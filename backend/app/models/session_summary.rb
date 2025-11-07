class SessionSummary < ApplicationRecord
  belongs_to :session
  belongs_to :student
  belongs_to :transcript, optional: true
  belongs_to :transcript_analysis, optional: true
  has_many :conversation_messages, dependent: :nullify

  validates :processing_status, inclusion: { in: %w[pending processing completed failed] }

  scope :completed, -> { where(processing_status: 'completed') }
  scope :pending, -> { where(processing_status: 'pending') }
  scope :processing, -> { where(processing_status: 'processing') }
  scope :failed, -> { where(processing_status: 'failed') }

  def completed?
    processing_status == 'completed'
  end

  def mark_processing!
    update(processing_status: 'processing')
  end

  def mark_completed!
    update(processing_status: 'completed', processed_at: Time.current)
  end

  def mark_failed!(error_message)
    update(processing_status: 'failed', error_message: error_message)
  end
end

