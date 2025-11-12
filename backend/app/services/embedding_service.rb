# Service to generate embeddings using OpenAI API

class EmbeddingService
  def initialize(api_key: nil, use_openrouter: false)
    @api_key = api_key || ENV['OPENAI_API_KEY']
    # Only use OpenRouter if explicitly set to true AND we have a key
    # Don't fall back to ENV if use_openrouter is explicitly false
    @use_openrouter = use_openrouter == true && ENV['OPENROUTER_API_KEY'].present?
    @openrouter_api_key = ENV['OPENROUTER_API_KEY']
  end

  def generate(text, model: 'text-embedding-3-small')
    if @use_openrouter && @openrouter_api_key.present?
      begin
        generate_via_openrouter(text, model)
      rescue => e
        Rails.logger.warn "OpenRouter embedding failed, falling back to OpenAI: #{e.message}"
        # Fallback to OpenAI if OpenRouter fails
        generate_via_openai(text, model)
      end
    else
      generate_via_openai(text, model)
    end
  end

  private

  def generate_via_openai(text, model)
    unless @api_key.present?
      raise 'OpenAI API key is required but not provided'
    end

    client = OpenAI::Client.new(access_token: @api_key)

    response = client.embeddings(
      parameters: {
        model: model,
        input: text
      }
    )

    embedding = response.dig('data', 0, 'embedding')
    raise 'No embedding returned' unless embedding

    embedding
  end

  def generate_via_openrouter(text, model)
    # OpenRouter uses openai/text-embedding-3-small format
    openrouter_model = model == 'text-embedding-3-small' ? 'openai/text-embedding-3-small' : model

    response = HTTParty.post(
      'https://openrouter.ai/api/v1/embeddings',
      headers: {
        'Authorization' => "Bearer #{@openrouter_api_key}",
        'Content-Type' => 'application/json',
        'HTTP-Referer' => ENV['APP_URL'] || 'http://localhost:3000',
        'X-Title' => 'Study Companion'
      },
      body: {
        model: openrouter_model,
        input: text
      }.to_json
    )

    if response.success?
      embedding = response.dig('data', 0, 'embedding')
      raise 'No embedding returned' unless embedding
      embedding
    else
      raise "OpenRouter API error: #{response.body}"
    end
  end
end

