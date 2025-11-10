# Service for understanding level analytics and aggregation
# Provides methods to calculate trends, averages, and summaries

class UnderstandingLevelAnalyticsService
  def initialize(student_id:)
    @student_id = student_id
  end

  # Get all understanding levels for a student
  def all_levels
    Transcript
      .where(student_id: @student_id)
      .where.not(understanding_level: nil)
      .order(session_date: :asc, created_at: :asc)
      .select(:id, :subject, :topic, :session_date, :understanding_level, :previous_understanding_level, :created_at)
  end

  # Get understanding levels for a specific subject
  def levels_for_subject(subject)
    Transcript
      .where(student_id: @student_id, subject: subject)
      .where.not(understanding_level: nil)
      .order(session_date: :asc, created_at: :asc)
      .select(:id, :subject, :topic, :session_date, :understanding_level, :previous_understanding_level, :created_at)
  end

  # Get summary statistics for a student
  def summary
    transcripts = Transcript
      .where(student_id: @student_id)
      .where.not(understanding_level: nil)

    return empty_summary if transcripts.empty?

    # Current understanding levels by subject
    current_by_subject = transcripts
      .select('subject, MAX(session_date) as latest_date')
      .group(:subject)
      .map do |row|
        latest = transcripts
          .where(subject: row.subject, session_date: row.latest_date)
          .order(created_at: :desc)
          .first
        {
          subject: row.subject,
          understanding_level: latest.understanding_level,
          session_date: latest.session_date
        }
      end

    # Average understanding by subject
    avg_by_subject = transcripts
      .group(:subject)
      .average(:understanding_level)
      .transform_values { |v| v.to_f.round(2) }

    # Overall statistics
    all_levels = transcripts.pluck(:understanding_level)
    current_levels = current_by_subject.map { |s| s[:understanding_level] }

    {
      total_sessions: transcripts.count,
      subjects_studied: transcripts.distinct.pluck(:subject).count,
      current_understanding_by_subject: current_by_subject,
      average_understanding_by_subject: avg_by_subject,
      overall_average: all_levels.sum.to_f / all_levels.count,
      overall_current_average: current_levels.any? ? (current_levels.sum.to_f / current_levels.count).round(2) : 0.0,
      highest_understanding: all_levels.max,
      lowest_understanding: all_levels.min,
      improving_subjects: improving_subjects(transcripts),
      declining_subjects: declining_subjects(transcripts)
    }
  end

  # Get understanding progression for a specific subject
  def progression_for_subject(subject)
    transcripts = levels_for_subject(subject)

    return empty_progression if transcripts.empty?

    progression_data = transcripts.map do |t|
      {
        transcript_id: t.id,
        topic: t.topic,
        session_date: t.session_date,
        understanding_level: t.understanding_level,
        previous_understanding_level: t.previous_understanding_level,
        progress: t.previous_understanding_level ? (t.understanding_level - t.previous_understanding_level).round(2) : nil,
        created_at: t.created_at
      }
    end

    # Calculate trends
    first_level = progression_data.first[:understanding_level]
    last_level = progression_data.last[:understanding_level]
    total_progress = last_level - first_level

    # Calculate average progress per session
    progress_values = progression_data.map { |p| p[:progress] }.compact
    avg_progress_per_session = progress_values.any? ? (progress_values.sum.to_f / progress_values.count).round(2) : 0.0

    # Determine trend direction
    trend = if total_progress > 2
      'improving'
    elsif total_progress < -2
      'declining'
    else
      'stable'
    end

    {
      subject: subject,
      total_sessions: progression_data.count,
      first_session_date: progression_data.first[:session_date],
      last_session_date: progression_data.last[:session_date],
      first_understanding_level: first_level,
      current_understanding_level: last_level,
      total_progress: total_progress.round(2),
      average_progress_per_session: avg_progress_per_session,
      trend: trend,
      progression: progression_data
    }
  end

  # Get summary for all subjects
  def all_subjects_summary
    subjects = Transcript
      .where(student_id: @student_id)
      .where.not(understanding_level: nil)
      .distinct
      .pluck(:subject)

    subjects.map { |subject| progression_for_subject(subject) }
  end

  private

  def empty_summary
    {
      total_sessions: 0,
      subjects_studied: 0,
      current_understanding_by_subject: [],
      average_understanding_by_subject: {},
      overall_average: 0.0,
      overall_current_average: 0.0,
      highest_understanding: 0.0,
      lowest_understanding: 0.0,
      improving_subjects: [],
      declining_subjects: []
    }
  end

  def empty_progression
    {
      subject: nil,
      total_sessions: 0,
      first_session_date: nil,
      last_session_date: nil,
      first_understanding_level: 0.0,
      current_understanding_level: 0.0,
      total_progress: 0.0,
      average_progress_per_session: 0.0,
      trend: 'stable',
      progression: []
    }
  end

  def improving_subjects(transcripts)
    subjects = transcripts.distinct.pluck(:subject)
    
    subjects.select do |subject|
      subject_transcripts = transcripts.where(subject: subject).order(session_date: :asc)
      next false if subject_transcripts.count < 2
      
      first_level = subject_transcripts.first.understanding_level
      last_level = subject_transcripts.last.understanding_level
      
      (last_level - first_level) > 5.0 # Improved by more than 5%
    end
  end

  def declining_subjects(transcripts)
    subjects = transcripts.distinct.pluck(:subject)
    
    subjects.select do |subject|
      subject_transcripts = transcripts.where(subject: subject).order(session_date: :asc)
      next false if subject_transcripts.count < 2
      
      first_level = subject_transcripts.first.understanding_level
      last_level = subject_transcripts.last.understanding_level
      
      (last_level - first_level) < -5.0 # Declined by more than 5%
    end
  end
end


