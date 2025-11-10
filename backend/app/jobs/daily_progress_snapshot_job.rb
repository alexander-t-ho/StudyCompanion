class DailyProgressSnapshotJob < ApplicationJob
  queue_as :default

  def perform
    Rails.logger.info "Starting daily progress snapshot job at #{Time.current}"

    GoalProgressSnapshotService.create_snapshots_for_all_students

    Rails.logger.info "Completed daily progress snapshot job"
  rescue => e
    Rails.logger.error "Error in daily progress snapshot job: #{e.message}"
    raise
  end
end


