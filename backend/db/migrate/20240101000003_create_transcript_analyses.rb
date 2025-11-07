class CreateTranscriptAnalyses < ActiveRecord::Migration[7.1]
  def change
    create_table :transcript_analyses do |t|
      t.references :transcript, null: false, foreign_key: true, index: false  # Index added explicitly below with unique constraint
      t.jsonb :sentiment_analysis
      t.jsonb :concept_extraction
      t.jsonb :speaker_identification
      t.integer :engagement_score
      t.jsonb :engagement_metrics
      t.text :summary
      t.string :model_used
      t.integer :token_count
      t.decimal :analysis_cost, precision: 10, scale: 4
      t.boolean :validated, default: false
      t.integer :validation_rating
      t.text :validation_notes

      t.timestamps
    end

    add_index :transcript_analyses, :transcript_id, unique: true
    add_index :transcript_analyses, :validated
  end
end

