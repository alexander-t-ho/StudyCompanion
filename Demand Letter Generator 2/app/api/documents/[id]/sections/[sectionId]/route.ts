import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { documentService, sectionService } from '@/lib/documents/service'
import { z } from 'zod'

const updateSectionSchema = z.object({
  content: z.string().optional(),
  order: z.number().optional(),
  isGenerated: z.boolean().optional(),
  metadata: z.any().optional(),
})

// PUT /api/documents/:id/sections/:sectionId
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; sectionId: string } }
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
    const validated = updateSectionSchema.parse(body)

    const section = await sectionService.updateSection(
      params.sectionId,
      params.id,
      validated
    )

    return NextResponse.json({
      success: true,
      section,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'Section not found') {
      return NextResponse.json(
        { success: false, error: 'Section not found' },
        { status: 404 }
      )
    }

    console.error('Error updating section:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update section' },
      { status: 500 }
    )
  }
}

// DELETE /api/documents/:id/sections/:sectionId
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; sectionId: string } }
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

    await sectionService.deleteSection(params.sectionId, params.id)

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Section not found') {
      return NextResponse.json(
        { success: false, error: 'Section not found' },
        { status: 404 }
      )
    }

    console.error('Error deleting section:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete section' },
      { status: 500 }
    )
  }
}

