class EarlyEngagementNudge < ApplicationRecord
  belongs_to :student
  belongs_to :session, optional: true

  validates :message, presence: true
  validates :delivery_channel, inclusion: { in: %w[in_app email push] }, allow_nil: true

  scope :sent, -> { where.not(sent_at: nil) }
  scope :opened, -> { where.not(opened_at: nil) }
  scope :clicked, -> { where.not(clicked_at: nil) }
  scope :converted, -> { where(session_booked: true) }

  def sent?
    sent_at.present?
  end

  def mark_sent!
    update(sent_at: Time.current)
  end

  def mark_opened!
    update(opened_at: Time.current) unless opened_at.present?
  end

  def mark_clicked!
    update(clicked_at: Time.current) unless clicked_at.present?
  end

  def mark_session_booked!(session_id)
    update(session_booked: true, session_id: session_id)
  end
end

