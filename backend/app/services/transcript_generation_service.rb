# Libraries are autoloaded by Rails

class TranscriptGenerationService
  def initialize(api_key: nil, use_openrouter: false)
    @api_key = api_key || ENV['OPENAI_API_KEY']
    @use_openrouter = use_openrouter || ENV['USE_OPENROUTER'] == 'true'
    @openrouter_api_key = ENV['OPENROUTER_API_KEY']
  end

  def generate(params)
    prompt = build_prompt(params)
    
    # Use Gemini via OpenRouter if use_gemini is true or if use_openrouter is true and no specific model preference
    use_gemini = params[:use_gemini] == true || params[:use_gemini] == 'true'
    
    if @use_openrouter && @openrouter_api_key
      generate_via_openrouter(prompt, params, use_gemini: use_gemini)
    else
      generate_via_openai(prompt, params)
    end
  end

  private

  def build_prompt(params)
    # Check if this should be a meeting transcript format (like the Gemini example)
    is_meeting_format = params[:transcript_type] == 'meeting' || params[:meeting_title].present?
    
    if is_meeting_format
      build_meeting_transcript_prompt(params)
    else
      build_tutoring_transcript_prompt(params)
    end
  end

  def build_meeting_transcript_prompt(params)
    meeting_title = params[:meeting_title] || params[:topic] || "Meeting Transcript"
    meeting_recording = params[:meeting_recording] || "Recording"
    participants = params[:participants] || params[:learning_objectives] || "Participants"
    
    <<~PROMPT
      Generate a detailed meeting transcript in the same format as Gemini meeting notes. Based on the following information:

      Meeting Title: #{meeting_title}
      Participants: #{participants}
      Meeting Recording: #{meeting_recording}
      Subject/Topic: #{params[:subject] || params[:topic] || 'General Discussion'}
      Duration: #{params[:session_duration_minutes] || 60} minutes
      Additional Context: #{params[:learning_objectives] || params[:student_personality] || 'General meeting discussion'}

      Format the transcript EXACTLY like this structure:

      [Meeting Title]

      Invited [Participant Names]

      Attachments [Any attachments mentioned]

      Meeting records [Recording type]

      Summary

      [A concise 2-3 sentence summary of the entire meeting covering the main topics, decisions, and outcomes]

      Details

      [Detailed sections with clear headings. Each major topic or discussion point should have its own section with a descriptive heading. Include:
      - What was discussed
      - Key points made by participants
      - Decisions reached
      - Action items
      - Important context or background information
      - Technical details if relevant
      - Questions asked and answers provided
      - Any clarifications or follow-ups needed]

      Format each detail section like:
      [Section Heading] [Participant name or general description] [explained/discussed/stated/etc.] [the content of what was said or decided, with context]

      Suggested next steps

      [List of action items, follow-ups, or next steps mentioned during the meeting. Format as:
      [Person/Group] will [action item].]

      Make it comprehensive, detailed, and well-organized. Include natural conversation flow, questions, answers, and decisions. The transcript should read like professional meeting notes that capture the essence and important details of the discussion.
    PROMPT
  end

  def build_tutoring_transcript_prompt(params)
    subject = params[:subject] || 'General'
    topic = params[:topic] || 'General Topic'
    
    # Determine format: structured for SAT/AP subjects, or based on format preference
    use_structured = params[:transcript_format] == 'structured' || 
                     params[:transcript_format].nil? && is_sat_or_ap_subject?(subject)
    
    # Add subject-specific guidance
    subject_guidance = case subject.upcase
    when 'SAT'
      "Focus on SAT preparation topics. For 'College Essays', help with essay structure, personal statements, and application strategies. For 'Study Skills', cover time management, test-taking strategies, and effective study techniques. For 'AP Prep', focus on AP exam format, content review, and practice strategies."
    when 'AP BIOLOGY', 'AP CHEMISTRY', 'AP PHYSICS 1', 'AP PHYSICS 2', 'AP PHYSICS C: MECHANICS', 'AP PHYSICS C: ELECTRICITY AND MAGNETISM', 'AP ENVIRONMENTAL SCIENCE'
      "Focus on the specific AP #{subject} curriculum. Help students understand key concepts, problem-solving strategies, and exam preparation. Connect concepts to real-world applications and other STEM subjects when relevant. Emphasize critical thinking and analytical skills needed for the AP exam."
    when 'AP CALCULUS AB', 'AP CALCULUS BC'
      "Focus on calculus concepts, problem-solving techniques, and AP exam preparation. Help students understand derivatives, integrals, and their applications. Emphasize both conceptual understanding and computational skills needed for the AP exam."
    when 'AP STATISTICS'
      "Focus on statistical concepts, data analysis, and AP exam preparation. Help students understand probability, inference, and statistical reasoning. Emphasize both conceptual understanding and practical application of statistical methods."
    when 'AP COMPUTER SCIENCE A', 'AP COMPUTER SCIENCE PRINCIPLES'
      "Focus on computer science concepts, programming, and AP exam preparation. Help students understand algorithms, data structures, and computational thinking. Emphasize problem-solving and coding skills needed for the AP exam."
    else
      "Provide comprehensive tutoring on the subject matter. Focus on key concepts, problem-solving strategies, and exam preparation if applicable."
    end
    
    if use_structured
      build_structured_tutoring_prompt(subject, topic, params, subject_guidance)
    else
      build_conversational_tutoring_prompt(subject, topic, params, subject_guidance)
    end
  end

  def is_sat_or_ap_subject?(subject)
    subject.upcase.start_with?('SAT') || subject.upcase.start_with?('AP ')
  end

  def build_structured_tutoring_prompt(subject, topic, params, subject_guidance)
    understanding_context = build_understanding_context(params)
    
    <<~PROMPT
      Generate a structured tutoring session transcript in a professional format similar to meeting notes. Based on the following information:

      Subject: #{subject}
      Topic: #{topic}
      Student Level: #{params[:student_level]}
      Session Duration: #{params[:session_duration_minutes]} minutes
      Learning Objectives: #{params[:learning_objectives]}
      Student Personality/Engagement Style: #{params[:student_personality]}

      #{understanding_context}

      Subject-Specific Guidance:
      #{subject_guidance}

      Format the transcript EXACTLY like this structure:

      #{subject} Tutoring Session - #{topic}

      Summary

      [A concise 2-3 sentence overview of the session covering: key topics covered, student progress, main learning outcomes, and overall session effectiveness]

      Details

      [Create 3-5 detailed sections with clear descriptive headings. Each section should cover a different aspect of the tutoring session. Use narrative style with embedded key conversation excerpts. Format each section like:]

      [Section Heading 1]
      [Narrative description of what was discussed in this section. Include key conversation excerpts embedded naturally. Format examples: "The tutor explained [concept]... The student asked [question]... The tutor responded by [explanation]..." Include specific examples, student questions, tutor explanations, and learning moments. Show the student's engagement patterns (#{params[:student_personality]}) and any sentiment indicators (frustration, confidence, confusion, etc.) as appropriate.]

      [Section Heading 2]
      [Continue with narrative sections covering different aspects: concept explanations, problem-solving approaches, practice exercises, student questions and responses, areas of difficulty, breakthrough moments, etc.]

      [Continue with additional sections as needed...]

      Suggested next steps

      [List 3-5 focus areas where the student struggles and should focus on during future AI tutoring sessions. Format as:]
      [Focus area 1]: [Specific struggle or weakness identified, what the student should practice or review]
      [Focus area 2]: [Additional struggle area with specific recommendations]
      [Focus area 3]: [Practice recommendations or concepts to reinforce]
      [Focus area 4]: [Areas needing more attention or follow-up]
      [Focus area 5]: [Additional recommendations for improvement]

      Requirements:
      - Make it comprehensive, detailed, and well-organized
      - Use natural, flowing narrative style (not robotic)
      - Include realistic conversation excerpts embedded in the narrative
      - Show the student's learning journey and progress
      - Include specific examples and concrete details
      - Reflect the student's personality and engagement style
      - Length should be appropriate for a #{params[:session_duration_minutes]}-minute session
      - Focus on the learning objectives provided
      - Make it realistic and educational

      Generate the transcript now:
    PROMPT
  end

  def build_conversational_tutoring_prompt(subject, topic, params, subject_guidance)
    understanding_context = build_understanding_context(params)
    
    <<~PROMPT
      Generate a realistic tutor-student conversation transcript for a tutoring session.

      Subject: #{subject}
      Topic: #{topic}
      Student Level: #{params[:student_level]}
      Session Duration: #{params[:session_duration_minutes]} minutes
      Learning Objectives: #{params[:learning_objectives]}
      Student Personality/Engagement Style: #{params[:student_personality]}

      #{understanding_context}

      Subject-Specific Guidance:
      #{subject_guidance}

      Requirements:
      - Format as a conversation with clear speaker labels (Tutor: and Student:)
      - Show natural conversation flow with realistic misunderstandings, questions, and explanations
      - Include learning moments and concept mastery indicators
      - Show engagement patterns (#{params[:student_personality]})
      - Include sentiment indicators (frustration, confidence, confusion, etc. as appropriate)
      - Make it realistic and educational
      - Length should be appropriate for a #{params[:session_duration_minutes]}-minute session
      - Keep the conversation focused on the topic and learning objectives

      Generate the transcript now:
    PROMPT
  end

  # Build understanding context for prompts
  def build_understanding_context(params)
    return "" unless params[:understanding_level].present?

    understanding_level = params[:understanding_level]
    previous_level = params[:previous_understanding_level] || 0.0
    goals_snapshot = params[:goals_snapshot] || {}
    session_history = params[:session_history_summary] || {}

    context_parts = []
    
    # Understanding level
    context_parts << "Student Understanding Level: #{understanding_level.round(1)}%"
    if previous_level > 0.0
      progress = understanding_level - previous_level
      progress_text = progress > 0 ? "improved by #{progress.round(1)}%" : progress < 0 ? "decreased by #{progress.abs.round(1)}%" : "maintained"
      context_parts << "Previous Understanding: #{previous_level.round(1)}% (has #{progress_text} since last session)"
    else
      context_parts << "This is the student's first session in this subject."
    end

    # Goals context (using string keys for JSONB compatibility)
    if goals_snapshot.is_a?(Hash) && goals_snapshot['active_goals']&.any?
      active_goals = goals_snapshot['active_goals']
      goals_text = active_goals.map { |g| 
        "#{g['title'] || g['goal_type']} (#{g['progress']}% complete)" 
      }.join(', ')
      context_parts << "Active Goals: #{goals_text}"
    end

    # Session history (using string keys for JSONB compatibility)
    if session_history.is_a?(Hash)
      if session_history['total_sessions_this_subject']&.positive?
        context_parts << "Total Sessions in Subject: #{session_history['total_sessions_this_subject']}"
      end
      
      if session_history['days_since_last_session']
        context_parts << "Days Since Last Session: #{session_history['days_since_last_session']}"
      end
      
      if session_history['topics_covered']&.any?
        topics = session_history['topics_covered'].first(5).join(', ')
        context_parts << "Previously Covered Topics: #{topics}"
      end
      
      if session_history['concepts_struggling']&.any?
        struggling = session_history['concepts_struggling'].first(3).join(', ')
        context_parts << "Areas Still Struggling: #{struggling}"
      end
    end

    return "" if context_parts.empty?

    "Student Progress Context:\n#{context_parts.join("\n")}\n\n"
  end

  def generate_via_openai(prompt, params)
    client = OpenAI::Client.new(access_token: @api_key)
    model = params[:use_gpt4o] ? 'gpt-4o' : 'gpt-4o-mini'

    response = client.chat(
      parameters: {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at generating realistic educational conversation transcripts between tutors and students.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000
      }
    )

    transcript_content = response.dig('choices', 0, 'message', 'content')
    token_count = response.dig('usage', 'total_tokens') || 0
    
    {
      transcript_content: transcript_content,
      model_used: model,
      token_count: token_count,
      cost: calculate_cost(model, token_count)
    }
  end

  def generate_via_openrouter(prompt, params, use_gemini: false)
    # Select model: Gemini for meeting transcripts, otherwise use GPT or specified model
    if use_gemini || params[:transcript_type] == 'meeting'
      model = 'google/gemini-2.5-pro' # Using Gemini 2.5 Pro via OpenRouter
      system_content = 'You are an expert at generating detailed meeting transcripts and notes in a professional format similar to Gemini meeting notes.'
    else
    model = params[:use_gpt4o] ? 'openai/gpt-4o' : 'openai/gpt-4o-mini'
      system_content = 'You are an expert at generating realistic educational conversation transcripts between tutors and students.'
    end
    
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
        messages: [
          {
            role: 'system',
            content: system_content
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000 # Increased for longer meeting transcripts
      }.to_json
    )

    if response.success?
      transcript_content = response.dig('choices', 0, 'message', 'content')
      token_count = response.dig('usage', 'total_tokens') || 0
      
      {
        transcript_content: transcript_content,
        model_used: model,
        token_count: token_count,
        cost: calculate_cost(model, token_count)
      }
    else
      raise "OpenRouter API error: #{response.body}"
    end
  end

  def calculate_cost(model, token_count)
    # Rough cost estimates per 1M tokens
    # GPT-4o-mini: ~$0.15 input, $0.60 output (average ~$0.30)
    # GPT-4o: ~$2.50 input, $10 output (average ~$5)
    # Gemini Pro 1.5: ~$1.25 input, $5 output (average ~$2.50)
    # Using average for simplicity
    cost_per_million = if model.include?('gemini')
      2.50
    elsif model.include?('gpt-4o') && !model.include?('mini')
      5.0
    else
      0.30
    end
    
    (token_count / 1_000_000.0) * cost_per_million
  end
end

