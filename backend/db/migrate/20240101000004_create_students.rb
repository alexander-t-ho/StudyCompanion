class CreateStudents < ActiveRecord::Migration[7.1]
  def change
    create_table :students do |t|
      t.string :email, null: false
      t.string :name
      t.string :authentication_token
      t.boolean :ai_companion_enabled, default: false
      t.jsonb :metadata, default: {}

      t.timestamps
    end

    add_index :students, :email, unique: true
    add_index :students, :authentication_token
    add_index :students, :ai_companion_enabled
  end
end

