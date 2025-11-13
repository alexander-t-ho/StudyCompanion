import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

// GET /api/transcribe/:transcriptionId
export async function GET(
  request: NextRequest,
  { params }: { params: { transcriptionId: string } }
) {
  try {
    // Check authentication
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const { transcriptionId } = params

    // Get transcription and verify document belongs to user
    const transcription = await prisma.transcription.findFirst({
      where: {
        id: transcriptionId,
        document: {
          userId: user.userId,
        },
      },
    })

    if (!transcription) {
      return NextResponse.json(
        { success: false, error: 'Transcription not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: transcription.id,
      filename: transcription.filename,
      transcript: transcription.transcript,
      duration: transcription.duration || undefined,
      wordCount: transcription.wordCount,
      status: transcription.status,
      createdAt: transcription.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Get transcription error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get transcription',
      },
      { status: 500 }
    )
  }
}

