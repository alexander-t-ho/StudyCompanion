class AiCostTracking < ApplicationRecord
  belongs_to :student, optional: true

  COST_TYPES = %w[
    conversation
    practice_generation
    session_processing
    embedding
    transcript_generation
    transcript_analysis
    routing_analysis
    nudge_generation
    goal_suggestion
  ].freeze

  validates :cost_type, presence: true, inclusion: { in: COST_TYPES }
  validates :cost, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :cost_date, presence: true

  scope :for_student, ->(student_id) { where(student_id: student_id) }
  scope :by_type, ->(type) { where(cost_type: type) }
  scope :in_date_range, ->(start_date, end_date) { where(cost_date: start_date..end_date) }
  scope :recent, ->(days = 30) { where('cost_date >= ?', days.days.ago.to_date) }

  def self.track_cost(cost_type:, student: nil, cost:, model_used: nil, token_count: 0, provider: 'openai', metadata: {})
    create!(
      student: student,
      cost_type: cost_type.to_s,
      cost: cost,
      model_used: model_used,
      token_count: token_count,
      provider: provider,
      metadata: metadata,
      cost_date: Date.current
    )
  end

  def self.total_cost_for_period(start_date:, end_date:, student: nil, cost_type: nil)
    query = in_date_range(start_date, end_date)
    query = query.for_student(student.id) if student
    query = query.by_type(cost_type) if cost_type
    query.sum(:cost)
  end

  def self.average_cost_per_student(start_date:, end_date:)
    total_cost = total_cost_for_period(start_date: start_date, end_date: end_date)
    unique_students = where(cost_date: start_date..end_date).distinct.count(:student_id)
    unique_students > 0 ? total_cost / unique_students : 0
  end
end


