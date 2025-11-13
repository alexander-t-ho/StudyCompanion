import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

// GET /api/documents/:id/sources/:sourceId/content
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

    const metadata: any = sourceDocument.metadata || {}
    const wordCount = metadata.wordCount || 0
    const pageCount = metadata.pageCount

    return NextResponse.json({
      text: sourceDocument.extractedText || '',
      metadata: {
        filename: sourceDocument.filename,
        fileType: sourceDocument.fileType,
        wordCount,
        ...(pageCount && { pageCount }),
      },
    })
  } catch (error) {
    console.error('Error fetching content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    )
  }
}

