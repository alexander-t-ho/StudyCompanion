class AddVariantToEarlyEngagementNudges < ActiveRecord::Migration[7.1]
  def change
    add_column :early_engagement_nudges, :variant, :string
    add_index :early_engagement_nudges, :variant
  end
end


