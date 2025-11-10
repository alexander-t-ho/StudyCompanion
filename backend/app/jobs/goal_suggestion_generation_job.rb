class GoalSuggestionGenerationJob < ApplicationJob
  queue_as :default

  def perform(student_id, goal_id)
    student = Student.find(student_id)
    goal = student.goals.find(goal_id)

    # Only generate if goal is still completed
    return unless goal.completed?

    # Check if suggestions already exist
    return if goal.goal_suggestions.any?

    # Generate suggestions (use environment API key if available)
    api_key = ENV['OPENAI_API_KEY']
    use_openrouter = ENV['USE_OPENROUTER'] == 'true'
    
    service = GoalSuggestionService.new(
      student, 
      goal,
      api_key: api_key,
      use_openrouter: use_openrouter
    )
    suggestions = service.generate_suggestions

    # Mark suggestions as presented (they're ready to show)
    suggestions.each(&:present!)

    Rails.logger.info "Generated #{suggestions.count} suggestions for goal #{goal_id} (student #{student_id})"
  rescue => e
    Rails.logger.error "Error generating suggestions for goal #{goal_id}: #{e.message}"
    raise
  end
end

