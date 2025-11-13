import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { documentService, sectionService } from '@/lib/documents/service'
import { z } from 'zod'

const reorderSchema = z.object({
  sectionIds: z.array(z.string()),
})

// PUT /api/documents/:id/sections/reorder
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
    const validated = reorderSchema.parse(body)

    await sectionService.reorderSections(params.id, validated.sectionIds)

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'Some sections not found') {
      return NextResponse.json(
        { success: false, error: 'Some sections not found' },
        { status: 404 }
      )
    }

    console.error('Error reordering sections:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reorder sections' },
      { status: 500 }
    )
  }
}

