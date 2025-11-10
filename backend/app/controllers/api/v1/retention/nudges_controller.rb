module Api
  module V1
    module Retention
      class NudgesController < BaseController
      def eligibility
        student = current_student
        return if performed? # Already rendered error in authenticate_student!
        
        api_key = params[:api_key] || request.headers['X-API-Key']
        use_openrouter = params[:use_openrouter] == 'true' || request.headers['X-Use-OpenRouter'] == 'true'
        
        begin
          service = NudgeService.new(
            student,
            api_key: api_key,
            use_openrouter: use_openrouter
          )
          details = service.eligibility_details

          render json: {
            eligible: details[:eligible] || false,
            details: details,
            suggested_nudge: details[:eligible] ? {
              message: service.generate_nudge_message,
              nudge_type: 'day_7_reminder'
            } : nil
          }
        rescue => e
          Rails.logger.error "Nudge eligibility error: #{e.message}\n#{e.backtrace.join("\n")}"
          render json: { 
            error: 'Failed to check nudge eligibility',
            message: e.message 
          }, status: :internal_server_error
        end
      end

      def create
        delivery_channel = params[:delivery_channel] || 'in_app'
        
        unless %w[in_app email push].include?(delivery_channel)
          render json: { error: 'Invalid delivery channel' }, status: :bad_request
          return
        end

        student = current_student
        return if performed? # Already rendered error in authenticate_student!

        api_key = params[:api_key] || request.headers['X-API-Key']
        use_openrouter = params[:use_openrouter] == 'true' || request.headers['X-Use-OpenRouter'] == 'true'
        
        begin
          service = NudgeService.new(
            student,
            api_key: api_key,
            use_openrouter: use_openrouter
          )
                 result = service.send_nudge(delivery_channel)
       
                 if result[:success]
                   # Track event
                   AnalyticsService.track_event(
                     event_type: :nudge_sent,
                     student: current_student,
                     properties: {
                       nudge_id: result[:nudge].id,
                       nudge_type: result[:nudge].nudge_type,
                       delivery_channel: delivery_channel
                     },
                     request: request
                   )
                   
                   render json: {
                     success: true,
                     message: 'Nudge sent successfully',
                     nudge: nudge_json(result[:nudge])
                   }
          else
            render json: {
              success: false,
              reason: result[:reason],
              details: service.eligibility_details
            }, status: :unprocessable_entity
          end
        rescue => e
          Rails.logger.error "Nudge send error: #{e.message}\n#{e.backtrace.join("\n")}"
          render json: { 
            error: 'Failed to send nudge',
            message: e.message 
          }, status: :internal_server_error
        end
      end

      # Get all nudges for the student
      def index
        student = current_student
        return if performed? # Already rendered error in authenticate_student!
        
        begin
          nudges = student.early_engagement_nudges.order(created_at: :desc)

          render json: {
            nudges: nudges.map { |n| nudge_json(n) }
          }
        rescue => e
          Rails.logger.error "Nudge index error: #{e.message}\n#{e.backtrace.join("\n")}"
          render json: { 
            error: 'Failed to load nudges',
            message: e.message 
          }, status: :internal_server_error
        end
      end

      # Mark nudge as opened
      def mark_opened
        nudge = current_student.early_engagement_nudges.find(params[:id])
        nudge.mark_opened!
        
        # Track event
        AnalyticsService.track_event(
          event_type: :nudge_opened,
          student: current_student,
          properties: {
            nudge_id: nudge.id,
            nudge_type: nudge.nudge_type
          },
          request: request
        )

        render json: {
          success: true,
          nudge: nudge_json(nudge)
        }
      end

      # Mark nudge as clicked
      def mark_clicked
        nudge = current_student.early_engagement_nudges.find(params[:id])
        nudge.mark_clicked!
        
        # Track event
        AnalyticsService.track_event(
          event_type: :nudge_clicked,
          student: current_student,
          properties: {
            nudge_id: nudge.id,
            nudge_type: nudge.nudge_type
          },
          request: request
        )

        render json: {
          success: true,
          nudge: nudge_json(nudge)
        }
      end

      private

      def nudge_json(nudge)
        {
          id: nudge.id,
          nudge_type: nudge.nudge_type,
          message: nudge.message,
          delivery_channel: nudge.delivery_channel,
          variant: nudge.variant,
          sent_at: nudge.sent_at,
          opened_at: nudge.opened_at,
          clicked_at: nudge.clicked_at,
          session_booked: nudge.session_booked,
          session_id: nudge.session_id,
          created_at: nudge.created_at
        }
      end
    end
  end
  end
end

