import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { documentService } from '@/lib/documents/service'
import { prisma } from '@/lib/db/client'

// POST /api/export/pdf
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

    // Export to PDF using react-pdf
    // Import with explicit .tsx extension to ensure it resolves correctly
    let pdfModule
    try {
      pdfModule = await import('@/lib/export/pdf')
    } catch (importError) {
      console.error('Failed to import PDF module:', importError)
      throw new Error(`Failed to import PDF export module: ${importError instanceof Error ? importError.message : String(importError)}`)
    }
    
    const { generatePDFDocument } = pdfModule
    
    if (!generatePDFDocument) {
      console.error('PDF module contents:', Object.keys(pdfModule))
      throw new Error('generatePDFDocument function not found in PDF export module')
    }
    
    // Validate sections data
    if (!document.sections || !Array.isArray(document.sections)) {
      throw new Error('Invalid sections data: sections must be an array')
    }
    
    console.log(`Generating PDF for document ${documentId} with ${document.sections.length} sections`)
    
    let pdfDoc
    try {
      pdfDoc = generatePDFDocument(
        document.sections,
        caseInfo,
        styleMetadata,
        includeMetadata,
        userRecord?.logoUrl || null
      )
    } catch (genError) {
      console.error('Error generating PDF document:', genError)
      throw new Error(`Failed to generate PDF document: ${genError instanceof Error ? genError.message : String(genError)}`)
    }
    
    // Convert to buffer using react-pdf's renderToBuffer for Node.js
    const { renderToBuffer } = await import('@react-pdf/renderer')
    let buffer: Buffer
    try {
      buffer = await renderToBuffer(pdfDoc)
    } catch (renderError) {
      console.error('Error rendering PDF to buffer:', renderError)
      // Fallback: try using pdf() and toBuffer() if available
      try {
        const { pdf } = await import('@react-pdf/renderer')
        const pdfInstance = pdf(pdfDoc)
        if (typeof pdfInstance.toBuffer === 'function') {
          buffer = await pdfInstance.toBuffer()
        } else {
          throw new Error('renderToBuffer failed and toBuffer is not available')
        }
      } catch (fallbackError) {
        console.error('Fallback PDF rendering also failed:', fallbackError)
        throw new Error(`Failed to render PDF: ${renderError instanceof Error ? renderError.message : String(renderError)}`)
      }
    }

    // Get filename
    const filename = document.filename.replace(/\.vine$/, '') || 'demand-letter'
    const safeFilename = filename.replace(/[^a-zA-Z0-9-_]/g, '_')

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF export error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Export failed',
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    )
  }
}

