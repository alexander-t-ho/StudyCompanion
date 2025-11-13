import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { generateS3Key, uploadToS3 } from '@/lib/aws/s3'
import { transcribeMedia } from '@/lib/transcription'
import { prisma } from '@/lib/db/client'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

// POST /api/transcribe/upload
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const documentId = formData.get('documentId') as string | null
    const metadataStr = formData.get('metadata') as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'documentId is required' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 100MB' },
        { status: 413 }
      )
    }

    // Validate file type
    const filename = file.name.toLowerCase()
    const supportedTypes = ['mp4', 'mov', 'avi', 'webm', 'mp3', 'wav', 'm4a', 'ogg']
    const fileExtension = filename.split('.').pop()
    
    if (!fileExtension || !supportedTypes.includes(fileExtension)) {
      return NextResponse.json(
        { success: false, error: `Unsupported file type. Supported types: ${supportedTypes.join(', ')}` },
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

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate S3 key
    const s3Key = generateS3Key(file.name)

    // Determine content type
    const contentType = file.type || `video/${fileExtension}`

    // Upload to S3
    await uploadToS3(s3Key, buffer, contentType)

    // Parse metadata
    let metadata: any = {}
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr)
      } catch {
        // Ignore parse errors
      }
    }

    // Create transcription record with processing status
    const transcription = await prisma.transcription.create({
      data: {
        documentId,
        filename: file.name,
        s3Key,
        transcript: '',
        wordCount: 0,
        status: 'processing',
        metadata,
      },
    })

    // Start transcription (async - in production, use a queue)
    transcribeMedia(s3Key, fileExtension)
      .then(async (result) => {
        // Update transcription with result
        await prisma.transcription.update({
          where: { id: transcription.id },
          data: {
            transcript: result.transcript,
            wordCount: result.wordCount,
            duration: result.duration,
            status: 'completed',
          },
        })
      })
      .catch(async (error) => {
        console.error('Transcription error:', error)
        // Update transcription with error status
        await prisma.transcription.update({
          where: { id: transcription.id },
          data: {
            status: 'failed',
            metadata: {
              ...metadata,
              error: error instanceof Error ? error.message : 'Transcription failed',
            },
          },
        })
      })

    return NextResponse.json({
      success: true,
      transcription: {
        id: transcription.id,
        filename: transcription.filename,
        s3Key: transcription.s3Key,
        transcript: transcription.transcript,
        duration: transcription.duration || undefined,
        wordCount: transcription.wordCount,
        status: transcription.status,
      },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    )
  }
}

