class CreateTutorRoutingEvents < ActiveRecord::Migration[7.1]
  def change
    create_table :tutor_routing_events do |t|
      t.references :student, null: false, foreign_key: true, index: false  # Index added explicitly below
      t.references :conversation_message, foreign_key: true, null: true
      t.text :routing_reason
      t.decimal :routing_confidence, precision: 3, scale: 2
      t.string :urgency # low, medium, high
      t.boolean :session_booked, default: false
      t.references :session, foreign_key: true, null: true
      t.boolean :tutor_notified, default: false

      t.timestamps
    end

    add_index :tutor_routing_events, [:student_id, :created_at]
    add_index :tutor_routing_events, :session_booked
  end
end

