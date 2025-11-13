import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

// GET /api/medical/:id/providers
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const documentId = params.id

    // Verify document belongs to user
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: user.userId,
      },
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get providers
    const providers = await prisma.medicalProvider.findMany({
      where: { documentId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      providers: providers.map(p => ({
        id: p.id,
        providerName: p.providerName,
        amount: p.amount ? Number(p.amount) : null,
        chronology: p.chronology,
        summary: p.summary,
        isSelected: p.isSelected,
      })),
    })
  } catch (error) {
    console.error('Get providers error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get providers',
      },
      { status: 500 }
    )
  }
}

