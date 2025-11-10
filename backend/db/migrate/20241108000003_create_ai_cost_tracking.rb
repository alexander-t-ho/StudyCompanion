class CreateAiCostTracking < ActiveRecord::Migration[7.1]
  def change
    create_table :ai_cost_tracking do |t|
      t.references :student, null: true, foreign_key: true, index: true
      t.string :cost_type, null: false # conversation, practice_generation, session_processing, embedding, etc.
      t.string :model_used # gpt-4o-mini, gpt-4o, etc.
      t.integer :token_count, default: 0
      t.decimal :cost, precision: 10, scale: 6, null: false
      t.string :provider # openai, openrouter
      t.jsonb :metadata, default: {} # Additional cost details
      t.date :cost_date, null: false

      t.timestamps
    end

    add_index :ai_cost_tracking, :cost_type
    add_index :ai_cost_tracking, :cost_date
    add_index :ai_cost_tracking, [:student_id, :cost_date]
    add_index :ai_cost_tracking, [:cost_type, :cost_date]
  end
end


