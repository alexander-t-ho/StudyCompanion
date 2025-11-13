import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

// GET /api/analyze/:analysisId/usages
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

    // Verify analysis belongs to user
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

    // Get all point usages for this analysis
    const usages = await prisma.analysisPointUsage.findMany({
      where: {
        analysisId,
      },
      include: {
        section: {
          select: {
            id: true,
            sectionType: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      usages: usages.map(usage => ({
        pointId: usage.pointId,
        sectionId: usage.section.id,
        sectionType: usage.section.sectionType,
        pointType: usage.pointType,
        pointText: usage.pointText,
      })),
    })
  } catch (error) {
    console.error('Get point usages error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get point usages',
      },
      { status: 500 }
    )
  }
}

