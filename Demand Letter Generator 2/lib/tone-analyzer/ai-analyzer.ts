import { generateContent, type OpenRouterMessage } from '@/lib/ai/openrouter'
import type { ToneMetadata } from './types'

/**
 * Analyze tone using AI
 */
export async function analyzeToneWithAI(
  text: string,
  sampleSize: number = 5
): Promise<ToneMetadata> {
  // Extract sample paragraphs
  const paragraphs = text
    .split(/\n\s*\n/)
    .filter(p => p.trim().length > 50) // Filter out very short paragraphs
    .slice(0, sampleSize)
    .join('\n\n')

  if (paragraphs.length < 50) {
    // Not enough text to analyze, return default
    return {
      formality: 'professional',
      voice: 'Neutral',
      descriptors: ['professional', 'clear'],
    }
  }

  const prompt = `Analyze the writing tone of the following text sample. Provide a JSON response with:
1. formality: one of "formal", "professional", "assertive", or "conversational"
2. voice: a single word or short phrase describing the voice (e.g., "Authoritative", "Empathetic", "Neutral")
3. descriptors: an array of 3-5 tone keywords (e.g., ["direct", "confident", "respectful"])

Text sample:
${paragraphs}

Respond with ONLY valid JSON in this format:
{
  "formality": "professional",
  "voice": "Authoritative",
  "descriptors": ["direct", "confident", "respectful"]
}`

  const messages: OpenRouterMessage[] = [
    {
      role: 'system',
      content: 'You are a writing style analyst. Analyze text and provide tone metadata in JSON format only.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ]

  try {
    const result = await generateContent(messages, 'anthropic/claude-3.5-sonnet', {
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 500,
    })

    // Parse JSON response
    const jsonMatch = result.content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        formality: parsed.formality || 'professional',
        voice: parsed.voice || 'Neutral',
        descriptors: Array.isArray(parsed.descriptors) ? parsed.descriptors : ['professional'],
      }
    }

    // Fallback if JSON parsing fails
    return {
      formality: 'professional',
      voice: 'Neutral',
      descriptors: ['professional', 'clear'],
    }
  } catch (error) {
    console.error('Tone analysis error:', error)
    // Return default on error
    return {
      formality: 'professional',
      voice: 'Neutral',
      descriptors: ['professional', 'clear'],
    }
  }
}

