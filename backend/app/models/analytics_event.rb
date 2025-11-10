class AnalyticsEvent < ApplicationRecord
  belongs_to :student, optional: true

  # Event types
  EVENT_TYPES = {
    # Engagement events
    chat_message: 'engagement',
    practice_generated: 'engagement',
    practice_submitted: 'engagement',
    practice_completed: 'engagement',
    dashboard_viewed: 'engagement',
    
    # Learning events
    practice_correct: 'learning',
    practice_incorrect: 'learning',
    concept_mastered: 'learning',
    understanding_level_increased: 'learning',
    
    # Retention events
    goal_suggestion_viewed: 'retention',
    goal_suggestion_accepted: 'retention',
    goal_suggestion_declined: 'retention',
    nudge_sent: 'retention',
    nudge_opened: 'retention',
    nudge_clicked: 'retention',
    goal_completed: 'retention',
    session_booked: 'retention',
    
    # System events
    tutor_routing_triggered: 'system',
    error_occurred: 'system'
  }.freeze

  validates :event_type, presence: true, inclusion: { in: EVENT_TYPES.keys.map(&:to_s) }
  validates :event_category, presence: true
  validates :occurred_at, presence: true

  scope :for_student, ->(student_id) { where(student_id: student_id) }
  scope :by_type, ->(type) { where(event_type: type) }
  scope :by_category, ->(category) { where(event_category: category) }
  scope :in_date_range, ->(start_date, end_date) { where(occurred_at: start_date..end_date) }
  scope :recent, ->(days = 30) { where('occurred_at >= ?', days.days.ago) }

  def self.track(event_type:, student: nil, properties: {}, session_id: nil, request: nil)
    category = EVENT_TYPES[event_type.to_sym] || 'system'
    
    create!(
      student: student,
      event_type: event_type.to_s,
      event_category: category,
      properties: properties,
      session_id: session_id,
      user_agent: request&.user_agent,
      ip_address: request&.remote_ip,
      occurred_at: Time.current
    )
  end
end


