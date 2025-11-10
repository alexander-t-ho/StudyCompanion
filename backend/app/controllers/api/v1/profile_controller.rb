module Api
  module V1
    class ProfileController < ApplicationController
      before_action :authenticate_student!

      def show
        student = current_student
        return if performed?

        # Calculate statistics
        stats = calculate_profile_stats(student)

        render json: {
          student: {
            id: student.id,
            username: student.username,
            email: student.email,
            name: student.name
          },
          statistics: stats
        }
      end

      def update
        student = current_student
        return if performed?

        if student.update(profile_params)
          render json: {
            student: {
              id: student.id,
              username: student.username,
              email: student.email,
              name: student.name
            }
          }
        else
          render json: { errors: student.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def change_password
        student = current_student
        return if performed?

        unless student.authenticate(params[:current_password])
          return render json: { error: 'Current password is incorrect' }, status: :unauthorized
        end

        if params[:new_password].blank? || params[:new_password].length < 6
          return render json: { error: 'New password must be at least 6 characters' }, status: :bad_request
        end

        if student.update(password: params[:new_password])
          render json: { message: 'Password changed successfully' }
        else
          render json: { errors: student.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def authenticate_student!
        token = request.headers['Authorization']&.gsub(/^Bearer /, '')
        
        if token.present?
          @current_student = Student.find_by(authentication_token: token)
          return @current_student if @current_student
        end

        # Fallback for development
        student_id = params[:student_id] || request.headers['X-Student-Id']
        if student_id.present? && (Rails.env.development? || Rails.env.test?)
          @current_student = Student.find_by(id: student_id)
          return @current_student if @current_student
        end

        render json: { error: 'Unauthorized' }, status: :unauthorized
        nil
      end

      def current_student
        @current_student
      end

      def profile_params
        params.require(:profile).permit(:name, :email)
      end

      def calculate_profile_stats(student)
        # Get all unique subjects from sessions and transcripts
        subjects_from_sessions = student.sessions.pluck(:subject).compact.uniq
        subjects_from_transcripts = student.transcripts.pluck(:subject).compact.uniq
        all_subjects = (subjects_from_sessions + subjects_from_transcripts).uniq

        # Count sessions per subject
        sessions_per_subject = student.sessions
          .where.not(subject: nil)
          .group(:subject)
          .count

        # Count sessions this week
        start_of_week = Date.current.beginning_of_week
        end_of_week = Date.current.end_of_week
        sessions_this_week = student.sessions
          .where(scheduled_at: start_of_week.beginning_of_day..end_of_week.end_of_day)
          .count

        {
          total_subjects: all_subjects.count,
          subjects: all_subjects,
          sessions_per_subject: sessions_per_subject,
          sessions_this_week: sessions_this_week
        }
      end
    end
  end
end

