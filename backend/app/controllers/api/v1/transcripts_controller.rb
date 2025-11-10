module Api
  module V1
    class TranscriptsController < ApplicationController
      before_action :set_transcript, only: [:show, :validate, :analyze]

      def index
        @transcripts = Transcript.order(created_at: :desc).includes(:transcript_analysis)
        
        # Filter by student_id if provided
        if params[:student_id].present?
          @transcripts = @transcripts.where(student_id: params[:student_id])
        end
        
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
        # Note: Understanding level will be calculated and added before transcript generation

        # For meeting transcripts, use meeting_title as subject if subject is not provided
        subject_value = generation_params[:subject] || generation_params[:meeting_title] || 'Meeting'
        topic_value = generation_params[:topic] || generation_params[:meeting_title] || 'General Discussion'
        
        # Get student_id from params or use session's student_id if session_id is provided
        student_id = generation_params[:student_id]
        if student_id.blank? && generation_params[:session_id].present?
          session = Session.find_by(id: generation_params[:session_id])
          student_id = session&.student_id
        end
        
        # Require student_id for transcript creation
        if student_id.blank?
          return render json: { error: 'student_id is required' }, status: :unprocessable_entity
        end
        
        # Generate random date from last 3 months
        session_date = if generation_params[:session_date].present?
          # Convert string to Date if needed
          generation_params[:session_date].is_a?(String) ? Date.parse(generation_params[:session_date]) : generation_params[:session_date]
        else
          generate_random_date
        end
        
        # Generate session count for current week (1-5 generally, max 10 but rare)
        session_count_this_week = generation_params[:session_count_this_week] || generate_session_count
        
        # Calculate understanding level and build snapshots (before generating transcript so we can use it in prompt)
        understanding_service = UnderstandingLevelService.new(
          student_id: student_id,
          subject: subject_value,
          session_date: session_date
        )
        
        understanding_data = understanding_service.calculate_and_build_snapshots
        
        # Adjust understanding level for first session based on student level
        student_level = generation_params[:student_level] || 'intermediate'
        if understanding_data[:previous_understanding_level] == 0.0
          understanding_data[:understanding_level] = understanding_service.adjust_for_student_level(
            understanding_data[:understanding_level], 
            student_level
          )
        end
        
        # Add understanding level to generation params for transcript generation
        generation_params[:understanding_level] = understanding_data[:understanding_level]
        generation_params[:previous_understanding_level] = understanding_data[:previous_understanding_level]
        generation_params[:goals_snapshot] = understanding_data[:goals_snapshot]
        generation_params[:session_history_summary] = understanding_data[:session_history_summary]
        
        # Regenerate transcript with understanding level in context
        result = service.generate(generation_params)
        
        @transcript = Transcript.create!(
          student_id: student_id,
          session_id: generation_params[:session_id],
          subject: subject_value,
          topic: topic_value,
          student_level: student_level || (generation_params[:transcript_type] == 'meeting' ? nil : 'intermediate'),
          session_duration_minutes: generation_params[:session_duration_minutes],
          learning_objectives: generation_params[:learning_objectives],
          student_personality: generation_params[:student_personality],
          transcript_content: result[:transcript_content],
          generation_parameters: generation_params,
          model_used: result[:model_used],
          token_count: result[:token_count],
          generation_cost: result[:cost],
          session_date: session_date,
          session_count_this_week: session_count_this_week,
          understanding_level: understanding_data[:understanding_level],
          previous_understanding_level: understanding_data[:previous_understanding_level],
          goals_snapshot: understanding_data[:goals_snapshot],
          session_history_summary: understanding_data[:session_history_summary]
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

      def generate_random_topic
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

        unless params[:subject].present?
          return render json: { error: 'subject is required' }, status: :unprocessable_entity
        end

        service = FieldGenerationService.new(
          api_key: api_key,
          use_openrouter: use_openrouter
        )

        result = service.generate_topic(
          subject: params[:subject],
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
          :student_id,
          :session_id,
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
          :transcript_format,
          :session_date,
          :session_count_this_week,
          :understanding_level,
          :previous_understanding_level,
          :goals_snapshot,
          :session_history_summary
        )
      end

      # Generate random date from last 3 months
      def generate_random_date
        # Random date between 3 months ago and today
        end_date = Date.today
        start_date = 3.months.ago.to_date
        days_diff = (end_date - start_date).to_i
        start_date + rand(days_diff).days
      end

      # Generate session count for current week
      # Range: 1-5 generally, max 10 but rare (5% chance)
      def generate_session_count
        # 5% chance of 6-10, 95% chance of 1-5
        if rand < 0.05
          # Rare: 6-10
          rand(6..10)
        else
          # Common: 1-5
          rand(1..5)
        end
      end
    end
  end
end

