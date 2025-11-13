import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { documentService } from '@/lib/documents/service'
import { prisma } from '@/lib/db/client'
import { z } from 'zod'

const bulkSelectSchema = z.object({
  providerIds: z.array(z.string()),
  isSelected: z.boolean(),
})

// PUT /api/documents/:id/providers/bulk-select
export async function PUT(
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

    const body = await request.json()
    const validated = bulkSelectSchema.parse(body)

    // Update all providers
    const result = await prisma.medicalProvider.updateMany({
      where: {
        documentId: params.id,
        id: { in: validated.providerIds },
      },
      data: {
        isSelected: validated.isSelected,
      },
    })

    return NextResponse.json({
      success: true,
      updated: result.count,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating providers:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update providers' },
      { status: 500 }
    )
  }
}

