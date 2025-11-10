# Service to generate practice problems using LLM
# Uses understanding level and session summaries to create appropriate problems

require 'openai'
require 'httparty'

class PracticeGenerationService
  def initialize(api_key: nil, use_openrouter: false)
    @api_key = api_key || ENV['OPENAI_API_KEY']
    @use_openrouter = use_openrouter || ENV['USE_OPENROUTER'] == 'true'
    @openrouter_api_key = ENV['OPENROUTER_API_KEY']
    @model_used = nil
    @token_count = 0
    @cost = 0.0
  end

  # Generate a practice problem for a student
  def generate_problem(student:, subject:, topic: nil, difficulty: nil, goal_id: nil, session_id: nil)
    # If session_id is provided, extract topic from the session
    if session_id.present? && topic.nil?
      session = Session.find_by(id: session_id, student_id: student.id)
      if session
        topic = session.topic
        # Also use the session's transcript if available to get more context
        transcript = session.transcripts.first
        if transcript && transcript.topic
          topic = transcript.topic
        end
      end
    end
    
    # Prioritize short-term goals if goal_id not provided
    if goal_id.nil?
      short_term_goal = get_priority_short_term_goal(student, subject)
      if short_term_goal
        goal_id = short_term_goal.id
        # Extract topic from goal if not specified
        if topic.nil?
          topic = extract_topic_from_goal(short_term_goal)
        end
      end
    end
    
    # Use adaptive selection algorithm if topic not specified
    # This will automatically consider mastery data from transcripts for the subject,
    # which aligns with goals for that subject since goals are scoped to subjects
    if topic.nil?
      adaptive_selection = AdaptiveDifficultyService.select_adaptive_problem(student, subject, topic: topic)
      topic = adaptive_selection[:weakest_sub_topic] || topic
      difficulty ||= adaptive_selection[:target_difficulty]
    end
    
    # Get goal context if goal_id is provided
    goal = nil
    if goal_id.present?
      goal = Goal.find_by(id: goal_id, student_id: student.id, subject: subject)
    end
    
    # Get student context
    student_context = build_student_context(student, subject, topic)
    
    # Determine difficulty if not provided
    difficulty ||= AdaptiveDifficultyService.recommended_difficulty(
      student.id,
      subject,
      topic: topic,
      use_trends: true
    )
    
    # Map difficulty to 1-3 scale if needed (adaptive selection returns 1-3)
    difficulty = [difficulty, 3].min if difficulty > 3
    
    # Get weak areas from session summaries
    weak_areas = get_weak_areas(student, subject)
    
    # Get struggling concepts from recent AI conversations
    struggling_concepts = get_struggling_concepts_from_conversations(student, subject)
    
    # Build prompt
    prompt = build_generation_prompt(
      student: student,
      subject: subject,
      topic: topic,
      difficulty: difficulty,
      weak_areas: weak_areas,
      student_context: student_context,
      goal: goal,
      struggling_concepts: struggling_concepts
    )
    
    # Generate problem using LLM
    problem_data = generate_via_llm(prompt, subject)
    
    # Ensure we have required fields with fallbacks
    question = problem_data[:question] || problem_data['question'] || "Practice problem"
    problem_type = problem_data[:problem_type] || problem_data['problem_type'] || 'free_response'
    problem_topic = topic || problem_data[:topic] || problem_data['topic']
    correct_answer = problem_data[:correct_answer] || problem_data['correct_answer'] || "Answer not provided"
    solution_steps = problem_data[:solution_steps] || problem_data['solution_steps'] || []
    
    # Extract tags from problem content using AI
    tags = extract_problem_tags({
      question: question,
      topic: problem_topic,
      subject: subject,
      difficulty: difficulty
    })
    
    # Create practice problem record
    problem_content_hash = {
      question: question,
      problem_type: problem_type,
      options: problem_data[:options] || problem_data['options'], # For multiple choice
      hints: problem_data[:hints] || problem_data['hints'] || [],
      tags: tags # Store tags in problem_content
    }
    
    # Store correct_answer as string in JSONB format
    correct_answer_value = correct_answer.is_a?(Hash) ? correct_answer : { 'answer' => correct_answer.to_s }
    
    practice_problem = PracticeProblem.create!(
      student: student,
      goal_id: goal_id,
      subject: subject,
      topic: problem_topic,
      difficulty_level: difficulty,
      problem_content: problem_content_hash,
      correct_answer: correct_answer_value,
      solution_steps: solution_steps.is_a?(Array) ? solution_steps : (solution_steps.is_a?(String) ? [solution_steps] : []),
      assigned_at: Time.current
    )
    
    {
      problem: practice_problem,
      model_used: @model_used,
      token_count: @token_count,
      cost: @cost
    }
  end

  # Provide feedback on a submitted answer
  def provide_feedback(practice_problem, student_answer)
    prompt = build_feedback_prompt(
      problem: practice_problem,
      student_answer: student_answer
    )
    
    feedback_data = generate_via_llm(prompt, practice_problem.subject, response_format: 'json_object')
    
    # Parse feedback
    begin
      parsed = JSON.parse(feedback_data)
      {
        is_correct: parsed['is_correct'] || false,
        feedback: parsed['feedback'] || '',
        explanation: parsed['explanation'] || '',
        common_mistakes: parsed['common_mistakes'] || [],
        suggestions: parsed['suggestions'] || []
      }
    rescue JSON::ParserError
      # Fallback if JSON parsing fails
      is_correct = check_answer_simple(practice_problem, student_answer)
      {
        is_correct: is_correct,
        feedback: feedback_data,
        explanation: '',
        common_mistakes: [],
        suggestions: []
      }
    end
  end

  # Public method for simple answer checking (used as fallback)
  def check_answer_simple(problem, student_answer)
    # Simple answer checking for fallback
    # Handle JSONB format for correct_answer
    correct = problem.correct_answer
    if correct.is_a?(Hash)
      correct = correct['answer'] || correct.values.first || correct.to_s
    end
    correct = correct.to_s if correct
    
    # Handle JSONB format for student_answer
    student = student_answer
    if student.is_a?(Hash)
      student = student['answer'] || student.values.first || student.to_s
    end
    student = student.to_s if student
    
    # Normalize for comparison
    correct_normalized = correct.to_s.downcase.strip
    student_normalized = student.to_s.downcase.strip
    
    correct_normalized == student_normalized
  end

  private

  def build_student_context(student, subject, topic)
    parts = []
    
    # Understanding level
    latest_transcript = Transcript
      .where(student_id: student.id, subject: subject)
      .where.not(understanding_level: nil)
      .order(session_date: :desc, created_at: :desc)
      .first
    
    if latest_transcript
      parts << "Current Understanding Level: #{latest_transcript.understanding_level.round(1)}%"
    end
    
    # Recent topics
    begin
      recent_summaries = student.session_summaries
        .joins("INNER JOIN transcripts ON transcripts.id = session_summaries.transcript_id")
        .where("transcripts.subject = ?", subject)
        .where(processing_status: 'completed')
        .order(created_at: :desc)
        .limit(3)
      
      if recent_summaries.any?
        topics = recent_summaries.flat_map(&:extracted_topics).compact.uniq.first(5)
        parts << "Recently Covered Topics: #{topics.join(', ')}" if topics.any?
      end
      
      # Weak areas
      weak_areas = recent_summaries.flat_map(&:areas_for_improvement).compact.uniq.first(3)
      parts << "Areas Needing Improvement: #{weak_areas.join(', ')}" if weak_areas.any?
    rescue => e
      # If join fails, skip this part
      Rails.logger.warn("Failed to load session summaries: #{e.message}") if defined?(Rails)
    end
    
    parts.join("\n")
  end

  def get_weak_areas(student, subject)
    begin
      summaries = student.session_summaries
        .joins("INNER JOIN transcripts ON transcripts.id = session_summaries.transcript_id")
        .where("transcripts.subject = ?", subject)
        .where(processing_status: 'completed')
        .order(created_at: :desc)
        .limit(5)
      
      summaries.flat_map(&:areas_for_improvement).compact.uniq
    rescue => e
      Rails.logger.warn("Failed to load weak areas: #{e.message}")
      []
    end
  end

  def build_generation_prompt(student:, subject:, topic:, difficulty:, weak_areas:, student_context:, goal: nil, struggling_concepts: [])
    difficulty_name = difficulty_name(difficulty)
    topic_text = topic ? "on the topic: #{topic}" : "in #{subject}"
    weak_areas_text = weak_areas.any? ? "\nFocus Areas: #{weak_areas.join(', ')}" : ""
    
    goal_text = ""
    if goal
      goal_text = "\n\nCurrent Short-Term Goal: #{goal.title}\nGoal Description: #{goal.description}\nIMPORTANT: Generate a problem that directly helps the student work toward this goal."
    end
    
    struggling_text = ""
    if struggling_concepts.any?
      concepts_list = struggling_concepts.map { |c| "- #{c[:concept]}: #{c[:context]}" }.join("\n")
      struggling_text = "\n\n⚠️ STUDENT IS STRUGGLING WITH THESE CONCEPTS (from recent AI conversations):\n#{concepts_list}\n\nCRITICAL: Generate a problem that is SIMILAR to what they're struggling with, but with slight variations to help them practice and master these concepts. Focus on the same type of problem but with different numbers/scenarios to build confidence."
    end
    
    <<~PROMPT
      Generate a practice problem for a student studying #{subject} #{topic_text}.
      
      Student Context:
      #{student_context}
      #{weak_areas_text}#{goal_text}#{struggling_text}
      
      Difficulty Level: #{difficulty} (#{difficulty_name})
      
      Requirements:
      1. Create a problem that matches the difficulty level
      2. Focus on areas where the student needs improvement (if provided)
      3. #{struggling_concepts.any? ? 'If struggling concepts are listed, generate a SIMILAR problem to help them practice the same concept type with variations.' : 'Make it educational and engaging'}
      4. Include clear instructions
      5. Provide a step-by-step solution
      #{goal ? '6. The problem should directly support the student\'s current short-term goal' : ''}
      
      Problem Types Supported:
      - Multiple choice (provide 4 options)
      - Free response (short answer or essay)
      - Math problem (with equations)
      - Coding problem (for programming subjects)
      
      Respond with valid JSON:
      {
        "question": "The problem question text",
        "problem_type": "multiple_choice|free_response|math|coding",
        "topic": "Specific topic covered",
        "options": ["Option A", "Option B", "Option C", "Option D"], // Only for multiple choice
        "correct_answer": "The correct answer",
        "solution_steps": [
          "Step 1: ...",
          "Step 2: ...",
          "Step 3: ..."
        ],
        "hints": ["Hint 1", "Hint 2"] // Optional hints
      }
      
      Generate the problem now:
    PROMPT
  end

  def build_feedback_prompt(problem:, student_answer:)
    problem_type = problem.problem_content['problem_type'] || 'free_response'
    
    # Extract correct answer from JSONB format
    correct_answer = problem.correct_answer
    if correct_answer.nil?
      correct_answer = "Not available"
    elsif correct_answer.is_a?(Hash)
      correct_answer = correct_answer['answer'] || correct_answer.values.first
      correct_answer = correct_answer.to_s if correct_answer
    else
      correct_answer = correct_answer.to_s
    end
    
    # Extract student answer - should be a string from params, but handle Hash just in case
    student_answer_text = student_answer
    if student_answer_text.nil?
      student_answer_text = ""
    elsif student_answer_text.is_a?(Hash)
      student_answer_text = student_answer_text['answer'] || student_answer_text.values.first
      student_answer_text = student_answer_text.to_s if student_answer_text
    else
      student_answer_text = student_answer_text.to_s
    end
    
    <<~PROMPT
      A student submitted an answer to a practice problem. Provide feedback.
      
      Problem:
      #{problem.problem_content['question']}
      
      Problem Type: #{problem_type}
      Subject: #{problem.subject}
      Topic: #{problem.topic}
      
      Correct Answer:
      #{correct_answer}
      
      Student's Answer:
      #{student_answer_text}
      
      Solution Steps:
      #{problem.solution_steps.is_a?(Array) ? problem.solution_steps.join("\n") : problem.solution_steps}
      
      Provide feedback in JSON format:
      {
        "is_correct": true/false,
        "feedback": "Brief feedback message",
        "explanation": "Detailed explanation of the correct answer",
        "common_mistakes": ["Common mistake 1", "Common mistake 2"],
        "suggestions": ["Suggestion for improvement 1", "Suggestion 2"]
      }
      
      Be encouraging and educational. If the answer is incorrect, explain why and guide the student toward the correct answer.
    PROMPT
  end

  def generate_via_llm(prompt, subject, response_format: 'json_object')
    model = @use_openrouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini'
    @model_used = model
    
    messages = [
      {
        role: 'system',
        content: "You are an expert educational content creator. Generate high-quality practice problems that help students learn effectively."
      },
      {
        role: 'user',
        content: prompt
      }
    ]
    
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
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: response_format }
        }.to_json
      )
      
      if response.success?
        content = response.dig('choices', 0, 'message', 'content')
        @token_count = response.dig('usage', 'total_tokens') || 0
        @cost = calculate_cost(model, @token_count)
        raise "No content in API response" if content.nil? || content.empty?
        parse_problem_response(content)
      else
        error_body = response.parsed_response || response.body
        raise "OpenRouter API error: #{error_body}"
      end
    else
      raise "OpenAI API key not provided" unless @api_key
      client = OpenAI::Client.new(access_token: @api_key)
      response = client.chat(
        parameters: {
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: response_format }
        }
      )
      content = response.dig('choices', 0, 'message', 'content')
      @token_count = response.dig('usage', 'total_tokens') || 0
      @cost = calculate_cost(model, @token_count)
      raise "No content in API response" if content.nil? || content.empty?
      parse_problem_response(content)
    end
  end

  def parse_problem_response(content)
    begin
      parsed = JSON.parse(content)
      # Convert string keys to symbols for consistency
      parsed.transform_keys(&:to_sym)
    rescue JSON::ParserError => e
      # Fallback: try to extract JSON from markdown code blocks
      json_match = content.match(/```(?:json)?\s*(\{.*?\})\s*```/m)
      if json_match
        begin
          parsed = JSON.parse(json_match[1])
          parsed.transform_keys(&:to_sym)
        rescue JSON::ParserError
          create_fallback_problem(content)
        end
      else
        create_fallback_problem(content)
      end
    end
  end

  def create_fallback_problem(content)
    # Last resort: create a basic problem structure
    {
      question: content.split("\n").first || "Practice problem",
      problem_type: 'free_response',
      topic: nil,
      options: nil,
      correct_answer: "See solution steps",
      solution_steps: content.split("\n").reject(&:empty?)
    }
  end

  def difficulty_name(difficulty)
    case difficulty
    when 1
      'Beginner'
    when 2
      'Easy'
    when 3
      'Intermediate'
    when 4
      'Advanced'
    when 5
      'Expert'
    else
      'Intermediate'
    end
  end

  def calculate_cost(model, token_count)
    case model
    when 'gpt-4o-mini', 'openai/gpt-4o-mini'
      (token_count.to_f / 1_000_000) * 0.15
    when 'gpt-4o', 'openai/gpt-4o'
      (token_count.to_f / 1_000_000) * 5.0
    else
      0.0
    end
  end

  # Extract problem tags (topic, sub-topic, difficulty, prerequisites) using AI
  def extract_problem_tags(problem_data)
    question = problem_data[:question] || problem_data['question'] || ''
    topic = problem_data[:topic] || problem_data['topic'] || ''
    subject = problem_data[:subject] || problem_data['subject'] || ''
    difficulty = problem_data[:difficulty] || problem_data['difficulty'] || 3
    
    prompt = <<~PROMPT
      Analyze this practice problem and extract structured tags.
      
      Problem:
      #{question}
      
      Subject: #{subject}
      Topic: #{topic}
      Difficulty Level: #{difficulty}
      
      Extract and return the following tags in JSON format:
      {
        "topic": "Broad subject area (e.g., 'Newton's Laws', 'Kinematics', 'Work & Energy')",
        "sub_topic": "Granular skill being tested (e.g., 'Incline FBD', 'Two-Body System', 'Angled Force Components')",
        "difficulty": #{difficulty},
        "prerequisites": ["Skill 1", "Skill 2", "Skill 3"]
      }
      
      The topic should be a broad subject area.
      The sub_topic should be the specific skill or concept being tested.
      Prerequisites should be skills required to solve the problem (e.g., "Trigonometry", "Vector Addition", "Algebra").
      
      Return only valid JSON:
    PROMPT
    
    begin
      tags_json = generate_via_llm(prompt, subject, response_format: 'json_object')
      parsed = JSON.parse(tags_json)
      
      {
        topic: parsed['topic'] || topic || subject,
        sub_topic: parsed['sub_topic'] || topic,
        difficulty: parsed['difficulty'] || difficulty,
        prerequisites: parsed['prerequisites'] || []
      }
    rescue => e
      # Fallback if extraction fails
      Rails.logger.warn("Problem tag extraction failed: #{e.message}") if defined?(Rails)
      {
        topic: subject,
        sub_topic: topic,
        difficulty: difficulty,
        prerequisites: []
      }
    end
  end

  # Get the highest priority short-term goal for a subject
  def get_priority_short_term_goal(student, subject)
    Goal
      .where(student_id: student.id, subject: subject, goal_type: 'short_term', status: 'active')
      .where('target_date >= ?', Date.current) # Not expired
      .order(
        Arel.sql("COALESCE((metadata->>'priority')::float, 0.5) DESC"),
        Arel.sql("COALESCE((metadata->>'confidence')::float, 0.5) DESC"),
        created_at: :desc
      )
      .first
  end

  # Extract topic from goal title/description
  def extract_topic_from_goal(goal)
    # Try to extract topic from goal metadata first
    related_concepts = goal.metadata&.dig('related_concepts') || []
    return related_concepts.first if related_concepts.any?
    
    # Fallback: extract from goal title/description
    text = "#{goal.title} #{goal.description}".downcase
    
    # Common topic keywords
    topic_keywords = {
      'calculus' => ['derivative', 'integral', 'limit', 'calculus'],
      'algebra' => ['equation', 'function', 'polynomial', 'algebra'],
      'geometry' => ['triangle', 'circle', 'angle', 'geometry'],
      'physics' => ['force', 'energy', 'motion', 'physics'],
      'chemistry' => ['reaction', 'molecule', 'atom', 'chemistry'],
      'computer science' => ['array', 'function', 'algorithm', 'programming']
    }
    
    # Find matching topic
    topic_keywords.each do |topic, keywords|
      return topic if keywords.any? { |kw| text.include?(kw) }
    end
    
    # Last resort: use first significant word from title
    words = goal.title.split(/\s+/).reject { |w| w.length < 4 }
    words.first&.downcase
  end

  # Analyze recent conversations to detect struggling concepts
  def get_struggling_concepts_from_conversations(student, subject)
    # Get last 20 conversation messages for this subject (last 10 turns)
    # Include messages where subject matches or is null (general conversations)
    recent_messages = ConversationMessage
      .where(student_id: student.id)
      .where("(context->>'subject' = ? OR context->>'subject' IS NULL)", subject)
      .order(created_at: :desc)
      .limit(20)
    
    return [] if recent_messages.empty?
    
    # Look for patterns indicating struggle
    struggling_concepts = []
    user_messages = recent_messages.select { |m| m.role == 'user' }
    assistant_messages = recent_messages.select { |m| m.role == 'assistant' }
    
    # Analyze conversation pairs for struggle indicators
    user_messages.each_with_index do |user_msg, idx|
      # Check for struggle indicators in user messages
      struggle_patterns = [
        /don'?t understand/i,
        /confused/i,
        /stuck/i,
        /can'?t solve/i,
        /don'?t know how/i,
        /help with/i,
        /struggling/i,
        /difficult/i,
        /hard/i,
        /wrong/i,
        /incorrect/i
      ]
      
      if struggle_patterns.any? { |pattern| user_msg.content.match?(pattern) }
        # Try to extract the concept they're struggling with
        concept = extract_concept_from_message(user_msg.content, assistant_messages[idx]&.content)
        if concept
          struggling_concepts << {
            concept: concept,
            context: user_msg.content[0..150], # First 150 chars for context
            detected_at: user_msg.created_at
          }
        end
      end
    end
    
    # If we have AI service available, use it to better extract struggling concepts
    if @api_key.present? && struggling_concepts.any?
      struggling_concepts = enhance_struggling_concepts_with_ai(recent_messages, struggling_concepts, subject)
    end
    
    # Remove duplicates and return most recent
    struggling_concepts.uniq { |c| c[:concept] }.first(3)
  end

  # Use AI to better identify struggling concepts from conversations
  def enhance_struggling_concepts_with_ai(messages, initial_concepts, subject)
    return initial_concepts unless @api_key.present?
    
    # Build conversation context
    conversation_text = messages.reverse.map do |msg|
      role_label = msg.role == 'user' ? 'Student' : 'AI'
      "#{role_label}: #{msg.content}"
    end.join("\n\n")
    
    prompt = <<~PROMPT
      Analyze this conversation between a student and AI tutor about #{subject}:
      
      #{conversation_text}
      
      Identify the specific concepts or topics the student is struggling with. Look for:
      - Concepts they explicitly mention having trouble with
      - Topics they ask for help on
      - Areas where they express confusion or difficulty
      
      Return JSON format:
      {
        "struggling_concepts": [
          {
            "concept": "Specific concept name",
            "context": "Brief context of why they're struggling",
            "severity": "low|medium|high"
          }
        ]
      }
    PROMPT
    
    begin
      # Use AI service to analyze
      ai_service = AiCompanionService.new(api_key: @api_key, use_openrouter: @use_openrouter)
      response = ai_service.generate_response(prompt, response_format: 'json_object')
      parsed = JSON.parse(response)
      
      ai_concepts = (parsed['struggling_concepts'] || []).map do |c|
        {
          concept: c['concept'] || c[:concept],
          context: c['context'] || c[:context] || '',
          severity: c['severity'] || c[:severity] || 'medium',
          detected_at: Time.current
        }
      end
      
      # Merge AI-detected concepts with pattern-matched ones, prioritizing AI results
      (ai_concepts + initial_concepts).uniq { |c| c[:concept] }
    rescue => e
      Rails.logger.warn "AI struggling concept analysis failed: #{e.message}"
      initial_concepts # Fallback to pattern-matched concepts
    end
  end

  # Extract concept from conversation message
  def extract_concept_from_message(user_content, assistant_content = nil)
    # Simple extraction: look for quoted text, capitalized phrases, or common concept patterns
    # This is a simple implementation - could be enhanced with AI
    
    # Try to find concept in quotes
    quoted = user_content.match(/["']([^"']+)["']/)
    return quoted[1] if quoted
    
    # Look for "with [concept]" or "about [concept]"
    with_match = user_content.match(/(?:with|about|on)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/)
    return with_match[1] if with_match
    
    # Look for capitalized phrases (likely concepts)
    capitalized = user_content.scan(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/).reject do |phrase|
      # Filter out common words
      ['I', 'The', 'This', 'That', 'What', 'How', 'Why', 'When', 'Where'].include?(phrase)
    end.first
    
    capitalized || nil
  end
end

