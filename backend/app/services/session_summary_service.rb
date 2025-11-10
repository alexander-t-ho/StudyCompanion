# Service to create session summaries from transcripts and analyses

class SessionSummaryService
  def initialize(api_key: nil, use_openrouter: false)
    @api_key = api_key || ENV['OPENAI_API_KEY']
    @use_openrouter = use_openrouter || ENV['USE_OPENROUTER'] == 'true'
    @embedding_service = EmbeddingService.new(api_key: api_key, use_openrouter: use_openrouter)
  end

  def create_from_transcript(transcript, session_id: nil, student_id: nil)
    # Ensure we have session and student
    session_id ||= transcript.session_id
    student_id ||= transcript.student_id || transcript.session&.student_id

    raise 'Session ID or Student ID required' unless session_id || student_id
    raise 'Session ID required for session summary' unless session_id

    # Check if summary already exists
    existing = SessionSummary.find_by(session_id: session_id)
    return existing if existing&.completed?

    # Get or create session summary
    summary = existing || SessionSummary.create!(
      session_id: session_id,
      student_id: student_id,
      transcript: transcript,
      transcript_analysis: transcript.transcript_analysis,
      processing_status: 'processing'
    )

    begin
      # Extract data from transcript and analysis
      analysis = transcript.transcript_analysis

      extracted_topics = extract_topics(transcript, analysis)
      key_concepts = extract_concepts(analysis)
      learning_points = extract_learning_points(transcript, analysis)
      strengths = extract_strengths(analysis)
      improvements = extract_improvements(analysis)

      # Generate embedding from transcript content
      embedding_text = build_embedding_text(transcript, analysis)
      embeddings = @embedding_service.generate(embedding_text)

      # Get understanding level from transcript if available
      understanding_level = transcript.understanding_level
      previous_understanding_level = transcript.previous_understanding_level

      # Update summary
      summary.update!(
        extracted_topics: extracted_topics,
        key_concepts: key_concepts,
        learning_points: learning_points,
        strengths_identified: strengths,
        areas_for_improvement: improvements,
        embeddings: embeddings,
        understanding_level: understanding_level,
        previous_understanding_level: previous_understanding_level,
        processing_status: 'completed',
        processed_at: Time.current
      )

      summary
    rescue => e
      summary.mark_failed!(e.message)
      raise e
    end
  end

  private

  def extract_topics(transcript, analysis)
    topics = []
    
    # From transcript
    topics << transcript.topic if transcript.topic.present?
    topics << transcript.subject if transcript.subject.present?
    
    # From analysis
    if analysis&.concept_extraction_hash&.dig('topics_covered')
      topics.concat(analysis.concept_extraction_hash['topics_covered'])
    end
    
    topics.uniq.compact
  end

  def extract_concepts(analysis)
    return [] unless analysis

    concepts = analysis.concept_extraction_hash&.dig('concepts_discussed') || []
    concepts.map { |c| c['concept'] }.compact.uniq
  end

  def extract_learning_points(transcript, analysis)
    return transcript.transcript_content unless analysis

    analysis.summary || transcript.transcript_content
  end

  def extract_strengths(analysis)
    return [] unless analysis

    analysis.sentiment_analysis_hash&.dig('confidence_indicators') || []
  end

  def extract_improvements(analysis)
    return [] unless analysis

    concepts = analysis.concept_extraction_hash&.dig('concepts_discussed') || []
    concepts.select { |c| c['mastery_level'] == 'struggling' }
            .map { |c| c['concept'] }
            .compact
  end

  def build_embedding_text(transcript, analysis)
    parts = []
    
    parts << "Subject: #{transcript.subject}"
    parts << "Topic: #{transcript.topic}"
    
    # Include understanding level for better semantic search
    if transcript.understanding_level.present?
      parts << "Student Understanding Level: #{transcript.understanding_level.round(1)}%"
      if transcript.previous_understanding_level.present? && transcript.previous_understanding_level > 0
        progress = transcript.understanding_level - transcript.previous_understanding_level
        parts << "Understanding Progress: #{progress > 0 ? '+' : ''}#{progress.round(1)}%"
      end
    end
    
    parts << transcript.transcript_content
    
    if analysis
      parts << "Summary: #{analysis.summary}" if analysis.summary
      
      concepts = analysis.concept_extraction_hash&.dig('concepts_discussed') || []
      if concepts.any?
        concept_list = concepts.map { |c| c['concept'] }.join(', ')
        parts << "Concepts: #{concept_list}"
      end
    end
    
    parts.join("\n\n")
  end
end

