import { NextRequest, NextResponse } from 'next/server'
import { templateService } from '@/lib/templates/service'
import { z } from 'zod'

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  content: z.string().optional().nullable(),
  styleMetadata: z.any().optional().nullable(),
  toneMetadata: z.any().optional().nullable(),
  sections: z.array(z.string()).optional(),
})

// GET /api/templates/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = await templateService.getById(params.id)

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Extract sections from metadata if stored there, or return empty array
    const sections: string[] = []

    return NextResponse.json({
      id: template.id,
      name: template.name,
      content: template.content,
      styleMetadata: template.styleMetadata,
      toneMetadata: template.toneMetadata,
      isDefault: template.isDefault,
      sections,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

// PUT /api/templates/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validated = updateTemplateSchema.parse(body)

    const template = await templateService.update(params.id, validated)

    return NextResponse.json({
      success: true,
      template,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'Template not found') {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    console.error('Error updating template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

// DELETE /api/templates/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await templateService.delete(params.id)

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Template not found') {
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        )
      }
      if (error.message === 'Cannot delete default template') {
        return NextResponse.json(
          { success: false, error: 'Cannot delete default template' },
          { status: 400 }
        )
      }
    }

    console.error('Error deleting template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}

