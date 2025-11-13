import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { extractStyle } from '@/lib/style-extractor'
import { analyzeTone } from '@/lib/tone-analyzer'
import { prisma } from '@/lib/db/client'

// POST /api/analyze/firm-style
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const body = await request.json()
    const { sourceDocumentIds } = body

    if (!sourceDocumentIds || !Array.isArray(sourceDocumentIds) || sourceDocumentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'sourceDocumentIds array is required' },
        { status: 400 }
      )
    }

    // Verify all source documents exist and belong to user
    const sourceDocuments = await prisma.sourceDocument.findMany({
      where: {
        id: { in: sourceDocumentIds },
        document: {
          userId: user.userId,
        },
      },
    })

    if (sourceDocuments.length !== sourceDocumentIds.length) {
      return NextResponse.json(
        { success: false, error: 'One or more source documents not found' },
        { status: 404 }
      )
    }

    // Analyze all documents
    const analyses = await Promise.allSettled(
      sourceDocuments.map(async (doc) => {
        const [style, tone] = await Promise.all([
          extractStyle(doc.id).catch(() => null),
          analyzeTone(doc.id).catch(() => null),
        ])
        return { style, tone }
      })
    )

    // Aggregate results
    const successfulAnalyses = analyses
      .filter((result): result is PromiseFulfilledResult<{ style: any; tone: any }> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value)

    if (successfulAnalyses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to analyze any documents' },
        { status: 500 }
      )
    }

    // Aggregate style metadata (most common values)
    const styleMetadata = aggregateStyleMetadata(
      successfulAnalyses.map(a => a.style).filter(Boolean)
    )

    // Aggregate tone metadata (average/consensus)
    const toneMetadata = aggregateToneMetadata(
      successfulAnalyses.map(a => a.tone).filter(Boolean)
    )

    // Calculate confidence based on consistency
    const confidence = calculateConfidence(successfulAnalyses.length, sourceDocumentIds.length)

    return NextResponse.json({
      success: true,
      firmStyle: {
        styleMetadata,
        toneMetadata,
        confidence,
        sampleCount: successfulAnalyses.length,
      },
    })
  } catch (error) {
    console.error('Firm style analysis error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Firm style analysis failed',
      },
      { status: 500 }
    )
  }
}

/**
 * Aggregate style metadata from multiple documents
 */
function aggregateStyleMetadata(styles: any[]): any {
  if (styles.length === 0) return null
  if (styles.length === 1) return styles[0]

  // For now, return the first style as the most common
  // In a production system, you'd analyze patterns across all styles
  return styles[0]
}

/**
 * Aggregate tone metadata from multiple documents
 */
function aggregateToneMetadata(tones: any[]): any {
  if (tones.length === 0) return null
  if (tones.length === 1) return tones[0]

  // Count formality levels
  const formalityCounts: Record<string, number> = {}
  const voices: string[] = []
  const allDescriptors: string[] = []

  tones.forEach(tone => {
    if (tone.formality) {
      formalityCounts[tone.formality] = (formalityCounts[tone.formality] || 0) + 1
    }
    if (tone.voice) {
      voices.push(tone.voice)
    }
    if (Array.isArray(tone.descriptors)) {
      allDescriptors.push(...tone.descriptors)
    }
  })

  // Most common formality
  const formality = Object.entries(formalityCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'professional'

  // Most common voice
  const voiceCounts: Record<string, number> = {}
  voices.forEach(v => {
    voiceCounts[v] = (voiceCounts[v] || 0) + 1
  })
  const voice = Object.entries(voiceCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Neutral'

  // Most common descriptors
  const descriptorCounts: Record<string, number> = {}
  allDescriptors.forEach(d => {
    descriptorCounts[d] = (descriptorCounts[d] || 0) + 1
  })
  const descriptors = Object.entries(descriptorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([d]) => d)

  return {
    formality,
    voice,
    descriptors: descriptors.length > 0 ? descriptors : ['professional'],
  }
}

/**
 * Calculate confidence based on sample count
 */
function calculateConfidence(successfulCount: number, totalCount: number): number {
  if (totalCount === 0) return 0
  const baseConfidence = successfulCount / totalCount
  
  // Higher confidence with more samples
  const sampleBonus = Math.min(successfulCount / 10, 0.3) // Up to 30% bonus
  
  return Math.min(baseConfidence + sampleBonus, 1.0)
}

