# Service to suggest short-term goals from session summaries
# Uses AI to analyze last 3 sessions and generate focused, actionable goals
# Calculates target dates based on session frequency and updates existing goals

class ShortTermGoalSuggestionService
  def initialize(student_id, subject = nil, api_key: nil, use_openrouter: false)
    @student_id = student_id
    @subject = subject
    @api_key = api_key || ENV['OPENAI_API_KEY']
    @use_openrouter = use_openrouter || ENV['USE_OPENROUTER'] == 'true'
    @ai_service = nil
    
    # Initialize AI service if API key is available
    if @api_key.present?
      begin
        @ai_service = AiCompanionService.new(
          api_key: @api_key,
          use_openrouter: @use_openrouter
        )
      rescue => e
        Rails.logger.warn "Failed to initialize AI service for short-term goals: #{e.message}"
        @ai_service = nil
      end
    end
  end

  # Get suggestions for a specific subject
  def suggestions_for_subject(subject)
    @subject = subject
    generate_suggestions
  end

  # Get all suggestions across all subjects
  def all_suggestions
    generate_suggestions
  end

  # Generate and create/update goals for a subject
  def generate_and_save_goals(subject = nil)
    @subject = subject if subject.present?
    result = generate_suggestions
    
    return { created: [], updated: [] } unless result.is_a?(Hash)
    
    created_goals = []
    updated_goals = []
    
    # Create new goals
    result[:to_create].each do |suggestion|
      # Skip if no parent_goal_id (no long-term goals exist for this subject)
      # This prevents validation errors since short-term goals require a parent
      if suggestion[:parent_goal_id].nil?
        Rails.logger.warn "Skipping short-term goal '#{suggestion[:title]}' - no long-term goal found for subject #{suggestion[:subject] || @subject}"
        next
      end
      
      goal = Goal.create!(
        student_id: @student_id,
        subject: suggestion[:subject] || @subject,
        goal_type: 'short_term',
        parent_goal_id: suggestion[:parent_goal_id],
        title: suggestion[:title],
        description: suggestion[:description],
        status: 'active',
        progress_percentage: 0,
        target_date: suggestion[:target_date] || Date.current + 2.weeks,
        metadata: {
          'source' => suggestion[:source] || 'rule_based',
          'generation_date' => Date.current.iso8601,
          'source_summary_ids' => [suggestion[:source_summary_id]].compact,
          'priority' => suggestion[:priority],
          'confidence' => suggestion[:confidence],
          'related_concepts' => suggestion[:related_concepts] || []
        }
      )
      created_goals << goal
    end
    
    # Update existing goals
    result[:to_update].each do |suggestion|
      existing_goal = Goal.find(suggestion[:existing_goal_id])
      existing_goal.update!(
        description: suggestion[:description] || existing_goal.description,
        target_date: suggestion[:target_date] || existing_goal.target_date,
        metadata: (existing_goal.metadata || {}).merge(
          'last_updated_by' => suggestion[:source] || 'rule_based',
          'last_updated' => Date.current.iso8601,
          'source_summary_ids' => ((existing_goal.metadata || {})['source_summary_ids'] || []) | [suggestion[:source_summary_id]].compact,
          'priority' => suggestion[:priority] || (existing_goal.metadata || {})['priority'],
          'confidence' => suggestion[:confidence] || (existing_goal.metadata || {})['confidence']
        )
      )
      updated_goals << existing_goal
    end
    
    { created: created_goals, updated: updated_goals }
  end

  private

  def generate_suggestions
    # Get recent session summaries (last 3 sessions)
    summaries = get_recent_summaries
    
    # Return empty hash if no summaries
    return { to_update: [], to_create: [] } if summaries.empty?

    # Calculate target date based on session frequency
    target_date = calculate_target_date

    # Try AI generation first, fallback to rule-based
    suggestions = if @ai_service && summaries.any?
      begin
        generate_ai_goals(summaries, target_date)
      rescue => e
        Rails.logger.error "AI goal generation failed, falling back to rule-based: #{e.message}"
        generate_rule_based_suggestions(summaries, target_date)
      end
    else
      generate_rule_based_suggestions(summaries, target_date)
    end

    # Match and update existing goals
    result = match_and_update_existing_goals(suggestions)
    
    # Add target_date to all suggestions
    result[:to_create].each { |s| s[:target_date] = target_date }
    result[:to_update].each { |s| s[:target_date] = target_date }

    # Match suggestions to existing long-term goals
    match_to_long_term_goals(result[:to_create])
    match_to_long_term_goals(result[:to_update])

    # Sort by priority/confidence and limit to 2-3 goals
    result[:to_create] = result[:to_create]
      .sort_by { |s| -(s[:priority] || s[:confidence] || 0.5) }
      .first(3)
    result[:to_update] = result[:to_update]
      .sort_by { |s| -(s[:priority] || s[:confidence] || 0.5) }
      .first(3)

    result
  end

  def generate_rule_based_suggestions(summaries, target_date)
    suggestions = []

    summaries.each do |summary|
      # Extract potential goals from areas_for_improvement
      if summary.areas_for_improvement.present?
        summary.areas_for_improvement.each do |area|
          suggestion = build_suggestion_from_area(area, summary)
          if suggestion
            suggestion[:target_date] = target_date
            suggestions << suggestion
          end
        end
      end

      # Extract from learning_points
      if summary.learning_points.present?
        suggestions_from_learning = extract_from_learning_points(summary.learning_points, summary)
        suggestions_from_learning.each { |s| s[:target_date] = target_date }
        suggestions.concat(suggestions_from_learning)
      end

      # Extract from key_concepts that need work
      if summary.key_concepts.present? && summary.understanding_level.present? && summary.understanding_level < 70
        summary.key_concepts.each do |concept|
          suggestion = build_suggestion_from_concept(concept, summary)
          if suggestion
            suggestion[:target_date] = target_date
            suggestions << suggestion
          end
        end
      end
    end

    # Remove duplicates and score by confidence
    deduplicate_and_score(suggestions)
  end

  def get_recent_summaries
    scope = SessionSummary
      .joins('LEFT JOIN transcripts ON session_summaries.transcript_id = transcripts.id')
      .where(student_id: @student_id)
      .where(processing_status: 'completed')
      .order('transcripts.session_date DESC NULLS LAST, session_summaries.created_at DESC')
      .limit(3) # Changed from 10 to 3 - focus on last 3 sessions

    if @subject.present?
      scope = scope.where('transcripts.subject = ?', @subject)
    end

    scope.includes(:transcript)
  end

  def build_suggestion_from_area(area, summary)
    return nil if area.blank?

    # Check if this is already a goal
    return nil if goal_exists?(area, summary.transcript&.subject)

    {
      title: format_as_goal_title(area),
      description: "Work on: #{area}",
      subject: summary.transcript&.subject || @subject,
      confidence: calculate_confidence(area, summary),
      source: 'areas_for_improvement',
      source_summary_id: summary.id
    }
  end

  def extract_from_learning_points(learning_points, summary)
    suggestions = []
    
    # Split learning points into sentences and look for actionable items
    sentences = learning_points.split(/[.!?]+/).map(&:strip).reject(&:blank?)
    
    sentences.each do |sentence|
      # Look for patterns like "needs to", "should", "work on", "practice"
      if sentence.match?(/needs? to|should|work on|practice|improve|master|understand|learn/i)
        goal_text = extract_goal_text(sentence)
        next if goal_text.blank? || goal_exists?(goal_text, summary.transcript&.subject)

        suggestions << {
          title: format_as_goal_title(goal_text),
          description: sentence.strip,
          subject: summary.transcript&.subject || @subject,
          confidence: calculate_confidence(goal_text, summary),
          source: 'learning_points',
          source_summary_id: summary.id
        }
      end
    end

    suggestions
  end

  def build_suggestion_from_concept(concept, summary)
    return nil if concept.blank? || goal_exists?("Understand #{concept}", summary.transcript&.subject)

    {
      title: "Understand #{concept}",
      description: "Build understanding of #{concept} concept",
      subject: summary.transcript&.subject || @subject,
      confidence: calculate_confidence(concept, summary),
      source: 'key_concepts',
      source_summary_id: summary.id
    }
  end

  def format_as_goal_title(text)
    # Capitalize first letter and ensure it's a complete sentence/phrase
    text = text.strip
    text = text[0].upcase + text[1..-1] if text.length > 0
    text
  end

  def extract_goal_text(sentence)
    # Extract the actionable part of the sentence
    # Remove common prefixes like "The student needs to", "Student should", etc.
    cleaned = sentence.gsub(/^(the\s+)?(student\s+)?(needs?\s+to|should|must|will|can)\s+/i, '')
    cleaned.strip
  end

  def calculate_confidence(text, summary)
    confidence = 0.5 # Base confidence

    # Increase confidence if understanding level is low (more need for improvement)
    if summary.understanding_level.present? && summary.understanding_level < 60
      confidence += 0.2
    end

    # Increase confidence if mentioned in areas_for_improvement
    if summary.areas_for_improvement.present? && summary.areas_for_improvement.any? { |a| a.downcase.include?(text.downcase) }
      confidence += 0.2
    end

    # Increase confidence if recent (within last 2 weeks)
    if summary.transcript&.session_date.present?
      days_ago = (Date.current - summary.transcript.session_date).to_i
      confidence += 0.1 if days_ago <= 14
    end

    [1.0, confidence].min # Cap at 1.0
  end

  def goal_exists?(title, subject)
    return false if title.blank? || subject.blank?

    Goal.where(student_id: @student_id, subject: subject)
        .where('LOWER(title) LIKE ?', "%#{title.downcase}%")
        .exists?
  end

  def match_to_long_term_goals(suggestions)
    # For each suggestion, try to find a matching long-term goal
    long_term_goals = Goal
      .where(student_id: @student_id, goal_type: 'long_term', status: 'active')
      .where(@subject.present? ? { subject: @subject } : {})

    suggestions.each do |suggestion|
      # First, try to find best matching long-term goal by subject and keyword overlap
      matching_goal = long_term_goals.find do |goal|
        goal.subject == suggestion[:subject] && 
        keywords_overlap?(suggestion[:title], goal.title.to_s + ' ' + goal.description.to_s)
      end

      # If no keyword match found, fall back to any long-term goal for the same subject
      if matching_goal.nil?
        matching_goal = long_term_goals.find { |goal| goal.subject == suggestion[:subject] }
      end

      # Set parent_goal_id (will be nil if no long-term goals exist for this subject)
      suggestion[:parent_goal_id] = matching_goal&.id
      suggestion[:parent_goal_title] = matching_goal&.title
    end
  end

  def keywords_overlap?(text1, text2)
    return false if text1.blank? || text2.blank?

    words1 = text1.downcase.split(/\W+/).reject { |w| w.length < 4 }
    words2 = text2.downcase.split(/\W+/).reject { |w| w.length < 4 }

    # Check if any significant words overlap
    (words1 & words2).length > 0
  end

  def deduplicate_and_score(suggestions)
    # Group by normalized title
    grouped = suggestions.group_by { |s| normalize_title(s[:title]) }

    # For each group, keep the one with highest confidence
    grouped.values.map do |group|
      group.max_by { |s| s[:confidence] }
    end.sort_by { |s| -s[:confidence] } # Sort by confidence descending
  end

  def normalize_title(title)
    title.downcase.gsub(/[^\w\s]/, '').strip
  end

  # Calculate average days between sessions for the student/subject
  def calculate_session_frequency
    scope = Transcript
      .where(student_id: @student_id)
      .where.not(session_date: nil)
      .order(session_date: :desc)
      .limit(10)

    if @subject.present?
      scope = scope.where(subject: @subject)
    end

    sessions = scope.pluck(:session_date).compact.uniq.sort.reverse

    return 14 if sessions.length < 2 # Default to 14 days if insufficient data

    # Calculate gaps between consecutive sessions
    gaps = []
    (0...sessions.length - 1).each do |i|
      gap = (sessions[i] - sessions[i + 1]).to_i
      gaps << gap if gap > 0
    end

    return 14 if gaps.empty?

    # Return average gap, rounded to nearest day
    (gaps.sum.to_f / gaps.length).round
  end

  # Calculate target date based on session frequency
  def calculate_target_date
    average_days = calculate_session_frequency
    next_expected_session = Date.current + average_days.days
    target_date = next_expected_session - 1.day # 1 day before next session
    
    # Ensure minimum of 7 days from now
    [target_date, Date.current + 7.days].max
  end

  # Generate goals using AI analysis of last 3 sessions
  def generate_ai_goals(summaries, target_date)
    return [] unless @ai_service

    student = Student.find(@student_id)
    
    # Build session data for prompt
    session_data = summaries.map.with_index do |summary, idx|
      transcript = summary.transcript
      {
        session_number: idx + 1,
        date: transcript&.session_date || summary.created_at.to_date,
        topic: transcript&.topic || 'General',
        understanding_level: summary.understanding_level,
        areas_for_improvement: summary.areas_for_improvement || [],
        learning_points: summary.learning_points || '',
        key_concepts: summary.key_concepts || []
      }
    end

    # Get long-term goals
    long_term_goals = Goal
      .where(student_id: @student_id, goal_type: 'long_term', status: 'active')
      .where(@subject.present? ? { subject: @subject } : {})
      .map { |g| { title: g.title, description: g.description } }

    # Get existing short-term goals
    existing_short_term = Goal
      .where(student_id: @student_id, goal_type: 'short_term', status: 'active')
      .where(@subject.present? ? { subject: @subject } : {})
      .pluck(:title)

    prompt = build_ai_goals_prompt(session_data, long_term_goals, existing_short_term, target_date)

    # Generate via AI service
    response = @ai_service.generate_response(prompt, response_format: 'json_object')

    # Parse JSON response
    begin
      parsed = JSON.parse(response)
      goals_data = parsed['goals'] || []
      
      goals_data.map do |goal_data|
        {
          title: goal_data['title'] || goal_data[:title],
          description: goal_data['description'] || goal_data[:description] || goal_data['title'] || goal_data[:title],
          priority: (goal_data['priority'] || goal_data[:priority] || 0.5).to_f,
          confidence: (goal_data['confidence'] || goal_data[:priority] || 0.7).to_f,
          related_concepts: goal_data['related_concepts'] || goal_data[:related_concepts] || [],
          subject: @subject || session_data.first[:topic]&.split(' ')&.first || 'General',
          source: 'ai_generation',
          target_date: target_date
        }
      end
    rescue JSON::ParserError => e
      Rails.logger.error "Failed to parse AI goals response: #{e.message}"
      []
    end
  end

  def build_ai_goals_prompt(session_data, long_term_goals, existing_short_term, target_date)
    sessions_text = session_data.map do |session|
      <<~SESSION
        Session #{session[:session_number]} (#{session[:date]}):
        - Topic: #{session[:topic]}
        - Understanding Level: #{session[:understanding_level] || 'N/A'}%
        - Areas for Improvement: #{session[:areas_for_improvement].join(', ') || 'None'}
        - Key Concepts: #{session[:key_concepts].join(', ') || 'None'}
        - Learning Points: #{session[:learning_points][0..200] || 'None'}
      SESSION
    end.join("\n\n")

    long_term_text = long_term_goals.any? ? 
      long_term_goals.map { |g| "- #{g[:title]}: #{g[:description]}" }.join("\n") : 
      "None"

    existing_text = existing_short_term.any? ? 
      existing_short_term.join(", ") : 
      "None"

    <<~PROMPT
      Analyze the last 3 tutoring sessions for student ID #{@student_id} in subject: #{@subject || 'various subjects'}.

      Session Summaries:
      #{sessions_text}

      Current Long-Term Goals:
      #{long_term_text}

      Existing Short-Term Goals (avoid duplicates):
      #{existing_text}

      Generate 2-3 focused, actionable short-term goals that:
      1. Address the most critical improvement areas from these sessions
      2. Can be achieved before the next expected session (target date: #{target_date})
      3. Build toward the long-term goals
      4. Are specific, measurable, and achievable
      5. Focus on concepts the student needs to practice before their next tutoring session

      Return JSON format:
      {
        "goals": [
          {
            "title": "Specific goal title",
            "description": "Detailed description of what to achieve",
            "priority": 0.0-1.0,
            "confidence": 0.0-1.0,
            "related_concepts": ["concept1", "concept2"]
          }
        ]
      }
    PROMPT
  end

  # Match AI-generated goals to existing goals and determine what to update vs create
  def match_and_update_existing_goals(suggestions)
    to_update = []
    to_create = []

    existing_goals = Goal
      .where(student_id: @student_id, goal_type: 'short_term', status: 'active')
      .where(@subject.present? ? { subject: @subject } : {})

    suggestions.each do |suggestion|
      # Find similar existing goal
      matched_goal = existing_goals.find do |existing|
        similarity = similarity_score(suggestion[:title], existing.title)
        similarity >= 0.7 && is_goal_relevant?(existing)
      end

      if matched_goal
        # Update existing goal
        suggestion[:existing_goal_id] = matched_goal.id
        suggestion[:action] = 'update'
        to_update << suggestion
      else
        # Create new goal
        suggestion[:action] = 'create'
        to_create << suggestion
      end
    end

    { to_update: to_update, to_create: to_create }
  end

  # Calculate similarity score between two goal titles (0.0-1.0)
  def similarity_score(title1, title2)
    return 0.0 if title1.blank? || title2.blank?

    # Normalize titles
    norm1 = normalize_title(title1)
    norm2 = normalize_title(title2)

    return 1.0 if norm1 == norm2

    # Word overlap method
    words1 = norm1.split(/\s+/).reject { |w| w.length < 3 }
    words2 = norm2.split(/\s+/).reject { |w| w.length < 3 }

    return 0.0 if words1.empty? || words2.empty?

    common_words = words1 & words2
    total_unique_words = (words1 | words2).length

    (common_words.length.to_f / total_unique_words)
  end

  # Check if existing goal is still relevant
  def is_goal_relevant?(goal)
    return false unless goal.status == 'active'
    return false if goal.completed?
    return false if goal.target_date && goal.target_date < Date.current

    # Check if created recently (within last 30 days) or adjust based on session frequency
    days_since_creation = (Date.current - goal.created_at.to_date).to_i
    max_age = [calculate_session_frequency * 2, 30].max

    days_since_creation <= max_age
  end
end

