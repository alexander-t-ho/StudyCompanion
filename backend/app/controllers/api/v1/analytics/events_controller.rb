module Api
  module V1
    module Analytics
      class EventsController < BaseController
        # POST /api/v1/analytics/events
        def create
          event = AnalyticsService.track_event(
            event_type: params[:event_type],
            student: current_student,
            properties: params[:properties] || {},
            session_id: params[:session_id],
            request: request
          )
          
          if event
            render json: { event: event_json(event) }, status: :created
          else
            render json: { error: 'Failed to track event' }, status: :unprocessable_entity
          end
        end

        # GET /api/v1/analytics/events
        def index
          start_date, end_date = parse_date_range
          
          events = AnalyticsEvent
            .for_student(current_student.id)
            .in_date_range(start_date, end_date)
            .order(occurred_at: :desc)
            .limit(params[:limit]&.to_i || 100)
          
          if params[:event_type].present?
            events = events.by_type(params[:event_type])
          end
          
          if params[:event_category].present?
            events = events.by_category(params[:event_category])
          end
          
          render json: {
            student_id: current_student.id,
            period: {
              start_date: start_date,
              end_date: end_date
            },
            events: events.map { |e| event_json(e) }
          }
        end

        private

        def event_json(event)
          {
            id: event.id,
            event_type: event.event_type,
            event_category: event.event_category,
            properties: event.properties,
            occurred_at: event.occurred_at,
            created_at: event.created_at
          }
        end
      end
    end
  end
end


