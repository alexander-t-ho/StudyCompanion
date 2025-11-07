class CreatePracticeProblems < ActiveRecord::Migration[7.1]
  def change
    create_table :practice_problems do |t|
      t.references :student, null: false, foreign_key: true, index: false  # Index added explicitly below
      t.references :goal, foreign_key: true, null: true, index: false  # Index added explicitly below
      t.string :subject
      t.string :topic
      t.integer :difficulty_level # 1-10 scale
      t.jsonb :problem_content, null: false
      t.jsonb :correct_answer
      t.jsonb :solution_steps
      t.datetime :assigned_at, default: -> { 'CURRENT_TIMESTAMP' }
      t.datetime :completed_at
      t.jsonb :student_answer
      t.boolean :is_correct
      t.text :feedback
      t.integer :attempts_count, default: 0

      t.timestamps
    end

    add_index :practice_problems, [:student_id, :assigned_at]
    add_index :practice_problems, :goal_id
    add_index :practice_problems, [:student_id, :completed_at]
  end
end

