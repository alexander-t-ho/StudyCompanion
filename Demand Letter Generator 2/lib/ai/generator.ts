import { generateContent, generateContentStream, type OpenRouterMessage } from './openrouter'
import { buildPrompt } from './prompts'
import { prisma } from '@/lib/db/client'
import type { GenerationRequest, GenerationResponse, StreamChunk, SectionType } from './types'

/**
 * Track which analysis points are used in a generated section
 */
async function trackAnalysisPointUsage(
  analysisId: string,
  documentId: string,
  sectionType: string,
  generatedContent: string,
  analysisPoints: {
    legalPoints?: Array<{id: string, text: string, category: string}>
    facts?: Array<{id: string, text: string, date?: string}>
    damages?: Array<{id: string, text: string, amount?: number, type: string}>
  }
) {
  // Get the section ID
  const section = await prisma.documentSection.findFirst({
    where: {
      documentId,
      sectionType,
    },
  })

  if (!section) {
    return // Section doesn't exist yet, will be created later
  }

  const usedPoints: Array<{
    pointId: string
    pointType: string
    pointText: string
  }> = []

  // Check which points are referenced in the generated content
  const contentLower = generatedContent.toLowerCase()

  // Check legal points
  if (analysisPoints.legalPoints) {
    for (const point of analysisPoints.legalPoints) {
      // Simple keyword matching - check if key terms from the point appear in content
      const keywords = point.text.toLowerCase().split(/\s+/).filter(w => w.length > 4)
      const matches = keywords.filter(kw => contentLower.includes(kw))
      if (matches.length >= Math.min(2, keywords.length * 0.3)) {
        usedPoints.push({
          pointId: point.id,
          pointType: 'legal',
          pointText: point.text,
        })
      }
    }
  }

  // Check facts
  if (analysisPoints.facts) {
    for (const fact of analysisPoints.facts) {
      const keywords = fact.text.toLowerCase().split(/\s+/).filter(w => w.length > 4)
      const matches = keywords.filter(kw => contentLower.includes(kw))
      if (matches.length >= Math.min(2, keywords.length * 0.3)) {
        usedPoints.push({
          pointId: fact.id,
          pointType: 'fact',
          pointText: fact.text,
        })
      }
    }
  }

  // Check damages
  if (analysisPoints.damages) {
    for (const damage of analysisPoints.damages) {
      const keywords = damage.text.toLowerCase().split(/\s+/).filter(w => w.length > 4)
      const matches = keywords.filter(kw => contentLower.includes(kw))
      if (matches.length >= Math.min(2, keywords.length * 0.3)) {
        usedPoints.push({
          pointId: damage.id,
          pointType: 'damage',
          pointText: damage.text,
        })
      }
    }
  }

  // Store point usages
  if (usedPoints.length > 0) {
    await prisma.analysisPointUsage.createMany({
      data: usedPoints.map(point => ({
        analysisId,
        sectionId: section.id,
        pointId: point.pointId,
        pointType: point.pointType,
        pointText: point.pointText,
      })),
      skipDuplicates: true,
    })
  }
}

/**
 * Generate content for a document section
 */
