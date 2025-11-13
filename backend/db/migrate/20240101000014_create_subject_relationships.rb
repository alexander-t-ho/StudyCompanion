class CreateSubjectRelationships < ActiveRecord::Migration[7.1]
  def change
    create_table :subject_relationships do |t|
      t.string :source_subject, null: false
      t.string :target_subject, null: false
      t.string :relationship_type # 'prerequisite', 'related', 'next_level', 'complementary'
      t.decimal :strength, precision: 3, scale: 2, default: 1.0 # 0.0-1.0 relationship strength

      t.timestamps
    end

    add_index :subject_relationships, :source_subject
    add_index :subject_relationships, [:source_subject, :target_subject], unique: true
    add_index :subject_relationships, :target_subject
  end
end












