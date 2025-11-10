# Service for tracking AI API costs
class CostTrackingService
  def initialize
  end

  # Track a cost
  def self.track_cost(cost_type:, student: nil, cost:, model_used: nil, token_count: 0, provider: 'openai', metadata: {})
    return nil unless AiCostTracking.table_exists?
    
    AiCostTracking.track_cost(
      cost_type: cost_type,
      student: student,
      cost: cost,
      model_used: model_used,
      token_count: token_count,
      provider: provider,
      metadata: metadata
    )
  rescue => e
    Rails.logger.error "Failed to track cost: #{e.message}"
    nil
  end

  # Get total cost for a period
  def self.total_cost(start_date:, end_date:, student: nil, cost_type: nil)
    return 0.0 unless AiCostTracking.table_exists?
    
    AiCostTracking.total_cost_for_period(
      start_date: start_date,
      end_date: end_date,
      student: student,
      cost_type: cost_type
    )
  end

  # Get average cost per student
  def self.average_cost_per_student(start_date:, end_date:)
    return 0.0 unless AiCostTracking.table_exists?
    
    AiCostTracking.average_cost_per_student(
      start_date: start_date,
      end_date: end_date
    )
  end

  # Get cost breakdown by type
  def self.cost_breakdown(start_date:, end_date:, student: nil)
    return { breakdown: {}, total: 0, by_percentage: {} } unless AiCostTracking.table_exists?
    
    costs = AiCostTracking
      .in_date_range(start_date, end_date)
      .then { |q| student ? q.for_student(student.id) : q }
      .group(:cost_type)
      .sum(:cost)
    
    total = costs.values.sum
    
    {
      breakdown: costs,
      total: total,
      by_percentage: costs.transform_values { |v| total > 0 ? (v / total * 100).round(2) : 0 }
    }
  end

  # Get cost trends over time
  def self.cost_trends(start_date:, end_date:, student: nil, cost_type: nil)
    query = AiCostTracking
      .in_date_range(start_date, end_date)
      .then { |q| student ? q.for_student(student.id) : q }
      .then { |q| cost_type ? q.by_type(cost_type) : q }
      .group(:cost_date)
      .sum(:cost)
    
    query.sort_by { |date, _| date }
  end

  # Get cost per student per month
  def self.cost_per_student_per_month(month: Date.current)
    start_date = month.beginning_of_month
    end_date = month.end_of_month
    
    total_cost = total_cost(start_date: start_date, end_date: end_date)
    unique_students = AiCostTracking
      .in_date_range(start_date, end_date)
      .where.not(student_id: nil)
      .distinct
      .count(:student_id)
    
    unique_students > 0 ? (total_cost / unique_students) : 0
  end

  # Project costs at scale
  def self.project_costs_at_scale(current_students:, target_students:, current_month_cost:)
    cost_per_student = current_students > 0 ? (current_month_cost / current_students) : 0
    projected_cost = cost_per_student * target_students
    
    {
      current_students: current_students,
      target_students: target_students,
      current_month_cost: current_month_cost,
      cost_per_student: cost_per_student,
      projected_cost: projected_cost
    }
  end
end

