class Session < ApplicationRecord
  belongs_to :student
  has_one :session_summary, dependent: :destroy
  has_many :transcripts, dependent: :destroy
  has_many :conversation_messages, dependent: :destroy
  has_many :practice_problems, dependent: :destroy
  has_many :early_engagement_nudges, dependent: :destroy
  has_many :tutor_routing_events, dependent: :destroy

  validates :status, inclusion: { in: %w[scheduled in_progress completed cancelled] }

  scope :completed, -> { where(status: 'completed') }
  scope :for_student, ->(student_id) { where(student_id: student_id) }

  def completed?
    status == 'completed'
  end

  def has_summary?
    session_summary.present? && session_summary.processing_status == 'completed'
  end
end

