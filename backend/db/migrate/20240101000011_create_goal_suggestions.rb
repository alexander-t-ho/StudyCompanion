class CreateGoalSuggestions < ActiveRecord::Migration[7.1]
  def change
    create_table :goal_suggestions do |t|
      t.references :student, null: false, foreign_key: true, index: false  # Index added explicitly below
      t.references :source_goal, null: false, foreign_key: { to_table: :goals }, index: false  # Index added explicitly below
      t.string :suggested_subject, null: false
      t.string :suggested_goal_type
      t.text :reasoning
      t.decimal :confidence, precision: 3, scale: 2
      t.datetime :presented_at
      t.datetime :accepted_at
      t.references :created_goal, foreign_key: { to_table: :goals }, null: true

      t.timestamps
    end

    add_index :goal_suggestions, [:student_id, :presented_at]
    add_index :goal_suggestions, :source_goal_id
  end
end

