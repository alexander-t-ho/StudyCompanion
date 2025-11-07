module Api
  module V1
    class SessionSummariesController < ApplicationController
      before_action :set_student

      def create_from_transcript
        transcript = Transcript.find(params[:transcript_id])
        
        unless transcript.approved? && transcript.analyzed?
          return render json: { 
            error: 'Transcript must be approved and analyzed' 
          }, status: :unprocessable_entity
        end

        service = SessionSummaryService.new(
          api_key: params[:api_key],
          use_openrouter: params[:use_openrouter] == 'true'
        )

        summary = service.create_from_transcript(
          transcript,
          session_id: params[:session_id],
          student_id: @student.id
        )

        render json: summary_json(summary), status: :created
      rescue => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      private

      def set_student
        # Placeholder - replace with actual authentication
        @student = Student.find_by(id: params[:student_id])
        unless @student
          render json: { error: 'Student not found' }, status: :not_found
        end
      end

      def summary_json(summary)
        {
          id: summary.id,
          session_id: summary.session_id,
          student_id: summary.student_id,
          transcript_id: summary.transcript_id,
          processing_status: summary.processing_status,
          extracted_topics: summary.extracted_topics,
          key_concepts: summary.key_concepts,
          learning_points: summary.learning_points,
          strengths_identified: summary.strengths_identified,
          areas_for_improvement: summary.areas_for_improvement,
          processed_at: summary.processed_at
        }
      end
    end
  end
end

