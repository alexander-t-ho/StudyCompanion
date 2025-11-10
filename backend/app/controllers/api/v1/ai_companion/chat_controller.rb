require 'base64'
require 'stringio'

module Api
  module V1
    module AiCompanion
      class ChatController < BaseController
        def create
          student = current_student
          return if performed? # Already rendered error in authenticate_student!
          
          message = params[:message] || params.dig(:chat, :message)
          
          unless message.present?
            return render json: { error: 'Message is required' }, status: :unprocessable_entity
          end

          # Accept api_key and use_openrouter from params, or fall back to environment variables
          api_key = params[:api_key].presence || ENV['OPENAI_API_KEY']
          use_openrouter = if params[:use_openrouter].present?
            params[:use_openrouter] == 'true' || params[:use_openrouter] == true
          else
            ENV['USE_OPENROUTER'] == 'true'
          end
          
          # If using OpenRouter and no API key provided, use OpenRouter key from env
          if use_openrouter && api_key.blank?
            api_key = ENV['OPENROUTER_API_KEY']
          end

          # Handle image uploads (Base64 encoded images from frontend)
          image_attachments = []
          if params[:images].present? && params[:images].is_a?(Array)
            params[:images].each do |image_data|
              if image_data.is_a?(String) && image_data.start_with?('data:image')
                # Base64 encoded image
                begin
                  # Parse data URI: data:image/jpeg;base64,<base64_data>
                  matches = image_data.match(/^data:image\/(\w+);base64,(.+)$/)
                  if matches
                    content_type = "image/#{matches[1]}"
                    base64_data = matches[2]
                    decoded_data = Base64.decode64(base64_data)
                    
                    # Store the decoded data so we can create fresh StringIO objects when needed
                    image_attachments << {
                      data: decoded_data,  # Store raw data
                      filename: "image.#{matches[1]}",
                      content_type: content_type
                    }
                  end
                rescue => e
                  Rails.logger.error "Failed to process image: #{e.message}\n#{e.backtrace.join("\n")}"
                  # Continue processing other images even if one fails
                end
              end
            end
          end

          service = AiCompanionService.new(
            api_key: api_key,
            use_openrouter: use_openrouter
          )

          context = {
            timestamp: Time.current.iso8601,
            user_agent: request.user_agent,
            ip_address: request.remote_ip,
            practice_problem_id: params[:practice_problem_id], # Add practice problem context
            subject: params[:subject] || params.dig(:context, :subject), # Add subject context for scoping
            session_id: params[:session_id], # Add session ID if provided
            session_context: params[:session_context] || params.dig(:context, :session_context), # Add session context for session-specific questions
            is_homework_help: params[:is_homework_help] == true || params[:is_homework_help] == 'true' # Flag for homework help chats
          }

          result = service.chat(
            student: student,
            message: message,
            context: context,
            image_attachments: image_attachments
          )

          # Check for handoff status
          routing_service = TutorRoutingService.new(
            api_key: api_key,
            use_openrouter: use_openrouter
          )
          routing_check = routing_service.check_routing_needed(
            student: student,
            conversation_context: context
          )

          # Track event and cost
          AnalyticsService.track_event(
            event_type: :chat_message,
            student: student,
            properties: {
              practice_problem_id: params[:practice_problem_id],
              message_length: message.length,
              handoff_triggered: routing_check[:routing_needed] && routing_check[:confidence] >= 0.7
            },
            request: request
          )
          
          if result[:cost]
            CostTrackingService.track_cost(
              cost_type: :conversation,
              student: student,
              cost: result[:cost],
              model_used: result[:model_used],
              token_count: result[:token_count],
              provider: use_openrouter ? 'openrouter' : 'openai',
              metadata: { message_id: result[:message_id] }
            )
          end

          response_data = {
            message: result[:message],
            message_id: result[:message_id],
            contexts_used: result[:contexts_used],
            image_urls: result[:image_urls] || []
          }

          # Don't add handoff information if the response is about notes (repeated query response)
          # The service already handled the repeated query and returned the appropriate message
          is_repeated_query_response = result[:message]&.downcase&.include?('put this in your notes') ||
                                       result[:message]&.downcase&.include?('notes for next session')

          # Include handoff information if triggered (but not for repeated query responses)
          if routing_check[:routing_needed] && routing_check[:confidence] >= 0.7 && !is_repeated_query_response
            response_data[:handoff] = {
              triggered: true,
              urgency: routing_check[:urgency],
              reason: routing_check[:reason],
              triggers: routing_check[:triggers] || []
            }
          end

          render json: response_data, status: :created
        rescue => e
          Rails.logger.error "Chat error: #{e.message}\n#{e.backtrace.join("\n")}"
          render json: { error: e.message }, status: :unprocessable_entity
        end

        def history
          student = current_student
          return if performed? # Already rendered error in authenticate_student!
          
          page = params[:page]&.to_i || 1
          per_page = [params[:per_page]&.to_i || 50, 100].min # Max 100 per page
          practice_problem_id = params[:practice_problem_id]
          
          begin
            query = student.conversation_messages
            
            # Filter by practice problem if provided
            if practice_problem_id.present?
              query = query.where("context->>'practice_problem_id' = ?", practice_problem_id.to_s)
            else
              # For general chat, exclude practice problem conversations
              query = query.where("context->>'practice_problem_id' IS NULL OR context->>'practice_problem_id' = ''")
            end
            
            # Filter by subject if provided
            subject = params[:subject]
            if subject.present?
              query = query.where("context->>'subject' = ?", subject)
            end
            
            # Filter by session_id if provided
            session_id = params[:session_id]
            if session_id.present?
              query = query.where("context->>'session_id' = ? OR session_id = ?", session_id.to_s, session_id.to_s)
            end
            
            messages = query
              .order(created_at: :desc)
              .limit(per_page)
              .offset((page - 1) * per_page)
              .reverse

            total_count = query.count

            render json: {
              messages: messages.map { |m| message_json(m) },
              pagination: {
                page: page,
                per_page: per_page,
                total_count: total_count,
                total_pages: (total_count.to_f / per_page).ceil
              }
            }
          rescue => e
            Rails.logger.error "Chat history error: #{e.message}\n#{e.backtrace.join("\n")}"
            render json: { error: e.message }, status: :internal_server_error
          end
        end

        private

        def message_json(message)
          {
            id: message.id,
            role: message.role,
            content: message.content,
            context: message.context_hash,
            created_at: message.created_at,
            session_id: message.session_id,
            session_summary_id: message.session_summary_id,
            image_urls: message.image_urls
          }
        end
      end
    end
  end
end

