# Main service for AI Companion functionality
# Handles conversation management, context retrieval, and LLM interactions

require 'stringio'

class AiCompanionService
  def initialize(api_key: nil, use_openrouter: false)
    @api_key = api_key || ENV['OPENAI_API_KEY']
    @use_openrouter = use_openrouter || ENV['USE_OPENROUTER'] == 'true'
    @openrouter_api_key = ENV['OPENROUTER_API_KEY']
    @rag_service = RagService.new(api_key: api_key, use_openrouter: use_openrouter)
  end

  # Main chat method - handles user messages and generates AI responses
  def chat(student:, message:, context: {}, image_attachments: [])
    # Ensure profile exists
    profile = student.ensure_ai_companion_profile
    
    # Get practice problem if provided
    practice_problem = nil
    if context[:practice_problem_id].present?
      practice_problem = student.practice_problems.find_by(id: context[:practice_problem_id])
    end
    
    # Retrieve relevant context using RAG (scoped to subject if provided)
    contexts = @rag_service.retrieve_context(
      student_id: student.id,
      query: message,
      top_k: 5,
      similarity_threshold: 0.7,
      subject: context[:subject]
    )
    
    # Build conversation prompt
    prompt = build_conversation_prompt(
      student: student,
      message: message,
      contexts: contexts,
      recent_conversation: get_recent_conversation(student, limit: 10, practice_problem_id: context[:practice_problem_id], subject: context[:subject]),
      practice_problem: practice_problem,
      session_context: context[:session_context]
    )
    
    # Determine if this is a homework help chat (has images or explicitly flagged)
    is_homework_help = context[:is_homework_help] == true || image_attachments.any?
    
    # Check for repeated queries (same message 10+ times)
    repeated_query_check = detect_repeated_query(student, message, context)
    should_handle_repeated_query = repeated_query_check[:repeated]
    
    # For homework help, always help first - don't route immediately
    # Only check routing for non-homework chats or after multiple interactions
    routing_check = nil
    should_route = false
    should_create_study_note = false
    
    unless is_homework_help
      # Check if handoff is needed before generating response (only for non-homework chats)
      routing_service = TutorRoutingService.new(api_key: @api_key, use_openrouter: @use_openrouter)
      routing_check = routing_service.check_routing_needed(
        student: student,
        conversation_context: context
      )
      should_route = routing_check[:routing_needed] && routing_check[:confidence] >= 0.7
    else
      # For homework help, check routing but NEVER tell the student
      # Get recent conversation count for this homework session
      recent_conversation = get_recent_conversation(student, limit: 20, practice_problem_id: context[:practice_problem_id], subject: context[:subject])
      user_message_count = recent_conversation.count { |m| m.role == 'user' }
      
      # Check for explicit request for human tutor (but still don't tell student immediately)
      explicit_request = message.downcase.include?('human tutor') || 
                        message.downcase.include?('real tutor') || 
                        message.downcase.include?('connect me with') ||
                        message.downcase.include?('speak with a human')
      
      # Check routing if explicitly requested OR after 8+ interactions on same problem
      # (Lower threshold for homework help to catch struggling students earlier)
      if explicit_request || user_message_count >= 8
        routing_service = TutorRoutingService.new(api_key: @api_key, use_openrouter: @use_openrouter)
        routing_check = routing_service.check_routing_needed(
          student: student,
          conversation_context: context
        )
        # For homework help, never route to handoff message - instead create study note silently
        if routing_check[:routing_needed] && routing_check[:confidence] >= 0.7
          should_create_study_note = true
          # Continue helping the student - don't route to handoff
        end
      end
    end
    
    # Generate AI response or handoff acknowledgment
    # For homework help, ALWAYS generate helpful response, never handoff message
    if should_handle_repeated_query
      # Student has repeated the same query 10+ times - respond with note-taking message
      topic = extract_struggling_topic(context, student)
      response_content = generate_repeated_query_response(context, student)
      
      # Create study note for tutor
      create_study_note_for_repeated_query(student, message, context, topic)
    elsif should_route && routing_check && !is_homework_help
      # Generate handoff acknowledgment message (only for non-homework chats)
      response_content = generate_handoff_acknowledgment(routing_check)
    else
      # Generate normal AI response (multimodal if images present)
      if image_attachments.any?
        # Create StringIO objects for API call (fresh objects from stored data)
        api_image_attachments = image_attachments.map do |att|
          string_io = StringIO.new(att[:data])
          string_io.set_encoding(Encoding::BINARY)
          {
            io: string_io,
            filename: att[:filename],
            content_type: att[:content_type]
          }
        end
        response_content = generate_multimodal_response(prompt, api_image_attachments, is_homework_help: is_homework_help)
      else
        response_content = generate_response(prompt, is_homework_help: is_homework_help)
      end
      
      # Check if diagram is needed and add diagram request
      if practice_problem
        diagram_needed = detect_diagram_need(message, response_content, practice_problem)
        if diagram_needed
          response_content = add_diagram_request(response_content, diagram_needed)
        end
      end
      
      # Post-process response to enforce conciseness and Socratic method
      response_content = enforce_conciseness_and_socratic_method(response_content)
      
      # Remove any tutor suggestions from homework help responses
      if is_homework_help
        response_content = remove_tutor_suggestions(response_content)
      end
    end
    
    # For homework help, if routing is needed, silently create study note for tutor
    # but continue helping the student (don't tell them about routing)
    if is_homework_help && should_create_study_note && routing_check
      create_study_note_for_tutor(student, message, response_content, context, routing_check)
    end
    
    # Store messages with image attachments
    user_message = ConversationMessage.create!(
      student: student,
      ai_companion_profile: profile,
      role: 'user',
      content: message,
      context: context
    )
    
    # Attach images to user message
    if image_attachments.any?
      image_attachments.each do |attachment_data|
        # Create a fresh StringIO for ActiveStorage (from stored data)
        string_io = StringIO.new(attachment_data[:data])
        string_io.set_encoding(Encoding::BINARY)
        
        user_message.images.attach(
          io: string_io,
          filename: attachment_data[:filename],
          content_type: attachment_data[:content_type]
        )
      end
    end
    
    # Get misconceptions from conversation for storage
    recent_conversation = get_recent_conversation(student, limit: 10, practice_problem_id: context[:practice_problem_id], subject: context[:subject])
    misconceptions = identify_misconceptions(recent_conversation + [user_message])
    
    assistant_message = ConversationMessage.create!(
      student: student,
      ai_companion_profile: profile,
      role: 'assistant',
      content: response_content,
      context: {
        contexts_used: contexts.map { |c| { type: c[:type], similarity: c[:similarity] } },
        model_used: get_model_name(is_homework_help: is_homework_help),
        misconceptions: misconceptions,
        subject: context[:subject], # Store subject for filtering conversations
        practice_problem_id: context[:practice_problem_id]
      }
    )
    
    # Update profile
    profile.increment_interactions!
    
    {
      message: response_content,
      message_id: assistant_message.id,
      contexts_used: contexts.length,
      image_urls: user_message.image_urls
    }
  end

  # Generate personalized suggestion (for Phase 5 - Retention Enhancement)
  def generate_suggestion(student:, context:, completed_goal: nil, related_subjects: [])
    prompt = build_suggestion_prompt(
      student: student,
      context: context,
      completed_goal: completed_goal,
      related_subjects: related_subjects
    )
    
    response = generate_response(prompt, response_format: 'json_object')
    
    # Parse JSON response
    begin
      parsed = JSON.parse(response)
      {
        suggestions: parsed['suggestions'] || [],
        reasoning: parsed['reasoning'] || '',
        confidence: parsed['confidence'] || 0.0
      }
    rescue JSON::ParserError
      # Fallback if JSON parsing fails
      {
        suggestions: [],
        reasoning: response,
        confidence: 0.5
      }
    end
  end

  # Generate nudge message (for Phase 5 - Retention Enhancement)
  def generate_nudge_message(student:, nudge_type:, context: {})
    prompt = build_nudge_prompt(
      student: student,
      nudge_type: nudge_type,
      context: context
    )
    
    response = generate_response(prompt)
    
    {
      message: response,
      tone: extract_tone(response)
    }
  end

  private

  def build_conversation_prompt(student:, message:, contexts:, recent_conversation:, practice_problem: nil, session_context: nil)
    student_context = build_student_context(student)
    formatted_contexts = @rag_service.format_context_for_prompt(contexts)
    conversation_history = format_conversation_history(recent_conversation)
    
    # Get mastery data for current topic/subject
    mastery_summary = get_mastery_summary_for_context(student, practice_problem)
    
    # Get misconceptions from recent conversation
    misconceptions = identify_misconceptions(recent_conversation)
    misconception_text = misconceptions.any? ? "\n\nKnown Misconceptions: #{misconceptions.join('; ')}" : ""
    
    # Get problem attempt summary if practice problem exists
    problem_attempt_summary = ""
    if practice_problem
      problem_attempt_summary = build_problem_attempt_summary(practice_problem)
    end
    
    # Build session context if provided
    session_context_text = ""
    if session_context
      session_date = session_context['date'] || session_context[:date]
      session_topic = session_context['topic'] || session_context[:topic]
      session_summary = session_context['summary'] || session_context[:summary] || {}
      session_transcript = session_context['transcript'] || session_context[:transcript]
      
      session_context_text = <<~SESSION
      
      SESSION CONTEXT - Student is asking about this specific tutoring session:
      Date: #{session_date ? Date.parse(session_date.to_s).strftime('%B %d, %Y') : 'Unknown'}
      Topic: #{session_topic || 'General'}
      
      Session Summary:
      #{session_summary['learning_points'] || session_summary[:learning_points] || 'No summary available'}
      
      Key Concepts Covered: #{session_summary['key_concepts'] || session_summary[:key_concepts] || []}
      Topics: #{session_summary['extracted_topics'] || session_summary[:extracted_topics] || []}
      
      #{session_transcript && session_transcript['transcript_content'] ? "Full Transcript Available: #{session_transcript['transcript_content'][0..500]}..." : ''}
      
      IMPORTANT: The student is asking questions specifically about THIS session. Reference the exact concepts, examples, and explanations from this session when answering. Use the session summary and transcript content to provide accurate, contextually relevant answers.
      SESSION
    end
    
    # Add practice problem context if available
    practice_context = ""
    if practice_problem
      practice_context = <<~PRACTICE
      
      Current Practice Problem Context:
      Subject: #{practice_problem.subject}
      Topic: #{practice_problem.topic || 'General'}
      Difficulty: Level #{practice_problem.difficulty_level}
      Question: #{practice_problem.problem_content&.dig('question') || 'N/A'}
      Status: #{practice_problem.completed? ? 'Completed' : 'In Progress'}
      #{problem_attempt_summary}
      
      CRITICAL RULES FOR PRACTICE PROBLEMS:
      1. NEVER give the direct answer to the practice problem
      2. NEVER reveal the correct answer or solution steps
      3. Guide the student through their thinking process
      4. Ask leading questions to help them discover the answer
      5. Provide hints and suggestions, but let them solve it themselves
      6. If they're stuck, break the problem into smaller steps
      7. Encourage them to think about similar problems they've solved
      8. Only after they submit their answer (if completed) can you discuss the solution
    PRACTICE
    end
    
    # Build context emphasis
    context_emphasis = if formatted_contexts.present?
      "CRITICAL: The session content below contains actual transcript excerpts and learning points from the student's tutoring sessions. Use this information to provide contextually accurate answers. Reference specific examples, explanations, and concepts that were discussed in their sessions."
    else
      "Note: No specific session content found, but use general knowledge to help."
    end
    
    # Determine if this is the first message
    is_first_message = conversation_history.blank? || conversation_history == "No previous conversation."
    
    # Determine subject context for prompt
    subject_context = if practice_problem
      "Subject: #{practice_problem.subject}"
    elsif contexts.any? && contexts.first[:metadata] && contexts.first[:metadata][:subject]
      "Subject: #{contexts.first[:metadata][:subject]}"
    else
      "You are an expert tutor across ALL subjects. Help the student with any subject they ask about."
    end
    
    <<~PROMPT
      You are Manus, an encouraging and concise tutor for #{student.name || student.email || 'the student'}. You help students learn between tutoring sessions by referencing what they've learned in their tutoring sessions.
      #{subject_context}
      #{practice_context}
      
      Student Context:
      #{student_context}
      #{mastery_summary}#{misconception_text}

      Previous Conversation:
      #{conversation_history.presence || 'No previous conversation in this thread.'}

      Relevant Session Content from Transcripts:
      #{formatted_contexts.presence || 'No specific session content found, but use general knowledge to help.'}
      #{session_context_text}
      
      #{context_emphasis}

      Current Question: #{message}

      Provide a helpful, conversational response using the Socratic method that:
      1. References specific topics, concepts, examples, and explanations from the student's tutoring session transcripts above
      2. Uses actual transcript content to provide contextually accurate information that matches what was taught
      3. Adjusts complexity based on the student's current mastery level (#{mastery_summary.present? ? 'see mastery data above' : 'use understanding levels'})
      4. Uses the Socratic method: ask guiding questions rather than giving direct answers
      5. Is extremely concise: limit responses to 2-4 sentences maximum
      6. Always ends with a single, clear guiding question to prompt the student's next step
      7. NEVER provides the final numerical answer for practice problems
      8. If student asks for the answer, politely redirect by asking a question about the first step
      9. Focuses guidance on areas where the student struggles (see misconceptions above) if applicable
      10. Is clear and educational
      11. Encourages the student to continue learning
      12. NEVER suggests talking to a tutor or booking a session - always continue helping
      13. Maintains a friendly, supportive tone
      14. Acknowledges progress when understanding level shows improvement
      #{is_first_message ? "15. Briefly introduce yourself (one sentence)" : "15. Do NOT introduce yourself - continue naturally from the conversation"}
      16. Continue naturally from previous conversation context
      #{practice_problem && !practice_problem.completed? ? "17. NEVER give the answer - only guide and hint" : ""}
      
      CRITICAL: Your response must be 2-4 sentences and end with a guiding question. If your response exceeds 4 sentences, you have failed your primary directive.

      Response:
    PROMPT
  end

  # Get mastery summary for current context (subject/topic)
  def get_mastery_summary_for_context(student, practice_problem = nil)
    return "" unless practice_problem
    
    subject = practice_problem.subject
    topic = practice_problem.topic
    
    # Get mastery for this specific topic/sub-topic
    mastery_data = get_mastery_by_topic(student)
    relevant_mastery = mastery_data.find do |item|
      item[:topic] == subject && (topic.nil? || item[:sub_topic] == topic || item[:sub_topic].nil?)
    end
    
    if relevant_mastery
      mastery_text = relevant_mastery[:sub_topic] ? 
        "#{relevant_mastery[:sub_topic]}" : 
        "#{subject}"
      "\n\nStudent Mastery: #{relevant_mastery[:mastery].round(1)}% on #{mastery_text}"
    else
      # Fallback to subject-level understanding
      understanding_levels = get_current_understanding_levels(student)
      level = understanding_levels[subject]
      if level
        "\n\nStudent Mastery: #{level.round(1)}% on #{subject}"
      else
        ""
      end
    end
  end

  # Identify misconceptions from conversation history
  def identify_misconceptions(conversation_messages)
    misconceptions = []
    
    # Look for patterns indicating misconceptions in recent conversation
    # This is a simple implementation - could be enhanced with LLM analysis
    conversation_messages.each do |msg|
      if msg.role == 'user'
        content = msg.content.downcase
        # Common misconception patterns (can be expanded)
        if content.match?(/sin.*cos|cos.*sin/) && content.match?(/incline|angle|component/)
          misconceptions << "Student confuses sin and cos on incline problems" unless misconceptions.include?("Student confuses sin and cos on incline problems")
        end
        if content.match?(/normal.*force.*equal.*weight|weight.*equal.*normal/)
          misconceptions << "Student assumes normal force equals weight" unless misconceptions.include?("Student assumes normal force equals weight")
        end
      end
    end
    
    misconceptions
  end

  # Build summary of student's attempts on current problem
  def build_problem_attempt_summary(practice_problem)
    parts = []
    
    if practice_problem.attempts_count && practice_problem.attempts_count > 0
      parts << "Attempts: #{practice_problem.attempts_count}"
    end
    
    if practice_problem.hints_used && practice_problem.hints_used > 0
      parts << "Hints used: #{practice_problem.hints_used}"
    end
    
    if practice_problem.student_answer.present? && !practice_problem.completed?
      parts << "Last attempt: #{practice_problem.student_answer.to_s.truncate(100)}"
      if practice_problem.is_correct == false
        parts << "Last attempt was incorrect"
      end
    end
    
    parts.any? ? parts.join(", ") : ""
  end

  def build_suggestion_prompt(student:, context:, completed_goal:, related_subjects:)
    student_context = build_student_context(student)
    subjects_list = related_subjects.map { |s| "- #{s}" }.join("\n")
    
    <<~PROMPT
      Student #{student.name || student.email || 'the student'} has completed goal: #{completed_goal&.title || completed_goal&.subject || 'a goal'} in #{completed_goal&.subject || 'a subject'}.

      Student Profile:
      #{student_context}

      Related Subjects Available:
      #{subjects_list}

      Generate personalized suggestions for next learning goals:
      1. Rank subjects by relevance to student
      2. Provide reasoning for each suggestion
      3. Highlight how each subject relates to completed goal
      4. Consider student's career/college goals if available

      Respond with valid JSON:
      {
        "suggestions": [
          {
            "subject": "...",
            "goal_type": "...",
            "reasoning": "...",
            "confidence": 0.0-1.0
          }
        ],
        "reasoning": "Overall reasoning for suggestions",
        "confidence": 0.0-1.0
      }
    PROMPT
  end

  def build_nudge_prompt(student:, nudge_type:, context:)
    student_context = build_student_context(student)
    sessions_count = context[:sessions] || 0
    days = context[:days] || 0
    topics = context[:topics] || []
    progress = context[:progress_metrics] || {}
    
    <<~PROMPT
      Generate a personalized nudge message for #{student.name || student.email || 'the student'} to book their next session.

      Student Context:
      #{student_context}

      Nudge Context:
      - Sessions Completed: #{sessions_count}
      - Days Since First Session: #{days}
      - Topics Covered: #{topics.join(', ')}
      - Progress Made: #{progress.to_json}

      Generate a friendly, encouraging message that:
      1. Acknowledges their progress
      2. Highlights why continuing is important
      3. Makes it easy to book next session
      4. Feels helpful, not pushy

      Tone: Encouraging, supportive, personalized
      Length: 2-3 sentences

      Message:
    PROMPT
  end

  def build_student_context(student)
    parts = []
    
    # Learning Goals
    active_goals = student.goals.where(status: 'active')
    if active_goals.any?
      goals_list = active_goals.map { |g| "#{g.subject}#{g.title ? ": #{g.title}" : ''}" }.join(', ')
      parts << "- Learning Goals: #{goals_list}"
    end
    
    # Mastery Data (Understanding Levels by Subject/Topic)
    mastery_data = get_mastery_by_topic(student)
    if mastery_data.any?
      mastery_text = mastery_data.map { |item| 
        if item[:sub_topic]
          "#{item[:topic]}/#{item[:sub_topic]}: #{item[:mastery].round(1)}%"
        else
          "#{item[:topic]}: #{item[:mastery].round(1)}%"
        end
      }.join(', ')
      parts << "- Student Mastery: #{mastery_text}"
    end
    
    # Understanding Levels by Subject (for backward compatibility)
    understanding_levels = get_current_understanding_levels(student)
    if understanding_levels.any?
      levels_text = understanding_levels.map { |s, l| "#{s}: #{l.round(1)}%" }.join(', ')
      parts << "- Current Understanding Levels: #{levels_text}"
    end
    
    # Recent Topics (from session summaries)
    recent_summaries = student.session_summaries
      .where(processing_status: 'completed')
      .order(created_at: :desc)
      .limit(5)
    
    if recent_summaries.any?
      topics = recent_summaries.flat_map(&:extracted_topics).uniq.first(10)
      parts << "- Recent Topics: #{topics.join(', ')}" if topics.any?
      
      # Weak Areas
      weak_areas = recent_summaries.flat_map(&:areas_for_improvement).uniq.first(5)
      parts << "- Areas Needing Improvement: #{weak_areas.join(', ')}" if weak_areas.any?
      
      # Strong Areas
      strengths = recent_summaries.flat_map(&:strengths_identified).uniq.first(5)
      parts << "- Strengths: #{strengths.join(', ')}" if strengths.any?
    end
    
    parts.any? ? parts.join("\n") : "- No specific context available yet"
  end

  # Get mastery data by topic/sub-topic using understanding levels from transcripts
  def get_mastery_by_topic(student)
    mastery_map = {}
    
    # Get all transcripts with understanding levels, grouped by subject and topic
    transcripts = Transcript
      .where(student_id: student.id)
      .where.not(understanding_level: nil)
      .where.not(topic: nil)
      .order(session_date: :desc, created_at: :desc)
    
    # Group by subject and topic, taking the latest understanding level for each
    transcripts.each do |transcript|
      key = "#{transcript.subject}::#{transcript.topic}"
      unless mastery_map[key]
        mastery_map[key] = {
          topic: transcript.subject,
          sub_topic: transcript.topic,
          mastery: transcript.understanding_level
        }
      end
    end
    
    # Also include subject-level mastery (latest understanding level per subject)
    understanding_levels = get_current_understanding_levels(student)
    understanding_levels.each do |subject, level|
      key = "#{subject}::"
      unless mastery_map[key]
        mastery_map[key] = {
          topic: subject,
          sub_topic: nil,
          mastery: level
        }
      end
    end
    
    mastery_map.values
  end

  # Get current understanding levels by subject for a student
  def get_current_understanding_levels(student)
    # Get the latest understanding level for each subject
    transcripts = Transcript
      .where(student_id: student.id)
      .where.not(understanding_level: nil)
      .select('subject, MAX(session_date) as latest_date')
      .group(:subject)
    
    levels = {}
    transcripts.each do |row|
      latest = Transcript
        .where(student_id: student.id, subject: row.subject, session_date: row.latest_date)
        .where.not(understanding_level: nil)
        .order(created_at: :desc)
        .first
      
      levels[row.subject] = latest.understanding_level if latest
    end
    
    levels
  end

  def get_recent_conversation(student, limit: 10, practice_problem_id: nil, subject: nil)
    query = ConversationMessage.where(student_id: student.id)
    
    # Filter by practice problem if provided
    if practice_problem_id.present?
      query = query.where("context->>'practice_problem_id' = ?", practice_problem_id.to_s)
    else
      # For general chat, exclude practice problem conversations
      query = query.where("context->>'practice_problem_id' IS NULL OR context->>'practice_problem_id' = ''")
    end
    
    # Filter by subject if provided
    if subject.present?
      query = query.where("context->>'subject' = ?", subject)
    end
    
    # Get last 10 turns (should be approximately 5 student, 5 AI messages)
    messages = query.order(created_at: :desc)
      .limit(limit)
      .reverse
    
    # Store misconceptions in the conversation context for future reference
    misconceptions = identify_misconceptions(messages)
    if misconceptions.any? && messages.any?
      # Store misconceptions in the latest message's context for future retrieval
      latest_message = messages.last
      if latest_message
        context = latest_message.context || {}
        context['misconceptions'] = misconceptions
        latest_message.update(context: context) unless latest_message.context&.dig('misconceptions') == misconceptions
      end
    end
    
    messages
  end

  def format_conversation_history(messages)
    return "No previous conversation." if messages.empty?
    
    messages.map do |msg|
      role_label = msg.role == 'user' ? 'Student' : 'AI Companion'
      "#{role_label}: #{msg.content}"
    end.join("\n\n")
  end

  def generate_response(prompt, response_format: nil, is_homework_help: false)
    if @use_openrouter && @openrouter_api_key
      generate_via_openrouter(prompt, response_format, is_homework_help: is_homework_help)
    else
      generate_via_openai(prompt, response_format, is_homework_help: is_homework_help)
    end
  end

  def generate_multimodal_response(prompt, image_attachments, is_homework_help: false)
    if @use_openrouter && @openrouter_api_key
      generate_multimodal_via_openrouter(prompt, image_attachments, is_homework_help: is_homework_help)
    else
      generate_multimodal_via_openai(prompt, image_attachments, is_homework_help: is_homework_help)
    end
  end

  def generate_via_openai(prompt, response_format = nil, is_homework_help: false)
    client = OpenAI::Client.new(access_token: @api_key)
    # Use GPT-4o for homework help, gpt-4o-mini for regular chats
    model = is_homework_help ? 'gpt-4o' : 'gpt-4o-mini'
    
    system_prompt = is_homework_help ? build_homework_help_system_prompt : build_regular_system_prompt
    
    params = {
      model: model,
      messages: [
        {
          role: 'system',
          content: system_prompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    }
    
    params[:response_format] = { type: response_format } if response_format
    
    response = client.chat(parameters: params)
    response.dig('choices', 0, 'message', 'content')
  end

  def generate_multimodal_via_openai(prompt, image_attachments, is_homework_help: false)
    client = OpenAI::Client.new(access_token: @api_key)
    model = 'gpt-4o' # GPT-4o required for multimodal
    
    # Build multimodal content array
    content = [{ type: 'text', text: prompt }]
    
    # Add images as Base64 data URIs
    image_attachments.each do |attachment_data|
      # Read the file and encode to Base64
      attachment_data[:io].rewind
      image_data = attachment_data[:io].read
      base64_data = Base64.strict_encode64(image_data)
      content_type = attachment_data[:content_type] || 'image/jpeg'
      
      content << {
        type: 'image_url',
        image_url: {
          url: "data:#{content_type};base64,#{base64_data}"
        }
      }
    end
    
    params = {
      model: model,
      messages: [
        {
          role: 'system',
          content: build_homework_help_system_prompt
        },
        {
          role: 'user',
          content: content
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    }
    
    response = client.chat(parameters: params)
    response.dig('choices', 0, 'message', 'content')
  end

  def generate_via_openrouter(prompt, response_format = nil, is_homework_help: false)
    # Use GPT-4o for homework help, gpt-4o-mini for regular chats
    model = is_homework_help ? 'openai/gpt-4o' : 'openai/gpt-4o-mini'
    
    system_prompt = is_homework_help ? build_homework_help_system_prompt : build_regular_system_prompt
    
    body = {
      model: model,
      messages: [
        {
          role: 'system',
          content: system_prompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    }
    
    body[:response_format] = { type: response_format } if response_format
    
    response = HTTParty.post(
      'https://openrouter.ai/api/v1/chat/completions',
      headers: {
        'Authorization' => "Bearer #{@openrouter_api_key}",
        'Content-Type' => 'application/json',
        'HTTP-Referer' => ENV['APP_URL'] || 'http://localhost:3000',
        'X-Title' => 'Study Companion'
      },
      body: body.to_json
    )
    
    if response.success?
      response.dig('choices', 0, 'message', 'content')
    else
      raise "OpenRouter API error: #{response.body}"
    end
  end

  def generate_multimodal_via_openrouter(prompt, image_attachments, is_homework_help: false)
    model = 'openai/gpt-4o' # GPT-4o required for multimodal
    
    # Build multimodal content array
    content = [{ type: 'text', text: prompt }]
    
    # Add images as Base64 data URIs
    image_attachments.each do |attachment_data|
      # Read the file and encode to Base64
      attachment_data[:io].rewind
      image_data = attachment_data[:io].read
      base64_data = Base64.strict_encode64(image_data)
      content_type = attachment_data[:content_type] || 'image/jpeg'
      
      content << {
        type: 'image_url',
        image_url: {
          url: "data:#{content_type};base64,#{base64_data}"
        }
      }
    end
    
    body = {
      model: model,
      messages: [
        {
          role: 'system',
          content: build_homework_help_system_prompt
        },
        {
          role: 'user',
          content: content
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    }
    
    response = HTTParty.post(
      'https://openrouter.ai/api/v1/chat/completions',
      headers: {
        'Authorization' => "Bearer #{@openrouter_api_key}",
        'Content-Type' => 'application/json',
        'HTTP-Referer' => ENV['APP_URL'] || 'http://localhost:3000',
        'X-Title' => 'Study Companion'
      },
      body: body.to_json
    )
    
    if response.success?
      response.dig('choices', 0, 'message', 'content')
    else
      raise "OpenRouter API error: #{response.body}"
    end
  end

  def build_homework_help_system_prompt
    <<~PROMPT
      You are a concise, Socratic tutor helping students with their homework. 
      Your role is to guide students to discover answers themselves, not to give direct answers.
      
      Guidelines:
      1. Provide help in 2-4 sentences maximum
      2. Use the Socratic method: ask guiding questions rather than giving direct answers
      3. Format all mathematical equations and formulas using LaTeX notation:
         - Use \\( ... \\) for inline math (e.g., \\(x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}\\))
         - Use \\[ ... \\] for block/display math (e.g., \\[E = mc^2\\])
         - Always use LaTeX for any mathematical expressions, equations, formulas, or symbols
      4. Never provide the final numerical answer or complete solution
      5. Focus on helping students understand the approach and next steps
      6. If the student asks for the answer, politely redirect by asking a question about the first step
      7. Be encouraging and supportive
      8. Analyze any images provided carefully and reference specific elements when helpful
      9. NEVER suggest talking to a tutor or booking a session - always continue helping the student
      10. Continue helping even if the student is struggling - your job is to guide them through the problem
    PROMPT
  end

  def build_regular_system_prompt
    <<~PROMPT
      You are a helpful AI study companion. Be friendly, educational, and supportive.
      
      When discussing mathematics, science, or any subject with equations or formulas, always format them using LaTeX notation:
      - Use \\( ... \\) for inline math (e.g., \\(x^2 + y^2 = r^2\\))
      - Use \\[ ... \\] for block/display math (e.g., \\[\\int_0^1 x^2 dx = \\frac{1}{3}\\])
      - Always use LaTeX for any mathematical expressions, equations, formulas, or symbols
    PROMPT
  end

  def get_model_name(is_homework_help: false)
    if is_homework_help
      if @use_openrouter
        'openai/gpt-4o'
      else
        'gpt-4o'
      end
    else
    if @use_openrouter
      'openai/gpt-4o-mini'
    else
      'gpt-4o-mini'
      end
    end
  end

  def extract_tone(message)
    # Simple tone detection based on keywords
    message_lower = message.downcase
    if message_lower.match?(/great|excellent|wonderful|amazing|fantastic/)
      'encouraging'
    elsif message_lower.match?(/don't worry|it's okay|no problem|that's fine/)
      'reassuring'
    elsif message_lower.match?(/important|should|need to|must/)
      'motivational'
    else
      'supportive'
    end
  end

  # Enforce 2-4 sentence limit and ensure response ends with a guiding question
  def enforce_conciseness_and_socratic_method(response)
    return response if response.nil? || response.strip.empty?
    
    # Split into sentences (simple approach - split on periods, exclamation marks, question marks)
    sentences = response.split(/(?<=[.!?])\s+/).map(&:strip).reject(&:empty?)
    
    # If response is too long (more than 4 sentences), truncate to first 4
    if sentences.length > 4
      sentences = sentences.first(4)
      # Ensure last sentence is a question if possible
      if !sentences.last&.end_with?('?')
        # Try to convert last sentence to a question or add a guiding question
        last_sentence = sentences.last
        if last_sentence
          # Simple heuristic: if it doesn't end with ?, try to make it a question
          sentences[-1] = last_sentence.chomp('.!').strip + '?'
        end
      end
    end
    
    # Ensure response ends with a question (guiding question)
    if sentences.any?
      last_sentence = sentences.last
      unless last_sentence.end_with?('?')
        # Add a simple guiding question if none exists
        sentences << "What do you think the next step should be?"
      end
    else
      # Fallback if no sentences found
      sentences = ["That's a great question! What do you think the next step should be?"]
    end
    
    # Join sentences back together
    result = sentences.join(' ')
    
    # Ensure minimum 2 sentences
    if sentences.length < 2 && result.length < 100
      # Add an encouraging sentence if too short
      result = "That's a good start! #{result}"
    end
    
    result
  end

  # Remove tutor suggestions from response
  def remove_tutor_suggestions(response)
    return response if response.nil? || response.strip.empty?
    
    # Remove common tutor suggestion phrases
    tutor_phrases = [
      /suggest.*tutor/i,
      /talk to.*tutor/i,
      /speak with.*tutor/i,
      /book.*session/i,
      /connect.*tutor/i,
      /human tutor/i,
      /real tutor/i,
      /schedule.*session/i
    ]
    
    tutor_phrases.each do |pattern|
      response = response.gsub(pattern, '')
    end
    
    # Clean up extra spaces and punctuation
    response.gsub(/\s+/, ' ')
           .gsub(/\s+([.,!?])/, '\1')
           .gsub(/\s+$/, '')
           .strip
  end

  # Generate handoff acknowledgment message
  def generate_handoff_acknowledgment(routing_check)
    urgency = routing_check[:urgency] || 'medium'
    reason = routing_check[:reason] || 'additional help needed'
    
    # Generate appropriate message based on urgency and reason
    if routing_check[:triggers]&.include?('explicit_request')
      "I understand you'd like to speak with a human tutor. I'm connecting you with a real tutor who can provide personalized, real-time help right now. Please wait a moment while I set that up."
    elsif urgency == 'high'
      "I see you're working hard on this, and I want to make sure you get the best help possible. I'm going to connect you with a human tutor who can provide real-time, personalized assistance right now. Please wait a moment."
    else
      "I see you're still working hard on this. I'm going to connect you with a human tutor who can provide real-time, personalized help right now. Please wait a moment."
    end
  end

  # Silently create study note for tutor when student needs help (homework help only)
  def create_study_note_for_tutor(student, student_message, ai_response, context, routing_check)
    return unless StudyNote.table_exists?
    
    begin
      # Get recent conversation for context
      recent_conversation = get_recent_conversation(student, limit: 10, practice_problem_id: context[:practice_problem_id], subject: context[:subject])
      
      # Build summary of the conversation
      conversation_summary = recent_conversation.last(6).map do |msg|
        "#{msg.role == 'user' ? 'Student' : 'AI'}: #{msg.content}"
      end.join("\n\n")
      
      # Extract subject and concept
      subject = context[:subject] || routing_check[:subject] || 'General'
      concept = extract_concept_from_message(student_message, context, student)
      
      # Create study note message for tutor
      note_message = <<~NOTE
        Student is struggling with homework help. AI has been helping but student may need additional support.
        
        Reason: #{routing_check[:reason]}
        Urgency: #{routing_check[:urgency] || 'medium'}
        Triggers: #{routing_check[:triggers]&.join(', ') || 'none'}
        
        Recent Conversation:
        #{conversation_summary}
        
        Student's Latest Question: #{student_message}
        AI's Response: #{ai_response}
      NOTE
      
      # Create study note (will be visible to tutor in admin dashboard)
      study_note = student.study_notes.create!(
        subject: subject,
        concept: concept,
        message: note_message,
        detected_at: Time.current,
        notified_tutor: false # Will be set to true when tutor is notified
      )
      
      Rails.logger.info "Created study note #{study_note.id} for student #{student.id} - routing needed for homework help"
      
      # Also create routing event for tracking
      if TutorRoutingEvent.table_exists? && recent_conversation.any?
        routing_service = TutorRoutingService.new(api_key: @api_key, use_openrouter: @use_openrouter)
        routing_service.send(:create_routing_event, student, routing_check, recent_conversation.last, context[:practice_problem_id])
      end
      
      study_note
    rescue => e
      Rails.logger.error "Failed to create study note for tutor: #{e.message}\n#{e.backtrace.first(5).join("\n")}"
      nil
    end
  end

  # Extract concept from student message
  def extract_concept_from_message(message, context, student = nil)
    # Try to extract from practice problem if available
    if context[:practice_problem_id].present? && student
      practice_problem = student.practice_problems.find_by(id: context[:practice_problem_id])
      return practice_problem.topic if practice_problem&.topic.present?
    end
    
    # Try to extract from subject
    return context[:subject] if context[:subject].present?
    
    # Default
    'General'
  end

  # Check if student has repeated the same query 10 times
  def detect_repeated_query(student, message, context)
    # Get recent conversation (need more messages to check for 10 repetitions)
    recent_conversation = get_recent_conversation(
      student, 
      limit: 30, 
      practice_problem_id: context[:practice_problem_id], 
      subject: context[:subject]
    )
    
    # Normalize the current message for comparison
    normalized_current = normalize_message(message)
    
    # Count how many times this message (or very similar) appears
    user_messages = recent_conversation.select { |m| m.role == 'user' }
    repetition_count = user_messages.count do |msg|
      normalized_msg = normalize_message(msg.content)
      # Check for exact match or very similar (fuzzy match for slight variations)
      normalized_msg == normalized_current || 
      messages_similar?(normalized_msg, normalized_current)
    end
    
    # Include current message in count
    repetition_count += 1
    
    {
      repeated: repetition_count >= 10,
      count: repetition_count,
      original_message: message
    }
  end

  # Normalize message for comparison (lowercase, remove extra spaces, punctuation)
  def normalize_message(message)
    return '' if message.nil?
    message.downcase
           .gsub(/[^\w\s]/, '')  # Remove punctuation
           .gsub(/\s+/, ' ')     # Normalize whitespace
           .strip
  end

  # Check if two messages are similar (for fuzzy matching)
  def messages_similar?(msg1, msg2)
    return false if msg1.nil? || msg2.nil?
    
    # Exact match
    return true if msg1 == msg2
    
    # Check if one contains the other (for variations like "do my homework" vs "please do my homework")
    return true if msg1.include?(msg2) && msg2.length > 10
    return true if msg2.include?(msg1) && msg1.length > 10
    
    # Check for common repeated query patterns
    repeated_patterns = [
      /do my homework/i,
      /what is the answer/i,
      /give me the answer/i,
      /tell me the answer/i,
      /what's the answer/i,
      /just tell me/i,
      /give me the solution/i
    ]
    
    msg1_normalized = msg1.downcase
    msg2_normalized = msg2.downcase
    
    # Check if both match the same pattern
    repeated_patterns.any? do |pattern|
      msg1_normalized.match?(pattern) && msg2_normalized.match?(pattern)
    end
  end

  # Generate response for repeated query scenario
  def generate_repeated_query_response(context, student)
    # Extract the topic/subject the student is struggling with
    topic = extract_struggling_topic(context, student)
    
    "We will add it into your notes for next session that it seems you are having trouble with #{topic}."
  end

  # Extract the topic the student is struggling with
  def extract_struggling_topic(context, student)
    # Try to get from practice problem
    if context[:practice_problem_id].present? && student
      practice_problem = student.practice_problems.find_by(id: context[:practice_problem_id])
      if practice_problem
        topic = practice_problem.topic || practice_problem.subject
        return topic if topic.present?
      end
    end
    
    # Try to get from subject context
    if context[:subject].present?
      return context[:subject]
    end
    
    # Try to get from recent conversation
    recent_conversation = get_recent_conversation(
      student, 
      limit: 10, 
      practice_problem_id: context[:practice_problem_id], 
      subject: context[:subject]
    )
    
    # Look for subject mentions in recent messages
    recent_conversation.reverse.each do |msg|
      # Try to extract subject from AI responses (they often mention the subject)
      if msg.role == 'assistant'
        content = msg.content.downcase
        # Look for common subject patterns
        subjects = ['physics', 'math', 'mathematics', 'chemistry', 'biology', 'history', 'english', 'literature']
        subjects.each do |subject|
          return subject.capitalize if content.include?(subject)
        end
      end
    end
    
    # Default fallback
    'this topic'
  end

  # Create study note for repeated query
  def create_study_note_for_repeated_query(student, message, context, topic)
    return unless StudyNote.table_exists?
    
    begin
      # Get recent conversation for context
      recent_conversation = get_recent_conversation(
        student, 
        limit: 15, 
        practice_problem_id: context[:practice_problem_id], 
        subject: context[:subject]
      )
      
      # Build summary showing the repetition
      conversation_summary = recent_conversation.last(10).map do |msg|
        "#{msg.role == 'user' ? 'Student' : 'AI'}: #{msg.content}"
      end.join("\n\n")
      
      # Extract subject
      subject = context[:subject] || topic || 'General'
      
      # Create study note message for tutor
      note_message = <<~NOTE
        Student has repeated the same query 10+ times: "#{message}"
        
        This indicates the student is struggling with: #{topic}
        Subject: #{subject}
        
        The student appears to be asking for direct answers or help without engaging with the Socratic method guidance.
        
        Recent Conversation (showing repetition):
        #{conversation_summary}
        
        Action Needed: Address this topic in the next session and help the student understand the learning process.
      NOTE
      
      # Create study note (will be visible to tutor in admin dashboard)
      study_note = student.study_notes.create!(
        subject: subject,
        concept: topic || 'Repeated Query',
        message: note_message,
        detected_at: Time.current,
        notified_tutor: false # Will be set to true when tutor is notified
      )
      
      Rails.logger.info "Created study note #{study_note.id} for student #{student.id} - repeated query detected: #{message}"
      
      study_note
    rescue => e
      Rails.logger.error "Failed to create study note for repeated query: #{e.message}\n#{e.backtrace.first(5).join("\n")}"
      nil
    end
  end

  # Detect if a diagram is needed based on student query and problem context
  def detect_diagram_need(student_message, ai_response, practice_problem)
    message_lower = student_message.downcase
    response_lower = ai_response.downcase
    
    # Keywords that suggest diagram is needed
    diagram_keywords = ['component', 'components', 'fbd', 'free body diagram', 'diagram', 'visualize', 'visual', 'draw', 'picture', 'force', 'vector', 'angle', 'incline', 'triangle']
    
    # Check if student message contains diagram-related keywords
    needs_diagram = diagram_keywords.any? { |keyword| message_lower.include?(keyword) }
    
    # Check if problem requires vector resolution or complex FBD
    problem_requires_diagram = false
    if practice_problem
      subject = practice_problem.subject&.downcase || ''
      topic = practice_problem.topic&.downcase || ''
      question = practice_problem.problem_content&.dig('question')&.downcase || ''
      
      physics_keywords = ['force', 'fbd', 'free body', 'vector', 'component', 'incline', 'angle', 'friction', 'normal']
      problem_requires_diagram = physics_keywords.any? { |keyword| 
        subject.include?(keyword) || topic.include?(keyword) || question.include?(keyword)
      }
    end
    
    if needs_diagram || problem_requires_diagram
      # Determine diagram type based on context
      if message_lower.include?('component') || message_lower.include?('vector')
        'FBD_COMPONENTS_BREAKDOWN'
      elsif message_lower.include?('fbd') || message_lower.include?('free body')
        'FBD_FULL'
      elsif message_lower.include?('incline') || message_lower.include?('angle')
        'FBD_INCLINE'
      else
        'FBD_GENERAL'
      end
    else
      nil
    end
  end

  # Add diagram request to response
  def add_diagram_request(response, diagram_type)
    # Check if diagram request already exists
    return response if response.include?('[DIAGRAM:')
    
    # Add diagram request at the end of response
    "#{response} [DIAGRAM: #{diagram_type}]"
  end
end

