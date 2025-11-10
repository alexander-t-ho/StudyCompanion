class CreateAbTestVariations < ActiveRecord::Migration[7.1]
  def change
    create_table :ab_test_variations do |t|
      t.references :student, null: false, foreign_key: true, index: true
      t.string :test_name, null: false # practice_problem_type, difficulty_curve, suggestion_algorithm, etc.
      t.string :variation_name, null: false # control, variant_a, variant_b, etc.
      t.boolean :is_active, default: true
      t.datetime :assigned_at, null: false
      t.datetime :ended_at
      t.jsonb :metadata, default: {} # Additional test configuration

      t.timestamps
    end

    add_index :ab_test_variations, :test_name
    add_index :ab_test_variations, [:student_id, :test_name, :is_active]
    add_index :ab_test_variations, [:test_name, :variation_name]
  end
end


