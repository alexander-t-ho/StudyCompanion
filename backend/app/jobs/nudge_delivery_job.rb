class NudgeDeliveryJob < ApplicationJob
  queue_as :default

  def perform
    Rails.logger.info "Starting daily nudge delivery job at #{Time.current}"

    # Process Day 7 nudges
    process_day_7_nudges

    # Process Day 10 follow-up nudges
    process_day_10_followups

    Rails.logger.info "Completed daily nudge delivery job"
  end

  private

  def process_day_7_nudges
    eligible_students = find_day_7_eligible_students

    Rails.logger.info "Found #{eligible_students.count} students eligible for Day 7 nudge"

    eligible_students.find_each do |student|
      begin
        # Use environment API key if available
        api_key = ENV['OPENAI_API_KEY']
        use_openrouter = ENV['USE_OPENROUTER'] == 'true'
        
        service = NudgeService.new(
          student,
          api_key: api_key,
          use_openrouter: use_openrouter
        )
        result = service.send_nudge('in_app')

        if result[:success]
          Rails.logger.info "Sent Day 7 nudge to student #{student.id}"
        else
          Rails.logger.warn "Failed to send Day 7 nudge to student #{student.id}: #{result[:reason]}"
        end
      rescue => e
        Rails.logger.error "Error sending Day 7 nudge to student #{student.id}: #{e.message}"
      end
    end
  end

  def process_day_10_followups
    eligible_students = find_day_10_eligible_students

    Rails.logger.info "Found #{eligible_students.count} students eligible for Day 10 follow-up"

    eligible_students.find_each do |student|
      begin
        # Use environment API key if available
        api_key = ENV['OPENAI_API_KEY']
        use_openrouter = ENV['USE_OPENROUTER'] == 'true'
        
        service = NudgeService.new(
          student,
          api_key: api_key,
          use_openrouter: use_openrouter
        )
        result = service.send_day_10_followup('in_app')

        if result[:success]
          Rails.logger.info "Sent Day 10 follow-up to student #{student.id}"
        else
          Rails.logger.warn "Failed to send Day 10 follow-up to student #{student.id}: #{result[:reason]}"
        end
      rescue => e
        Rails.logger.error "Error sending Day 10 follow-up to student #{student.id}: #{e.message}"
      end
    end
  end

  def find_day_7_eligible_students
    # Use NudgeService to check eligibility for each student
    # This is simpler and reuses existing logic
    Student.joins(:sessions)
           .distinct
           .select { |student| day_7_eligible?(student) }
  end

  def find_day_10_eligible_students
    # Use NudgeService to check eligibility for each student
    Student.joins(:sessions)
           .distinct
           .select { |student| day_10_eligible?(student) }
  end

  def day_7_eligible?(student)
    return false if student.sessions.empty?

    first_session = student.sessions.order(:created_at).first
    days_since_first = (Date.current - first_session.created_at.to_date).to_i
    total_sessions = student.sessions.completed.count

    # Day 7+ and <3 sessions
    return false unless days_since_first >= 7 && total_sessions < 3

    # Haven't received nudge recently
    !student.early_engagement_nudges
            .where(nudge_type: 'day_7_reminder')
            .where('sent_at > ?', 3.days.ago)
            .exists?
  end

  def day_10_eligible?(student)
    return false if student.sessions.empty?

    first_session = student.sessions.order(:created_at).first
    days_since_first = (Date.current - first_session.created_at.to_date).to_i

    # Must be Day 10+
    return false unless days_since_first >= 10

    # Must have received Day 7 nudge
    day_7_nudge = student.early_engagement_nudges
                         .where(nudge_type: 'day_7_reminder')
                         .where.not(sent_at: nil)
                         .order(sent_at: :desc)
                         .first

    return false unless day_7_nudge
    return false if day_7_nudge.session_booked?
    return false if student.early_engagement_nudges.where(nudge_type: 'day_10_followup').exists?

    true
  end
end

