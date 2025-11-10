class AddSessionDateAndCountToTranscripts < ActiveRecord::Migration[7.1]
  def change
    add_column :transcripts, :session_date, :date
    add_column :transcripts, :session_count_this_week, :integer
    
    add_index :transcripts, :session_date
  end
end


