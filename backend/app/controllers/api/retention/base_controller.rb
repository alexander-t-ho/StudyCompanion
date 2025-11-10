module Api
  module V1
    module Retention
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

        if params[:student_id].present?
          student = Student.find_by(id: params[:student_id])
          return student if student
        end

        render json: { error: 'Unauthorized' }, status: :unauthorized
        nil
      end
    end
  end
  end
end

