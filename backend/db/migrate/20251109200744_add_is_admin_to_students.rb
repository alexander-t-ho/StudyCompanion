class AddIsAdminToStudents < ActiveRecord::Migration[7.1]
  def change
    add_column :students, :is_admin, :boolean, default: false, null: false
  end
end
