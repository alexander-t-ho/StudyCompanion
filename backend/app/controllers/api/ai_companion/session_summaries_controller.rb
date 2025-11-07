module Api
  module AiCompanion
    class SessionSummariesController < BaseController
      def index
        summaries = current_student.session_summaries
          .includes(:session, :transcript)
          .order(created_at: :desc)
          .limit(50)

        render json: {
          summaries: summaries.map { |s| summary_json(s) }
        }
      end

      def show
        summary = current_student.session_summaries.find(params[:id])
        render json: summary_json(summary, detailed: true)
      end

      private

      def summary_json(summary, detailed: false)
        json = {
          id: summary.id,
          session_id: summary.session_id,
          processing_status: summary.processing_status,
          extracted_topics: summary.extracted_topics,
          key_concepts: summary.key_concepts,
          processed_at: summary.processed_at
        }

        if detailed
          json.merge!({
            learning_points: summary.learning_points,
            strengths_identified: summary.strengths_identified,
            areas_for_improvement: summary.areas_for_improvement,
            transcript_id: summary.transcript_id
          })
        end

        json
      end
    end
  end
end