export async function generateSection(
  request: GenerationRequest
): Promise<GenerationResponse> {
  const startTime = Date.now()
  
  try {
    // Get document to access template and metadata
    const document = await prisma.document.findUnique({
      where: { id: request.documentId },
      include: { template: true },
    })

    if (!document) {
      return {
        success: false,
        error: 'Document not found',
      }
    }

    // Get style/tone metadata from template if not provided
    const styleMetadata = request.context.styleMetadata || document.template?.styleMetadata
    const toneMetadata = request.context.toneMetadata || document.template?.toneMetadata

    // Ensure date defaults to current day
    const caseInfo = {
      ...request.context.caseInfo,
      dateOfLetter: request.context.caseInfo?.dateOfLetter || new Date().toISOString().split('T')[0],
    }

    // Update context with template metadata and default date
    const enhancedContext = {
      ...request.context,
      caseInfo,
      styleMetadata,
      toneMetadata,
    }

    // Build final prompt if not custom
    const finalPrompt = request.prompt || buildPrompt(
      request.sectionType as SectionType,
      enhancedContext
    )

    // Prepare messages for OpenRouter
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: 'You are a professional legal assistant specializing in drafting demand letters. Generate clear, professional, and persuasive legal content.',
      },
      {
        role: 'user',
        content: finalPrompt,
      },
    ]

    // Generate content
    const model = request.model || process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet'
    const result = await generateContent(messages, model)

    // Track analysis point usage if analysis points are provided
    if (request.context.analysisId && request.context.analysisPoints) {
      try {
        await trackAnalysisPointUsage(
          request.context.analysisId,
          request.documentId,
          request.sectionType,
          result.content,
          request.context.analysisPoints
        )
      } catch (trackingError) {
        console.error('Failed to track analysis point usage:', trackingError)
        // Don't fail the request if tracking fails
      }
    }

    // Log generation history
    try {
      await prisma.generationHistory.create({
        data: {
          documentId: request.documentId,
          sectionType: request.sectionType,
          promptUsed: finalPrompt,
          modelUsed: result.modelUsed,
          responseTime: result.responseTime,
        },
      })
    } catch (historyError) {
      console.error('Failed to log generation history:', historyError)
      // Don't fail the request if history logging fails
    }

    return {
      success: true,
      content: result.content,
      modelUsed: result.modelUsed,
      responseTime: result.responseTime,
    }
  } catch (error) {
    console.error('Generation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during generation',
      responseTime: Date.now() - startTime,
    }
  }
}

/**
 * Generate content stream for a document section
 */
export async function* generateSectionStream(
  request: GenerationRequest
): AsyncGenerator<StreamChunk, void, unknown> {
  try {
    // Get document to access template and metadata
    const document = await prisma.document.findUnique({
      where: { id: request.documentId },
      include: { template: true },
    })

    if (!document) {
      yield { error: 'Document not found' }
      return
    }

    // Get style/tone metadata from template if not provided
    const styleMetadata = request.context.styleMetadata || document.template?.styleMetadata
    const toneMetadata = request.context.toneMetadata || document.template?.toneMetadata

    // Ensure date defaults to current day
    const caseInfo = {
      ...request.context.caseInfo,
      dateOfLetter: request.context.caseInfo?.dateOfLetter || new Date().toISOString().split('T')[0],
    }

    // Update context with template metadata and default date
    const enhancedContext = {
      ...request.context,
      caseInfo,
      styleMetadata,
      toneMetadata,
    }

    // Build final prompt if not custom
    const finalPrompt = request.prompt || buildPrompt(
      request.sectionType as SectionType,
      enhancedContext
    )

    // Prepare messages for OpenRouter
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: 'You are a professional legal assistant specializing in drafting demand letters. Generate clear, professional, and persuasive legal content.',
      },
      {
        role: 'user',
        content: finalPrompt,
      },
    ]

    // Generate content stream
    const model = request.model || process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet'
    let fullContent = ''
    let modelUsed = model
    let responseTime = 0

    for await (const chunk of generateContentStream(messages, model)) {
      if (chunk.chunk) {
        fullContent += chunk.chunk
        yield chunk
      } else if (chunk.done) {
        modelUsed = chunk.modelUsed || model
        responseTime = chunk.responseTime || 0
        
        // Track analysis point usage if analysis points are provided
        if (request.context.analysisId && request.context.analysisPoints) {
          try {
            await trackAnalysisPointUsage(
              request.context.analysisId,
              request.documentId,
              request.sectionType,
              fullContent,
              request.context.analysisPoints
            )
          } catch (trackingError) {
            console.error('Failed to track analysis point usage:', trackingError)
          }
        }

        // Log generation history
        try {
          await prisma.generationHistory.create({
            data: {
              documentId: request.documentId,
              sectionType: request.sectionType,
              promptUsed: finalPrompt,
              modelUsed,
              responseTime,
            },
          })
        } catch (historyError) {
          console.error('Failed to log generation history:', historyError)
        }
        
        yield chunk
      } else if (chunk.error) {
        yield chunk
        return
      }
    }
  } catch (error) {
    console.error('Streaming generation error:', error)
    yield {
      error: error instanceof Error ? error.message : 'Unknown error during streaming generation',
    }
  }
}

