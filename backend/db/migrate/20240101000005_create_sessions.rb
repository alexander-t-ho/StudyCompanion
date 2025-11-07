class CreateSessions < ActiveRecord::Migration[7.1]
  def change
    create_table :sessions do |t|
      t.references :student, null: false, foreign_key: true, index: false  # Index added explicitly below
      t.integer :tutor_id, null: true # Can reference tutors table if exists, or students with tutor role
      t.string :subject
      t.string :topic
      t.datetime :scheduled_at
      t.datetime :started_at
      t.datetime :ended_at
      t.integer :duration_minutes
      t.string :status, default: 'scheduled' # scheduled, in_progress, completed, cancelled
      t.text :notes
      t.string :recording_url
      t.jsonb :metadata, default: {}

      t.timestamps
    end

    add_index :sessions, :student_id
    add_index :sessions, :status
    add_index :sessions, :scheduled_at
  end
end

