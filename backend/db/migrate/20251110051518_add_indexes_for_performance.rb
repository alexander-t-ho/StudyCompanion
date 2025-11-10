class AddIndexesForPerformance < ActiveRecord::Migration[7.1]
  def change
    # Indexes for Goals table - optimize queries by student_id and subject
    add_index :goals, [:student_id, :subject], if_not_exists: true, name: 'index_goals_on_student_id_and_subject'
    add_index :goals, [:student_id, :subject, :status], if_not_exists: true, name: 'index_goals_on_student_id_subject_status'
    
    # Indexes for Transcripts table - optimize queries by student_id and subject
    add_index :transcripts, [:student_id, :subject], if_not_exists: true, name: 'index_transcripts_on_student_id_and_subject'
    add_index :transcripts, [:student_id, :subject, :session_date], if_not_exists: true, name: 'index_transcripts_on_student_id_subject_session_date'
    
    # Index for understanding_level queries
    add_index :transcripts, [:student_id, :subject, :understanding_level], 
              where: 'understanding_level IS NOT NULL',
              if_not_exists: true,
              name: 'index_transcripts_on_student_id_subject_understanding_level'
  end
end
