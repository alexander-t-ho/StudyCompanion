import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { versionService } from '@/lib/versions/service'
import { documentService } from '@/lib/documents/service'

// POST /api/documents/:id/redo
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

    // Verify document access
    const document = await documentService.getById(params.id, user.userId)
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    await versionService.redo(params.id, user.userId)

    return NextResponse.json({
      success: true,
      message: 'Redo successful',
    })
  } catch (error) {
    console.error('Error redoing:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to redo'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

