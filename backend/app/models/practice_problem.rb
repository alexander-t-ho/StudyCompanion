class PracticeProblem < ApplicationRecord
  belongs_to :student
  belongs_to :goal, optional: true

  validates :difficulty_level, inclusion: { in: 1..10 }, allow_nil: true
  validates :problem_content, presence: true

  scope :for_student, ->(student_id) { where(student_id: student_id) }
  scope :assigned, -> { where(completed_at: nil) }
  scope :completed, -> { where.not(completed_at: nil) }
  scope :by_difficulty, ->(level) { where(difficulty_level: level) }

  def completed?
    completed_at.present?
  end

  def submit_answer!(answer, is_correct, feedback = nil)
    update(
      student_answer: answer,
      is_correct: is_correct,
      feedback: feedback,
      completed_at: Time.current,
      attempts_count: attempts_count + 1
    )
  end

  def problem_content_hash
    problem_content || {}
  end
end

