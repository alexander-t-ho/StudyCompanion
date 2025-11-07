# Service to analyze transcripts for sentiment, concepts, engagement, etc.
require 'json'

class TranscriptAnalysisService
  def initialize(api_key: nil, use_openrouter: false)
    @api_key = api_key || ENV['OPENAI_API_KEY']
    @use_openrouter = use_openrouter || ENV['USE_OPENROUTER'] == 'true'
    @openrouter_api_key = ENV['OPENROUTER_API_KEY']
  end

  def analyze(transcript)
    prompt = build_analysis_prompt(transcript.transcript_content)
    
    if @use_openrouter && @openrouter_api_key
      result = analyze_via_openrouter(prompt, transcript)
    else
      result = analyze_via_openai(prompt, transcript)
    end

    result
  end

  private

  def build_analysis_prompt(transcript_content)
    <<~PROMPT
      Analyze the following tutor-student conversation transcript and provide a comprehensive analysis in JSON format.

      Transcript:
      #{transcript_content}

      Please provide analysis in the following JSON structure:
      {
        "sentiment_analysis": {
          "overall_sentiment": "positive|neutral|frustrated|confused|engaged",
          "student_sentiment": {
            "overall": "positive|neutral|frustrated|confused|engaged",
            "segments": [
              {
                "segment": "excerpt from transcript",
                "sentiment": "positive|neutral|frustrated|confused|engaged",
                "confidence": "high|medium|low"
              }
            ]
          },
          "tutor_sentiment": {
            "overall": "encouraging|neutral|concerned",
            "segments": [
              {
                "segment": "excerpt from transcript",
                "sentiment": "encouraging|neutral|concerned",
                "confidence": "high|medium|low"
              }
            ]
          },
          "engagement_level": "high|medium|low",
          "confidence_indicators": ["list of indicators showing student confidence or lack thereof"]
        },
        "concept_extraction": {
          "concepts_discussed": [
            {
              "concept": "concept name",
              "subject": "subject area",
              "mastery_level": "struggling|learning|mastered",
              "evidence": "excerpt showing understanding level"
            }
          ],
          "topics_covered": ["list of topics"],
          "learning_objectives_met": ["list of objectives that were achieved"]
        },
        "speaker_identification": {
          "tutor_segments": ["segments identified as tutor"],
          "student_segments": ["segments identified as student"],
          "confidence": "high|medium|low"
        },
        "engagement_score": 0-100,
        "engagement_metrics": {
          "question_frequency": "high|medium|low",
          "response_patterns": "detailed|brief|mixed",
          "interaction_quality": "high|medium|low",
          "participation_level": "high|medium|low"
        },
        "summary": "Brief summary of the session, key learning moments, and overall assessment"
      }

      Return ONLY valid JSON, no additional text.
    PROMPT
  end

  def analyze_via_openai(prompt, transcript)
    client = OpenAI::Client.new(access_token: @api_key)
    model = 'gpt-4o-mini' # Use mini for cost-effectiveness

    response = client.chat(
      parameters: {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing educational conversations. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, # Lower temperature for more consistent analysis
        response_format: { type: 'json_object' }
      }
    )

    content = response.dig('choices', 0, 'message', 'content')
    token_count = response.dig('usage', 'total_tokens') || 0
    
    parsed_analysis = JSON.parse(content)
    
    {
      sentiment_analysis: parsed_analysis['sentiment_analysis'],
      concept_extraction: parsed_analysis['concept_extraction'],
      speaker_identification: parsed_analysis['speaker_identification'],
      engagement_score: parsed_analysis['engagement_score'],
      engagement_metrics: parsed_analysis['engagement_metrics'],
      summary: parsed_analysis['summary'],
      model_used: model,
      token_count: token_count,
      cost: calculate_cost(model, token_count)
    }
  rescue JSON::ParserError => e
    raise "Failed to parse analysis JSON: #{e.message}"
  end

  def analyze_via_openrouter(prompt, transcript)
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
            content: 'You are an expert at analyzing educational conversations. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }.to_json
    )

    if response.success?
      content = response.dig('choices', 0, 'message', 'content')
      token_count = response.dig('usage', 'total_tokens') || 0
      
      parsed_analysis = JSON.parse(content)
      
      {
        sentiment_analysis: parsed_analysis['sentiment_analysis'],
        concept_extraction: parsed_analysis['concept_extraction'],
        speaker_identification: parsed_analysis['speaker_identification'],
        engagement_score: parsed_analysis['engagement_score'],
        engagement_metrics: parsed_analysis['engagement_metrics'],
        summary: parsed_analysis['summary'],
        model_used: model,
        token_count: token_count,
        cost: calculate_cost(model, token_count)
      }
    else
      raise "OpenRouter API error: #{response.body}"
    end
  rescue JSON::ParserError => e
    raise "Failed to parse analysis JSON: #{e.message}"
  end

  def calculate_cost(model, token_count)
    # GPT-4o-mini: ~$0.30 per 1M tokens average
    cost_per_million = 0.30
    (token_count / 1_000_000.0) * cost_per_million
  end
end

