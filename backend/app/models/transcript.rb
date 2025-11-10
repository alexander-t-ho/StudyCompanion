class Transcript < ApplicationRecord
  belongs_to :session, optional: true
  belongs_to :student, optional: true
  has_one :transcript_analysis, dependent: :destroy
  has_many :session_summaries, dependent: :nullify

  validates :student_id, presence: true
  validates :subject, presence: true, unless: -> { generation_parameters&.dig('transcript_type') == 'meeting' }
  validates :topic, presence: true
  validates :student_level, presence: true, unless: -> { generation_parameters&.dig('transcript_type') == 'meeting' }
  validates :transcript_content, presence: true

  scope :approved, -> { where(approved: true) }
  scope :pending_approval, -> { where(approved: false) }
  scope :for_student, ->(student_id) { where(student_id: student_id) }
  scope :for_session, ->(session_id) { where(session_id: session_id) }

  def approve!
    update(approved: true)
  end

  def generation_parameters_hash
    generation_parameters || {}
  end

  def analyzed?
    transcript_analysis.present?
  end
end

