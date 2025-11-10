module Api
  module AiCompanion
    class RoutingController < BaseController
      def check
        student = current_student
        api_key = params[:api_key] || ENV['OPENAI_API_KEY']
        use_openrouter = params[:use_openrouter] == 'true' || ENV['USE_OPENROUTER'] == 'true'
        
        service = TutorRoutingService.new(
          api_key: api_key,
          use_openrouter: use_openrouter
        )
        
        result = service.check_routing_needed(
          student: student,
          conversation_context: params[:context] || {}
        )
        
        render json: {
          routing_needed: result[:routing_needed],
          confidence: result[:confidence],
          reason: result[:reason],
          urgency: result[:urgency],
          subject: result[:subject],
          triggers: result[:triggers] || []
        }
      rescue => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      def request
        student = current_student
        api_key = params[:api_key] || ENV['OPENAI_API_KEY']
        use_openrouter = params[:use_openrouter] == 'true' || ENV['USE_OPENROUTER'] == 'true'
        
        service = TutorRoutingService.new(
          api_key: api_key,
          use_openrouter: use_openrouter
        )
        
        result = service.request_routing(
          student: student,
          routing_event_id: params[:routing_event_id]&.to_i,
          subject: params[:subject]
        )
        
        if result[:error]
          render json: result, status: :not_found
        else
          render json: {
            routing_event: routing_event_json(result[:routing_event]),
            suggested_tutors: result[:suggested_tutors],
            routing_context: result[:routing_context]
          }
        end
      rescue => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      private

      def routing_event_json(event)
        {
          id: event.id,
          routing_reason: event.routing_reason,
          routing_confidence: event.routing_confidence,
          urgency: event.urgency,
          session_booked: event.session_booked,
          session_id: event.session_id,
          created_at: event.created_at
        }
      end
    end
  end
end

