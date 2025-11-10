module Api
  module AiCompanion
    class ChatController < BaseController
      def create
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

        service = AiCompanionService.new(
          api_key: api_key,
          use_openrouter: use_openrouter
        )

        context = {
          timestamp: Time.current.iso8601,
          user_agent: request.user_agent,
          ip_address: request.remote_ip
        }

        result = service.chat(
          student: current_student,
          message: message,
          context: context
        )

        render json: {
          message: result[:message],
          message_id: result[:message_id],
          contexts_used: result[:contexts_used]
        }, status: :created
      rescue => e
        Rails.logger.error "Chat error: #{e.message}\n#{e.backtrace.join("\n")}"
        render json: { error: e.message }, status: :unprocessable_entity
      end

      def history
        page = params[:page]&.to_i || 1
        per_page = [params[:per_page]&.to_i || 50, 100].min # Max 100 per page
        
        messages = current_student.conversation_messages
          .order(created_at: :desc)
          .limit(per_page)
          .offset((page - 1) * per_page)
          .reverse

        total_count = current_student.conversation_messages.count

        render json: {
          messages: messages.map { |m| message_json(m) },
          pagination: {
            page: page,
            per_page: per_page,
            total_count: total_count,
            total_pages: (total_count.to_f / per_page).ceil
          }
        }
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
          session_summary_id: message.session_summary_id
        }
      end
    end
  end
end

