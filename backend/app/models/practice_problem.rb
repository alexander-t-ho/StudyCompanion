class PracticeProblem < ApplicationRecord
  belongs_to :student
  belongs_to :goal, optional: true

  validates :difficulty_level, inclusion: { in: 1..10 }, allow_nil: true
  validates :problem_content, presence: true

  scope :for_student, ->(student_id) { where(student_id: student_id) }
  scope :assigned, -> { where(completed_at: nil) }
  scope :completed, -> { where.not(completed_at: nil) }
  scope :by_difficulty, ->(level) { where(difficulty_level: level) }

  def completed?
    completed_at.present?
  end

  def submit_answer!(answer, is_correct, feedback = nil)
    # Store answer as string in JSONB (can be a simple string or hash)
    # Handle nil, string, or hash inputs
    if answer.nil?
      answer_value = { 'answer' => '' }
    elsif answer.is_a?(Hash)
      answer_value = answer
    else
      answer_value = { 'answer' => answer.to_s }
    end
    
    # Use update! to raise errors if validation fails
    update!(
      student_answer: answer_value,
      is_correct: is_correct,
      feedback: feedback,
      completed_at: Time.current,
      attempts_count: attempts_count + 1
    )
    
    # Update understanding level based on performance
    update_understanding_level_after_attempt(is_correct)
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.error "Failed to submit answer: #{e.message}"
    Rails.logger.error "Validation errors: #{errors.full_messages.join(', ')}"
    raise e
  end

  # Update understanding level after problem attempt
  def update_understanding_level_after_attempt(is_correct)
    return unless student && subject
    
    # Get current understanding level for this subject/topic
    current_transcript = Transcript
      .where(student_id: student.id, subject: subject)
      .where.not(understanding_level: nil)
      .order(session_date: :desc, created_at: :desc)
      .first
    
    current_level = current_transcript&.understanding_level || 50.0 # Default to 50% if no data
    
    # Calculate adjustment based on performance
    # Correct on first try: +10 points
    # Correct after hints: +5 points
    # Incorrect: -15 points
    adjustment = if is_correct
      if attempts_count == 1
        10.0 # First try correct
      else
        5.0 # Correct after hints/attempts
      end
    else
      -15.0 # Incorrect
    end
    
    # Account for hints used (reduces positive adjustment)
    if is_correct && hints_used && hints_used > 0
      adjustment -= (hints_used * 1.0) # Reduce by 1 point per hint
    end
    
    new_level = [0, [100, current_level + adjustment].min].max
    
    # Create or update transcript with new understanding level
    # Use today's date for the session
    transcript = Transcript.find_or_initialize_by(
      student_id: student.id,
      subject: subject,
      topic: topic || subject,
      session_date: Date.current
    )
    
    transcript.understanding_level = new_level
    transcript.transcript_content ||= "Practice problem completion - #{subject}"
    transcript.student_level ||= 'high_school'
    transcript.save if transcript.changed?
  end

  def problem_content_hash
    problem_content || {}
  end

  # Extract tags from problem_content
  def tags
    content = problem_content_hash
    {
      topic: content['tags']&.dig('topic') || content.dig('tags', 'topic') || subject,
      sub_topic: content['tags']&.dig('sub_topic') || content.dig('tags', 'sub_topic') || topic,
      difficulty: content['tags']&.dig('difficulty') || content.dig('tags', 'difficulty') || difficulty_level || 3,
      prerequisites: content['tags']&.dig('prerequisites') || content.dig('tags', 'prerequisites') || []
    }
  end

  # Get topic tag
  def topic_tag
    tags[:topic]
  end

  # Get sub-topic tag
  def sub_topic_tag
    tags[:sub_topic]
  end

  # Get prerequisites
  def prerequisites
    tags[:prerequisites]
  end

  # Get hints_used from metadata or return 0
  def hints_used
    # Check if we have a metadata field, otherwise return 0
    if respond_to?(:metadata) && metadata.is_a?(Hash)
      metadata['hints_used'] || 0
    else
      0
    end
  end

  # Get student answer as string (handles JSONB format)
  def student_answer_text
    return nil unless student_answer
    
    if student_answer.is_a?(Hash)
      student_answer['answer'] || student_answer.to_s
    else
      student_answer.to_s
    end
  end
end

