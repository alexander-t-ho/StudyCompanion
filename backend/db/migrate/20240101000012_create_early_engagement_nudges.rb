class CreateEarlyEngagementNudges < ActiveRecord::Migration[7.1]
  def change
    create_table :early_engagement_nudges do |t|
      t.references :student, null: false, foreign_key: true, index: false  # Index added explicitly below
      t.string :nudge_type
      t.text :message, null: false
      t.string :delivery_channel # in_app, email, push
      t.datetime :sent_at
      t.datetime :opened_at
      t.datetime :clicked_at
      t.boolean :session_booked, default: false
      t.references :session, foreign_key: true, null: true

      t.timestamps
    end

    add_index :early_engagement_nudges, [:student_id, :sent_at]
    add_index :early_engagement_nudges, :session_booked
  end
end

