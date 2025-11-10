module Api
  module V1
    class SessionsController < ApplicationController
      before_action :authenticate_student!

      # GET /api/v1/sessions
      # List all sessions for the current student
      def index
        student = current_student
        return if performed?

        sessions = Session.where(student_id: student.id)
                         .order(scheduled_at: :desc)
                         .limit(100)

        render json: {
          sessions: sessions.map { |s| session_json(s) }
        }
      end

      # GET /api/v1/sessions/:id
      # Get a specific session
      def show
        student = current_student
        return if performed?

        session = Session.find_by(id: params[:id], student_id: student.id)
        return render json: { error: 'Session not found' }, status: :not_found unless session

        render json: session_json(session)
      end

      # POST /api/v1/sessions
      # Create a new scheduled session
      def create
        student = current_student
        return if performed?

        begin
          # Validate required parameters
          unless params[:scheduled_at].present?
            return render json: { error: 'scheduled_at is required' }, status: :bad_request
          end

          # Parse scheduled_at
          scheduled_at = Time.parse(params[:scheduled_at])
          
          # Validate scheduled_at is in the future
          if scheduled_at <= Time.current
            return render json: { error: 'scheduled_at must be in the future' }, status: :bad_request
          end

          # Create session
          duration_minutes = params[:duration_minutes] || 60
          session = Session.create!(
            student_id: student.id,
            subject: params[:subject],
            topic: params[:topic],
            scheduled_at: scheduled_at,
            status: 'scheduled',
            tutor_id: params[:tutor_id],
            notes: params[:notes],
            duration_minutes: duration_minutes,
            metadata: {
              booking_source: 'student_dashboard'
            }
          )

          render json: session_json(session), status: :created
        rescue ArgumentError => e
          render json: { error: "Invalid date format: #{e.message}" }, status: :bad_request
        rescue ActiveRecord::RecordInvalid => e
          render json: { error: e.message }, status: :unprocessable_entity
        rescue => e
          Rails.logger.error "Session creation error: #{e.message}\n#{e.backtrace.join("\n")}"
          render json: { error: e.message }, status: :internal_server_error
        end
      end

      # PATCH /api/v1/sessions/:id
      # Update a session (e.g., cancel, reschedule)
      def update
        student = current_student
        return if performed?

        session = Session.find_by(id: params[:id], student_id: student.id)
        return render json: { error: 'Session not found' }, status: :not_found unless session

        begin
          update_params = {}
          
          if params[:scheduled_at].present?
            scheduled_at = Time.parse(params[:scheduled_at])
            if scheduled_at <= Time.current && session.status == 'scheduled'
              return render json: { error: 'scheduled_at must be in the future' }, status: :bad_request
            end
            update_params[:scheduled_at] = scheduled_at
          end

          update_params[:subject] = params[:subject] if params[:subject].present?
          update_params[:topic] = params[:topic] if params[:topic].present?
          update_params[:status] = params[:status] if params[:status].present?
          update_params[:notes] = params[:notes] if params[:notes].present?

          session.update!(update_params)

          render json: session_json(session)
        rescue ArgumentError => e
          render json: { error: "Invalid date format: #{e.message}" }, status: :bad_request
        rescue ActiveRecord::RecordInvalid => e
          render json: { error: e.message }, status: :unprocessable_entity
        rescue => e
          Rails.logger.error "Session update error: #{e.message}\n#{e.backtrace.join("\n")}"
          render json: { error: e.message }, status: :internal_server_error
        end
      end

      # DELETE /api/v1/sessions/:id
      # Cancel a session
      def destroy
        student = current_student
        return if performed?

        session = Session.find_by(id: params[:id], student_id: student.id)
        return render json: { error: 'Session not found' }, status: :not_found unless session

        # Instead of deleting, mark as cancelled
        session.update!(status: 'cancelled')

        render json: { message: 'Session cancelled successfully' }
      end

      private

      def authenticate_student!
        token = request.headers['Authorization']&.gsub(/^Bearer /, '')
        
        if token.present?
          student = Student.find_by(authentication_token: token)
          return student if student
        end

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

      def current_student
        @current_student ||= authenticate_student!
      end

      def session_json(session)
        {
          id: session.id,
          student_id: session.student_id,
          tutor_id: session.tutor_id,
          subject: session.subject,
          topic: session.topic,
          scheduled_at: session.scheduled_at&.iso8601,
          started_at: session.started_at&.iso8601,
          ended_at: session.ended_at&.iso8601,
          duration_minutes: session.duration_minutes || session.metadata['duration_minutes'] || 60,
          status: session.status,
          notes: session.notes,
          metadata: session.metadata,
          created_at: session.created_at&.iso8601,
          updated_at: session.updated_at&.iso8601
        }
      end
    end
  end
end

