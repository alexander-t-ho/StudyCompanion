# Service to calculate long-term goal progress based on understanding level improvements
# from transcripts and session summaries

class LongTermGoalProgressService
  def initialize(goal_id)
    @goal = Goal.find(goal_id)
    @student_id = @goal.student_id
    @subject = @goal.subject
    raise ArgumentError, 'Goal must be a long-term goal' unless @goal.long_term?
  end

  # Calculate and update progress for the goal
  def calculate_and_update
    progress = calculate_progress
    @goal.update(progress_percentage: progress)
    progress
  end

  # Calculate progress without updating
  def calculate_progress
    # Get all transcripts for this subject
    transcripts = Transcript
      .where(student_id: @student_id, subject: @subject)
      .where.not(understanding_level: nil)
      .order(session_date: :asc, created_at: :asc)

    return 0 if transcripts.empty?

    # Match transcripts to goal by topic/keywords
    relevant_transcripts = filter_relevant_transcripts(transcripts)

    return 0 if relevant_transcripts.empty?

    # Get baseline understanding level (first relevant transcript or goal creation)
    baseline_understanding = get_baseline_understanding(relevant_transcripts)
    
    # Get current understanding level (most recent relevant transcript)
    current_understanding = relevant_transcripts.last.understanding_level.to_f

    # Target understanding level (default 90% for mastery, can be customized in metadata)
    target_understanding = @goal.metadata['target_understanding_level']&.to_f || 90.0

    # Calculate progress: (current - baseline) / (target - baseline) * 100
    progress = if target_understanding > baseline_understanding
      ((current_understanding - baseline_understanding) / (target_understanding - baseline_understanding) * 100).round
    else
      # If target is not higher than baseline, check if we've reached target
      current_understanding >= target_understanding ? 100 : 0
    end

    # Clamp between 0 and 100
    [0, [100, progress].min].max
  end

  private

  # Filter transcripts that are relevant to this goal
  # Match by topic keywords from goal title/description
  def filter_relevant_transcripts(transcripts)
    goal_keywords = extract_keywords(@goal.title.to_s + ' ' + @goal.description.to_s)
    
    transcripts.select do |transcript|
      transcript_keywords = extract_keywords(transcript.topic.to_s + ' ' + transcript.subject.to_s)
      
      # Check if any goal keywords match transcript keywords
      goal_keywords.any? { |keyword| transcript_keywords.any? { |t_kw| t_kw.include?(keyword) || keyword.include?(t_kw) } }
    end
  end

  # Extract keywords from text (simple approach - can be enhanced with NLP)
  def extract_keywords(text)
    return [] if text.blank?
    
    # Convert to lowercase and split into words
    words = text.downcase.split(/\W+/)
    
    # Remove common stop words
    stop_words = %w[the a an and or but in on at to for of with by from as is was are were been be have has had do does did will would could should may might must can this that these those]
    
    # Filter out stop words and short words, return unique keywords
    words.reject { |w| stop_words.include?(w) || w.length < 3 }.uniq
  end

  # Get baseline understanding level
  # Use the first relevant transcript, or 0 if goal was created before any transcripts
  def get_baseline_understanding(relevant_transcripts)
    first_transcript = relevant_transcripts.first
    
    # If goal was created after first transcript, use first transcript's understanding
    if first_transcript && (@goal.created_at.nil? || first_transcript.created_at < @goal.created_at)
      # Use previous_understanding_level if available, otherwise use understanding_level
      first_transcript.previous_understanding_level&.to_f || first_transcript.understanding_level.to_f
    else
      # Goal created before any relevant transcripts, use metadata baseline or 0
      @goal.metadata['baseline_understanding_level']&.to_f || 0.0
    end
  end
end


