class Goal < ApplicationRecord
  belongs_to :student
  has_many :goal_suggestions, foreign_key: :source_goal_id, dependent: :destroy
  has_many :created_goal_suggestions, class_name: 'GoalSuggestion', foreign_key: :created_goal_id, dependent: :nullify
  has_many :practice_problems, dependent: :destroy

  validates :subject, presence: true
  validates :status, inclusion: { in: %w[active completed paused cancelled] }

  scope :active, -> { where(status: 'active') }
  scope :completed, -> { where(status: 'completed') }
  scope :for_student, ->(student_id) { where(student_id: student_id) }

  def completed?
    status == 'completed'
  end

  def mark_completed!
    update(status: 'completed', completed_at: Date.current, progress_percentage: 100)
  end
end

