module Api
  module V1
    class StudentDashboardController < ApplicationController
      before_action :authenticate_student!

      # GET /api/v1/student/dashboard
      # Returns all subjects with mastery levels
      def index
        student = current_student
        return if performed? || student.nil?

        begin
          service = SubjectMasteryService.new(student.id)
          subjects_with_mastery = service.get_all_subjects_with_mastery

          render json: {
            student_id: student.id,
            subjects: subjects_with_mastery
          }
        rescue => e
          Rails.logger.error "Student dashboard index error: #{e.message}\n#{e.backtrace.join("\n")}"
          render json: { error: e.message }, status: :internal_server_error
        end
      end

      # GET /api/v1/student/dashboard/long-term-goals
      # Returns all long-term goals grouped by subject
      def long_term_goals
        student = current_student
        return if performed? || student.nil?

        begin
          long_term_goals = student.goals
                                   .where(goal_type: 'long_term')
                                   .order(created_at: :desc)
          
          grouped = long_term_goals.group_by(&:subject)
          
          render json: {
            goals_by_subject: grouped.transform_values { |goals| goals.map { |g| goal_json(g) } }
          }
        rescue => e
          Rails.logger.error "Long-term goals error: #{e.message}\n#{e.backtrace.join("\n")}"
          render json: { error: e.message }, status: :internal_server_error
        end
      end

      # GET /api/v1/student/dashboard/all-sessions
      # Returns all sessions across all subjects (optimized for AllSessionsView)
      # Includes both completed sessions (from transcripts) and scheduled sessions
      def all_sessions
        student = current_student
        return if performed? || student.nil?

        begin
          all_sessions = []
          
          # Get completed sessions from transcripts
          transcript_subjects = Transcript.where(student_id: student.id)
                                          .where.not(subject: nil)
                                          .distinct
                                          .pluck(:subject)
                                          .compact
                                          .uniq

          # Batch load all transcripts with sessions and summaries
          all_transcripts = Transcript.where(student_id: student.id, subject: transcript_subjects)
                                      .includes(:session, :session_summaries)
                                      .order(session_date: :desc, created_at: :desc)
                                      .limit(500) # Reasonable limit

          # Map completed sessions to session format
          all_transcripts.each do |transcript|
            session = transcript.session
            session_summary = transcript.session_summaries.first

            all_sessions << {
              id: session&.id,
              session_id: session&.id,
              transcript_id: transcript.id,
              date: transcript.session_date || session&.started_at&.to_date || transcript.created_at.to_date,
              topic: transcript.topic,
              subject: transcript.subject,
              duration_minutes: transcript.session_duration_minutes || session&.duration_minutes,
              understanding_level: transcript.understanding_level&.to_f,
              status: session&.status || 'completed',
              is_scheduled: false,
              summary: {
                id: session_summary&.id,
                extracted_topics: session_summary&.extracted_topics || [],
                key_concepts: session_summary&.key_concepts || [],
                learning_points: session_summary&.learning_points,
                strengths_identified: session_summary&.strengths_identified || [],
                areas_for_improvement: session_summary&.areas_for_improvement || []
              }
            }
          end

          # Get scheduled sessions (not yet completed, excluding cancelled)
          scheduled_sessions = Session.where(student_id: student.id)
                                      .where(status: ['scheduled', 'confirmed'])
                                      .where.not(status: 'cancelled')
                                      .where('scheduled_at IS NOT NULL')
                                      .order(scheduled_at: :asc)
                                      .limit(100)

          # Add scheduled sessions to the list
          scheduled_sessions.each do |session|
            all_sessions << {
              id: session.id,
              session_id: session.id,
              transcript_id: nil,
              date: session.scheduled_at&.to_date || session.created_at.to_date,
              topic: session.topic,
              subject: session.subject,
              duration_minutes: session.duration_minutes,
              understanding_level: nil,
              status: session.status,
              is_scheduled: true,
              scheduled_at: session.scheduled_at&.iso8601,
              summary: nil
            }
          end

          # Sort all sessions by date (most recent first, but scheduled sessions by scheduled_at)
          all_sessions.sort_by! do |s|
            if s[:is_scheduled] && s[:scheduled_at]
              Time.parse(s[:scheduled_at])
            else
              s[:date].is_a?(Date) ? s[:date].to_time : Time.parse(s[:date].to_s)
            end
          end.reverse!

          render json: {
            student_id: student.id,
            sessions: all_sessions
          }
        rescue => e
          Rails.logger.error "All sessions error: #{e.message}\n#{e.backtrace.join("\n")}"
          render json: { error: e.message }, status: :internal_server_error
        end
      end

      # GET /api/v1/student/dashboard/subjects/:subject
      # Returns detailed subject view with mastery, sessions, goals, and learning concepts
      def show
        student = current_student
        return if performed? || student.nil?

        subject = params[:subject]
        return render json: { error: 'Subject parameter required' }, status: :bad_request unless subject.present?

        begin
          service = SubjectMasteryService.new(student.id)
          mastery_breakdown = service.get_mastery_breakdown(subject)

          return render json: { error: 'Subject not found' }, status: :not_found unless mastery_breakdown

          # Get sessions for this subject (via transcripts and scheduled sessions)
          sessions = get_sessions_for_subject(student.id, subject)
          
          # Also include scheduled sessions for this subject (excluding cancelled)
          scheduled_sessions = Session.where(student_id: student.id, subject: subject)
                                      .where(status: ['scheduled', 'confirmed'])
                                      .where.not(status: 'cancelled')
                                      .where('scheduled_at IS NOT NULL')
                                      .order(scheduled_at: :asc)
          
          # Add scheduled sessions to the sessions array
          scheduled_sessions.each do |session|
            sessions << {
              id: session.id,
              session_id: session.id,
              transcript_id: nil,
              date: session.scheduled_at&.to_date || session.created_at.to_date,
              topic: session.topic,
              subject: session.subject,
              duration_minutes: session.duration_minutes,
              understanding_level: nil,
              status: session.status,
              is_scheduled: true,
              scheduled_at: session.scheduled_at&.iso8601,
              summary: nil
            }
          end
          
          # Sort all sessions by date (most recent first, but scheduled sessions by scheduled_at)
          sessions.sort_by! do |s|
            if s[:is_scheduled] && s[:scheduled_at]
              Time.parse(s[:scheduled_at])
            else
              s[:date].is_a?(Date) ? s[:date].to_time : Time.parse(s[:date].to_s)
            end
          end.reverse!

          # Get goals for this subject - separate long-term and short-term
          all_goals = student.goals.where(subject: subject).order(created_at: :desc)
          long_term_goals = all_goals.where(goal_type: 'long_term')
          short_term_goals = all_goals.where(goal_type: 'short_term')

          # Get learning concepts from session summaries
          learning_concepts = get_learning_concepts_for_subject(student.id, subject)

          render json: {
            subject: subject,
            mastery: mastery_breakdown[:mastery],
            goals: all_goals.map { |g| goal_json(g) },
            long_term_goals: long_term_goals.map { |g| goal_json(g) },
            short_term_goals: short_term_goals.map { |g| goal_json(g) },
            sessions: sessions,
            learning_concepts: learning_concepts
          }
        rescue => e
          Rails.logger.error "Student dashboard show error: #{e.message}\n#{e.backtrace.join("\n")}"
          render json: { error: e.message }, status: :internal_server_error
        end
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

      def get_sessions_for_subject(student_id, subject)
        # Get sessions via transcripts (transcripts have subject)
        transcripts = Transcript.where(student_id: student_id, subject: subject)
                                .includes(:session, :session_summaries)
                                .order(session_date: :desc, created_at: :desc)
                                .limit(50)

        transcripts.map do |transcript|
          session = transcript.session
          session_summary = transcript.session_summaries.first

          {
            id: session&.id,
            session_id: session&.id,
            transcript_id: transcript.id,
            date: transcript.session_date || session&.started_at&.to_date || transcript.created_at.to_date,
            topic: transcript.topic,
            subject: transcript.subject,
            duration_minutes: transcript.session_duration_minutes || session&.duration_minutes,
            understanding_level: transcript.understanding_level&.to_f,
            summary: {
              id: session_summary&.id,
              extracted_topics: session_summary&.extracted_topics || [],
              key_concepts: session_summary&.key_concepts || [],
              learning_points: session_summary&.learning_points,
              strengths_identified: session_summary&.strengths_identified || [],
              areas_for_improvement: session_summary&.areas_for_improvement || []
            }
          }
        end
      end

      def get_learning_concepts_for_subject(student_id, subject)
        # Get unique learning concepts from session summaries for this subject
        # Join through transcripts to filter by subject
        summaries = SessionSummary.joins(:transcript)
                                  .where(student_id: student_id, transcripts: { subject: subject })
                                  .where(processing_status: 'completed')
                                  .includes(:transcript)

        concepts = summaries.flat_map(&:key_concepts).compact.uniq
        topics = summaries.flat_map(&:extracted_topics).compact.uniq

        {
          key_concepts: concepts,
          topics: topics
        }
      end

      def goal_json(goal)
        {
          id: goal.id,
          subject: goal.subject,
          goal_type: goal.goal_type,
          title: goal.title,
          description: goal.description,
          status: goal.status,
          target_date: goal.target_date,
          completed_at: goal.completed_at,
          progress_percentage: goal.progress_percentage || 0,
          parent_goal_id: goal.parent_goal_id,
          parent_goal: goal.parent_goal ? {
            id: goal.parent_goal.id,
            title: goal.parent_goal.title
          } : nil,
          child_goals_count: goal.child_goals.count,
          metadata: goal.metadata,
          created_at: goal.created_at,
          updated_at: goal.updated_at
        }
      end
    end
  end
end

