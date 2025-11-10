class CreateGoalProgressSnapshots < ActiveRecord::Migration[7.1]
  def change
    create_table :goal_progress_snapshots do |t|
      t.references :student, null: false, foreign_key: true, index: false
      t.references :goal, null: false, foreign_key: true, index: false
      t.decimal :completion_percentage, precision: 5, scale: 2
      t.integer :milestones_completed, default: 0
      t.date :estimated_completion_date
      t.date :snapshot_date, null: false

      t.timestamps
    end

    add_index :goal_progress_snapshots, [:student_id, :snapshot_date]
    add_index :goal_progress_snapshots, [:goal_id, :snapshot_date]
    add_index :goal_progress_snapshots, :snapshot_date
  end
end


