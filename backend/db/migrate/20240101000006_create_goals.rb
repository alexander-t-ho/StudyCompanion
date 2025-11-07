class CreateGoals < ActiveRecord::Migration[7.1]
  def change
    create_table :goals do |t|
      t.references :student, null: false, foreign_key: true, index: false  # Index added explicitly below
      t.string :subject, null: false
      t.string :goal_type
      t.string :title
      t.text :description
      t.string :status, default: 'active' # active, completed, paused, cancelled
      t.date :target_date
      t.date :completed_at
      t.integer :progress_percentage, default: 0
      t.jsonb :metadata, default: {}

      t.timestamps
    end

    add_index :goals, :student_id
    add_index :goals, :status
    add_index :goals, [:student_id, :status]
  end
end

