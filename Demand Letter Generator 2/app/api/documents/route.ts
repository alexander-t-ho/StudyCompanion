import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { documentService } from '@/lib/documents/service'
import { versionService } from '@/lib/versions/service'
import { z } from 'zod'

const createDocumentSchema = z.object({
  filename: z.string().min(1).max(255),
  templateId: z.string().optional(),
  metadata: z.any().optional(),
})

// GET /api/documents
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await documentService.list(user.userId, {
      status,
      limit,
      offset,
    })

    return NextResponse.json({
      documents: result.documents.map((doc) => ({
        id: doc.id,
        filename: doc.filename,
        status: doc.status,
        templateId: doc.templateId,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      })),
      total: result.total,
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

// POST /api/documents
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const body = await request.json()
    const validated = createDocumentSchema.parse(body)

    const document = await documentService.create({
      userId: user.userId,
      filename: validated.filename,
      templateId: validated.templateId,
      metadata: validated.metadata,
    })

    // Create initial version
    try {
      await versionService.createVersion({
        documentId: document.id,
        userId: user.userId,
        changeType: 'create',
        changeSummary: 'Document created',
      })
    } catch (versionError) {
      console.error('Failed to create initial version:', versionError)
      // Don't fail document creation if version creation fails
    }

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

    console.error('Error creating document:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create document' },
      { status: 500 }
    )
  }
}

