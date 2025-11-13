import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { documentService, sectionService } from '@/lib/documents/service'
import { z } from 'zod'

const createSectionSchema = z.object({
  sectionType: z.string(),
  content: z.string(),
  order: z.number().optional(),
  isGenerated: z.boolean().optional(),
  metadata: z.any().optional(),
})

// POST /api/documents/:id/sections
export async function POST(
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
    const validated = createSectionSchema.parse(body)

    const section = await sectionService.addSection({
      documentId: params.id,
      ...validated,
    })

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

    console.error('Error creating section:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create section' },
      { status: 500 }
    )
  }
}

