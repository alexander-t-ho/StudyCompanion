class GoalProgressSnapshot < ApplicationRecord
  belongs_to :student
  belongs_to :goal

  validates :snapshot_date, presence: true
  validates :completion_percentage, inclusion: { in: 0.0..100.0 }, allow_nil: true

  scope :for_student, ->(student_id) { where(student_id: student_id) }
  scope :for_goal, ->(goal_id) { where(goal_id: goal_id) }
  scope :recent, -> { order(snapshot_date: :desc) }
  scope :on_date, ->(date) { where(snapshot_date: date) }
  scope :between_dates, ->(start_date, end_date) { where(snapshot_date: start_date..end_date) }

  def self.latest_for_goal(goal_id)
    for_goal(goal_id).recent.first
  end

  def self.latest_for_student(student_id)
    for_student(student_id).recent
  end
end


