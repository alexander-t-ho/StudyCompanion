module Api
  module V1
    module Analytics
      class BaseController < ApplicationController
        before_action :authenticate_student!

        private

        def current_student
          @current_student ||= authenticate_student!
        end

        def authenticate_student!
          # Placeholder authentication - replace with actual auth mechanism
          token = request.headers['Authorization']&.gsub(/^Bearer /, '')
          
          if token.present?
            student = Student.find_by(authentication_token: token)
            return student if student
          end

          # For development/testing, allow student_id in params or headers
          student_id = params[:student_id] || request.headers['X-Student-Id']
          if student_id.present?
            student = Student.find_by(id: student_id)
            return student if student
          end

          # Default to student ID 1 for development (remove in production)
          if Rails.env.development? || Rails.env.test?
            student = Student.find_by(id: 1)
            return student if student
          end

          render json: { error: 'Unauthorized - Student not found' }, status: :unauthorized
          nil
        end

        def parse_date_range
          start_date = params[:start_date] ? Date.parse(params[:start_date]) : 30.days.ago.to_date
          end_date = params[:end_date] ? Date.parse(params[:end_date]) : Date.current
          [start_date, end_date]
        rescue ArgumentError
          [30.days.ago.to_date, Date.current]
        end
      end
    end
  end
end


