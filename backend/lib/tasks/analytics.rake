namespace :analytics do
  desc "Calculate daily metrics for a specific date (defaults to today)"
  task :calculate_daily_metrics, [:date] => :environment do |t, args|
    date = args[:date] ? Date.parse(args[:date]) : Date.current
    puts "Calculating daily metrics for #{date}..."
    
    DailyMetricsCalculationJob.perform_now(date)
    
    puts "Daily metrics calculation completed for #{date}"
  end

  desc "Calculate daily metrics for a date range"
  task :calculate_range, [:start_date, :end_date] => :environment do |t, args|
    start_date = Date.parse(args[:start_date])
    end_date = Date.parse(args[:end_date])
    
    puts "Calculating daily metrics from #{start_date} to #{end_date}..."
    
    (start_date..end_date).each do |date|
      puts "Processing #{date}..."
      DailyMetricsCalculationJob.perform_now(date)
    end
    
    puts "Daily metrics calculation completed for range"
  end

  desc "Schedule daily metrics calculation job (runs at 2 AM)"
  task schedule_daily: :environment do
    # Schedule job to run daily at 2 AM
    # This would typically be done via cron or Sidekiq scheduler
    puts "To schedule daily metrics calculation, add to your cron or Sidekiq scheduler:"
    puts "  DailyMetricsCalculationJob.perform_later"
    puts "  Run daily at 2:00 AM"
  end
end


