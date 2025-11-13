import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

// POST /api/medical/:id/providers/bulk-select
export async function POST(
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
    const body = await request.json()
    const { providerIds, isSelected } = body

    if (!Array.isArray(providerIds)) {
      return NextResponse.json(
        { success: false, error: 'providerIds must be an array' },
        { status: 400 }
      )
    }

    if (typeof isSelected !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isSelected must be a boolean' },
        { status: 400 }
      )
    }

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

    // Update providers
    const result = await prisma.medicalProvider.updateMany({
      where: {
        id: { in: providerIds },
        documentId: documentId,
      },
      data: {
        isSelected,
      },
    })

    return NextResponse.json({
      success: true,
      updated: result.count,
    })
  } catch (error) {
    console.error('Bulk select error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update providers',
      },
      { status: 500 }
    )
  }
}

