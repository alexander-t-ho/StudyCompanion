class CreateConversationMessages < ActiveRecord::Migration[7.1]
  def change
    create_table :conversation_messages do |t|
      t.references :student, null: false, foreign_key: true, index: false  # Index added explicitly below
      t.references :ai_companion_profile, foreign_key: true, null: true, index: false  # Index added explicitly below
      t.string :role, null: false # 'user' or 'assistant'
      t.text :content, null: false
      t.jsonb :context, default: {}
      t.references :session, foreign_key: true, null: true
      t.references :session_summary, foreign_key: true, null: true

      t.timestamps
    end

    add_index :conversation_messages, [:student_id, :created_at]
    add_index :conversation_messages, :ai_companion_profile_id
    add_index :conversation_messages, :role
  end
end

