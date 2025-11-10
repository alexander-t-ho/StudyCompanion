class AddUnderstandingLevelToSessionSummaries < ActiveRecord::Migration[7.1]
  def change
    add_column :session_summaries, :understanding_level, :decimal, precision: 5, scale: 2
    add_column :session_summaries, :previous_understanding_level, :decimal, precision: 5, scale: 2
    
    add_index :session_summaries, :understanding_level
    add_index :session_summaries, [:student_id, :understanding_level]
  end
end


