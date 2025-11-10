# Service for tracking analytics events and aggregating metrics
class AnalyticsService
  def initialize
  end

  # Track an event
  def self.track_event(event_type:, student: nil, properties: {}, session_id: nil, request: nil)
    return nil unless AnalyticsEvent.table_exists?
    
    AnalyticsEvent.track(
      event_type: event_type,
      student: student,
      properties: properties,
      session_id: session_id,
      request: request
    )
  rescue => e
    Rails.logger.error "Failed to track event: #{e.message}"
    nil
  end

  # Calculate and store daily metrics
  def self.calculate_daily_metrics(date: Date.current)
    # Engagement metrics
    calculate_dau(date: date)
    calculate_chat_frequency(date: date)
    calculate_practice_frequency(date: date)
    
    # Learning metrics
    calculate_practice_completion_rate(date: date)
    calculate_practice_accuracy_rate(date: date)
    calculate_average_difficulty_level(date: date)
    
    # Retention metrics
    calculate_goal_suggestion_acceptance_rate(date: date)
    calculate_nudge_conversion_rate(date: date)
    
    # Business metrics
    calculate_total_sessions(date: date)
    calculate_average_sessions_per_student(date: date)
  end

  # Daily Active Users
  def self.calculate_dau(date: Date.current)
    unique_users = AnalyticsEvent
      .where(occurred_at: date.beginning_of_day..date.end_of_day)
      .where.not(student_id: nil)
      .distinct
      .count(:student_id)
    
    AnalyticsMetric.upsert_metric(
      name: :dau,
      value: unique_users,
      date: date,
      period: 'daily'
    )
  end

  # Weekly Active Users
  def self.calculate_wau(week_start: Date.current.beginning_of_week)
    week_end = week_start.end_of_week
    unique_users = AnalyticsEvent
      .where(occurred_at: week_start.beginning_of_day..week_end.end_of_day)
      .where.not(student_id: nil)
      .distinct
      .count(:student_id)
    
    AnalyticsMetric.upsert_metric(
      name: :wau,
      value: unique_users,
      date: week_start,
      period: 'weekly'
    )
  end

  # Monthly Active Users
  def self.calculate_mau(month_start: Date.current.beginning_of_month)
    month_end = month_start.end_of_month
    unique_users = AnalyticsEvent
      .where(occurred_at: month_start.beginning_of_day..month_end.end_of_day)
      .where.not(student_id: nil)
      .distinct
      .count(:student_id)
    
    AnalyticsMetric.upsert_metric(
      name: :mau,
      value: unique_users,
      date: month_start,
      period: 'monthly'
    )
  end

  # Chat frequency (average messages per student per day)
  def self.calculate_chat_frequency(date: Date.current)
    chat_events = AnalyticsEvent
      .where(event_type: 'chat_message')
      .where(occurred_at: date.beginning_of_day..date.end_of_day)
      .where.not(student_id: nil)
    
    unique_students = chat_events.distinct.count(:student_id)
    total_messages = chat_events.count
    
    frequency = unique_students > 0 ? (total_messages.to_f / unique_students) : 0
    
    AnalyticsMetric.upsert_metric(
      name: :chat_frequency,
      value: frequency,
      date: date,
      period: 'daily'
    )
  end

  # Practice frequency (average practice problems per student per day)
  def self.calculate_practice_frequency(date: Date.current)
    practice_events = AnalyticsEvent
      .where(event_type: 'practice_generated')
      .where(occurred_at: date.beginning_of_day..date.end_of_day)
      .where.not(student_id: nil)
    
    unique_students = practice_events.distinct.count(:student_id)
    total_practices = practice_events.count
    
    frequency = unique_students > 0 ? (total_practices.to_f / unique_students) : 0
    
    AnalyticsMetric.upsert_metric(
      name: :practice_frequency,
      value: frequency,
      date: date,
      period: 'daily'
    )
  end

  # Practice completion rate (% of generated problems that are completed)
  def self.calculate_practice_completion_rate(date: Date.current)
    generated = AnalyticsEvent
      .where(event_type: 'practice_generated')
      .where(occurred_at: date.beginning_of_day..date.end_of_day)
      .count
    
    completed = AnalyticsEvent
      .where(event_type: 'practice_completed')
      .where(occurred_at: date.beginning_of_day..date.end_of_day)
      .count
    
    rate = generated > 0 ? (completed.to_f / generated * 100) : 0
    
    AnalyticsMetric.upsert_metric(
      name: :practice_completion_rate,
      value: rate,
      date: date,
      period: 'daily',
      dimensions: { generated: generated, completed: completed }
    )
  end

  # Practice accuracy rate (% of submitted problems that are correct)
  def self.calculate_practice_accuracy_rate(date: Date.current)
    submitted = AnalyticsEvent
      .where(event_type: 'practice_submitted')
      .where(occurred_at: date.beginning_of_day..date.end_of_day)
      .count
    
    correct = AnalyticsEvent
      .where(event_type: 'practice_correct')
      .where(occurred_at: date.beginning_of_day..date.end_of_day)
      .count
    
    rate = submitted > 0 ? (correct.to_f / submitted * 100) : 0
    
    AnalyticsMetric.upsert_metric(
      name: :practice_accuracy_rate,
      value: rate,
      date: date,
      period: 'daily',
      dimensions: { submitted: submitted, correct: correct }
    )
  end

  # Average difficulty level of practice problems
  def self.calculate_average_difficulty_level(date: Date.current)
    practice_events = AnalyticsEvent
      .where(event_type: 'practice_generated')
      .where(occurred_at: date.beginning_of_day..date.end_of_day)
      .where.not(properties: nil)
    
    difficulties = practice_events.map { |e| e.properties['difficulty_level'] }.compact
    average = difficulties.any? ? (difficulties.sum.to_f / difficulties.size) : 0
    
    AnalyticsMetric.upsert_metric(
      name: :average_difficulty_level,
      value: average,
      date: date,
      period: 'daily'
    )
  end

  # Goal suggestion acceptance rate
  def self.calculate_goal_suggestion_acceptance_rate(date: Date.current)
    viewed = AnalyticsEvent
      .where(event_type: 'goal_suggestion_viewed')
      .where(occurred_at: date.beginning_of_day..date.end_of_day)
      .count
    
    accepted = AnalyticsEvent
      .where(event_type: 'goal_suggestion_accepted')
      .where(occurred_at: date.beginning_of_day..date.end_of_day)
      .count
    
    rate = viewed > 0 ? (accepted.to_f / viewed * 100) : 0
    
    AnalyticsMetric.upsert_metric(
      name: :goal_suggestion_acceptance_rate,
      value: rate,
      date: date,
      period: 'daily',
      dimensions: { viewed: viewed, accepted: accepted }
    )
  end

  # Nudge conversion rate (% of nudges that lead to session booking)
  def self.calculate_nudge_conversion_rate(date: Date.current)
    sent = AnalyticsEvent
      .where(event_type: 'nudge_sent')
      .where(occurred_at: date.beginning_of_day..date.end_of_day)
      .count
    
    clicked = AnalyticsEvent
      .where(event_type: 'nudge_clicked')
      .where(occurred_at: date.beginning_of_day..date.end_of_day)
      .count
    
    rate = sent > 0 ? (clicked.to_f / sent * 100) : 0
    
    AnalyticsMetric.upsert_metric(
      name: :nudge_conversion_rate,
      value: rate,
      date: date,
      period: 'daily',
      dimensions: { sent: sent, clicked: clicked }
    )
  end

  # Total sessions
  def self.calculate_total_sessions(date: Date.current)
    total = AnalyticsEvent
      .where(event_type: 'session_booked')
      .where(occurred_at: date.beginning_of_day..date.end_of_day)
      .count
    
    AnalyticsMetric.upsert_metric(
      name: :total_sessions,
      value: total,
      date: date,
      period: 'daily'
    )
  end

  # Average sessions per student
  def self.calculate_average_sessions_per_student(date: Date.current)
    session_events = AnalyticsEvent
      .where(event_type: 'session_booked')
      .where(occurred_at: date.beginning_of_day..date.end_of_day)
      .where.not(student_id: nil)
    
    unique_students = session_events.distinct.count(:student_id)
    total_sessions = session_events.count
    
    average = unique_students > 0 ? (total_sessions.to_f / unique_students) : 0
    
    AnalyticsMetric.upsert_metric(
      name: :average_sessions_per_student,
      value: average,
      date: date,
      period: 'daily'
    )
  end

  # Get metrics for a date range
  def self.get_metrics(metric_name:, start_date:, end_date:, student: nil, period: 'daily')
    # Return empty relation if table doesn't exist yet
    return AnalyticsMetric.none unless AnalyticsMetric.table_exists?
    
    query = AnalyticsMetric
      .by_name(metric_name)
      .by_period(period)
      .in_date_range(start_date, end_date)
    
    query = query.for_student(student.id) if student
    
    query.order(:metric_date)
  end

  # Get summary statistics
  def self.get_summary(start_date:, end_date:, student: nil)
    {
      engagement: {
        dau: get_metrics(metric_name: :dau, start_date: start_date, end_date: end_date, student: student).average(:metric_value)&.round(2) || 0,
        wau: get_metrics(metric_name: :wau, start_date: start_date, end_date: end_date, student: student, period: 'weekly').last&.metric_value || 0,
        mau: get_metrics(metric_name: :mau, start_date: start_date, end_date: end_date, student: student, period: 'monthly').last&.metric_value || 0,
        chat_frequency: get_metrics(metric_name: :chat_frequency, start_date: start_date, end_date: end_date, student: student).average(:metric_value)&.round(2) || 0,
        practice_frequency: get_metrics(metric_name: :practice_frequency, start_date: start_date, end_date: end_date, student: student).average(:metric_value)&.round(2) || 0
      },
      learning: {
        practice_completion_rate: get_metrics(metric_name: :practice_completion_rate, start_date: start_date, end_date: end_date, student: student).average(:metric_value)&.round(2) || 0,
        practice_accuracy_rate: get_metrics(metric_name: :practice_accuracy_rate, start_date: start_date, end_date: end_date, student: student).average(:metric_value)&.round(2) || 0,
        average_difficulty_level: get_metrics(metric_name: :average_difficulty_level, start_date: start_date, end_date: end_date, student: student).average(:metric_value)&.round(2) || 0
      },
      retention: {
        goal_suggestion_acceptance_rate: get_metrics(metric_name: :goal_suggestion_acceptance_rate, start_date: start_date, end_date: end_date, student: student).average(:metric_value)&.round(2) || 0,
        nudge_conversion_rate: get_metrics(metric_name: :nudge_conversion_rate, start_date: start_date, end_date: end_date, student: student).average(:metric_value)&.round(2) || 0
      },
      business: {
        total_sessions: get_metrics(metric_name: :total_sessions, start_date: start_date, end_date: end_date, student: student).sum(:metric_value).to_i,
        average_sessions_per_student: get_metrics(metric_name: :average_sessions_per_student, start_date: start_date, end_date: end_date, student: student).average(:metric_value)&.round(2) || 0
      }
    }
  end
end

