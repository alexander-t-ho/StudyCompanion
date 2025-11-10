class AnalyticsMetric < ApplicationRecord
  belongs_to :student, optional: true

  # Metric names
  METRIC_NAMES = {
    # Engagement metrics
    dau: 'engagement', # Daily Active Users
    wau: 'engagement', # Weekly Active Users
    mau: 'engagement', # Monthly Active Users
    chat_frequency: 'engagement',
    practice_frequency: 'engagement',
    
    # Learning metrics
    practice_completion_rate: 'learning',
    practice_accuracy_rate: 'learning',
    average_difficulty_level: 'learning',
    concepts_mastered_count: 'learning',
    understanding_level_average: 'learning',
    
    # Retention metrics
    goal_suggestion_acceptance_rate: 'retention',
    nudge_conversion_rate: 'retention',
    goal_completion_rate: 'retention',
    session_booking_rate: 'retention',
    day_7_retention: 'retention',
    day_30_retention: 'retention',
    
    # Business metrics
    total_sessions: 'business',
    average_sessions_per_student: 'business',
    revenue_per_student: 'business',
    churn_rate: 'business'
  }.freeze

  AGGREGATION_PERIODS = %w[daily weekly monthly].freeze

  validates :metric_name, presence: true, inclusion: { in: METRIC_NAMES.keys.map(&:to_s) }
  validates :metric_category, presence: true
  validates :metric_value, presence: true
  validates :metric_date, presence: true
  validates :aggregation_period, inclusion: { in: AGGREGATION_PERIODS }

  scope :for_student, ->(student_id) { where(student_id: student_id) }
  scope :by_name, ->(name) { where(metric_name: name) }
  scope :by_category, ->(category) { where(metric_category: category) }
  scope :by_period, ->(period) { where(aggregation_period: period) }
  scope :in_date_range, ->(start_date, end_date) { where(metric_date: start_date..end_date) }
  scope :recent, ->(days = 30) { where('metric_date >= ?', days.days.ago.to_date) }

  def self.upsert_metric(name:, student: nil, value:, date: Date.current, period: 'daily', dimensions: {})
    category = METRIC_NAMES[name.to_sym] || 'system'
    
    metric = find_or_initialize_by(
      student: student,
      metric_name: name.to_s,
      metric_date: date,
      aggregation_period: period
    )
    
    metric.assign_attributes(
      metric_category: category,
      metric_value: value,
      dimensions: dimensions
    )
    
    metric.save!
    metric
  end
end


