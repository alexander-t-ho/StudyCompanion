class CreateStudyNotes < ActiveRecord::Migration[7.1]
  def change
    create_table :study_notes do |t|
      t.bigint :student_id, null: false
      t.string :subject
      t.string :concept
      t.text :message
      t.datetime :detected_at
      t.boolean :notified_tutor, default: false, null: false
      t.bigint :conversation_message_id

      t.timestamps
    end

    add_index :study_notes, :student_id
    add_index :study_notes, :conversation_message_id
    add_foreign_key :study_notes, :students
    add_foreign_key :study_notes, :conversation_messages
  end
end
