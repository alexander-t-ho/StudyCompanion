module Api
  module V1
    module Analytics
      class AbTestingController < BaseController
        # POST /api/v1/analytics/ab_testing/assign
        def assign
          test_name = params[:test_name]
          variations = params[:variations] || ['control', 'variant_a']
          
          variation = AbTestingService.assign_variation(
            student: current_student,
            test_name: test_name,
            variations: variations
          )
          
          render json: {
            student_id: current_student.id,
            test_name: test_name,
            variation: variation.variation_name,
            assigned_at: variation.assigned_at
          }
        end

        # GET /api/v1/analytics/ab_testing/variation
        def variation
          test_name = params[:test_name]
          
          variation_name = AbTestingService.get_variation(
            student: current_student,
            test_name: test_name
          )
          
          render json: {
            student_id: current_student.id,
            test_name: test_name,
            variation: variation_name
          }
        end

        # GET /api/v1/analytics/ab_testing/results
        def results
          test_name = params[:test_name]
          start_date = params[:start_date] ? Date.parse(params[:start_date]) : 30.days.ago.to_date
          end_date = params[:end_date] ? Date.parse(params[:end_date]) : Date.current
          
          results = AbTestingService.get_test_results(
            test_name: test_name,
            start_date: start_date,
            end_date: end_date
          )
          
          is_significant = AbTestingService.is_statistically_significant?(
            test_name: test_name,
            start_date: start_date,
            end_date: end_date
          )
          
          render json: {
            test_name: test_name,
            period: {
              start_date: start_date,
              end_date: end_date
            },
            results: results,
            statistically_significant: is_significant
          }
        rescue ArgumentError
          render json: { error: 'Invalid date format' }, status: :bad_request
        end
      end
    end
  end
end


