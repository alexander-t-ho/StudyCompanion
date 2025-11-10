# Service to calculate subject mastery based on goal completion percentage
class SubjectMasteryService
  def initialize(student_id)
    @student_id = student_id
  end

  # Calculate mastery for a specific subject
  # Note: This method is kept for backward compatibility but is less efficient
  # Use get_all_subjects_with_mastery for batch operations
  def calculate_mastery_for_subject(subject)
    goals = Goal.where(student_id: @student_id, subject: subject).to_a
    
    # If there are goals, calculate mastery from goals
    if goals.any?
      # Calculate average progress_percentage across all goals
      total_progress = goals.sum { |goal| goal.progress_percentage || 0 }
      goals_count = goals.count
      average_progress = goals_count > 0 ? (total_progress.to_f / goals_count) : 0
      
      # Map to mastery level
      mastery_level = mastery_level_from_percentage(average_progress)
      
      {
        percentage: average_progress.round(1),
        level: mastery_level,
        goals_count: goals_count,
        completed_goals: goals.count { |g| g.status == 'completed' },
        active_goals: goals.count { |g| g.status == 'active' },
        paused_goals: goals.count { |g| g.status == 'paused' },
        cancelled_goals: goals.count { |g| g.status == 'cancelled' }
      }
    else
      # If no goals, calculate mastery from understanding level in transcripts
      latest_transcript = Transcript.where(student_id: @student_id, subject: subject)
                                    .where.not(understanding_level: nil)
                                    .order(session_date: :desc, created_at: :desc)
                                    .first
      
      if latest_transcript && latest_transcript.understanding_level
        understanding = latest_transcript.understanding_level.to_f
        mastery_level = mastery_level_from_percentage(understanding)
        
        {
          percentage: understanding.round(1),
          level: mastery_level,
          goals_count: 0,
          completed_goals: 0,
          active_goals: 0,
          paused_goals: 0,
          cancelled_goals: 0
        }
      else
        # No goals and no understanding level - return default
        {
          percentage: 0.0,
          level: 'Needs Work',
          goals_count: 0,
          completed_goals: 0,
          active_goals: 0,
          paused_goals: 0,
          cancelled_goals: 0
        }
      end
    end
  end

  # Get all subjects with mastery data
  def get_all_subjects_with_mastery
    # Get all unique subjects from transcripts only (not from goals)
    # A student should only see subjects they have transcript history for
    transcript_subjects = Transcript.where(student_id: @student_id)
                                    .where.not(subject: nil)
                                    .distinct
                                    .pluck(:subject)
                                    .compact
                                    .uniq
                                    .sort
    
    return [] if transcript_subjects.empty?
    
    # Batch load ALL goals for this student at once (one query instead of N queries)
    all_goals = Goal.where(student_id: @student_id)
                    .where(subject: transcript_subjects)
                    .to_a
                    .group_by(&:subject)
    
    # Batch load latest transcripts for all subjects at once
    # Get all transcripts with understanding levels, then find latest per subject in memory
    all_transcripts = Transcript.where(student_id: @student_id)
                                .where(subject: transcript_subjects)
                                .where.not(understanding_level: nil)
                                .order(:subject, session_date: :desc, created_at: :desc)
                                .to_a
    
    # Group by subject and take the first (latest) for each subject
    latest_transcripts = all_transcripts.group_by(&:subject).transform_values(&:first)
    
    # Calculate mastery for all subjects in memory (no more queries in the loop)
    transcript_subjects.map do |subject|
      goals = all_goals[subject] || []
      
      if goals.any?
        # Calculate from goals (all in memory now - no database queries)
        total_progress = goals.sum { |goal| goal.progress_percentage || 0 }
        goals_count = goals.count
        average_progress = goals_count > 0 ? (total_progress.to_f / goals_count) : 0
        
        mastery = {
          percentage: average_progress.round(1),
          level: mastery_level_from_percentage(average_progress),
          goals_count: goals_count,
          completed_goals: goals.count { |g| g.status == 'completed' },
          active_goals: goals.count { |g| g.status == 'active' },
          paused_goals: goals.count { |g| g.status == 'paused' },
          cancelled_goals: goals.count { |g| g.status == 'cancelled' }
        }
      else
        # Use transcript understanding level
        transcript = latest_transcripts[subject]
        if transcript && transcript.understanding_level
          understanding = transcript.understanding_level.to_f
          mastery = {
            percentage: understanding.round(1),
            level: mastery_level_from_percentage(understanding),
            goals_count: 0,
            completed_goals: 0,
            active_goals: 0,
            paused_goals: 0,
            cancelled_goals: 0
          }
        else
          mastery = {
            percentage: 0.0,
            level: 'Needs Work',
            goals_count: 0,
            completed_goals: 0,
            active_goals: 0,
            paused_goals: 0,
            cancelled_goals: 0
          }
        end
      end
      
      {
        subject: subject,
        mastery: mastery
      }
    end
  end

  # Get detailed mastery breakdown for a subject
  def get_mastery_breakdown(subject)
    goals = Goal.where(student_id: @student_id, subject: subject)
                .order(created_at: :desc)
    
    mastery = calculate_mastery_for_subject(subject)
    
    goals_data = goals.map do |goal|
      {
        id: goal.id,
        title: goal.title,
        goal_type: goal.goal_type,
        status: goal.status,
        progress_percentage: goal.progress_percentage || 0,
        target_date: goal.target_date,
        completed_at: goal.completed_at,
        created_at: goal.created_at
      }
    end
    
    {
      subject: subject,
      mastery: mastery,
      goals: goals_data
    }
  end

  private

  # Map percentage to mastery level string
  def mastery_level_from_percentage(percentage)
    case percentage
    when 0...52
      'Needs Work'
    when 52...70
      'Proficient'
    when 70...90
      'Advanced'
    when 90..100
      'Master'
    else
      'Needs Work'
    end
  end
end

