class AddPasswordAndUsernameToStudents < ActiveRecord::Migration[7.1]
  def change
    add_column :students, :password_digest, :string
    add_column :students, :username, :string
    add_index :students, :username, unique: true
  end
end
