import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { documentService } from '@/lib/documents/service'
import { prisma } from '@/lib/db/client'

// GET /api/documents/:id/available-data
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

    // Verify document ownership
    const document = await documentService.getById(params.id, user.userId)
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get medical providers
    const providers = await prisma.medicalProvider.findMany({
      where: { documentId: params.id },
      orderBy: { providerName: 'asc' },
    })

    // Get transcriptions
    const transcriptions = await prisma.transcription.findMany({
      where: { documentId: params.id },
      orderBy: { createdAt: 'desc' },
    })

    // Get source documents (expert reports)
    const expertReports = await prisma.sourceDocument.findMany({
      where: { documentId: params.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      providers: providers.map((p) => ({
        id: p.id,
        providerName: p.providerName,
        amount: p.amount,
        chronology: p.chronology,
        summary: p.summary,
        isSelected: p.isSelected,
      })),
      transcriptions: transcriptions.map((t) => ({
        id: t.id,
        filename: t.filename,
        transcript: t.transcript,
        duration: t.duration,
        wordCount: t.wordCount,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
      expertReports: expertReports.map((r) => ({
        id: r.id,
        filename: r.filename,
        fileType: r.fileType,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error fetching available data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available data' },
      { status: 500 }
    )
  }
}

