class SubjectRelationship < ApplicationRecord
  validates :source_subject, presence: true
  validates :target_subject, presence: true
  validates :strength, inclusion: { in: 0.0..1.0 }
  validates :source_subject, uniqueness: { scope: :target_subject }

  scope :for_subject, ->(subject) { where(source_subject: subject) }
  scope :strong_relationships, -> { where('strength >= ?', 0.7) }
  scope :by_strength, -> { order(strength: :desc) }

  def self.related_subjects(subject)
    where(source_subject: subject).order(strength: :desc).pluck(:target_subject)
  end

  def self.related_subjects_with_details(subject)
    where(source_subject: subject).order(strength: :desc)
  end
end







