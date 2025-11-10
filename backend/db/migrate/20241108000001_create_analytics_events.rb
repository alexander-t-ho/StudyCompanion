class CreateAnalyticsEvents < ActiveRecord::Migration[7.1]
  def change
    create_table :analytics_events do |t|
      t.references :student, null: true, foreign_key: true, index: true
      t.string :event_type, null: false # chat_message, practice_generated, practice_submitted, goal_suggestion_viewed, nudge_sent, etc.
      t.string :event_category, null: false # engagement, learning, retention, system
      t.jsonb :properties, default: {} # Flexible properties for each event type
      t.string :session_id # Browser session ID
      t.string :user_agent
      t.string :ip_address
      t.datetime :occurred_at, null: false

      t.timestamps
    end

    add_index :analytics_events, :event_type
    add_index :analytics_events, :event_category
    add_index :analytics_events, :occurred_at
    add_index :analytics_events, [:student_id, :event_type, :occurred_at]
    add_index :analytics_events, [:event_type, :occurred_at]
  end
end


