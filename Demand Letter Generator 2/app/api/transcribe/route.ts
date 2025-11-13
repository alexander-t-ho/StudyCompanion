import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { transcribeMedia } from '@/lib/transcription'
import { prisma } from '@/lib/db/client'

// POST /api/transcribe
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const body = await request.json()
    const { s3Key, documentId } = body

    if (!s3Key || !documentId) {
      return NextResponse.json(
        { success: false, error: 's3Key and documentId are required' },
        { status: 400 }
      )
    }

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

    // Determine file type from s3Key
    const fileExtension = s3Key.split('.').pop() || ''

    // Transcribe media
    const result = await transcribeMedia(s3Key, fileExtension)

    // Check if transcription already exists
    const existing = await prisma.transcription.findFirst({
      where: {
        documentId,
        s3Key,
      },
    })

    let transcription
    if (existing) {
      // Update existing
      transcription = await prisma.transcription.update({
        where: { id: existing.id },
        data: {
          transcript: result.transcript,
          wordCount: result.wordCount,
          duration: result.duration,
          status: 'completed',
        },
      })
    } else {
      // Create new
      transcription = await prisma.transcription.create({
        data: {
          documentId,
          filename: s3Key.split('/').pop() || 'unknown',
          s3Key,
          transcript: result.transcript,
          wordCount: result.wordCount,
          duration: result.duration,
          status: 'completed',
        },
      })
    }

    return NextResponse.json({
      success: true,
      transcription: {
        id: transcription.id,
        transcript: transcription.transcript,
        duration: transcription.duration || undefined,
        wordCount: transcription.wordCount,
      },
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Transcription failed',
      },
      { status: 500 }
    )
  }
}

