module Api
  module V1
    module Admin
      class StudentsController < BaseController
        def index
          students = Student.students.order(created_at: :desc)
          
          students_data = students.map do |student|
            {
              id: student.id,
              username: student.username,
              email: student.email,
              name: student.name,
              created_at: student.created_at,
              stats: {
                total_subjects: get_total_subjects(student),
                total_sessions: student.sessions.count,
                sessions_this_week: get_sessions_this_week(student),
                practice_problems_count: student.practice_problems.count
              }
            }
          end

          render json: { students: students_data }
        end

        def show
          student = Student.find_by(id: params[:id])
          
          unless student
            return render json: { error: 'Student not found' }, status: :not_found
          end

          # Get all data for this student
          goals = student.goals.order(created_at: :desc)
          sessions = student.sessions.order(scheduled_at: :desc)
          upcoming_sessions = student.sessions
            .where('scheduled_at > ?', Time.current)
            .where(status: ['scheduled', 'confirmed'])
            .order(scheduled_at: :asc)
          
          # Get progress analytics (reuse existing service)
          progress_analytics = get_progress_analytics(student)
          
          # Get study notes
          study_notes = student.study_notes.recent
          
          # Count practice problems
          practice_problems_count = student.practice_problems.count

          render json: {
            student: {
              id: student.id,
              username: student.username,
              email: student.email,
              name: student.name,
              created_at: student.created_at
            },
            goals: goals.map { |g| goal_json(g) },
            sessions: sessions.map { |s| session_json(s) },
            upcoming_sessions: upcoming_sessions.map { |s| session_json(s) },
            progress_analytics: progress_analytics,
            study_notes: study_notes.map { |n| study_note_json(n) },
            practice_problems_count: practice_problems_count
          }
        end

        private

        def get_total_subjects(student)
          subjects_from_sessions = student.sessions.pluck(:subject).compact.uniq
          subjects_from_transcripts = student.transcripts.pluck(:subject).compact.uniq
          (subjects_from_sessions + subjects_from_transcripts).uniq.count
        end

        def get_sessions_this_week(student)
          start_of_week = Date.current.beginning_of_week
          end_of_week = Date.current.end_of_week
          student.sessions
            .where(scheduled_at: start_of_week.beginning_of_day..end_of_week.end_of_day)
            .count
        end

        def get_progress_analytics(student)
          # Get all subjects
          subjects_from_sessions = student.sessions.pluck(:subject).compact.uniq
          subjects_from_transcripts = student.transcripts.pluck(:subject).compact.uniq
          all_subjects = (subjects_from_sessions + subjects_from_transcripts).uniq

          service = SubjectMasteryService.new(student.id)
          analytics = {}
          all_subjects.each do |subject|
            # Calculate mastery for this subject
            mastery = service.calculate_mastery_for_subject(subject)
            if mastery
              analytics[subject] = {
                mastery: mastery[:percentage] || 0,
                breakdown: mastery
              }
            end
          end

          analytics
        end

        def goal_json(goal)
          {
            id: goal.id,
            title: goal.title,
            description: goal.description,
            subject: goal.subject,
            goal_type: goal.goal_type,
            status: goal.status,
            progress_percentage: goal.progress_percentage,
            created_at: goal.created_at,
            updated_at: goal.updated_at
          }
        end

        def session_json(session)
          {
            id: session.id,
            subject: session.subject,
            topic: session.topic,
            scheduled_at: session.scheduled_at,
            started_at: session.started_at,
            ended_at: session.ended_at,
            duration_minutes: session.duration_minutes,
            status: session.status,
            notes: session.notes
          }
        end

        def study_note_json(note)
          {
            id: note.id,
            subject: note.subject,
            concept: note.concept,
            message: note.message,
            detected_at: note.detected_at,
            notified_tutor: note.notified_tutor,
            created_at: note.created_at
          }
        end
      end
    end
  end
end

