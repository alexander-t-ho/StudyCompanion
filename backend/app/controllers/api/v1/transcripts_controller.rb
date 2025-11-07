module Api
  module V1
    class TranscriptsController < ApplicationController
      before_action :set_transcript, only: [:show, :validate, :analyze]

      def index
        @transcripts = Transcript.order(created_at: :desc).includes(:transcript_analysis)
        render json: @transcripts, include: :transcript_analysis
      end

      def show
        render json: @transcript, include: :transcript_analysis
      end

      def create
        # Accept api_key and use_openrouter from params, or fall back to environment variables
        api_key = params[:api_key].presence || params.dig(:transcript, :api_key).presence || ENV['OPENAI_API_KEY']
        use_openrouter = if params[:use_openrouter].present? || params.dig(:transcript, :use_openrouter).present?
          params[:use_openrouter] == 'true' || params[:use_openrouter] == true || params.dig(:transcript, :use_openrouter) == 'true' || params.dig(:transcript, :use_openrouter) == true
        else
          ENV['USE_OPENROUTER'] == 'true'
        end
        
        # If using OpenRouter and no API key provided, use OpenRouter key from env
        if use_openrouter && api_key.blank?
          api_key = ENV['OPENROUTER_API_KEY']
        end
        
        service = TranscriptGenerationService.new(
          api_key: api_key,
          use_openrouter: use_openrouter
        )

        generation_params = transcript_params.to_h
        result = service.generate(generation_params)

        # For meeting transcripts, use meeting_title as subject if subject is not provided
        subject_value = generation_params[:subject] || generation_params[:meeting_title] || 'Meeting'
        topic_value = generation_params[:topic] || generation_params[:meeting_title] || 'General Discussion'
        
        @transcript = Transcript.create!(
          subject: subject_value,
          topic: topic_value,
          student_level: generation_params[:student_level] || (generation_params[:transcript_type] == 'meeting' ? nil : 'intermediate'),
          session_duration_minutes: generation_params[:session_duration_minutes],
          learning_objectives: generation_params[:learning_objectives],
          student_personality: generation_params[:student_personality],
          transcript_content: result[:transcript_content],
          generation_parameters: generation_params,
          model_used: result[:model_used],
          token_count: result[:token_count],
          generation_cost: result[:cost]
        )

        render json: @transcript, status: :created
      rescue => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      def validate
        @transcript.update!(
          quality_rating: params[:quality_rating],
          validation_notes: params[:validation_notes],
          approved: params[:approved] == 'true'
        )

        render json: @transcript
      end

      def analyze
        if @transcript.transcript_analysis.present?
          return render json: { 
            error: 'Transcript already analyzed',
            analysis: @transcript.transcript_analysis
          }, status: :conflict
        end

        # Accept api_key and use_openrouter from params, or fall back to environment variables
        api_key = params[:api_key].presence || params.dig(:transcript_analysis, :api_key).presence || ENV['OPENAI_API_KEY']
        use_openrouter = if params[:use_openrouter].present? || params.dig(:transcript_analysis, :use_openrouter).present?
          params[:use_openrouter] == 'true' || params[:use_openrouter] == true || params.dig(:transcript_analysis, :use_openrouter) == 'true' || params.dig(:transcript_analysis, :use_openrouter) == true
        else
          ENV['USE_OPENROUTER'] == 'true'
        end
        
        # If using OpenRouter and no API key provided, use OpenRouter key from env
        if use_openrouter && api_key.blank?
          api_key = ENV['OPENROUTER_API_KEY']
        end

        service = TranscriptAnalysisService.new(
          api_key: api_key,
          use_openrouter: use_openrouter
        )

        result = service.analyze(@transcript)

        @analysis = TranscriptAnalysis.create!(
          transcript: @transcript,
          sentiment_analysis: result[:sentiment_analysis],
          concept_extraction: result[:concept_extraction],
          speaker_identification: result[:speaker_identification],
          engagement_score: result[:engagement_score],
          engagement_metrics: result[:engagement_metrics],
          summary: result[:summary],
          model_used: result[:model_used],
          token_count: result[:token_count],
          analysis_cost: result[:cost]
        )

        render json: @analysis, status: :created
      rescue => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      def generate_random_fields
        # Accept api_key and use_openrouter from params, or fall back to environment variables
        api_key = params[:api_key].presence || ENV['OPENAI_API_KEY']
        use_openrouter = if params[:use_openrouter].present?
          params[:use_openrouter] == 'true' || params[:use_openrouter] == true
        else
          ENV['USE_OPENROUTER'] == 'true'
        end
        
        # If using OpenRouter and no API key provided, use OpenRouter key from env
        if use_openrouter && api_key.blank?
          api_key = ENV['OPENROUTER_API_KEY']
        end

        service = FieldGenerationService.new(
          api_key: api_key,
          use_openrouter: use_openrouter
        )

        result = service.generate_fields(
          subject: params[:subject] || 'General',
          topic: params[:topic] || 'General Topic',
          student_level: params[:student_level] || 'intermediate'
        )

        render json: result, status: :ok
      rescue => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      private

      def set_transcript
        @transcript = Transcript.find(params[:id])
      end

      def transcript_params
        params.require(:transcript).permit(
          :subject,
          :topic,
          :student_level,
          :session_duration_minutes,
          :learning_objectives,
          :student_personality,
          :use_gpt4o,
          :transcript_type,
          :meeting_title,
          :meeting_recording,
          :participants,
          :use_gemini,
          :transcript_format
        )
      end
    end
  end
end

