module Api
  module V1
    module AiCompanion
      class SessionSummariesController < BaseController
        def index
          student = current_student
          return if performed? # Already rendered error in authenticate_student!
          
          begin
            summaries = student.session_summaries
              .includes(:session, :transcript)
              .order(created_at: :desc)
            
            # Filter by subject if provided
            if params[:subject].present?
              summaries = summaries.joins(:transcript)
                                   .where(transcripts: { subject: params[:subject] })
            end
            
            summaries = summaries.limit(50)

            render json: {
              summaries: summaries.map { |s| summary_json(s) }
            }
          rescue => e
            Rails.logger.error "Session summaries index error: #{e.message}\n#{e.backtrace.join("\n")}"
            render json: { error: e.message }, status: :internal_server_error
          end
        end

        def show
          student = current_student
          return if performed? # Already rendered error in authenticate_student!
          
          begin
            summary = student.session_summaries.find(params[:id])
            render json: summary_json(summary, detailed: true)
          rescue ActiveRecord::RecordNotFound
            render json: { error: 'Session summary not found' }, status: :not_found
          rescue => e
            Rails.logger.error "Session summary show error: #{e.message}\n#{e.backtrace.join("\n")}"
            render json: { error: e.message }, status: :internal_server_error
          end
        end

        private

        def summary_json(summary, detailed: false)
          transcript = summary.transcript
          session = summary.session
          
          json = {
            id: summary.id,
            session_id: summary.session_id,
            transcript_id: summary.transcript_id,
            processing_status: summary.processing_status,
            extracted_topics: summary.extracted_topics || [],
            key_concepts: summary.key_concepts || [],
            processed_at: summary.processed_at,
            understanding_level: summary.understanding_level&.to_f,
            # Include session/transcript metadata
            date: transcript&.session_date || session&.started_at&.to_date || summary.created_at.to_date,
            topic: transcript&.topic,
            subject: transcript&.subject
          }

          if detailed
            json.merge!({
              learning_points: summary.learning_points,
              strengths_identified: summary.strengths_identified || [],
              areas_for_improvement: summary.areas_for_improvement || []
            })
          end

          json
        end
      end
    end
  end
end

