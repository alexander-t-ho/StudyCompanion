module Api
  module V1
    module Admin
      class StudyNotesController < BaseController
        def index
          student_id = params[:student_id]
          
          if student_id.present?
            notes = StudyNote.where(student_id: student_id).recent
          else
            notes = StudyNote.recent.limit(100)
          end

          render json: {
            study_notes: notes.map { |n| study_note_json(n) }
          }
        end

        def update
          note = StudyNote.find_by(id: params[:id])
          
          unless note
            return render json: { error: 'Study note not found' }, status: :not_found
          end

          if note.update(study_note_params)
            render json: { study_note: study_note_json(note) }
          else
            render json: { errors: note.errors.full_messages }, status: :unprocessable_entity
          end
        end

        private

        def study_note_params
          params.require(:study_note).permit(:notified_tutor)
        end

        def study_note_json(note)
          {
            id: note.id,
            student_id: note.student_id,
            student_name: note.student.name,
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

