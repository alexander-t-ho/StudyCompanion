class CreateAiCompanionProfiles < ActiveRecord::Migration[7.1]
  def change
    create_table :ai_companion_profiles do |t|
      t.references :student, null: false, foreign_key: true, index: false  # Index added explicitly below with unique constraint
      t.jsonb :conversation_history, default: []
      t.jsonb :learning_preferences, default: {}
      t.datetime :last_interaction_at
      t.integer :total_interactions_count, default: 0
      t.boolean :enabled, default: true

      t.timestamps
    end

    add_index :ai_companion_profiles, :student_id, unique: true
    add_index :ai_companion_profiles, :last_interaction_at
  end
end

