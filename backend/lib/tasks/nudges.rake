namespace :nudges do
  desc "Send daily early engagement nudges (Day 7 and Day 10 follow-ups)"
  task deliver: :environment do
    puts "Starting daily nudge delivery at #{Time.current}"
    
    begin
      NudgeDeliveryJob.perform_now
      puts "Daily nudge delivery completed successfully"
    rescue => e
      puts "Error during nudge delivery: #{e.message}"
      puts e.backtrace.join("\n")
      raise
    end
  end

  desc "Check nudge eligibility for all students (for testing)"
  task check_eligibility: :environment do
    puts "Checking nudge eligibility for all students..."
    
    Student.find_each do |student|
      service = NudgeService.new(student)
      day_7_details = service.eligibility_details
      day_10_eligible = service.eligible_for_day_10_followup?
      
      if day_7_details[:eligible] || day_10_eligible
        puts "\nStudent #{student.id} (#{student.email}):"
        if day_7_details[:eligible]
          puts "  ✅ Eligible for Day 7 nudge"
          puts "     Days since first session: #{day_7_details[:days_since_first_session]}"
          puts "     Total sessions: #{day_7_details[:total_sessions]}"
        end
        if day_10_eligible
          puts "  ✅ Eligible for Day 10 follow-up"
        end
      end
    end
    
    puts "\nEligibility check complete"
  end
end


