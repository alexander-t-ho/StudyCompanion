class GoalProgressSnapshotJob < ApplicationJob
  queue_as :default

  def perform(student_id, goal_id)
    student = Student.find(student_id)
    goal = student.goals.find(goal_id)

    service = GoalProgressSnapshotService.new(student, goal)
    service.create_snapshot

    Rails.logger.info "Created snapshot for goal #{goal_id} (student #{student_id})"
  rescue => e
    Rails.logger.error "Error creating snapshot for goal #{goal_id}: #{e.message}"
    raise
  end
end


