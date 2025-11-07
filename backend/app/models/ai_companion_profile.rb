class AiCompanionProfile < ApplicationRecord
  belongs_to :student
  has_many :conversation_messages, dependent: :destroy

  validates :student_id, uniqueness: true

  def increment_interactions!
    update(
      total_interactions_count: total_interactions_count + 1,
      last_interaction_at: Time.current
    )
  end

  def conversation_history_array
    conversation_history || []
  end

  def learning_preferences_hash
    learning_preferences || {}
  end
end

