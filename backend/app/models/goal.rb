class Goal < ApplicationRecord
  belongs_to :student
  belongs_to :parent_goal, class_name: 'Goal', optional: true
  has_many :goal_suggestions, foreign_key: :source_goal_id, dependent: :destroy
  has_many :created_goal_suggestions, class_name: 'GoalSuggestion', foreign_key: :created_goal_id, dependent: :nullify
  has_many :practice_problems, dependent: :destroy
  has_many :goal_progress_snapshots, dependent: :destroy
  has_many :child_goals, class_name: 'Goal', foreign_key: 'parent_goal_id', dependent: :nullify

  validates :subject, presence: true
  validates :status, inclusion: { in: %w[active completed paused cancelled] }
  validates :goal_type, inclusion: { in: %w[long_term short_term] }, allow_nil: true
  validate :short_term_goal_must_have_parent

  scope :active, -> { where(status: 'active') }
  scope :completed, -> { where(status: 'completed') }
  scope :for_student, ->(student_id) { where(student_id: student_id) }
  scope :long_term, -> { where(goal_type: 'long_term') }
  scope :short_term, -> { where(goal_type: 'short_term') }
  scope :for_parent, ->(parent_id) { where(parent_goal_id: parent_id) }

  # Automatically generate suggestions when goal is completed
  after_update :generate_suggestions_on_completion, if: :saved_change_to_status?
  after_update :create_snapshot_on_progress_change, if: :should_create_snapshot?

  # Milestones are stored in metadata as array
  def milestones
    metadata['milestones'] || []
  end

  def milestones=(milestones_array)
    self.metadata = (metadata || {}).merge('milestones' => milestones_array)
  end

  def completed_milestones
    milestones.select { |m| m['completed'] == true }
  end

  def completed_milestones_count
    completed_milestones.count
  end

  def add_milestone(name, description = nil)
    current_milestones = milestones
    current_milestones << {
      'name' => name,
      'description' => description,
      'completed' => false,
      'created_at' => Time.current.iso8601
    }
    self.milestones = current_milestones
    save
  end

  def complete_milestone(milestone_name)
    current_milestones = milestones
    milestone = current_milestones.find { |m| m['name'] == milestone_name }
    if milestone
      milestone['completed'] = true
      milestone['completed_at'] = Time.current.iso8601
      self.milestones = current_milestones
      save
    end
  end

  def completed?
    status == 'completed'
  end

  def mark_completed!
    update(status: 'completed', completed_at: Date.current, progress_percentage: 100)
  end

  def long_term?
    goal_type == 'long_term'
  end

  def short_term?
    goal_type == 'short_term'
  end

  private

  def short_term_goal_must_have_parent
    if goal_type == 'short_term' && parent_goal_id.nil?
      errors.add(:parent_goal_id, 'must be present for short-term goals')
    end
  end

  def generate_suggestions_on_completion
    # Only generate if status changed to 'completed' and wasn't already completed
    if status == 'completed' && saved_change_to_status? && saved_change_to_status[0] != 'completed'
      # Generate suggestions asynchronously to avoid blocking the update
      GoalSuggestionGenerationJob.perform_later(student_id, id)
    end
  end

  def should_create_snapshot?
    # Create snapshot if progress changed or status changed
    saved_change_to_progress_percentage? || saved_change_to_status?
  end

  def create_snapshot_on_progress_change
    # Create snapshot asynchronously
    GoalProgressSnapshotJob.perform_later(student_id, id)
  end
end

