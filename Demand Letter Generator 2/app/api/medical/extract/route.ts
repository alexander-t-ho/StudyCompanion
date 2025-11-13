import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { extractMedicalData } from '@/lib/medical'
import { prisma } from '@/lib/db/client'

// POST /api/medical/extract
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const body = await request.json()
    const { documentId, sourceDocumentId } = body

    if (!documentId || !sourceDocumentId) {
      return NextResponse.json(
        { success: false, error: 'documentId and sourceDocumentId are required' },
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

    // Get source document
    const sourceDocument = await prisma.sourceDocument.findFirst({
      where: {
        id: sourceDocumentId,
        documentId: documentId,
      },
    })

    if (!sourceDocument) {
      return NextResponse.json(
        { success: false, error: 'Source document not found' },
        { status: 404 }
      )
    }

    if (!sourceDocument.extractedText) {
      return NextResponse.json(
        { success: false, error: 'No extracted text available for medical data extraction' },
        { status: 400 }
      )
    }

    // Extract medical data
    const medicalProviders = await extractMedicalData(
      sourceDocument.extractedText,
      documentId
    )

    // Store providers in database
    const createdProviders = await Promise.all(
      medicalProviders.map(provider =>
        prisma.medicalProvider.create({
          data: {
            documentId,
            providerName: provider.providerName,
            amount: provider.amount,
            chronology: provider.chronology,
            summary: provider.summary,
            isSelected: false,
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      providers: createdProviders.map(p => ({
        id: p.id,
        providerName: p.providerName,
        amount: p.amount ? Number(p.amount) : null,
        chronology: p.chronology,
        summary: p.summary,
      })),
    })
  } catch (error) {
    console.error('Medical extraction error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Medical extraction failed',
      },
      { status: 500 }
    )
  }
}

