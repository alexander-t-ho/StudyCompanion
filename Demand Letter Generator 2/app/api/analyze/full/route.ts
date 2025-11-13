import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { extractStyle } from '@/lib/style-extractor'
import { analyzeTone } from '@/lib/tone-analyzer'
import { prisma } from '@/lib/db/client'

// POST /api/analyze/full
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const body = await request.json()
    const { sourceDocumentId, documentId } = body

    if (!sourceDocumentId) {
      return NextResponse.json(
        { success: false, error: 'sourceDocumentId is required' },
        { status: 400 }
      )
    }

    // Verify source document exists and belongs to user
    const sourceDocument = await prisma.sourceDocument.findFirst({
      where: {
        id: sourceDocumentId,
        document: {
          userId: user.userId,
        },
      },
    })

    if (!sourceDocument) {
      return NextResponse.json(
        { success: false, error: 'Source document not found' },
        { status: 404 }
      )
    }

    // Extract both style and tone in parallel
    const [styleMetadata, toneMetadata] = await Promise.all([
      extractStyle(sourceDocumentId).catch(() => null),
      analyzeTone(sourceDocumentId).catch(() => null),
    ])

    // If documentId provided, update the document's metadata
    if (documentId) {
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          userId: user.userId,
        },
      })

      if (document) {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            metadata: {
              ...(document.metadata as object || {}),
              ...(styleMetadata && { styleMetadata }),
              ...(toneMetadata && { toneMetadata }),
            },
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      styleMetadata: styleMetadata || undefined,
      toneMetadata: toneMetadata || undefined,
    })
  } catch (error) {
    console.error('Full analysis error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      },
      { status: 500 }
    )
  }
}

