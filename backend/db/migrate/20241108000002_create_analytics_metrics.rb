class CreateAnalyticsMetrics < ActiveRecord::Migration[7.1]
  def change
    create_table :analytics_metrics do |t|
      t.references :student, null: true, foreign_key: true, index: true
      t.string :metric_name, null: false # dau, wau, mau, practice_completion_rate, chat_frequency, etc.
      t.string :metric_category, null: false # engagement, learning, retention, business
      t.decimal :metric_value, precision: 15, scale: 4, null: false
      t.string :metric_unit # count, percentage, duration, cost, etc.
      t.date :metric_date, null: false
      t.jsonb :dimensions, default: {} # Additional dimensions (subject, feature, etc.)
      t.string :aggregation_period, default: 'daily' # daily, weekly, monthly

      t.timestamps
    end

    add_index :analytics_metrics, :metric_name
    add_index :analytics_metrics, :metric_category
    add_index :analytics_metrics, :metric_date
    add_index :analytics_metrics, [:student_id, :metric_name, :metric_date]
    add_index :analytics_metrics, [:metric_name, :metric_date, :aggregation_period]
  end
end


