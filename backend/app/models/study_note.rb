class StudyNote < ApplicationRecord
  belongs_to :student
  belongs_to :conversation_message, optional: true

  validates :concept, presence: true
  validates :message, presence: true
  validates :detected_at, presence: true

  scope :recent, -> { order(detected_at: :desc) }
  scope :unnotified, -> { where(notified_tutor: false) }
  scope :for_subject, ->(subject) { where(subject: subject) }
end

