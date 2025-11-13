import { generateContent, type OpenRouterMessage } from '@/lib/ai/openrouter'
import { prisma } from '@/lib/db/client'
import type { MedicalProviderData } from './types'

/**
 * Extract medical provider data from document text using AI
 */
export async function extractMedicalData(
  text: string,
  documentId: string
): Promise<MedicalProviderData[]> {
  const prompt = `Analyze the following medical records and extract medical provider information. For each provider, extract:
1. Medical provider name
2. Total amount billed (if available)
3. A chronological timeline of treatments (dates, services, procedures)
4. A summary of injuries and treatments

Format your response as a JSON array of objects with this structure:
[
  {
    "providerName": "Provider Name",
    "amount": 1234.56,
    "chronology": "Chronological timeline of treatments...",
    "summary": "Summary of injuries and treatments..."
  }
]

Medical Records Text:
${text.substring(0, 10000)} // Limit to first 10k chars to avoid token limits

Respond with ONLY valid JSON array. If no medical providers are found, return an empty array [].`

  const messages: OpenRouterMessage[] = [
    {
      role: 'system',
      content: 'You are a medical records analyst. Extract medical provider information from medical records and return structured JSON data only.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ]

  try {
    const result = await generateContent(messages, 'anthropic/claude-3.5-sonnet', {
      temperature: 0.3,
      max_tokens: 4000,
    })

    // Parse JSON response
    const jsonMatch = result.content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const providers = JSON.parse(jsonMatch[0])
      
      // Validate and normalize the data
      return providers
        .filter((p: any) => p.providerName)
        .map((p: any) => ({
          providerName: p.providerName,
          amount: typeof p.amount === 'number' ? p.amount : null,
          chronology: p.chronology || '',
          summary: p.summary || '',
        }))
    }

    return []
  } catch (error) {
    console.error('Medical extraction error:', error)
    return []
  }
}

/**
 * Generate chronology for a medical provider
 */
export async function generateChronology(
  providerData: MedicalProviderData
): Promise<string> {
  if (providerData.chronology) {
    return providerData.chronology
  }

  // If no chronology provided, generate one from summary
  const prompt = `Create a chronological timeline of medical treatments for ${providerData.providerName}.

Summary: ${providerData.summary}

Generate a clear, chronological timeline of all treatments, procedures, and services.`

  const messages: OpenRouterMessage[] = [
    {
      role: 'system',
      content: 'You are a medical records analyst. Create clear, chronological timelines of medical treatments.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ]

  try {
    const result = await generateContent(messages, 'anthropic/claude-3.5-sonnet', {
      temperature: 0.3,
      max_tokens: 2000,
    })

    return result.content
  } catch (error) {
    console.error('Chronology generation error:', error)
    return providerData.summary || ''
  }
}

