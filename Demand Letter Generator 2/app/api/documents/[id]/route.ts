import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { documentService } from '@/lib/documents/service'
import { z } from 'zod'

const updateDocumentSchema = z.object({
  filename: z.string().min(1).max(255).optional(),
  status: z.string().optional(),
  metadata: z.any().optional(),
})

// GET /api/documents/:id
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

    const document = await documentService.getById(params.id, user.userId)

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: document.id,
      filename: document.filename,
      status: document.status,
      templateId: document.templateId,
      template: document.template,
      metadata: document.metadata,
      sections: document.sections.map((section) => ({
        id: section.id,
        sectionType: section.sectionType,
        content: section.content,
        order: section.order,
        isGenerated: section.isGenerated,
        createdAt: section.createdAt.toISOString(),
        updatedAt: section.updatedAt.toISOString(),
      })),
      sourceDocs: document.sourceDocs.map((sourceDoc) => ({
        id: sourceDoc.id,
        filename: sourceDoc.filename,
        fileType: sourceDoc.fileType,
        createdAt: sourceDoc.createdAt.toISOString(),
      })),
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    )
  }
}

// PUT /api/documents/:id
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

    const body = await request.json()
    const validated = updateDocumentSchema.parse(body)

    const document = await documentService.update(params.id, user.userId, validated)

    return NextResponse.json({
      success: true,
      document,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'Document not found or access denied') {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    console.error('Error updating document:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update document' },
      { status: 500 }
    )
  }
}

// DELETE /api/documents/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    await documentService.delete(params.id, user.userId)

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Document not found or access denied') {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    console.error('Error deleting document:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}

