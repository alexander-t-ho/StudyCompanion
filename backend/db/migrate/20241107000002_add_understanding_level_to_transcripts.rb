class AddUnderstandingLevelToTranscripts < ActiveRecord::Migration[7.1]
  def change
    add_column :transcripts, :understanding_level, :decimal, precision: 5, scale: 2
    add_column :transcripts, :previous_understanding_level, :decimal, precision: 5, scale: 2
    add_column :transcripts, :goals_snapshot, :jsonb, default: {}
    add_column :transcripts, :session_history_summary, :jsonb, default: {}
    
    add_index :transcripts, :understanding_level
    add_index :transcripts, [:student_id, :subject, :understanding_level]
  end
end


