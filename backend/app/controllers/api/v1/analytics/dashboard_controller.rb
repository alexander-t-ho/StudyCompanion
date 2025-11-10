module Api
  module V1
    module Analytics
      class DashboardController < BaseController
        # GET /api/v1/analytics/dashboard
        def show
          start_date, end_date = parse_date_range
          student = params[:student_id] ? Student.find_by(id: params[:student_id]) : current_student
          
          begin
            # Get summary metrics (handle case where tables might not exist yet)
            summary = begin
              AnalyticsService.get_summary(
                start_date: start_date,
                end_date: end_date,
                student: student
              )
            rescue ActiveRecord::StatementInvalid => e
              Rails.logger.warn "Analytics tables may not exist yet: #{e.message}"
              # Return empty summary structure
              {
                engagement: { dau: 0, wau: 0, mau: 0, chat_frequency: 0, practice_frequency: 0 },
                learning: { practice_completion_rate: 0, practice_accuracy_rate: 0, average_difficulty_level: 0 },
                retention: { goal_suggestion_acceptance_rate: 0, nudge_conversion_rate: 0 },
                business: { total_sessions: 0, average_sessions_per_student: 0 }
              }
            end
            
            # Get cost summary
            total_cost = begin
              CostTrackingService.total_cost(
                start_date: start_date,
                end_date: end_date,
                student: student
              )
            rescue ActiveRecord::StatementInvalid => e
              Rails.logger.warn "Cost tracking table may not exist yet: #{e.message}"
              0.0
            end
            
            cost_breakdown = begin
              CostTrackingService.cost_breakdown(
                start_date: start_date,
                end_date: end_date,
                student: student
              )
            rescue ActiveRecord::StatementInvalid => e
              Rails.logger.warn "Cost tracking table may not exist yet: #{e.message}"
              { breakdown: {}, total: 0, by_percentage: {} }
            end
            
            # Get recent events
            recent_events = begin
              query = AnalyticsEvent
              query = query.for_student(student.id) if student
              query.recent(7).order(occurred_at: :desc).limit(10)
            rescue ActiveRecord::StatementInvalid => e
              Rails.logger.warn "Analytics events table may not exist yet: #{e.message}"
              []
            end
            
            render json: {
              student_id: student&.id,
              period: {
                start_date: start_date,
                end_date: end_date
              },
              metrics: summary,
              costs: {
                total: total_cost,
                breakdown: cost_breakdown,
                average_cost_per_student: student ? nil : begin
                  CostTrackingService.average_cost_per_student(
                    start_date: start_date,
                    end_date: end_date
                  )
                rescue ActiveRecord::StatementInvalid
                  nil
                end
              },
              recent_events: recent_events.map { |e| {
                id: e.id,
                event_type: e.event_type,
                event_category: e.event_category,
                occurred_at: e.occurred_at
              }}
            }
          rescue => e
            Rails.logger.error "Dashboard error: #{e.message}\n#{e.backtrace.join("\n")}"
            render json: { 
              error: 'Failed to load dashboard',
              message: e.message,
              hint: 'Make sure to run migrations: bundle exec rails db:migrate'
            }, status: :internal_server_error
          end
        end
      end
    end
  end
end

