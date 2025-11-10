class NudgeService
  def initialize(student, api_key: nil, use_openrouter: false)
    @student = student
    @api_key = api_key
    @use_openrouter = use_openrouter
    @ai_service = nil
    
    # Initialize AI service if API key is available
    if @api_key.present? || ENV['OPENAI_API_KEY'].present?
      begin
        @ai_service = AiCompanionService.new(
          api_key: @api_key || ENV['OPENAI_API_KEY'],
          use_openrouter: @use_openrouter || ENV['USE_OPENROUTER'] == 'true'
        )
      rescue => e
        Rails.logger.warn "Failed to initialize AI service for nudge messages: #{e.message}"
        @ai_service = nil
      end
    end
  end

  # Check if student is eligible for early engagement nudge
  # Eligibility: Day 7 after first session, <3 sessions total
  def eligible_for_nudge?
    return false if @student.nil? || @student.sessions.empty?

    begin
      first_session = @student.sessions.order(:created_at).first
      return false unless first_session

      days_since_first = (Date.current - first_session.created_at.to_date).to_i
      total_sessions = @student.sessions.completed.count

      # Check if it's Day 7 or later
      return false if days_since_first < 7

      # Check if student has <3 completed sessions
      return false if total_sessions >= 3

      # Check if student already received a nudge for this eligibility period
      return false if already_nudged_recently?

      true
    rescue => e
      Rails.logger.error "Error in eligible_for_nudge?: #{e.message}"
      false
    end
  end

  # Generate and send a nudge
  def send_nudge(delivery_channel = 'in_app', variant = nil)
    return { success: false, reason: 'not_eligible' } unless eligible_for_nudge?

    # Check if nudge already exists but not sent
    existing_nudge = @student.early_engagement_nudges
                             .where(nudge_type: 'day_7_reminder', sent_at: nil)
                             .first

    if existing_nudge
      nudge = existing_nudge
    else
      # Select variant if not provided
      variant ||= select_nudge_variant
      
      # Try AI generation first, fallback to rule-based
      message = generate_nudge_message(variant)
      
      nudge = @student.early_engagement_nudges.create!(
        nudge_type: 'day_7_reminder',
        message: message,
        delivery_channel: delivery_channel,
        variant: variant
      )
    end

    # Mark as sent and deliver via appropriate channel
    nudge.mark_sent!
    deliver_nudge(nudge, delivery_channel)

    { success: true, nudge: nudge }
  end

  # Deliver nudge via specified channel
  def deliver_nudge(nudge, delivery_channel)
    case delivery_channel
    when 'email'
      EmailDeliveryService.deliver_nudge(nudge, @student)
    when 'push'
      PushNotificationService.deliver_nudge(nudge, @student)
    when 'in_app'
      # In-app delivery is handled by frontend
      { success: true, channel: 'in_app' }
    else
      { success: false, error: 'Unknown delivery channel' }
    end
  end

  # Generate personalized nudge message (AI-enhanced with rule-based fallback)
  # Supports A/B testing with different variants
  def generate_nudge_message(variant = nil)
    total_sessions = @student.sessions.completed.count
    first_session = @student.sessions.order(:created_at).first
    days_since_first = (Date.current - first_session.created_at.to_date).to_i

    # Get recent topics/subjects from sessions
    recent_subjects = @student.sessions.completed.limit(3).pluck(:subject).uniq
    subject_text = recent_subjects.any? ? recent_subjects.join(' and ') : 'your studies'

    # Select variant randomly if not specified (A/B testing)
    variant ||= select_nudge_variant

    # Try AI generation first, fallback to rule-based
    if @ai_service
      begin
        ai_message = generate_ai_nudge_message(variant, total_sessions, days_since_first, recent_subjects)
        return ai_message if ai_message.present?
      rescue => e
        Rails.logger.error "AI nudge generation failed, falling back to rule-based: #{e.message}"
        # Fall through to rule-based generation
      end
    end

    # Rule-based fallback
    generate_rule_based_nudge_message(variant, total_sessions, subject_text)
  end

  # Generate nudge message using AI
  def generate_ai_nudge_message(variant, total_sessions, days_since_first, recent_subjects)
    return nil unless @ai_service

    # Build context for AI
    progress_metrics = {
      completion_rate: total_sessions.to_f / 3.0, # Target is 3 sessions
      sessions_completed: total_sessions,
      days_since_first: days_since_first
    }

    # Call AI service
    ai_result = @ai_service.generate_nudge_message(
      student: @student,
      nudge_type: 'early_engagement',
      context: {
        sessions: total_sessions,
        days: days_since_first,
        topics: recent_subjects,
        progress_metrics: progress_metrics,
        variant: variant
      }
    )

    ai_result[:message] if ai_result && ai_result[:message].present?
  end

  # Generate rule-based nudge message (fallback)
  def generate_rule_based_nudge_message(variant, total_sessions, subject_text)
    # Generate message based on variant and progress
    case variant
    when 'progress_focused'
      if total_sessions == 1
        "You've completed 1 session and made great progress in #{subject_text}! Continue your momentum - book your next session to keep building on what you've learned."
      else
        "You've completed #{total_sessions} sessions and mastered key concepts in #{subject_text}. Continue your momentum - book your next session!"
      end
    when 'fomo_focused'
      "Don't lose the progress you've made in #{subject_text}! Book your next session soon to keep building on what you've learned."
    when 'achievement_focused'
      "You're on track! You've been working on #{subject_text} - keep going with your next session."
    else # 'personalized' or default
      if total_sessions == 1
        "You've made great progress in #{subject_text}! Don't lose momentum - book your next session to continue building on what you've learned."
      elsif total_sessions == 2
        "You're doing great! You've completed 2 sessions in #{subject_text}. Keep the momentum going by booking your next session."
      else
        "Continue your learning journey! You've been working on #{subject_text} - book your next session to keep making progress."
      end
    end
  end

  # Select nudge variant for A/B testing (random assignment)
  def select_nudge_variant
    variants = ['progress_focused', 'fomo_focused', 'achievement_focused', 'personalized']
    variants.sample
  end

  # Check if student already received a nudge recently (within last 3 days)
  def already_nudged_recently?
    @student.early_engagement_nudges
            .where(nudge_type: 'day_7_reminder')
            .where('sent_at > ?', 3.days.ago)
            .exists?
  end

  # Check if student is eligible for Day 10 follow-up nudge
  # Eligibility: Received Day 7 nudge, no session booked, Day 10+ since first session
  def eligible_for_day_10_followup?
    return false if @student.sessions.empty?

    first_session = @student.sessions.order(:created_at).first
    days_since_first = (Date.current - first_session.created_at.to_date).to_i

    # Must be Day 10 or later
    return false if days_since_first < 10

    # Must have received Day 7 nudge
    day_7_nudge = @student.early_engagement_nudges
                          .where(nudge_type: 'day_7_reminder')
                          .where.not(sent_at: nil)
                          .order(sent_at: :desc)
                          .first

    return false unless day_7_nudge

    # Must not have booked a session after Day 7 nudge
    return false if day_7_nudge.session_booked?

    # Must not have already received Day 10 follow-up
    return false if @student.early_engagement_nudges
                            .where(nudge_type: 'day_10_followup')
                            .exists?

    true
  end

  # Generate and send Day 10 follow-up nudge
  def send_day_10_followup(delivery_channel = 'in_app', variant = nil)
    return { success: false, reason: 'not_eligible' } unless eligible_for_day_10_followup?

    variant ||= select_nudge_variant
    message = generate_day_10_message(variant)
    nudge = @student.early_engagement_nudges.create!(
      nudge_type: 'day_10_followup',
      message: message,
      delivery_channel: delivery_channel,
      variant: variant
    )

    nudge.mark_sent!
    deliver_nudge(nudge, delivery_channel)

    { success: true, nudge: nudge }
  end

  # Generate Day 10 follow-up message
  def generate_day_10_message(variant = nil)
    total_sessions = @student.sessions.completed.count
    recent_subjects = @student.sessions.completed.limit(3).pluck(:subject).uniq
    subject_text = recent_subjects.any? ? recent_subjects.join(' and ') : 'your studies'

    variant ||= select_nudge_variant

    # Try AI generation first, fallback to rule-based
    if @ai_service
      begin
        first_session = @student.sessions.order(:created_at).first
        days_since_first = (Date.current - first_session.created_at.to_date).to_i
        
        ai_message = generate_ai_nudge_message(variant, total_sessions, days_since_first, recent_subjects)
        return ai_message if ai_message.present?
      rescue => e
        Rails.logger.error "AI Day 10 nudge generation failed, falling back to rule-based: #{e.message}"
        # Fall through to rule-based generation
      end
    end

    # Rule-based fallback
    case variant
    when 'fomo_focused'
      "We noticed you haven't booked a session yet. Don't let your progress in #{subject_text} slip away - schedule your next session soon!"
    when 'progress_focused'
      "You've made progress in #{subject_text}, but it's been a while. Keep the momentum going - book your next session to continue learning!"
    else
      "We noticed you haven't booked a session yet. Don't let your progress in #{subject_text} slip away - schedule your next session to keep building on what you've learned!"
    end
  end

  # Get nudge eligibility details
  def eligibility_details
    return { eligible: false, reason: 'no_sessions', days_since_first_session: 0, total_sessions: 0 } if @student.nil? || @student.sessions.empty?

    begin
      first_session = @student.sessions.order(:created_at).first
      return { eligible: false, reason: 'no_sessions', days_since_first_session: 0, total_sessions: 0 } unless first_session

      days_since_first = (Date.current - first_session.created_at.to_date).to_i
      total_sessions = @student.sessions.completed.count

      {
        eligible: eligible_for_nudge?,
        days_since_first_session: days_since_first,
        total_sessions: total_sessions,
        first_session_date: first_session.created_at.to_date,
        reason: eligible_for_nudge? ? nil : determine_ineligibility_reason(days_since_first, total_sessions)
      }
    rescue => e
      Rails.logger.error "Error in eligibility_details: #{e.message}\n#{e.backtrace.join("\n")}"
      { eligible: false, reason: "error: #{e.message}", days_since_first_session: 0, total_sessions: 0 }
    end
  end

  private

  def determine_ineligibility_reason(days_since_first, total_sessions)
    if days_since_first < 7
      "Not yet Day 7 (currently Day #{days_since_first})"
    elsif total_sessions >= 3
      "Student has #{total_sessions} sessions (requires <3)"
    elsif already_nudged_recently?
      "Already received nudge recently"
    else
      "Unknown reason"
    end
  end
end

