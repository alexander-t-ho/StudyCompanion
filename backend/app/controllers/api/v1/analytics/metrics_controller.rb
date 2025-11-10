module Api
  module V1
    module Analytics
      class MetricsController < BaseController
        # GET /api/v1/analytics/metrics/summary
        def summary
          start_date, end_date = parse_date_range
          student = params[:student_id] ? Student.find(params[:student_id]) : current_student
          
          summary_data = AnalyticsService.get_summary(
            start_date: start_date,
            end_date: end_date,
            student: student
          )
          
          render json: {
            student_id: student&.id,
            period: {
              start_date: start_date,
              end_date: end_date
            },
            summary: summary_data
          }
        end

        # GET /api/v1/analytics/metrics/:metric_name
        def show
          start_date, end_date = parse_date_range
          student = params[:student_id] ? Student.find(params[:student_id]) : current_student
          period = params[:period] || 'daily'
          
          metrics = AnalyticsService.get_metrics(
            metric_name: params[:metric_name],
            start_date: start_date,
            end_date: end_date,
            student: student,
            period: period
          )
          
          render json: {
            metric_name: params[:metric_name],
            student_id: student&.id,
            period: {
              start_date: start_date,
              end_date: end_date,
              aggregation_period: period
            },
            metrics: metrics.map { |m| metric_json(m) }
          }
        end

        # POST /api/v1/analytics/metrics/calculate
        def calculate
          date = params[:date] ? Date.parse(params[:date]) : Date.current
          
          AnalyticsService.calculate_daily_metrics(date: date)
          
          render json: {
            message: 'Metrics calculated successfully',
            date: date
          }
        rescue ArgumentError
          render json: { error: 'Invalid date format' }, status: :bad_request
        end

        private

        def metric_json(metric)
          {
            id: metric.id,
            metric_name: metric.metric_name,
            metric_category: metric.metric_category,
            metric_value: metric.metric_value,
            metric_unit: metric.metric_unit,
            metric_date: metric.metric_date,
            dimensions: metric.dimensions,
            aggregation_period: metric.aggregation_period,
            created_at: metric.created_at
          }
        end
      end
    end
  end
end


