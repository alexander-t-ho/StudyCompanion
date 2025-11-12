# Service for Retrieval Augmented Generation (RAG)
# Retrieves relevant context from session summaries and conversation history

require 'set'

class RagService
  def initialize(api_key: nil, use_openrouter: false)
    # Only use OpenRouter if explicitly set to true
    @use_openrouter = use_openrouter == true
    @embedding_service = EmbeddingService.new(api_key: api_key, use_openrouter: @use_openrouter)
    @api_key = api_key || ENV['OPENAI_API_KEY']
  end

  # Retrieve relevant context for a query
  # Returns array of context objects with content and metadata
  def retrieve_context(student_id:, query:, top_k: 5, similarity_threshold: 0.7, subject: nil)
    # Generate embedding for query
    query_embedding = @embedding_service.generate(query)
    
    # Search session summaries (filtered by subject if provided)
    session_contexts = search_session_summaries(
      student_id: student_id,
      query: query,
      query_embedding: query_embedding,
      top_k: top_k,
      similarity_threshold: similarity_threshold,
      subject: subject
    )
    
    # Search conversation history (filtered by subject if provided)
    conversation_contexts = search_conversation_history(
      student_id: student_id,
      query: query,
      query_embedding: query_embedding,
      top_k: 3,
      similarity_threshold: similarity_threshold,
      subject: subject
    )
    
    # Combine and rank all contexts
    all_contexts = (session_contexts + conversation_contexts)
      .sort_by { |c| -c[:similarity] }
      .first(top_k)
    
    all_contexts
  end

  # Format retrieved context for injection into prompts
  def format_context_for_prompt(contexts)
    return "" if contexts.empty?
    
    formatted = contexts.map.with_index(1) do |ctx, idx|
      case ctx[:type]
      when :session_summary
        format_session_summary_context(ctx, idx)
      when :conversation
        format_conversation_context(ctx, idx)
      else
        ""
      end
    end.compact.join("\n\n")
    
    formatted
  end

  private

  def search_session_summaries(student_id:, query:, query_embedding:, top_k:, similarity_threshold:, subject: nil)
    summaries = SessionSummary
      .where(student_id: student_id)
      .where(processing_status: 'completed')
      .includes(:session, :transcript)
      .order(created_at: :desc)
    
    # Filter by subject if provided (via transcript)
    if subject.present?
      summaries = summaries.joins(:transcript)
                           .where(transcripts: { subject: subject })
    end
    
    summaries = summaries.limit(50) # Limit initial set for performance
    
    results = []
    
    summaries.each do |summary|
      # Check if embeddings column exists and has data
      if summary.respond_to?(:embeddings) && summary.embeddings.present?
        similarity = cosine_similarity(query_embedding, summary.embeddings)
        
        if similarity >= similarity_threshold
          results << {
            type: :session_summary,
            content: build_summary_text(summary),
            similarity: similarity,
            metadata: {
              session_id: summary.session_id,
              subject: summary.session&.subject,
              topic: summary.session&.topic,
              created_at: summary.created_at,
              topics: summary.extracted_topics,
              concepts: summary.key_concepts,
              understanding_level: summary.understanding_level,
              previous_understanding_level: summary.previous_understanding_level
            }
          }
        end
      else
        # Fallback: text-based similarity if embeddings not available
        summary_text = build_summary_text(summary)
        similarity = text_similarity(query, summary_text)
        
        if similarity >= similarity_threshold
          results << {
            type: :session_summary,
            content: summary_text,
            similarity: similarity,
            metadata: {
              session_id: summary.session_id,
              subject: summary.session&.subject,
              topic: summary.session&.topic,
              created_at: summary.created_at,
              topics: summary.extracted_topics,
              concepts: summary.key_concepts,
              understanding_level: summary.understanding_level,
              previous_understanding_level: summary.previous_understanding_level
            }
          }
        end
      end
    end
    
    results.sort_by { |r| -r[:similarity] }.first(top_k)
  end

  def search_conversation_history(student_id:, query:, query_embedding:, top_k:, similarity_threshold:, subject: nil)
    # Get recent conversation messages
    messages = ConversationMessage
      .where(student_id: student_id)
      .order(created_at: :desc)
    
    # Filter by subject if provided (from context JSONB)
    if subject.present?
      messages = messages.where("context->>'subject' = ?", subject)
    end
    
    messages = messages.limit(100)
                      .reverse # Get chronological order
    
    # Group into conversation chunks (user + assistant pairs)
    chunks = []
    current_chunk = []
    
    messages.each do |message|
      if message.role == 'user'
        if current_chunk.any?
          chunks << current_chunk
        end
        current_chunk = [message]
      elsif message.role == 'assistant' && current_chunk.any?
        current_chunk << message
      end
    end
    chunks << current_chunk if current_chunk.any?
    
    # Search chunks
    results = []
    chunks.last(20).each do |chunk| # Only search last 20 chunks
      chunk_text = chunk.map(&:content).join("\n")
      
      # Simple text similarity for conversation history
      similarity = text_similarity(query, chunk_text)
      
      if similarity >= similarity_threshold
        results << {
          type: :conversation,
          content: chunk_text,
          similarity: similarity,
          metadata: {
            message_ids: chunk.map(&:id),
            created_at: chunk.last&.created_at
          }
        }
      end
    end
    
    results.sort_by { |r| -r[:similarity] }.first(top_k)
  end

  def build_summary_text(summary)
    parts = []
    
    parts << "Subject: #{summary.session&.subject}" if summary.session&.subject
    parts << "Topic: #{summary.session&.topic}" if summary.session&.topic
    
    # Include understanding level for better context
    if summary.understanding_level.present?
      parts << "Student Understanding Level: #{summary.understanding_level.round(1)}%"
      if summary.previous_understanding_level.present? && summary.previous_understanding_level > 0
        progress = summary.understanding_level - summary.previous_understanding_level
        parts << "Understanding Progress: #{progress > 0 ? '+' : ''}#{progress.round(1)}%"
      end
    end
    
    if summary.extracted_topics.any?
      parts << "Topics Covered: #{summary.extracted_topics.join(', ')}"
    end
    
    if summary.key_concepts.any?
      parts << "Key Concepts: #{summary.key_concepts.join(', ')}"
    end
    
    # Include actual transcript content for better context
    if summary.transcript&.transcript_content.present?
      # Include a substantial excerpt from the transcript (first 2000 chars)
      transcript_excerpt = summary.transcript.transcript_content[0..2000]
      parts << "Transcript Excerpt:\n#{transcript_excerpt}"
    end
    
    # Include learning points (which may contain transcript summary)
    if summary.learning_points.present?
      parts << "Learning Points: #{summary.learning_points}"
    end
    
    if summary.strengths_identified.any?
      parts << "Student Strengths: #{summary.strengths_identified.join(', ')}"
    end
    
    if summary.areas_for_improvement.any?
      parts << "Areas for Improvement: #{summary.areas_for_improvement.join(', ')}"
    end
    
    parts.join("\n\n")
  end

  def format_session_summary_context(ctx, idx)
    metadata = ctx[:metadata]
    understanding_info = if metadata[:understanding_level]
      "Understanding Level: #{metadata[:understanding_level].round(1)}%"
    else
      ""
    end
    
    <<~CONTEXT
      [Tutoring Session #{idx} - #{metadata[:created_at]&.strftime('%Y-%m-%d') || 'N/A'}]
      Subject: #{metadata[:subject] || 'N/A'}
      Topic: #{metadata[:topic] || 'N/A'}
      #{understanding_info}
      
      Session Content (from transcript):
      #{ctx[:content]}
    CONTEXT
  end

  def format_conversation_context(ctx, idx)
    <<~CONTEXT
      [Previous Conversation #{idx}]
      #{ctx[:content]}
    CONTEXT
  end

  # Calculate cosine similarity between two vectors
  def cosine_similarity(vec1, vec2)
    return 0.0 if vec1.nil? || vec2.nil? || vec1.empty? || vec2.empty?
    return 0.0 if vec1.length != vec2.length
    
    dot_product = vec1.zip(vec2).sum { |a, b| a * b }
    magnitude1 = Math.sqrt(vec1.sum { |a| a * a })
    magnitude2 = Math.sqrt(vec2.sum { |a| a * a })
    
    return 0.0 if magnitude1.zero? || magnitude2.zero?
    
    dot_product / (magnitude1 * magnitude2)
  end

  # Simple text-based similarity (fallback when embeddings not available)
  # Uses word overlap and Jaccard similarity
  def text_similarity(query, text)
    query_words = normalize_text(query).split(/\s+/).to_set
    text_words = normalize_text(text).split(/\s+/).to_set
    
    return 0.0 if query_words.empty? || text_words.empty?
    
    intersection = (query_words & text_words).size
    union = (query_words | text_words).size
    
    return 0.0 if union.zero?
    
    # Jaccard similarity
    jaccard = intersection.to_f / union
    
    # Boost if query words appear multiple times
    matches = text_words.count { |w| query_words.include?(w) }
    boost = [matches.to_f / query_words.size, 1.0].min
    
    (jaccard * 0.7 + boost * 0.3).clamp(0.0, 1.0)
  end

  def normalize_text(text)
    text.downcase
        .gsub(/[^\w\s]/, ' ')
        .gsub(/\s+/, ' ')
        .strip
  end
end

