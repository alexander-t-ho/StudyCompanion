module Api
  module V1
    module Admin
      class BaseController < ApplicationController
        before_action :authenticate_admin!

        private

        def authenticate_admin!
          token = request.headers['Authorization']&.gsub(/^Bearer /, '')
          
          if token.present?
            student = Student.find_by(authentication_token: token)
            if student && student.is_admin?
              @current_admin = student
              return
            end
          end

          # Fallback for development
          student_id = params[:student_id] || request.headers['X-Student-Id']
          if student_id.present? && (Rails.env.development? || Rails.env.test?)
            student = Student.find_by(id: student_id)
            if student && student.is_admin?
              @current_admin = student
              return
            end
          end

          render json: { error: 'Admin access required' }, status: :forbidden
        end

        def current_admin
          @current_admin
        end
      end
    end
  end
end

