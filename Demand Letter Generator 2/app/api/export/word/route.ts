import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { documentService } from '@/lib/documents/service'
import { exportToWord } from '@/lib/export/word'
import { prisma } from '@/lib/db/client'

// POST /api/export/word
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const body = await request.json()
    const { documentId, includeMetadata = true } = body

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    // Get document with sections
    const document = await documentService.getById(documentId, user.userId)
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get case info from metadata
    const caseInfo = document.metadata?.caseInfo || {}
    const styleMetadata = document.metadata?.styleMetadata || document.template?.styleMetadata

    // Get user logo
    const userRecord = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { logoUrl: true },
    })

    // Export to Word
    const buffer = await exportToWord(
      document.sections,
      caseInfo,
      styleMetadata,
      includeMetadata,
      userRecord?.logoUrl || null
    )

    // Get filename
    const filename = document.filename.replace(/\.vine$/, '') || 'demand-letter'
    const safeFilename = filename.replace(/[^a-zA-Z0-9-_]/g, '_')

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeFilename}.docx"`,
      },
    })
  } catch (error) {
    console.error('Word export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    )
  }
}

