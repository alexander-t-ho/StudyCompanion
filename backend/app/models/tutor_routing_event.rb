class TutorRoutingEvent < ApplicationRecord
  belongs_to :student
  belongs_to :conversation_message, optional: true
  belongs_to :session, optional: true

  validates :urgency, inclusion: { in: %w[low medium high] }, allow_nil: true
  validates :routing_confidence, inclusion: { in: 0.0..1.0 }, allow_nil: true

  scope :booked, -> { where(session_booked: true) }
  scope :not_booked, -> { where(session_booked: false) }
  scope :by_urgency, ->(urgency) { where(urgency: urgency) }

  def booked?
    session_booked?
  end

  def mark_session_booked!(session_id)
    update(session_booked: true, session_id: session_id)
  end

  def mark_tutor_notified!
    update(tutor_notified: true)
  end
end

