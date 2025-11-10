# Service to calculate understanding level and build snapshots for transcripts
# Implements the hybrid approach: stores snapshots on transcripts while deriving from existing data

class UnderstandingLevelService
  def initialize(student_id:, subject:, session_date:)
    @student_id = student_id
    @subject = subject
    @session_date = session_date
  end

    # Main method to calculate understanding level and build all snapshots
  def calculate_and_build_snapshots
    previous_max = find_previous_max_understanding
    goals_snapshot = build_goals_snapshot
    session_history = build_session_history_summary(previous_max)
    ai_usage_boost = calculate_ai_usage_boost(session_history['last_session_date'])
    
    understanding_level = calculate_understanding_level(
      previous_max: previous_max,
      goals_snapshot: goals_snapshot,
      session_history: session_history,
      ai_usage_boost: ai_usage_boost
    )

    {
      understanding_level: understanding_level,
      previous_understanding_level: previous_max,
      goals_snapshot: goals_snapshot,
      session_history_summary: session_history
    }
  end

  private

  # Find the maximum understanding level from previous sessions for this student + subject
  def find_previous_max_understanding
    Transcript
      .where(student_id: @student_id, subject: @subject)
      .where.not(understanding_level: nil)
      .maximum(:understanding_level) || 0.0
  end

  # Build goals snapshot at session time
  # Uses Phase 5's GoalProgressSnapshot when available, otherwise queries Goals directly
  def build_goals_snapshot
    active_goals = Goal.where(student_id: @student_id, subject: @subject, status: 'active')
    completed_goals_count = Goal.where(student_id: @student_id, subject: @subject, status: 'completed').count
    total_goals_count = Goal.where(student_id: @student_id, subject: @subject).count

    # Use Phase 5's GoalProgressSnapshot for latest progress if available
    # Otherwise fall back to goal's current progress_percentage
    active_goals_data = active_goals.map do |goal|
      # Try to get latest snapshot from Phase 5's GoalProgressSnapshot
      latest_snapshot = GoalProgressSnapshot.latest_for_goal(goal.id)
      progress = if latest_snapshot && latest_snapshot.snapshot_date >= @session_date - 7.days
        # Use snapshot if it's recent (within 7 days)
        latest_snapshot.completion_percentage || goal.progress_percentage || 0
      else
        # Fall back to current goal progress
        goal.progress_percentage || 0
      end

      {
        'id' => goal.id,
        'progress' => progress,
        'title' => goal.title,
        'goal_type' => goal.goal_type,
        'target_date' => goal.target_date&.iso8601,
        'milestones_completed' => goal.completed_milestones_count
      }
    end

    {
      'active_goals' => active_goals_data,
      'completed_goals_count' => completed_goals_count,
      'total_goals_count' => total_goals_count,
      'snapshot_date' => @session_date.iso8601
    }
  end

  # Build session history summary
  def build_session_history_summary(previous_max)
    previous_transcripts = Transcript
      .where(student_id: @student_id, subject: @subject)
      .order(session_date: :desc, created_at: :desc)

    last_session = previous_transcripts.first
    
    # Get topics covered (all time, but prioritize recent)
    topics_covered = previous_transcripts.pluck(:topic).uniq
    
    # Get concepts from session summaries
    session_summaries = SessionSummary
      .where(student_id: @student_id)
      .joins(:transcript)
      .where(transcripts: { subject: @subject })
      .where(processing_status: 'completed')
    
    concepts_mastered = session_summaries.flat_map(&:strengths_identified).compact.uniq
    concepts_struggling = session_summaries.flat_map(&:areas_for_improvement).compact.uniq
    
    # Calculate days since last session
    days_since_last = if last_session&.session_date
      (@session_date - last_session.session_date).to_i
    else
      nil
    end

    {
      'total_sessions_this_subject' => previous_transcripts.count,
      'last_session_date' => last_session&.session_date&.iso8601,
      'days_since_last_session' => days_since_last,
      'previous_max_understanding' => previous_max,
      'topics_covered' => topics_covered,
      'topics_covered_count' => topics_covered.count,
      'concepts_mastered' => concepts_mastered,
      'concepts_mastered_count' => concepts_mastered.count,
      'concepts_struggling' => concepts_struggling,
      'concepts_struggling_count' => concepts_struggling.count,
      'recent_sessions_count' => previous_transcripts.where('session_date >= ?', 30.days.ago).count
    }
  end

  # Calculate AI usage boost based on conversations and practice problems
  def calculate_ai_usage_boost(last_session_date)
    return 0.0 unless last_session_date

    start_date = Date.parse(last_session_date)
    end_date = @session_date

    # Count AI companion conversations
    conversation_count = ConversationMessage
      .where(student_id: @student_id)
      .where(role: 'user')
      .where('created_at >= ? AND created_at <= ?', start_date.beginning_of_day, end_date.end_of_day)
      .count

    # Count completed practice problems
    practice_count = PracticeProblem
      .where(student_id: @student_id)
      .where.not(completed_at: nil)
      .where('completed_at >= ? AND completed_at <= ?', start_date.beginning_of_day, end_date.end_of_day)
      .count

    total_interactions = conversation_count + practice_count

    # Tiered boost system
    case total_interactions
    when 0
      0.0
    when 1..3
      # Light usage: +5% to +8%
      rand(5.0..8.0)
    when 4..10
      # Moderate usage: +8% to +12%
      rand(8.0..12.0)
    else
      # Heavy usage: +12% to +15%
      rand(12.0..15.0)
    end
  end

  # Calculate understanding level with all factors
  def calculate_understanding_level(previous_max:, goals_snapshot:, session_history:, ai_usage_boost:)
    base_understanding = previous_max

    # First session: start at 0-20% based on student level
    if previous_max == 0.0
      # We don't have student_level here, so use a reasonable default
      # This will be adjusted in the controller if student_level is available
      base_understanding = rand(0.0..20.0)
    else
      # Apply time decay for long gaps (>3 months = 90 days)
      if session_history['days_since_last_session'] && session_history['days_since_last_session'] > 90
        decay = rand(3.0..5.0)
        base_understanding = [base_understanding - decay, 0.0].max
      end

      # Natural progression: +0% to +5% even without AI
      natural_progression = rand(0.0..5.0)
      base_understanding += natural_progression
    end

    # Add AI usage boost
    base_understanding += ai_usage_boost

    # Cap at 100%
    base_understanding = [base_understanding, 100.0].min

    # Round to 2 decimal places
    base_understanding.round(2)
  end

  # Adjust understanding level for first session based on student level
  def adjust_for_student_level(base_understanding, student_level)
    return base_understanding if base_understanding > 20.0 # Not a first session

    case student_level&.downcase
    when 'beginner'
      rand(0.0..10.0)
    when 'intermediate'
      rand(10.0..20.0)
    when 'advanced'
      rand(15.0..25.0)
    else
      base_understanding # Keep original if level unknown
    end
  end

  public :adjust_for_student_level
end

