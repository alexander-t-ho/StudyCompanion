import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

// GET /api/analyze/:analysisId
export async function GET(
  request: NextRequest,
  { params }: { params: { analysisId: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const { analysisId } = params

    if (!analysisId) {
      return NextResponse.json(
        { success: false, error: 'Analysis ID is required' },
        { status: 400 }
      )
    }

    const analysis = await prisma.documentAnalysis.findFirst({
      where: {
        id: analysisId,
        userId: user.userId,
      },
    })

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analysis not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      analysis: {
        id: analysis.id,
        analysisData: analysis.analysisData,
        status: analysis.status,
        sourceDocumentId: analysis.sourceDocumentId,
        documentId: analysis.documentId,
        createdAt: analysis.createdAt,
      },
    })
  } catch (error) {
    console.error('Get analysis error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get analysis',
      },
      { status: 500 }
    )
  }
}

