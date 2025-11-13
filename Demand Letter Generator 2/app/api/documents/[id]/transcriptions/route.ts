import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

// GET /api/documents/:id/transcriptions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const documentId = params.id

    // Verify document belongs to user
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: user.userId,
      },
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get transcriptions
    const transcriptions = await prisma.transcription.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      transcriptions: transcriptions.map(t => ({
        id: t.id,
        filename: t.filename,
        transcript: t.transcript,
        duration: t.duration || undefined,
        wordCount: t.wordCount,
        createdAt: t.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Get transcriptions error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get transcriptions',
      },
      { status: 500 }
    )
  }
}

