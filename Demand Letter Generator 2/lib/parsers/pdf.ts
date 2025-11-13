import pdfParse from 'pdf-parse'
import { createWorker } from 'tesseract.js'

export interface PDFMetadata {
  pageCount: number
  title?: string
  author?: string
  subject?: string
  wordCount: number
  isOCR?: boolean
}

export interface PDFParseResult {
  text: string
  metadata: PDFMetadata
  isOCR?: boolean
  warning?: string
}

export interface PDFParseOptions {
  enableOCR?: boolean
  ocrLanguage?: string
  minTextLength?: number
  minWordCount?: number
}

/**
 * Parse PDF file and extract text
 * Automatically attempts OCR if text extraction fails or returns minimal text
 */
export async function parsePDF(
  buffer: Buffer,
  options: PDFParseOptions = {}
): Promise<PDFParseResult> {
  try {
    if (!buffer || buffer.length === 0) {
      throw new Error('PDF buffer is empty or invalid')
    }

    const {
      enableOCR = true,
      ocrLanguage = 'eng',
      minTextLength = 0, // Accept any text length
      minWordCount = 0,  // Accept any word count
    } = options

    console.log('Starting PDF parsing:', {
      bufferLength: buffer.length,
      bufferStart: buffer.slice(0, 10).toString('hex'),
      enableOCR,
    })

    // Try parsing with pdf-parse first
    const parseOptions = {
      max: 0, // 0 means parse all pages
    }

    const data = await pdfParse(buffer, parseOptions)

    console.log('PDF parsed successfully:', {
      numPages: data.numpages,
      hasText: !!data.text,
      textLength: data.text?.length || 0,
      textPreview: data.text?.substring(0, 200) || 'No text',
      info: data.info,
    })

    // Validate that we got text content
    if (!data.text || typeof data.text !== 'string') {
      if (enableOCR) {
        console.log('No text found in PDF, attempting OCR...')
        return await parsePDFWithOCR(buffer, ocrLanguage, data.numpages || 0)
      }
      throw new Error('PDF parsing returned no text content. The PDF may be image-based or corrupted.')
    }

    // Count words (simple word count)
    const text = data.text.trim()
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length

    console.log('PDF text extraction summary:', {
      textLength: text.length,
      wordCount,
      pageCount: data.numpages || 0,
    })

    // Check if we got sufficient text, otherwise try OCR
    const needsOCR = wordCount < minWordCount || text.length < minTextLength

    if (needsOCR && enableOCR) {
      console.log('PDF contains minimal text, attempting OCR to extract more content...')
      try {
        const ocrResult = await parsePDFWithOCR(buffer, ocrLanguage, data.numpages || 0)
        
        // If OCR found more text, use it; otherwise use the original
        if (ocrResult.metadata.wordCount > wordCount) {
          console.log(`OCR found ${ocrResult.metadata.wordCount} words vs ${wordCount} from text extraction`)
          return ocrResult
        } else {
          console.log('OCR did not find more text, using original extraction')
          return {
            text,
            metadata: {
              pageCount: data.numpages || 0,
              title: data.info?.Title,
              author: data.info?.Author,
              subject: data.info?.Subject,
              wordCount,
              isOCR: false,
            },
            warning: 'PDF contains minimal text. OCR was attempted but did not find additional content.',
          }
        }
      } catch (ocrError) {
        console.warn('OCR failed, using original text extraction:', ocrError)
        return {
          text,
          metadata: {
            pageCount: data.numpages || 0,
            title: data.info?.Title,
            author: data.info?.Author,
            subject: data.info?.Subject,
            wordCount,
            isOCR: false,
          },
          warning: 'PDF contains minimal text and OCR failed. Using extracted text as-is.',
        }
      }
    }

    if (wordCount === 0) {
      console.warn('PDF parsed but contains no extractable text. The PDF may be image-based.')
    }

    if (text.length < 10) {
      console.warn('PDF extracted very little text. This might indicate an image-based PDF or parsing issue.')
    }

    return {
      text,
      metadata: {
        pageCount: data.numpages || 0,
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        wordCount,
        isOCR: false,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('PDF parsing error:', {
      errorMessage,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      bufferLength: buffer?.length,
      errorStack,
    })
    
    // If initial parsing failed and OCR is enabled, try OCR as last resort
    if (options.enableOCR !== false) {
      console.log('Initial parsing failed, attempting OCR as fallback...')
      try {
        // Try to get page count from error or default to 1
        const pageCount = 1
        return await parsePDFWithOCR(buffer, options.ocrLanguage || 'eng', pageCount)
      } catch (ocrError) {
        console.error('OCR fallback also failed:', ocrError)
        // Continue to throw original error
      }
    }
    
    // Provide more helpful error messages
    if (errorMessage.includes('Invalid PDF')) {
      throw new Error(`Invalid PDF file format: ${errorMessage}`)
    } else if (errorMessage.includes('password')) {
      throw new Error('PDF is password-protected. Please remove the password and try again.')
    } else if (errorMessage.includes('corrupted')) {
      throw new Error(`PDF file appears to be corrupted: ${errorMessage}`)
    } else {
      throw new Error(`Failed to parse PDF: ${errorMessage}`)
    }
  }
}

/**
 * Parse PDF using OCR (Optical Character Recognition)
 * This is used for image-based PDFs that don't have selectable text
 * 
 * Note: Tesseract.js works best with images. For PDFs, it will attempt to process
 * the PDF directly, but for better results, consider converting PDF pages to images first.
 */
async function parsePDFWithOCR(
  buffer: Buffer,
  language: string = 'eng',
  pageCount: number = 1
): Promise<PDFParseResult> {
  console.log('Starting OCR processing...', {
    bufferLength: buffer.length,
    language,
    pageCount,
  })

  let worker: any = null

  try {
    // Create Tesseract worker with the specified language
    console.log(`Initializing Tesseract worker with language: ${language}`)
    worker = await createWorker(language)
    
    // Set worker parameters for better OCR accuracy
    await worker.setParameters({
      tessedit_pageseg_mode: '1', // Automatic page segmentation with OSD
      tessedit_char_whitelist: '', // No character whitelist (allow all characters)
    })
    
    try {
      // Tesseract.js can work with PDF buffers directly
      // It will internally convert PDF pages to images for processing
      console.log('Running OCR on PDF (this may take a while for large PDFs)...')
      
      const startTime = Date.now()
      const { data: { text, words, paragraphs } } = await worker.recognize(buffer)
      const processingTime = Date.now() - startTime
      
      // Clean up worker
      await worker.terminate()
      worker = null

      const cleanedText = text.trim()
      const wordCount = words?.length || cleanedText.split(/\s+/).filter(word => word.length > 0).length

      console.log('OCR completed:', {
        textLength: cleanedText.length,
        wordCount,
        wordsFound: words?.length || 0,
        paragraphsFound: paragraphs?.length || 0,
        processingTimeMs: processingTime,
      })

      if (wordCount === 0 || cleanedText.length < 10) {
        throw new Error('OCR did not extract any meaningful text from the PDF. The images may be too low quality or the PDF may not contain readable text.')
      }

      return {
        text: cleanedText,
        metadata: {
          pageCount,
          wordCount,
          isOCR: true,
        },
        isOCR: true,
      }
    } catch (ocrError) {
      // Make sure to terminate worker even on error
      if (worker) {
        await worker.terminate().catch(() => {})
        worker = null
      }
      throw ocrError
    }
  } catch (error) {
    // Ensure worker is terminated
    if (worker) {
      await worker.terminate().catch(() => {})
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('OCR processing failed:', {
      error: errorMessage,
      bufferLength: buffer.length,
      errorStack: error instanceof Error ? error.stack : undefined,
    })
    
    // Provide helpful error messages
    if (errorMessage.includes('language') || errorMessage.includes('lang')) {
      throw new Error(`OCR language '${language}' is not available. Please ensure the language pack is installed.`)
    } else if (errorMessage.includes('memory') || errorMessage.includes('out of memory')) {
      throw new Error('OCR processing failed due to insufficient memory. The PDF may be too large. Try processing smaller PDFs or increasing available memory.')
    } else {
      throw new Error(`OCR processing failed: ${errorMessage}. The PDF may not contain readable images, may be corrupted, or the images may be too low quality.`)
    }
  }
}

