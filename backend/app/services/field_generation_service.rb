# Service to generate random Learning Objectives and Student Personality
# based on subject, topic, and student level

class FieldGenerationService
  def initialize(api_key: nil, use_openrouter: false)
    @api_key = api_key || ENV['OPENAI_API_KEY']
    @use_openrouter = use_openrouter || ENV['USE_OPENROUTER'] == 'true'
    @openrouter_api_key = ENV['OPENROUTER_API_KEY']
  end

  def generate_fields(subject:, topic:, student_level:)
    prompt = build_prompt(subject, topic, student_level)
    
    if @use_openrouter && @openrouter_api_key
      generate_via_openrouter(prompt)
    else
      generate_via_openai(prompt)
    end
  end

  def generate_topic(subject:, student_level: 'intermediate')
    prompt = build_topic_prompt(subject, student_level)
    
    if @use_openrouter && @openrouter_api_key
      generate_topic_via_openrouter(prompt)
    else
      generate_topic_via_openai(prompt)
    end
  end

  private

  def build_prompt(subject, topic, student_level)
    subject_guidance = get_subject_guidance(subject)
    
    <<~PROMPT
      Generate realistic and contextually appropriate suggestions for a tutoring session.

      Subject: #{subject}
      Topic: #{topic}
      Student Level: #{student_level}

      Subject Context:
      #{subject_guidance}

      Generate TWO separate outputs in JSON format:

      1. Learning Objectives: Generate 2-3 specific, measurable learning objectives for this subject and topic. Make them realistic and appropriate for a #{student_level} level student. Format as a single string with objectives separated by periods or semicolons.

      2. Student Personality/Engagement Style: Generate a realistic student personality and engagement style description (2-3 sentences). Include 1-2 specific traits relevant to this subject. Make it natural and realistic, not generic. Examples: "Engaged and curious, sometimes struggles with confidence on word problems" or "Very detail-oriented and methodical, but can get overwhelmed with complex multi-step problems."

      Respond ONLY with valid JSON in this exact format:
      {
        "learning_objectives": "Objective 1. Objective 2. Objective 3.",
        "student_personality": "Description of student personality and engagement style with specific traits relevant to the subject."
      }
    PROMPT
  end

  def get_subject_guidance(subject)
    case subject.upcase
    when 'SAT'
      "SAT preparation focusing on test-taking strategies, content review, and skill building. Topics may include: college essays, study skills, AP prep, math, reading, writing."
    when 'AP BIOLOGY'
      "AP Biology curriculum covering cellular processes, genetics, evolution, ecology, and organismal biology. Focus on scientific inquiry and data analysis."
    when 'AP CHEMISTRY'
      "AP Chemistry covering atomic structure, chemical bonding, reactions, thermodynamics, and kinetics. Emphasis on problem-solving and lab skills."
    when 'AP PHYSICS 1', 'AP PHYSICS 2'
      "AP Physics covering mechanics, electricity, magnetism, waves, and modern physics. Focus on conceptual understanding and problem-solving."
    when 'AP PHYSICS C: MECHANICS', 'AP PHYSICS C: ELECTRICITY AND MAGNETISM'
      "AP Physics C with calculus-based approach. Advanced mechanics or E&M topics with emphasis on mathematical problem-solving."
    when 'AP CALCULUS AB', 'AP CALCULUS BC'
      "AP Calculus covering limits, derivatives, integrals, and applications. BC includes series and additional topics. Focus on computational and conceptual skills."
    when 'AP STATISTICS'
      "AP Statistics covering data analysis, probability, inference, and statistical reasoning. Emphasis on interpretation and real-world applications."
    when 'AP COMPUTER SCIENCE A'
      "AP Computer Science A covering programming in Java, data structures, algorithms, and object-oriented design. Focus on coding skills and problem-solving."
    when 'AP COMPUTER SCIENCE PRINCIPLES'
      "AP Computer Science Principles covering computational thinking, programming, data, algorithms, and impacts of computing. Broader, less coding-intensive."
    when 'AP ENVIRONMENTAL SCIENCE'
      "AP Environmental Science covering ecosystems, biodiversity, resources, pollution, and sustainability. Interdisciplinary approach with scientific and social aspects."
    else
      "General academic subject covering key concepts, problem-solving, and skill development appropriate for the topic."
    end
  end

  def generate_via_openai(prompt)
    client = OpenAI::Client.new(access_token: @api_key)
    model = 'gpt-4o-mini'

    response = client.chat(
      parameters: {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at generating realistic educational content. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      }
    )

    content = response.dig('choices', 0, 'message', 'content')
    parse_response(content)
  end

  def generate_via_openrouter(prompt)
    model = 'openai/gpt-4o-mini'
    
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
            content: 'You are an expert at generating realistic educational content. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      }.to_json
    )

    if response.success?
      content = response.dig('choices', 0, 'message', 'content')
      parse_response(content)
    else
      raise "OpenRouter API error: #{response.body}"
    end
  end

  def build_topic_prompt(subject, student_level)
    subject_guidance = get_subject_guidance(subject)
    
    <<~PROMPT
      Generate a realistic and contextually appropriate topic for a tutoring session.

      Subject: #{subject}
      Student Level: #{student_level}

      Subject Context:
      #{subject_guidance}

      Generate a specific topic that:
      1. Is directly related to the subject
      2. Is appropriate for a #{student_level} level student
      3. Is specific enough to be useful (not too broad)
      4. Is realistic and commonly covered in tutoring sessions

      Respond ONLY with valid JSON in this exact format:
      {
        "topic": "Specific topic name (e.g., 'Derivatives and Chain Rule', 'Photosynthesis and Cellular Respiration', 'Essay Structure and Thesis Statements')"
      }
    PROMPT
  end

  def generate_topic_via_openai(prompt)
    client = OpenAI::Client.new(access_token: @api_key)
    model = 'gpt-4o-mini'

    response = client.chat(
      parameters: {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at generating realistic educational topics. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 200,
        response_format: { type: 'json_object' }
      }
    )

    content = response.dig('choices', 0, 'message', 'content')
    parse_topic_response(content)
  end

  def generate_topic_via_openrouter(prompt)
    model = 'openai/gpt-4o-mini'
    
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
            content: 'You are an expert at generating realistic educational topics. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 200,
        response_format: { type: 'json_object' }
      }.to_json
    )

    if response.success?
      content = response.dig('choices', 0, 'message', 'content')
      parse_topic_response(content)
    else
      raise "OpenRouter API error: #{response.body}"
    end
  end

  def parse_topic_response(content)
    parsed = JSON.parse(content)
    {
      topic: parsed['topic'] || get_fallback_topic
    }
  rescue JSON::ParserError => e
    # Fallback if JSON parsing fails
    {
      topic: get_fallback_topic
    }
  end

  def get_fallback_topic
    # Simple fallback topics by subject
    topics = [
      'Introduction to Key Concepts',
      'Problem-Solving Strategies',
      'Review and Practice',
      'Advanced Topics',
      'Exam Preparation'
    ]
    topics.sample
  end

  def parse_response(content)
    parsed = JSON.parse(content)
    {
      learning_objectives: parsed['learning_objectives'] || 'Learn key concepts and develop problem-solving skills.',
      student_personality: parsed['student_personality'] || 'Engaged and curious student.'
    }
  rescue JSON::ParserError => e
    # Fallback if JSON parsing fails
    {
      learning_objectives: 'Learn key concepts and develop problem-solving skills for this topic.',
      student_personality: 'Engaged and curious student, sometimes struggles with confidence on challenging problems.'
    }
  end
end

