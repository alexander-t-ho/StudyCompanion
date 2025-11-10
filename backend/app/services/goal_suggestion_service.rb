class GoalSuggestionService
  def initialize(student, source_goal, api_key: nil, use_openrouter: false)
    @student = student
    @source_goal = source_goal
    @api_key = api_key
    @use_openrouter = use_openrouter
    @ai_service = nil
    
    # Initialize AI service if API key is available
    if @api_key.present? || ENV['OPENAI_API_KEY'].present?
      begin
        @ai_service = AiCompanionService.new(
          api_key: @api_key || ENV['OPENAI_API_KEY'],
          use_openrouter: @use_openrouter || ENV['USE_OPENROUTER'] == 'true'
        )
      rescue => e
        Rails.logger.warn "Failed to initialize AI service for goal suggestions: #{e.message}"
        @ai_service = nil
      end
    end
  end

  # Generate goal suggestions based on subject relationships
  # Returns array of GoalSuggestion records
  def generate_suggestions
    return [] unless @source_goal.completed?

    related_subjects = SubjectRelationship.related_subjects_with_details(@source_goal.subject)
    
    # Filter out subjects the student already has active goals for
    existing_subjects = @student.goals.active.pluck(:subject)
    available_subjects = related_subjects.reject { |rel| existing_subjects.include?(rel.target_subject) }

    # Score and rank suggestions based on understanding level trends
    scored_subjects = available_subjects.map do |relationship|
      score = calculate_suggestion_score(relationship)
      { relationship: relationship, score: score }
    end.sort_by { |s| -s[:score] }

    # Get top subjects for AI generation
    top_subjects = scored_subjects.first(5).map { |s| s[:relationship].target_subject }
    
    # Try AI generation first, fallback to rule-based
    if @ai_service && top_subjects.any?
      begin
        ai_suggestions = generate_ai_suggestions(top_subjects, scored_subjects)
        if ai_suggestions.any?
          return ai_suggestions
        end
      rescue => e
        Rails.logger.error "AI suggestion generation failed, falling back to rule-based: #{e.message}"
        # Fall through to rule-based generation
      end
    end

    # Rule-based fallback
    suggestions = scored_subjects.first(5).map do |scored|
      create_suggestion(scored[:relationship], scored[:score])
    end

    suggestions
  end

  # Create a single suggestion with rule-based reasoning
  def create_suggestion(relationship, score = nil)
    reasoning = generate_reasoning(relationship, score)
    goal_type = infer_goal_type(relationship.target_subject)
    
    # Adjust confidence based on understanding level trends
    base_confidence = relationship.strength
    adjusted_confidence = if score && score > 0.7
      # Boost confidence if student is doing well in related subjects
      [base_confidence + 0.1, 1.0].min
    elsif score && score < 0.3
      # Reduce confidence if student is struggling
      [base_confidence - 0.1, 0.0].max
    else
      base_confidence
    end

    GoalSuggestion.create!(
      student: @student,
      source_goal: @source_goal,
      suggested_subject: relationship.target_subject,
      suggested_goal_type: goal_type,
      reasoning: reasoning,
      confidence: adjusted_confidence
    )
  end

  private

  # Generate suggestions using AI
  def generate_ai_suggestions(subjects, scored_subjects)
    return [] unless @ai_service

    # Build subject list with scores for context
    related_subjects = scored_subjects.map { |s| s[:relationship].target_subject }
    
    # Call AI service
    ai_result = @ai_service.generate_suggestion(
      student: @student,
      context: "goal_completion",
      completed_goal: @source_goal,
      related_subjects: related_subjects
    )

    # Map AI suggestions to GoalSuggestion records
    suggestions = []
    ai_result[:suggestions]&.each do |ai_suggestion|
      subject = ai_suggestion['subject'] || ai_suggestion[:subject]
      next unless subject && related_subjects.include?(subject)
      
      # Find the relationship for this subject
      relationship = scored_subjects.find { |s| s[:relationship].target_subject == subject }&.dig(:relationship)
      next unless relationship

      # Create suggestion with AI-generated reasoning
      suggestion = GoalSuggestion.create!(
        student: @student,
        source_goal: @source_goal,
        suggested_subject: subject,
        suggested_goal_type: ai_suggestion['goal_type'] || ai_suggestion[:goal_type] || infer_goal_type(subject),
        reasoning: ai_suggestion['reasoning'] || ai_suggestion[:reasoning] || generate_reasoning(relationship),
        confidence: (ai_suggestion['confidence'] || ai_suggestion[:confidence] || relationship.strength).to_f
      )
      suggestions << suggestion
    end

    # If AI didn't return enough suggestions, fill with rule-based
    if suggestions.count < 3
      remaining = scored_subjects.first(5 - suggestions.count)
      remaining.each do |scored|
        next if suggestions.any? { |s| s.suggested_subject == scored[:relationship].target_subject }
        suggestions << create_suggestion(scored[:relationship], scored[:score])
      end
    end

    suggestions
  end

  def generate_reasoning(relationship, score = nil)
    base_reasoning = case relationship.relationship_type
    when 'next_level'
      "#{relationship.target_subject} builds directly on your #{@source_goal.subject} knowledge. This is the natural next step in your learning journey."
    when 'related'
      "#{relationship.target_subject} complements your #{@source_goal.subject} studies. The skills you've developed will transfer well."
    when 'prerequisite'
      "Your mastery of #{@source_goal.subject} prepares you well for #{relationship.target_subject}."
    when 'complementary'
      "#{relationship.target_subject} pairs well with #{@source_goal.subject}, helping you build a well-rounded understanding."
    else
      "Based on your success with #{@source_goal.subject}, #{relationship.target_subject} would be a great next goal to pursue."
    end

    # Add understanding level context if available
    if score && score > 0.7
      base_reasoning += " Your strong progress in related subjects suggests you'll excel here too."
    elsif score && score < 0.3
      base_reasoning += " This could be a good opportunity to build foundational skills."
    end

    base_reasoning
  end

  # Calculate suggestion score based on understanding level trends
  def calculate_suggestion_score(relationship)
    target_subject = relationship.target_subject
    
    # Get understanding level for the target subject if student has studied it
    transcripts = Transcript
      .where(student_id: @student.id, subject: target_subject)
      .where.not(understanding_level: nil)
      .order(session_date: :desc)
      .limit(3)
    
    return relationship.strength if transcripts.empty? # No data, use base strength
    
    # Calculate trend
    if transcripts.count >= 2
      recent_levels = transcripts.pluck(:understanding_level)
      trend = recent_levels.first - recent_levels.last
      
      # Score based on trend and current level
      current_level = recent_levels.first
      
      if trend > 5 && current_level > 60
        # Improving and already strong - high score
        0.9
      elsif trend > 5
        # Improving - good score
        0.7
      elsif current_level > 70
        # Strong current level - good score
        0.6
      elsif trend < -5
        # Declining - lower score
        0.3
      else
        # Stable - use base strength
        relationship.strength
      end
    else
      # Only one session - use current level
      current_level = transcripts.first.understanding_level
      if current_level > 70
        0.7
      elsif current_level > 50
        0.5
      else
        relationship.strength
      end
    end
  end

  def infer_goal_type(subject)
    # Simple rule-based goal type inference
    if subject.include?('Prep') || subject.include?('Test')
      'test_preparation'
    elsif subject.include?('Advanced') || subject.include?('AP')
      'advanced_study'
    elsif subject.match?(/Math|Calculus|Algebra|Geometry|Statistics/)
      'mathematics'
    elsif subject.match?(/Chemistry|Physics|Biology/)
      'science'
    elsif subject.match?(/English|ESL|Writing|Essays/)
      'language_arts'
    else
      'general'
    end
  end
end

