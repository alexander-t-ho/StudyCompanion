import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

// PUT /api/medical/:id/providers/:providerId
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; providerId: string } }
) {
  try {
    // Check authentication
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const documentId = params.id
    const providerId = params.providerId
    const body = await request.json()
    const { isSelected } = body

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

    // Update provider
    const provider = await prisma.medicalProvider.update({
      where: {
        id: providerId,
        documentId: documentId,
      },
      data: {
        isSelected,
      },
    })

    return NextResponse.json({
      success: true,
      provider: {
        id: provider.id,
        providerName: provider.providerName,
        amount: provider.amount ? Number(provider.amount) : null,
        chronology: provider.chronology,
        summary: provider.summary,
        isSelected: provider.isSelected,
      },
    })
  } catch (error) {
    console.error('Update provider error:', error)
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { success: false, error: 'Provider not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update provider',
      },
      { status: 500 }
    )
  }
}

