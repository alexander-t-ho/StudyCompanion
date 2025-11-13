import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { versionService } from '@/lib/versions/service'
import { documentService } from '@/lib/documents/service'

// GET /api/documents/:id/versions/status
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

    // Verify document access
    const document = await documentService.getById(params.id, user.userId)
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    let previousVersion: number | null = null
    let nextVersion: number | null = null

    try {
      previousVersion = await versionService.getPreviousVersionNumber(params.id)
    } catch (err) {
      console.error('Error getting previous version:', err)
    }

    try {
      nextVersion = await versionService.getNextVersionNumber(params.id)
    } catch (err) {
      console.error('Error getting next version:', err)
    }

    return NextResponse.json({
      currentVersion: document.currentVersion || 0,
      canUndo: previousVersion !== null,
      canRedo: nextVersion !== null,
      previousVersion,
      nextVersion,
    })
  } catch (error) {
    console.error('Error getting version status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get version status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

