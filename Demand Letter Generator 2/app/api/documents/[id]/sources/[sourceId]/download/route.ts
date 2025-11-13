import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { getPresignedUrl } from '@/lib/aws/s3'
import { prisma } from '@/lib/db/client'

// GET /api/documents/:id/sources/:sourceId/download
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; sourceId: string } }
) {
  try {
    // Check authentication
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    // Verify document belongs to user
    const document = await prisma.document.findFirst({
      where: {
        id: params.id,
        userId: user.userId,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get source document
    const sourceDocument = await prisma.sourceDocument.findFirst({
      where: {
        id: params.sourceId,
        documentId: params.id,
      },
    })

    if (!sourceDocument) {
      return NextResponse.json(
        { error: 'Source document not found' },
        { status: 404 }
      )
    }

    // Generate presigned URL (valid for 1 hour)
    const url = await getPresignedUrl(sourceDocument.s3Key, 3600)

    // Return JSON with URL or redirect
    const redirect = request.nextUrl.searchParams.get('redirect')
    if (redirect === 'true') {
      return NextResponse.redirect(url)
    }

    return NextResponse.json({
      url,
      filename: sourceDocument.filename,
    })
  } catch (error) {
    console.error('Error generating download URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    )
  }
}

