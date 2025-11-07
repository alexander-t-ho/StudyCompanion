class CreateTranscripts < ActiveRecord::Migration[7.1]
  def change
    create_table :transcripts do |t|
      t.references :session, foreign_key: false, null: true  # Foreign key added later after sessions table exists
      t.references :student, foreign_key: false, null: true  # Foreign key added later after students table exists
      t.string :subject
      t.string :topic
      t.string :student_level
      t.integer :session_duration_minutes
      t.text :learning_objectives
      t.text :student_personality
      t.text :transcript_content
      t.jsonb :generation_parameters
      t.integer :quality_rating
      t.text :validation_notes
      t.boolean :approved, default: false
      t.string :model_used
      t.integer :token_count
      t.decimal :generation_cost, precision: 10, scale: 4

      t.timestamps
    end

    add_index :transcripts, :subject
    add_index :transcripts, :approved
    add_index :transcripts, :created_at
    # session_id and student_id indexes are automatically created by t.references
  end
end

