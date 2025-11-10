module Api
  module V1
    class StudyNotesController < ApplicationController
      before_action :authenticate_student!

      def create
        student = current_student
        return if performed?

        study_note = student.study_notes.build(study_note_params)
        study_note.detected_at ||= Time.current

        if study_note.save
          render json: { study_note: study_note_json(study_note) }, status: :created
        else
          render json: { errors: study_note.errors.full_messages }, status: :unprocessable_entity
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

      def study_note_params
        params.require(:study_note).permit(:subject, :concept, :message, :detected_at, :conversation_message_id)
      end

      def study_note_json(note)
        {
          id: note.id,
          subject: note.subject,
          concept: note.concept,
          message: note.message,
          detected_at: note.detected_at,
          notified_tutor: note.notified_tutor
        }
      end
    end
  end
end

