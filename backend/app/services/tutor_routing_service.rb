# Service to determine when a student should be routed to a human tutor
# Analyzes conversations, understanding level, and student behavior

require 'openai'
require 'httparty'

class TutorRoutingService
  def initialize(api_key: nil, use_openrouter: false)
    @api_key = api_key || ENV['OPENAI_API_KEY']
    @use_openrouter = use_openrouter || ENV['USE_OPENROUTER'] == 'true'
    @openrouter_api_key = ENV['OPENROUTER_API_KEY']
  end

  # Check if routing is needed based on conversation
  def check_routing_needed(student:, conversation_context: {})
    practice_problem_id = conversation_context[:practice_problem_id]
    subject = conversation_context[:subject]
    
    # Get recent conversation (filtered by practice problem if provided)
    recent_messages = get_recent_conversation_for_routing(student, practice_problem_id, subject)
    
    return { routing_needed: false, confidence: 0.0, reason: 'No conversation history' } if recent_messages.empty?
    
    # Check for explicit triggers first (fast path)
    explicit_trigger = check_explicit_triggers(recent_messages, student, practice_problem_id)
    if explicit_trigger[:routing_needed]
      analysis = explicit_trigger
      if analysis[:confidence] >= 0.7
        create_routing_event(student, analysis, recent_messages.last, practice_problem_id)
      end
      return analysis
    end
    
    # Get student understanding level
    understanding_context = get_understanding_context(student)
    
    # Build analysis prompt
    prompt = build_routing_analysis_prompt(
      student: student,
      recent_messages: recent_messages,
      understanding_context: understanding_context,
      conversation_context: conversation_context
    )
    
    # Analyze using LLM
    analysis = analyze_via_llm(prompt)
    
    # Create routing event if needed
    if analysis[:routing_needed] && analysis[:confidence] >= 0.7
      create_routing_event(student, analysis, recent_messages.last, practice_problem_id)
    end
    
    analysis
  end

  # Get recent conversation for routing analysis
  def get_recent_conversation_for_routing(student, practice_problem_id, subject)
    query = student.conversation_messages
    
    if practice_problem_id.present?
      query = query.where("context->>'practice_problem_id' = ?", practice_problem_id.to_s)
    end
    
    if subject.present?
      query = query.where("context->>'subject' = ?", subject)
    end
    
    query.order(created_at: :desc).limit(20).reverse
  end

  # Check for explicit handoff triggers (fast path before LLM analysis)
  def check_explicit_triggers(recent_messages, student, practice_problem_id)
    triggers = []
    confidence = 0.0
    
    # 1. Explicit request check
    recent_messages.each do |msg|
      if msg.role == 'user'
        content_lower = msg.content.downcase
        if content_lower.match?(/\b(human|real person|tutor|talk to someone|speak with|connect me)\b/)
          triggers << 'explicit_request'
          confidence = 1.0
          return {
            routing_needed: true,
            confidence: confidence,
            reason: 'Student explicitly requested human tutor',
            urgency: 'high',
            subject: nil,
            triggers: triggers
          }
        end
      end
    end
    
    # 2. High interaction count (>10 turns on single problem)
    if practice_problem_id.present?
      problem_messages = recent_messages.select { |m| 
        m.context&.dig('practice_problem_id') == practice_problem_id.to_s 
      }
      if problem_messages.length > 10
        triggers << 'high_interaction_count'
        confidence = [confidence, 0.8].max
      end
    end
    
    # 3. Frustration/Emotional cues (keyword detection)
    frustration_keywords = ['stuck', 'give up', 'hate', 'impossible', 'cant', "can't", 'dont understand', "don't understand", 'confused', 'frustrated']
    frustration_count = 0
    recent_messages.each do |msg|
      if msg.role == 'user'
        content_lower = msg.content.downcase
        frustration_keywords.each do |keyword|
          if content_lower.include?(keyword)
            frustration_count += 1
            triggers << 'frustration_cues' unless triggers.include?('frustration_cues')
          end
        end
        # Check for repeated exclamations
        if msg.content.scan(/[!?]{2,}/).any?
          triggers << 'frustration_cues' unless triggers.include?('frustration_cues')
          frustration_count += 1
        end
      end
    end
    
    if frustration_count >= 2
      confidence = [confidence, 0.85].max
    elsif frustration_count == 1
      confidence = [confidence, 0.6].max
    end
    
    # 4. No progress check (mastery not increased after 3 attempts)
    if practice_problem_id.present?
      practice_problem = student.practice_problems.find_by(id: practice_problem_id)
      if practice_problem && practice_problem.attempts_count && practice_problem.attempts_count >= 3
        # Check if understanding level has improved
        current_level = get_current_understanding_for_problem(student, practice_problem)
        # This is a simplified check - in production, would track level at start vs now
        triggers << 'no_progress' unless triggers.include?('no_progress')
        confidence = [confidence, 0.75].max
      end
    end
    
    if triggers.any? && confidence >= 0.6
      {
        routing_needed: true,
        confidence: confidence,
        reason: "Handoff triggers detected: #{triggers.join(', ')}",
        urgency: confidence >= 0.8 ? 'high' : 'medium',
        subject: nil,
        triggers: triggers
      }
    else
      { routing_needed: false, confidence: 0.0, reason: 'No explicit triggers detected', urgency: 'low', subject: nil, triggers: [] }
    end
  end

  def get_current_understanding_for_problem(student, practice_problem)
    transcript = Transcript
      .where(student_id: student.id, subject: practice_problem.subject)
      .where.not(understanding_level: nil)
      .order(session_date: :desc, created_at: :desc)
      .first
    
    transcript&.understanding_level || 0
  end

  # Create handoff package with all context for human tutor
  def create_handoff_package(student, practice_problem, conversation, reason)
    # Get conversation transcript (last 20 turns)
    conversation_transcript = conversation.map do |msg|
      {
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at
      }
    end
    
    # Get mastery summary
    mastery_summary = build_mastery_summary(student, practice_problem)
    
    # Get current problem state
    problem_state = if practice_problem
      {
        problem_id: practice_problem.id,
        subject: practice_problem.subject,
        topic: practice_problem.topic,
        difficulty: practice_problem.difficulty_level,
        question: practice_problem.problem_content&.dig('question'),
        last_attempt: practice_problem.student_answer,
        attempts_count: practice_problem.attempts_count,
        hints_used: practice_problem.hints_used,
        is_correct: practice_problem.is_correct,
        status: practice_problem.completed? ? 'completed' : 'in_progress'
      }
    else
      nil
    end
    
    {
      student_id: student.id,
      student_name: student.name || student.email,
      problem_id: practice_problem&.id,
      problem_state: problem_state,
      conversation_transcript: conversation_transcript,
      mastery_summary: mastery_summary,
      reason_for_handoff: reason,
      created_at: Time.current
    }
  end

  # Build mastery summary for handoff package
  def build_mastery_summary(student, practice_problem)
    summary_parts = []
    
    if practice_problem
      subject = practice_problem.subject
      topic = practice_problem.topic
      
      # Get understanding level for this subject/topic
      transcript = Transcript
        .where(student_id: student.id, subject: subject)
        .where.not(understanding_level: nil)
        .order(session_date: :desc, created_at: :desc)
        .first
      
      if transcript
        level = transcript.understanding_level
        summary_parts << "Student mastery: #{level.round(1)}% on #{topic || subject}"
      end
      
      # Get misconceptions if available
      recent_messages = student.conversation_messages
        .where("context->>'practice_problem_id' = ?", practice_problem.id.to_s)
        .order(created_at: :desc)
        .limit(10)
      
      misconceptions = []
      recent_messages.each do |msg|
        if msg.context&.dig('misconceptions')
          misconceptions.concat(msg.context['misconceptions'])
        end
      end
      
      if misconceptions.any?
        summary_parts << "Known misconceptions: #{misconceptions.uniq.join('; ')}"
      end
    end
    
    # Get last correct topic
    last_correct = Transcript
      .where(student_id: student.id)
      .where.not(understanding_level: nil)
      .where('understanding_level > ?', 70)
      .order(session_date: :desc, created_at: :desc)
      .first
    
    if last_correct
      summary_parts << "Last correct topic: #{last_correct.topic} (#{last_correct.subject})"
    end
    
    summary_parts.join('. ')
  end

  # Request routing and suggest tutors
  def request_routing(student:, routing_event_id: nil, subject: nil)
    routing_event = routing_event_id ? 
      student.tutor_routing_events.find(routing_event_id) : 
      student.tutor_routing_events.order(created_at: :desc).first
    
    return { error: 'No routing event found' } unless routing_event
    
    # Extract subject if not provided
    subject ||= extract_subject_from_conversation(routing_event.conversation_message) ||
                student.goals.active.first&.subject ||
                'General'
    
    # Get suggested tutors (placeholder - would integrate with actual tutor system)
    suggested_tutors = suggest_tutors(student, subject)
    
    # Create handoff package
    practice_problem_id = routing_event.metadata&.dig('practice_problem_id')
    practice_problem = practice_problem_id ? student.practice_problems.find_by(id: practice_problem_id) : nil
    
    recent_messages = get_recent_conversation_for_routing(student, practice_problem_id, subject)
    handoff_package = create_handoff_package(student, practice_problem, recent_messages, routing_event.routing_reason)
    
    {
      routing_event: routing_event,
      suggested_tutors: suggested_tutors,
      routing_context: build_routing_context(routing_event, student),
      handoff_package: handoff_package
    }
  end

  private

  def get_understanding_context(student)
    # Get current understanding levels
    transcripts = Transcript
      .where(student_id: student.id)
      .where.not(understanding_level: nil)
      .select('subject, MAX(session_date) as latest_date')
      .group(:subject)
    
    context_parts = []
    transcripts.each do |row|
      latest = Transcript
        .where(student_id: student.id, subject: row.subject, session_date: row.latest_date)
        .where.not(understanding_level: nil)
        .order(created_at: :desc)
        .first
      
      if latest
        context_parts << "#{row.subject}: #{latest.understanding_level.round(1)}%"
      end
    end
    
    context_parts.any? ? context_parts.join(', ') : 'No understanding data available'
  end

  def build_routing_analysis_prompt(student:, recent_messages:, understanding_context:, conversation_context:)
    conversation_text = recent_messages.map do |msg|
      role = msg.role == 'user' ? 'Student' : 'AI Companion'
      "#{role}: #{msg.content}"
    end.join("\n\n")
    
    practice_problem_id = conversation_context[:practice_problem_id]
    problem_context = ""
    if practice_problem_id.present?
      practice_problem = student.practice_problems.find_by(id: practice_problem_id)
      if practice_problem
        problem_context = <<~PROBLEM
          
          Current Practice Problem:
          - Subject: #{practice_problem.subject}
          - Topic: #{practice_problem.topic || 'General'}
          - Difficulty: Level #{practice_problem.difficulty_level}
          - Attempts: #{practice_problem.attempts_count || 0}
          - Hints Used: #{practice_problem.hints_used || 0}
          - Status: #{practice_problem.completed? ? 'Completed' : 'In Progress'}
        PROBLEM
      end
    end
    
    <<~PROMPT
      Analyze this conversation to determine if the student needs human tutor intervention.
      
      Student Context:
      - Understanding Levels: #{understanding_context}
      - Recent Topics: #{get_recent_topics(student).join(', ')}
      #{problem_context}
      
      Conversation (last #{recent_messages.length} messages):
      #{conversation_text}
      
      Additional Context:
      #{conversation_context.to_json}
      
      Determine if routing to a human tutor is needed based on these triggers:
      1. High Interaction Count: >10 conversational turns on a single problem
      2. No Progress: Student's mastery score for the sub-topic has not increased after 3 consecutive attempts/guidance sessions
      3. Frustration/Emotional Cues: Keywords like "stuck," "give up," "hate," or repeated exclamations
      4. Explicit Request: Student types "human," "real person," "tutor"
      5. AI Fallback: AI model returns an error or an irrelevant response (hallucination)
      6. Question complexity beyond AI capability
      7. Repeated struggles with the same concept
      8. Understanding level declining or stuck
      
      Respond with valid JSON:
      {
        "routing_needed": true/false,
        "confidence": 0.0-1.0,
        "reason": "Explanation of why routing is needed or not",
        "urgency": "low|medium|high",
        "subject": "Subject area if applicable",
        "triggers": ["trigger1", "trigger2"]
      }
      
      Analyze now:
    PROMPT
  end

  def analyze_via_llm(prompt)
    model = @use_openrouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini'
    
    messages = [
      {
        role: 'system',
        content: 'You are an expert at analyzing student conversations to determine when human tutor intervention is needed. Be thoughtful and considerate.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]
    
    begin
      if @use_openrouter && @openrouter_api_key
        response = HTTParty.post(
          'https://openrouter.ai/api/v1/chat/completions',
          headers: {
            'Authorization' => "Bearer #{@openrouter_api_key}",
            'Content-Type' => 'application/json',
            'HTTP-Referer' => ENV['APP_URL'] || 'http://localhost:3000',
            'X-Title' => 'Study Companion'
          },
          body: {
            model: model,
            messages: messages,
            temperature: 0.3, # Lower temperature for more consistent classification
            max_tokens: 500,
            response_format: { type: 'json_object' }
          }.to_json
        )
        
        if response.success?
          content = response.dig('choices', 0, 'message', 'content')
          parse_routing_response(content)
        else
          Rails.logger.error "OpenRouter API error: #{response.body}"
          { routing_needed: false, confidence: 0.0, reason: 'Analysis failed', urgency: 'low', subject: nil, triggers: [] }
        end
      elsif @api_key
        client = OpenAI::Client.new(access_token: @api_key)
        response = client.chat(
          parameters: {
            model: model,
            messages: messages,
            temperature: 0.3,
            max_tokens: 500,
            response_format: { type: 'json_object' }
          }
        )
        content = response.dig('choices', 0, 'message', 'content')
        parse_routing_response(content)
      else
        # No API key available - return default response
        { routing_needed: false, confidence: 0.0, reason: 'API key not configured', urgency: 'low', subject: nil, triggers: [] }
      end
    rescue => e
      Rails.logger.error "Routing analysis error: #{e.message}\n#{e.backtrace.first(5).join("\n")}"
      { routing_needed: false, confidence: 0.0, reason: "Analysis error: #{e.message}", urgency: 'low', subject: nil, triggers: [] }
    end
  end

  def parse_routing_response(content)
    begin
      parsed = JSON.parse(content)
      {
        routing_needed: parsed['routing_needed'] || false,
        confidence: parsed['confidence']&.to_f || 0.0,
        reason: parsed['reason'] || '',
        urgency: parsed['urgency'] || 'low',
        subject: parsed['subject'],
        triggers: parsed['triggers'] || []
      }
    rescue JSON::ParserError
      # Fallback
      {
        routing_needed: false,
        confidence: 0.0,
        reason: 'Failed to parse analysis',
        urgency: 'low',
        subject: nil,
        triggers: []
      }
    end
  end

  def create_routing_event(student, analysis, conversation_message, practice_problem_id = nil)
    # Check if TutorRoutingEvent table exists
    return nil unless TutorRoutingEvent.table_exists?
    
    begin
      TutorRoutingEvent.create!(
        student: student,
        conversation_message: conversation_message,
        routing_reason: analysis[:reason],
        routing_confidence: analysis[:confidence],
        urgency: analysis[:urgency],
        metadata: {
          triggers: analysis[:triggers] || [],
          subject: analysis[:subject],
          practice_problem_id: practice_problem_id
        }
      )
    rescue => e
      Rails.logger.warn "Could not create routing event: #{e.message}"
      nil
    end
  end

  def suggest_tutors(student, subject)
    # Placeholder - would integrate with actual tutor matching system
    # For now, return mock suggestions
    [
      {
        id: 1,
        name: 'Tutor Match',
        expertise: [subject],
        rating: 4.8,
        available_slots: ['Today 2pm', 'Tomorrow 10am', 'Tomorrow 3pm']
      }
    ]
  end

  def build_routing_context(routing_event, student)
    # Extract subject from conversation or recent sessions
    subject = extract_subject_from_conversation(routing_event.conversation_message) ||
              student.goals.active.first&.subject ||
              'General'
    
    {
      reason: routing_event.routing_reason,
      urgency: routing_event.urgency,
      subject: subject,
      triggers: [], # Could be stored in routing_reason or metadata
      student_understanding: get_understanding_context(student),
      conversation_excerpt: routing_event.conversation_message&.content&.truncate(200)
    }
  end

  def extract_subject_from_conversation(message)
    return nil unless message
    
    # Try to extract subject from message content or related session
    if message.respond_to?(:session_summary) && message.session_summary
      message.session_summary.transcript&.subject
    elsif message.context && message.context['subject']
      message.context['subject']
    else
      nil
    end
  end

  def get_recent_topics(student)
    student.session_summaries
      .where(processing_status: 'completed')
      .order(created_at: :desc)
      .limit(5)
      .flat_map(&:extracted_topics)
      .uniq
  end
end

