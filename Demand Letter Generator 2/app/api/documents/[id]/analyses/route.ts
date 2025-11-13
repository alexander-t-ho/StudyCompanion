import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'
import { documentService } from '@/lib/documents/service'

// GET /api/documents/:id/analyses
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    // Verify document ownership
    const document = await documentService.getById(params.id, user.userId)
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get all analyses for this document, ordered by most recent first
    const analyses = await prisma.documentAnalysis.findMany({
      where: {
        documentId: params.id,
        userId: user.userId,
      },
      include: {
        sourceDocument: {
          select: {
            id: true,
            filename: true,
            fileType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Find the most recent completed analysis, or the most recent one if none are completed
    const completedAnalysis = analyses.find(a => a.status === 'completed')
    const mostRecentAnalysis = completedAnalysis || analyses[0]

    // If we have a completed analysis, return it with aggregated data from all completed analyses
    if (mostRecentAnalysis && mostRecentAnalysis.status === 'completed') {
      // Aggregate all completed analyses to combine their points
      const completedAnalyses = analyses.filter(a => a.status === 'completed')
      
      const aggregatedData: any = {
        legalPoints: [],
        facts: [],
        damages: [],
        summary: mostRecentAnalysis.analysisData && typeof mostRecentAnalysis.analysisData === 'object' 
          ? (mostRecentAnalysis.analysisData as any).summary || '' 
          : '',
      }

      // Combine points from all completed analyses (avoid duplicates)
      const seenLegalPoints = new Set<string>()
      const seenFacts = new Set<string>()
      const seenDamages = new Set<string>()

      for (const analysis of completedAnalyses) {
        const data = analysis.analysisData as any
        
        if (data.legalPoints && Array.isArray(data.legalPoints)) {
          for (const point of data.legalPoints) {
            const key = point.text?.toLowerCase().trim() || ''
            if (key && !seenLegalPoints.has(key)) {
              seenLegalPoints.add(key)
              aggregatedData.legalPoints.push(point)
            }
          }
        }

        if (data.facts && Array.isArray(data.facts)) {
          for (const fact of data.facts) {
            const key = fact.text?.toLowerCase().trim() || ''
            if (key && !seenFacts.has(key)) {
              seenFacts.add(key)
              aggregatedData.facts.push(fact)
            }
          }
        }

        if (data.damages && Array.isArray(data.damages)) {
          for (const damage of data.damages) {
            const key = damage.text?.toLowerCase().trim() || ''
            if (key && !seenDamages.has(key)) {
              seenDamages.add(key)
              aggregatedData.damages.push(damage)
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        analysis: {
          id: mostRecentAnalysis.id,
          analysisData: aggregatedData,
          status: mostRecentAnalysis.status,
          createdAt: mostRecentAnalysis.createdAt.toISOString(),
          updatedAt: mostRecentAnalysis.updatedAt.toISOString(),
          sourceDocument: mostRecentAnalysis.sourceDocument,
        },
        allAnalyses: analyses.map(a => ({
          id: a.id,
          status: a.status,
          createdAt: a.createdAt.toISOString(),
          sourceDocument: a.sourceDocument,
        })),
      })
    }

    // If we have analyses but none are completed, return the most recent one with its status
    if (mostRecentAnalysis) {
      return NextResponse.json({
        success: true,
        analysis: {
          id: mostRecentAnalysis.id,
          analysisData: mostRecentAnalysis.analysisData,
          status: mostRecentAnalysis.status,
          createdAt: mostRecentAnalysis.createdAt.toISOString(),
          updatedAt: mostRecentAnalysis.updatedAt.toISOString(),
          sourceDocument: mostRecentAnalysis.sourceDocument,
        },
        allAnalyses: analyses.map(a => ({
          id: a.id,
          status: a.status,
          createdAt: a.createdAt.toISOString(),
          sourceDocument: a.sourceDocument,
        })),
      })
    }

    // No analyses found
    return NextResponse.json({
      success: true,
      analysis: null,
      allAnalyses: [],
    })
  } catch (error) {
    console.error('Get document analyses error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get analyses',
      },
      { status: 500 }
    )
  }
}

