class GoalProgressSnapshotService
  def initialize(student, goal)
    @student = student
    @goal = goal
  end

  def create_snapshot
    # Check if snapshot already exists for today
    existing = GoalProgressSnapshot.where(
      student_id: @student.id,
      goal_id: @goal.id,
      snapshot_date: Date.current
    ).first

    if existing
      # Update existing snapshot
      existing.update!(
        completion_percentage: @goal.progress_percentage,
        milestones_completed: @goal.completed_milestones_count,
        estimated_completion_date: @goal.target_date
      )
      existing
    else
      # Create new snapshot
      GoalProgressSnapshot.create!(
        student_id: @student.id,
        goal_id: @goal.id,
        completion_percentage: @goal.progress_percentage,
        milestones_completed: @goal.completed_milestones_count,
        estimated_completion_date: @goal.target_date,
        snapshot_date: Date.current
      )
    end
  end

  def self.create_snapshots_for_student(student)
    student.goals.active.find_each do |goal|
      service = new(student, goal)
      service.create_snapshot
    end
  end

  def self.create_snapshots_for_all_students
    Student.find_each do |student|
      create_snapshots_for_student(student)
    end
  end
end


