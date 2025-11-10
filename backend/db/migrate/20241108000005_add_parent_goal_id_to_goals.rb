class AddParentGoalIdToGoals < ActiveRecord::Migration[7.1]
  def change
    add_reference :goals, :parent_goal, foreign_key: { to_table: :goals }, null: true, index: true
  end
end


