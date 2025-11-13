import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { versionService } from '@/lib/versions/service'
import { documentService } from '@/lib/documents/service'

// GET /api/documents/:id/versions/:versionNumber
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; versionNumber: string } }
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

    const versionNumber = parseInt(params.versionNumber)
    const version = await versionService.getVersion(params.id, versionNumber)

    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: version.id,
      versionNumber: version.versionNumber,
      userId: version.userId,
      userEmail: version.user.email,
      snapshot: version.snapshot,
      changeType: version.changeType,
      changeSummary: version.changeSummary,
      createdAt: version.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching version:', error)
    return NextResponse.json(
      { error: 'Failed to fetch version' },
      { status: 500 }
    )
  }
}

// POST /api/documents/:id/versions/:versionNumber (restore)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; versionNumber: string } }
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

    const versionNumber = parseInt(params.versionNumber)
    await versionService.restoreVersion(params.id, versionNumber, user.userId)

    return NextResponse.json({
      success: true,
      message: `Restored to version ${versionNumber}`,
    })
  } catch (error) {
    console.error('Error restoring version:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to restore version'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

