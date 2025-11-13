import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { generateS3Key, uploadToS3 } from '@/lib/aws/s3'
import { parseDocument } from '@/lib/parsers'
import { prisma } from '@/lib/db/client'
import { generateContent, type OpenRouterMessage } from '@/lib/ai/openrouter'
import { buildAnalysisPrompt, type AnalysisResult } from '@/lib/ai/analysis-prompts'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// POST /api/upload
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

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

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
      console.log('Starting text extraction:', {
        filename: file.name,
        fileType,
        bufferSize: buffer.length,
      })
      
      const parseResult = await parseDocument(buffer, file.name, fileType)
      extractedText = parseResult.text
      metadata = parseResult.metadata
      
      console.log('Text extraction successful:', {
        filename: file.name,
        fileType,
        textLength: extractedText?.length || 0,
        wordCount: metadata.wordCount || 0,
        pageCount: metadata.pageCount || 0,
        isOCR: metadata.isOCR || false,
      })
      
      if (metadata.isOCR) {
        console.log('Text was extracted using OCR (image-based PDF)')
      }
      
      // Validate extracted text
      if (!extractedText || extractedText.trim().length === 0) {
        console.warn('Text extraction returned empty result, attempting OCR fallback:', {
          filename: file.name,
          fileType,
        })
        
        // If extraction failed and it's a PDF, try OCR as fallback
        if (fileType === 'pdf') {
          try {
            console.log('Attempting OCR as fallback for text extraction...')
            const ocrResult = await parseDocument(buffer, file.name, fileType, {
              enableOCR: true,
              minTextLength: 0, // Accept any text
              minWordCount: 0,
            })
            extractedText = ocrResult.text
            metadata = ocrResult.metadata
            console.log('OCR fallback successful:', {
              textLength: extractedText?.length || 0,
              wordCount: metadata.wordCount || 0,
            })
          } catch (ocrError) {
            console.error('OCR fallback also failed:', ocrError)
            // Continue - we'll still try to analyze with whatever we have
          }
        }
      }
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error'
      console.error('Text extraction failed:', {
        error: errorMessage,
        filename: file.name,
        fileType,
        bufferSize: buffer.length,
        errorStack: parseError instanceof Error ? parseError.stack : undefined,
      })
      
      // If it's a PDF and extraction failed, try OCR as last resort
      if (fileType === 'pdf') {
        try {
          console.log('Text extraction failed, attempting OCR as last resort...')
          const ocrResult = await parseDocument(buffer, file.name, fileType, {
            enableOCR: true,
            minTextLength: 0,
            minWordCount: 0,
          })
          extractedText = ocrResult.text
          metadata = ocrResult.metadata
          console.log('OCR last resort successful:', {
            textLength: extractedText?.length || 0,
            wordCount: metadata.wordCount || 0,
          })
        } catch (ocrError) {
          console.error('OCR last resort also failed:', ocrError)
          // Continue - file is still uploaded, but analysis may not work
        }
      }
    }

    // Create or update document if documentId provided
    let finalDocumentId = documentId

    if (!finalDocumentId) {
      // Create a new document for this upload
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

    // Store source document in database
    const sourceDocument = await prisma.sourceDocument.create({
      data: {
        documentId: finalDocumentId,
        filename: file.name,
        s3Key,
        fileType,
        extractedText,
        metadata,
      },
    })

    // Automatically analyze the document if ANY text was extracted
    // Always attempt analysis - even minimal text can be useful
    let analysisId: string | null = null
    if (extractedText && extractedText.trim().length > 0) {
      try {
        // Create analysis record
        const analysis = await prisma.documentAnalysis.create({
          data: {
            documentId: finalDocumentId,
            sourceDocumentId: sourceDocument.id,
            userId: user.userId,
            status: 'processing',
            analysisData: {},
          },
        })

        analysisId = analysis.id

        // Start analysis in background (don't await - let it run async)
        // Analysis will retry on failure and create fallback if needed
        analyzeDocumentAsync(extractedText, analysis.id, finalDocumentId, sourceDocument.id, user.userId)
          .catch((error) => {
            console.error('Background analysis failed after all retries:', error)
            // Fallback analysis should have been created, but if not, create one now
            createFallbackAnalysis(extractedText, analysis.id).catch((fallbackError) => {
              console.error('Fallback analysis also failed:', fallbackError)
            })
          })
      } catch (analysisError) {
        console.error('Failed to start automatic analysis:', analysisError)
        // Don't fail the upload if analysis setup fails
      }
    }

    return NextResponse.json({
      success: true,
      sourceDocument: {
        id: sourceDocument.id,
        filename: sourceDocument.filename,
        s3Key: sourceDocument.s3Key,
        fileType: sourceDocument.fileType,
        extractedText: sourceDocument.extractedText,
      },
      analysisId, // Return analysis ID if analysis was started
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

/**
 * Analyze document asynchronously (runs in background)
 * Includes retry logic and fallback analysis
 */
async function analyzeDocumentAsync(
  documentText: string,
  analysisId: string,
  documentId: string,
  sourceDocumentId: string,
  userId: string,
  retryCount: number = 0
) {
  const MAX_RETRIES = 2
  
  try {
    // Build analysis prompt
    const analysisPrompt = buildAnalysisPrompt(documentText)

    console.log('Starting automatic analysis:', {
      analysisId,
      textLength: documentText.length,
      promptLength: analysisPrompt.length,
      retryCount,
    })

    // Generate analysis using AI
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: 'You are a legal document analyst. Extract key information from legal documents in structured JSON format. Always extract whatever information is available, even if the document is brief or unclear.',
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

    // If AI returns no content, create fallback analysis instead of failing
    if (!result.content) {
      console.warn('AI returned no content, creating fallback analysis')
      return await createFallbackAnalysis(documentText, analysisId)
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
        if (!analysisData.summary) {
          // Create a summary from the document text if AI didn't provide one
          const textPreview = documentText.substring(0, 200).trim()
          analysisData.summary = textPreview ? `Document summary: ${textPreview}...` : 'Analysis completed but no summary generated.'
        }
        
        // Ensure we have at least some data - if everything is empty, create fallback
        if (analysisData.legalPoints.length === 0 && 
            analysisData.facts.length === 0 && 
            analysisData.damages.length === 0) {
          console.warn('AI returned empty analysis, creating fallback with extracted data')
          return await createFallbackAnalysis(documentText, analysisId)
        }
        
        console.log('Automatic analysis completed successfully:', {
          analysisId,
          legalPoints: analysisData.legalPoints?.length || 0,
          facts: analysisData.facts?.length || 0,
          damages: analysisData.damages?.length || 0,
          hasSummary: !!analysisData.summary,
        })
      } else {
        console.warn('No JSON found in AI response, creating fallback analysis')
        // Instead of using empty structure, create fallback
        return await createFallbackAnalysis(documentText, analysisId)
      }
    } catch (parseError) {
      console.error('Failed to parse AI analysis response, creating fallback:', {
        error: parseError,
        responsePreview: result.content?.substring(0, 200),
      })
      // Create fallback instead of empty structure
      return await createFallbackAnalysis(documentText, analysisId)
    }

    // Update analysis with results
    await prisma.documentAnalysis.update({
      where: { id: analysisId },
      data: {
        status: 'completed',
        analysisData: analysisData as any,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Automatic analysis error:', {
      error: errorMessage,
      analysisId,
      retryCount,
      errorStack: error instanceof Error ? error.stack : undefined,
    })

    // Retry on failure (up to MAX_RETRIES times)
    if (retryCount < MAX_RETRIES) {
      const delayMs = 2000 * (retryCount + 1) // Exponential backoff: 2s, 4s
      console.log(`Analysis failed, retrying in ${delayMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
      return analyzeDocumentAsync(documentText, analysisId, documentId, sourceDocumentId, userId, retryCount + 1)
    }

    // If all retries failed, create a fallback analysis instead of marking as failed
    console.error('All analysis retries failed, creating fallback analysis')
    return await createFallbackAnalysis(documentText, analysisId)
  }
}

/**
 * Create a basic analysis even if AI fails
 * Extracts basic information from text using pattern matching
 */
async function createFallbackAnalysis(
  documentText: string,
  analysisId: string
): Promise<void> {
  try {
    console.log('Creating fallback analysis from text patterns...')
    
    // Extract basic information from text even without AI
    const words = documentText.split(/\s+/).filter(w => w.length > 0)
    const sentences = documentText.split(/[.!?]+/).filter(s => s.trim().length > 10)
    
    // Create a basic analysis structure
    const fallbackAnalysis: AnalysisResult = {
      legalPoints: [],
      facts: [],
      damages: [],
      summary: `Document contains ${words.length} words and ${sentences.length} sentences. Analysis completed with basic extraction.`,
    }
    
    // Extract facts from sentences (first 10 sentences)
    if (sentences.length > 0) {
      fallbackAnalysis.facts = sentences.slice(0, 10).map((s, i) => ({
        id: `f${i + 1}`,
        text: s.trim().substring(0, 300), // Limit length
      }))
    }
    
    // Try to extract dates
    const datePattern = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g
    const dates = documentText.match(datePattern) || []
    
    // Add dates as facts if found
    if (dates.length > 0) {
      const uniqueDates = [...new Set(dates)]
      uniqueDates.slice(0, 5).forEach((date, i) => {
        // Find sentences containing this date
        const dateSentences = sentences.filter(s => s.includes(date))
        if (dateSentences.length > 0) {
          fallbackAnalysis.facts.push({
            id: `date_f${fallbackAnalysis.facts.length + 1}`,
            text: dateSentences[0].trim().substring(0, 300),
            date: date,
          })
        }
      })
    }
    
    // Try to extract monetary amounts
    const amountPattern = /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g
    const amounts = documentText.match(amountPattern) || []
    
    if (amounts.length > 0) {
      const uniqueAmounts = [...new Set(amounts)]
      fallbackAnalysis.damages = uniqueAmounts.slice(0, 10).map((amt, i) => {
        const numericAmount = parseFloat(amt.replace(/[$,]/g, ''))
        // Find context around the amount
        const amountIndex = documentText.indexOf(amt)
        const contextStart = Math.max(0, amountIndex - 50)
        const contextEnd = Math.min(documentText.length, amountIndex + amt.length + 50)
        const context = documentText.substring(contextStart, contextEnd).trim()
        
        return {
          id: `d${i + 1}`,
          text: context || `Monetary amount: ${amt}`,
          amount: numericAmount,
          type: 'economic',
        }
      })
    }
    
    // Try to identify legal terms
    const legalTerms = [
      'negligence', 'liability', 'breach', 'duty', 'causation', 'damages',
      'injury', 'accident', 'fault', 'violation', 'statute', 'law', 'legal',
      'plaintiff', 'defendant', 'claim', 'settlement', 'lawsuit', 'court'
    ]
    
    const foundLegalTerms: string[] = []
    const textLower = documentText.toLowerCase()
    legalTerms.forEach(term => {
      if (textLower.includes(term) && !foundLegalTerms.includes(term)) {
        foundLegalTerms.push(term)
      }
    })
    
    if (foundLegalTerms.length > 0) {
      // Find sentences containing legal terms
      foundLegalTerms.slice(0, 5).forEach((term, i) => {
        const termSentences = sentences.filter(s => 
          s.toLowerCase().includes(term) && s.length > 20
        )
        if (termSentences.length > 0) {
          fallbackAnalysis.legalPoints.push({
            id: `lp${i + 1}`,
            text: termSentences[0].trim().substring(0, 300),
            category: term,
          })
        }
      })
    }
    
    // Create a better summary from the first few sentences
    if (sentences.length > 0) {
      const summarySentences = sentences.slice(0, 3).map(s => s.trim()).join(' ')
      fallbackAnalysis.summary = summarySentences.substring(0, 500) + 
        (summarySentences.length > 500 ? '...' : '')
    }
    
    // Update analysis with fallback data
    await prisma.documentAnalysis.update({
      where: { id: analysisId },
      data: {
        status: 'completed',
        analysisData: fallbackAnalysis as any,
      },
    })
    
    console.log('Fallback analysis created successfully:', {
      analysisId,
      legalPoints: fallbackAnalysis.legalPoints.length,
      facts: fallbackAnalysis.facts.length,
      damages: fallbackAnalysis.damages.length,
      hasSummary: !!fallbackAnalysis.summary,
    })
  } catch (error) {
    console.error('Failed to create fallback analysis:', error)
    // Even if fallback fails, create a minimal structure
    await prisma.documentAnalysis.update({
      where: { id: analysisId },
      data: {
        status: 'completed',
        analysisData: {
          legalPoints: [],
          facts: [],
          damages: [],
          summary: `Document uploaded and processed. Text length: ${documentText.length} characters.`,
        },
      },
    }).catch((updateError) => {
      console.error('Failed to update analysis with minimal data:', updateError)
    })
  }
}

