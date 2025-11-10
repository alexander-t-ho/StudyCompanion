# Background job to calculate daily metrics
class DailyMetricsCalculationJob < ApplicationJob
  queue_as :default

  def perform(date = Date.current)
    Rails.logger.info "Starting daily metrics calculation for #{date}"
    
    begin
      # Calculate engagement metrics
      AnalyticsService.calculate_dau(date: date)
      AnalyticsService.calculate_chat_frequency(date: date)
      AnalyticsService.calculate_practice_frequency(date: date)
      
      # Calculate learning metrics
      AnalyticsService.calculate_practice_completion_rate(date: date)
      AnalyticsService.calculate_practice_accuracy_rate(date: date)
      AnalyticsService.calculate_average_difficulty_level(date: date)
      
      # Calculate retention metrics
      AnalyticsService.calculate_goal_suggestion_acceptance_rate(date: date)
      AnalyticsService.calculate_nudge_conversion_rate(date: date)
      
      # Calculate business metrics
      AnalyticsService.calculate_total_sessions(date: date)
      AnalyticsService.calculate_average_sessions_per_student(date: date)
      
      # Calculate weekly metrics if it's the end of the week
      if date.end_of_week == date
        AnalyticsService.calculate_wau(week_start: date.beginning_of_week)
      end
      
      # Calculate monthly metrics if it's the end of the month
      if date.end_of_month == date
        AnalyticsService.calculate_mau(month_start: date.beginning_of_month)
      end
      
      Rails.logger.info "Daily metrics calculation completed for #{date}"
    rescue => e
      Rails.logger.error "Error calculating daily metrics for #{date}: #{e.message}\n#{e.backtrace.join("\n")}"
      raise e
    end
  end
end


