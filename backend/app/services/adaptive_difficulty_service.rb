# Service to determine appropriate difficulty level based on understanding level
# Maps understanding level ranges to practice problem difficulty

class AdaptiveDifficultyService
  # Map understanding level to difficulty (1-5 scale)
  # 1 = Beginner, 2 = Easy, 3 = Intermediate, 4 = Advanced, 5 = Expert
  def self.difficulty_from_understanding(understanding_level, subject: nil)
    return 1 if understanding_level.nil? || understanding_level <= 0
    
    case understanding_level
    when 0..30
      1 # Beginner
    when 31..50
      2 # Easy
    when 51..70
      3 # Intermediate
    when 71..85
      4 # Advanced
    else
      5 # Expert (86-100)
    end
  end

  # Get difficulty for a student in a specific subject
  def self.difficulty_for_student_subject(student_id, subject)
    # Get current understanding level for the subject
    latest_transcript = Transcript
      .where(student_id: student_id, subject: subject)
      .where.not(understanding_level: nil)
      .order(session_date: :desc, created_at: :desc)
      .first
    
    understanding_level = latest_transcript&.understanding_level || 0
    
    difficulty_from_understanding(understanding_level, subject: subject)
  end

  # Adjust difficulty based on recent trends
  # If understanding is improving, slightly increase difficulty
  # If understanding is declining, slightly decrease difficulty
  def self.adjusted_difficulty(base_difficulty, student_id, subject, trend_window: 3)
    recent_transcripts = Transcript
      .where(student_id: student_id, subject: subject)
      .where.not(understanding_level: nil)
      .order(session_date: :desc, created_at: :desc)
      .limit(trend_window)
    
    return base_difficulty if recent_transcripts.count < 2
    
    # Calculate trend
    levels = recent_transcripts.pluck(:understanding_level).reverse
    trend = levels.last - levels.first
    
    # Adjust difficulty based on trend
    if trend > 5 # Improving significantly
      [base_difficulty + 1, 5].min
    elsif trend < -5 # Declining significantly
      [base_difficulty - 1, 1].max
    else
      base_difficulty
    end
  end

  # Get recommended difficulty for a practice problem
  def self.recommended_difficulty(student_id, subject, topic: nil, use_trends: true)
    base_difficulty = difficulty_for_student_subject(student_id, subject)
    
    if use_trends
      adjusted_difficulty(base_difficulty, student_id, subject)
    else
      base_difficulty
    end
  end

  # Select adaptive problem based on mastery scores (understanding levels)
  # Implements the adaptive selection algorithm from the specification
  def self.select_adaptive_problem(student, subject, topic: nil)
    # Get mastery data (understanding levels) for the subject/topic (0-100 percentage)
    mastery = get_mastery_for_topic(student, subject, topic)
    
    # Identify weakest sub-topic
    weakest_sub_topic = identify_weakest_sub_topic(student, subject)
    
    # Determine target difficulty based on mastery (mastery is 0-100 percentage)
    # < 50% = Level 1, 50-75% = Level 2, > 75% = Level 3
    problem_level = determine_target_difficulty(mastery)
    
    {
      target_difficulty: problem_level,
      weakest_sub_topic: weakest_sub_topic,
      mastery: mastery,
      subject: subject,
      topic: topic
    }
  end

  # Get mastery score for a specific topic/sub-topic (returns percentage 0-100)
  def self.get_mastery_for_topic(student, subject, topic = nil)
    if topic
      # Get understanding level for specific topic
      transcript = Transcript
        .where(student_id: student.id, subject: subject, topic: topic)
        .where.not(understanding_level: nil)
        .order(session_date: :desc, created_at: :desc)
        .first
      
      transcript&.understanding_level || 0
    else
      # Get understanding level for subject (convert from difficulty to percentage)
      latest_transcript = Transcript
        .where(student_id: student.id, subject: subject)
        .where.not(understanding_level: nil)
        .order(session_date: :desc, created_at: :desc)
        .first
      
      latest_transcript&.understanding_level || 0
    end
  end

  # Identify weakest sub-topic from understanding levels
  def self.identify_weakest_sub_topic(student, subject)
    transcripts = Transcript
      .where(student_id: student.id, subject: subject)
      .where.not(understanding_level: nil)
      .where.not(topic: nil)
      .order(session_date: :desc, created_at: :desc)
    
    # Group by topic and get latest understanding level for each
    topic_levels = {}
    transcripts.each do |transcript|
      unless topic_levels[transcript.topic]
        topic_levels[transcript.topic] = transcript.understanding_level
      end
    end
    
    # Find topic with lowest understanding level
    if topic_levels.any?
      topic_levels.min_by { |_topic, level| level }&.first
    else
      nil
    end
  end

  # Determine target difficulty based on mastery score (0-100 percentage)
  # < 50% = Level 1, 50-75% = Level 2, > 75% = Level 3
  def self.determine_target_difficulty(mastery)
    # Mastery is a percentage (0-100), not a difficulty level
    case mastery.to_f
    when 0...50
      1 # Level 1 (Easy) - Reinforce fundamentals
    when 50..75
      2 # Level 2 (Medium) - Build confidence and breadth
    else
      3 # Level 3 (Hard) - Challenge and advance learning
    end
  end
end

