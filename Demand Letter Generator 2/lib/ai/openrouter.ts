import type { GenerationRequest, GenerationResponse, StreamChunk } from './types'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet'

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenRouterRequest {
  model: string
  messages: OpenRouterMessage[]
  stream?: boolean
  temperature?: number
  max_tokens?: number
}

/**
 * Generate content using OpenRouter API (non-streaming)
 */
export async function generateContent(
  messages: OpenRouterMessage[],
  model: string = DEFAULT_MODEL,
  options?: {
    temperature?: number
    max_tokens?: number
  }
): Promise<{ content: string; modelUsed: string; responseTime: number }> {
  const startTime = Date.now()
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set')
  }

  const requestBody: OpenRouterRequest = {
    model,
    messages,
    stream: false,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.max_tokens ?? 4000,
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'Demand Letter Generator',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
      )
    }

    const data = await response.json()
    const responseTime = Date.now() - startTime

    const content = data.choices?.[0]?.message?.content || ''
    const modelUsed = data.model || model

    if (!content) {
      throw new Error('No content generated from API')
    }

    return {
      content,
      modelUsed,
      responseTime,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error during generation')
  }
}

/**
 * Generate content using OpenRouter API (streaming)
 */
export async function* generateContentStream(
  messages: OpenRouterMessage[],
  model: string = DEFAULT_MODEL,
  options?: {
    temperature?: number
    max_tokens?: number
  }
): AsyncGenerator<StreamChunk, void, unknown> {
  const startTime = Date.now()
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set')
  }

  const requestBody: OpenRouterRequest = {
    model,
    messages,
    stream: true,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.max_tokens ?? 4000,
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'Demand Letter Generator',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
      )
    }

    if (!response.body) {
      throw new Error('No response body for streaming')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              const responseTime = Date.now() - startTime
              yield {
                done: true,
                modelUsed: model,
                responseTime,
              }
              return
            }

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) {
                fullContent += delta
                yield { chunk: delta }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Final chunk
      const responseTime = Date.now() - startTime
      yield {
        done: true,
        modelUsed: model,
        responseTime,
      }
    } finally {
      reader.releaseLock()
    }
  } catch (error) {
    if (error instanceof Error) {
      yield { error: error.message }
    } else {
      yield { error: 'Unknown error during streaming' }
    }
  }
}

