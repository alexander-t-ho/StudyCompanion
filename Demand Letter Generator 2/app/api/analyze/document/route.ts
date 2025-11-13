import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'
import { generateS3Key, uploadToS3 } from '@/lib/aws/s3'
import { parseDocument } from '@/lib/parsers'
import { generateContent, type OpenRouterMessage } from '@/lib/ai/openrouter'
import { buildAnalysisPrompt, type AnalysisResult } from '@/lib/ai/analysis-prompts'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// POST /api/analyze/document
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const sourceDocumentId = formData.get('sourceDocumentId') as string | null
    const documentId = formData.get('documentId') as string | null

    let sourceDocument: any = null
    let documentText = ''

    // Handle new file upload
    if (file) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: 'File too large. Maximum size is 50MB' },
          { status: 413 }
        )
      }

      // Validate file type
      const filename = file.name.toLowerCase()
      let fileType: 'pdf' | 'docx' | null = null

      if (filename.endsWith('.pdf')) {
        fileType = 'pdf'
      } else if (filename.endsWith('.docx')) {
        fileType = 'docx'
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid file type. Only PDF and DOCX files are supported' },
          { status: 400 }
        )
      }

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Generate S3 key
      const s3Key = generateS3Key(file.name)

      // Upload to S3
      const contentType = fileType === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      await uploadToS3(s3Key, buffer, contentType)

      // Extract text
      let extractedText: string | null = null
      let metadata: any = {}

      try {
        const parseResult = await parseDocument(buffer, file.name, fileType)
        extractedText = parseResult.text?.trim() || null
        metadata = parseResult.metadata

        if (!extractedText || extractedText.length === 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'No text content could be extracted from the document. The file may be image-based, corrupted, or empty. Please ensure the document contains selectable text.' 
            },
            { status: 400 }
          )
        }

        // Log extraction success for debugging
        console.log('Text extraction successful:', {
          filename: file.name,
          fileType,
          textLength: extractedText.length,
          wordCount: metadata.wordCount,
          pageCount: metadata.pageCount,
          isOCR: metadata.isOCR || false,
        })
        
        if (metadata.isOCR) {
          console.log('Text was extracted using OCR (image-based PDF)')
        }
      } catch (parseError) {
        console.error('Text extraction failed:', {
          error: parseError,
          filename: file.name,
          fileType,
          bufferSize: buffer.length,
          errorMessage: parseError instanceof Error ? parseError.message : 'Unknown error',
          errorStack: parseError instanceof Error ? parseError.stack : undefined,
        })
        
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error'
        return NextResponse.json(
          { 
            success: false, 
            error: `Failed to extract text from document: ${errorMessage}. Please ensure the file is a valid ${fileType.toUpperCase()} file.` 
          },
          { status: 500 }
        )
      }

      // Create or get document
      let finalDocumentId = documentId

      if (!finalDocumentId) {
        const newDocument = await prisma.document.create({
          data: {
            userId: user.userId,
            filename: file.name,
            status: 'draft',
          },
        })
        finalDocumentId = newDocument.id
      } else {
        // Verify document belongs to user
        const document = await prisma.document.findFirst({
          where: {
            id: finalDocumentId,
            userId: user.userId,
          },
        })

        if (!document) {
          return NextResponse.json(
            { success: false, error: 'Document not found' },
            { status: 404 }
          )
        }
      }

      // Store source document
      sourceDocument = await prisma.sourceDocument.create({
        data: {
          documentId: finalDocumentId,
          filename: file.name,
          s3Key,
          fileType,
          extractedText,
          metadata,
        },
      })

      documentText = extractedText || ''
    } else if (sourceDocumentId) {
      // Use existing source document
      sourceDocument = await prisma.sourceDocument.findFirst({
        where: {
          id: sourceDocumentId,
          document: {
            userId: user.userId,
          },
        },
      })

      if (!sourceDocument) {
        return NextResponse.json(
          { success: false, error: 'Source document not found' },
          { status: 404 }
        )
      }

      documentText = sourceDocument.extractedText?.trim() || ''
      
      if (!documentText || documentText.length === 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'The selected source document has no extractable text. Please upload a new document or select a different source document.' 
          },
          { status: 400 }
        )
      }

      // Log that we're using existing source document
      console.log('Using existing source document for analysis:', {
        sourceDocumentId,
        textLength: documentText.length,
        filename: sourceDocument.filename,
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Either file or sourceDocumentId is required' },
        { status: 400 }
      )
    }

    if (!documentText || documentText.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No text content found in document. The document may be image-based, corrupted, or empty. Please ensure the document contains selectable text.' 
        },
        { status: 400 }
      )
    }

    // Validate minimum text length for meaningful analysis
    if (documentText.length < 50) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Document text is too short for analysis. Please provide a document with more content.' 
        },
        { status: 400 }
      )
    }

    // Create analysis record
    const analysis = await prisma.documentAnalysis.create({
      data: {
        documentId: sourceDocument.documentId || documentId || null,
        sourceDocumentId: sourceDocument.id,
        userId: user.userId,
        status: 'processing',
        analysisData: {},
      },
    })

    try {
      // Build analysis prompt
      const analysisPrompt = buildAnalysisPrompt(documentText)

      console.log('Starting AI analysis:', {
        analysisId: analysis.id,
        textLength: documentText.length,
        promptLength: analysisPrompt.length,
      })

      // Generate analysis using AI
      const messages: OpenRouterMessage[] = [
        {
          role: 'system',
          content: 'You are a legal document analyst. Extract key information from legal documents in structured JSON format.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ]

      const model = process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet'
      const result = await generateContent(messages, model, {
        temperature: 0.3,
        max_tokens: 4000,
      })

      if (!result.content) {
        throw new Error('AI analysis returned no content')
      }

      // Parse JSON response
      let analysisData: AnalysisResult
      try {
        // Try to extract JSON from response
        const jsonMatch = result.content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          analysisData = JSON.parse(jsonMatch[0])
          
          // Validate analysis data structure
          if (!analysisData.legalPoints) analysisData.legalPoints = []
          if (!analysisData.facts) analysisData.facts = []
          if (!analysisData.damages) analysisData.damages = []
          if (!analysisData.summary) analysisData.summary = 'Analysis completed but no summary generated.'
          
          console.log('Analysis completed successfully:', {
            analysisId: analysis.id,
            legalPoints: analysisData.legalPoints?.length || 0,
            facts: analysisData.facts?.length || 0,
            damages: analysisData.damages?.length || 0,
            hasSummary: !!analysisData.summary,
          })
        } else {
          console.warn('No JSON found in AI response, using fallback structure')
          // If parsing fails, create a basic structure
          analysisData = {
            legalPoints: [],
            facts: [],
            damages: [],
            summary: result.content.substring(0, 500),
          }
        }
      } catch (parseError) {
        console.error('Failed to parse AI analysis response:', {
          error: parseError,
          responsePreview: result.content?.substring(0, 200),
        })
        // If parsing fails, create a basic structure
        analysisData = {
          legalPoints: [],
          facts: [],
          damages: [],
          summary: result.content.substring(0, 500) || 'Analysis completed but response could not be parsed.',
        }
      }

      // Update analysis with results
      await prisma.documentAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: 'completed',
          analysisData: analysisData as any,
        },
      })

      return NextResponse.json({
        success: true,
        analysisId: analysis.id,
        analysis: analysisData,
      })
    } catch (error) {
      // Update analysis status to failed
      await prisma.documentAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: 'failed',
        },
      }).catch((updateError) => {
        console.error('Failed to update analysis status:', updateError)
      })

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Analysis error:', {
        error: errorMessage,
        analysisId: analysis.id,
        errorStack: error instanceof Error ? error.stack : undefined,
        textLength: documentText.length,
      })

      return NextResponse.json(
        {
          success: false,
          error: `Analysis failed: ${errorMessage}. Please check your OpenRouter API key and ensure the document contains valid text content.`,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Document analysis error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      },
      { status: 500 }
    )
  }
}


