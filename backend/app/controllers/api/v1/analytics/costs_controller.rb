module Api
  module V1
    module Analytics
      class CostsController < BaseController
        # GET /api/v1/analytics/costs/summary
        def summary
          start_date, end_date = parse_date_range
          student = params[:student_id] ? Student.find(params[:student_id]) : current_student
          
          total_cost = CostTrackingService.total_cost(
            start_date: start_date,
            end_date: end_date,
            student: student
          )
          
          breakdown = CostTrackingService.cost_breakdown(
            start_date: start_date,
            end_date: end_date,
            student: student
          )
          
          average_per_student = student ? nil : CostTrackingService.average_cost_per_student(
            start_date: start_date,
            end_date: end_date
          )
          
          render json: {
            student_id: student&.id,
            period: {
              start_date: start_date,
              end_date: end_date
            },
            total_cost: total_cost,
            average_cost_per_student: average_per_student,
            breakdown: breakdown
          }
        end

        # GET /api/v1/analytics/costs/trends
        def trends
          start_date, end_date = parse_date_range
          student = params[:student_id] ? Student.find(params[:student_id]) : current_student
          cost_type = params[:cost_type]
          
          trends = CostTrackingService.cost_trends(
            start_date: start_date,
            end_date: end_date,
            student: student,
            cost_type: cost_type
          )
          
          render json: {
            student_id: student&.id,
            cost_type: cost_type,
            period: {
              start_date: start_date,
              end_date: end_date
            },
            trends: trends.map { |date, cost| { date: date, cost: cost } }
          }
        end

        # GET /api/v1/analytics/costs/projections
        def projections
          current_students = params[:current_students]&.to_i || Student.count
          target_students = params[:target_students]&.to_i || 1000
          current_month = params[:month] ? Date.parse(params[:month]) : Date.current
          
          current_month_cost = CostTrackingService.total_cost(
            start_date: current_month.beginning_of_month,
            end_date: current_month.end_of_month
          )
          
          projections = CostTrackingService.project_costs_at_scale(
            current_students: current_students,
            target_students: target_students,
            current_month_cost: current_month_cost
          )
          
          render json: {
            projections: projections
          }
        end
      end
    end
  end
end


