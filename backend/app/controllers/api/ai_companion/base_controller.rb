module Api
  module AiCompanion
    class BaseController < ApplicationController
      before_action :authenticate_student!
      before_action :verify_ai_companion_access

      private

      def current_student
        @current_student ||= authenticate_student!
      end

      def authenticate_student!
        # Placeholder authentication - replace with actual auth mechanism
        # This could be JWT, session-based, or OAuth depending on existing system
        token = request.headers['Authorization']&.gsub(/^Bearer /, '')
        
        if token.present?
          # Try to find student by authentication token
          student = Student.find_by(authentication_token: token)
          return student if student
        end

        # For development/testing, allow student_id in params
        if params[:student_id].present?
          student = Student.find_by(id: params[:student_id])
          return student if student
        end

        render json: { error: 'Unauthorized' }, status: :unauthorized
        nil
      end

      def verify_ai_companion_access
        unless current_student&.ai_companion_access?
          render json: { error: 'AI Companion access not enabled' }, status: :forbidden
        end
      end
    end
  end
end

