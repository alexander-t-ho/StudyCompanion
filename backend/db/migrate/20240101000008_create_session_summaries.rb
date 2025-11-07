class CreateSessionSummaries < ActiveRecord::Migration[7.1]
  def change
    create_table :session_summaries do |t|
      t.references :session, null: false, foreign_key: true, index: false  # Index added explicitly below with unique constraint
      t.references :student, null: false, foreign_key: true, index: false  # Index added explicitly below
      t.references :transcript, foreign_key: true, null: true, index: false  # Index added explicitly below
      t.references :transcript_analysis, foreign_key: { to_table: :transcript_analyses }, null: true
      t.text :extracted_topics, array: true, default: []
      t.text :key_concepts, array: true, default: []
      t.text :learning_points
      t.text :strengths_identified, array: true, default: []
      t.text :areas_for_improvement, array: true, default: []
      # t.vector :embeddings, limit: 1536  # Temporarily disabled - requires pgvector extension
      t.string :processing_status, default: 'pending' # pending, processing, completed, failed
      t.text :error_message
      t.datetime :processed_at

      t.timestamps
    end

    add_index :session_summaries, :session_id, unique: true
    add_index :session_summaries, :student_id
    add_index :session_summaries, :processing_status
    add_index :session_summaries, :transcript_id
  end
end

