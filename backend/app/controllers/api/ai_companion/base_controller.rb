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

      def verify_ai_companion_access
        student = current_student
        return if performed? # Already rendered error in authenticate_student!
        
        # In development, auto-enable AI companion access if not set
        if (Rails.env.development? || Rails.env.test?) && student && !student.ai_companion_enabled?
          student.update(ai_companion_enabled: true)
        end
        
        unless student&.ai_companion_access?
          render json: { error: 'AI Companion access not enabled' }, status: :forbidden
        end
      end
    end
  end
end

