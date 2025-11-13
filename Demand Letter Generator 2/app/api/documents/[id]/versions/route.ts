import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { versionService } from '@/lib/versions/service'
import { documentService } from '@/lib/documents/service'

// GET /api/documents/:id/versions
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

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')
    const versions = await versionService.getVersions(params.id, limit)

    return NextResponse.json({
      versions: versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        userId: v.userId,
        userEmail: v.user.email,
        changeType: v.changeType,
        changeSummary: v.changeSummary,
        createdAt: v.createdAt.toISOString(),
      })),
      currentVersion: document.currentVersion || 0,
    })
  } catch (error) {
    console.error('Error fetching versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    )
  }
}

// POST /api/documents/:id/versions (create version)
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

    const body = await request.json()
    const { changeType, changeSummary, sectionId } = body

    const version = await versionService.createVersion({
      documentId: params.id,
      userId: user.userId,
      changeType: changeType || 'update',
      changeSummary,
      sectionId,
    })

    return NextResponse.json({
      success: true,
      version: {
        id: version.id,
        versionNumber: version.versionNumber,
        changeType: version.changeType,
        changeSummary: version.changeSummary,
        createdAt: version.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error creating version:', error)
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    )
  }
}

