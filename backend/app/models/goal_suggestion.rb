class GoalSuggestion < ApplicationRecord
  belongs_to :student
  belongs_to :source_goal, class_name: 'Goal'
  belongs_to :created_goal, class_name: 'Goal', optional: true

  validates :suggested_subject, presence: true
  validates :confidence, inclusion: { in: 0.0..1.0 }, allow_nil: true

  scope :presented, -> { where.not(presented_at: nil) }
  scope :accepted, -> { where.not(accepted_at: nil) }
  scope :pending, -> { where(presented_at: nil) }

  def presented?
    presented_at.present?
  end

  def accepted?
    accepted_at.present?
  end

  def present!
    update(presented_at: Time.current)
  end

  def accept!
    update(accepted_at: Time.current)
  end
end

