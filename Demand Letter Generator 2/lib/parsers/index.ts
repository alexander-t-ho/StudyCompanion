import { parsePDF, type PDFParseResult, type PDFParseOptions } from './pdf'
import { parseDOCX, type DOCXParseResult } from './docx'

export type ParseResult = PDFParseResult | DOCXParseResult

export interface ParserMetadata {
  filename: string
  fileType: 'pdf' | 'docx'
  wordCount: number
  pageCount?: number
  isOCR?: boolean
}

export interface ParseDocumentOptions {
  enableOCR?: boolean
  ocrLanguage?: string
  minTextLength?: number
  minWordCount?: number
}

/**
 * Parse document based on file type
 */
export async function parseDocument(
  buffer: Buffer,
  filename: string,
  fileType: 'pdf' | 'docx',
  options: ParseDocumentOptions = {}
): Promise<{ text: string; metadata: ParserMetadata }> {
  let result: ParseResult

  if (fileType === 'pdf') {
    const pdfOptions: PDFParseOptions = {
      enableOCR: options.enableOCR,
      ocrLanguage: options.ocrLanguage,
      minTextLength: options.minTextLength,
      minWordCount: options.minWordCount,
    }
    result = await parsePDF(buffer, pdfOptions)
    return {
      text: result.text,
      metadata: {
        filename,
        fileType: 'pdf',
        wordCount: result.metadata.wordCount,
        pageCount: result.metadata.pageCount,
        isOCR: result.metadata.isOCR,
      },
    }
  } else if (fileType === 'docx') {
    result = await parseDOCX(buffer)
    return {
      text: result.text,
      metadata: {
        filename,
        fileType: 'docx',
        wordCount: result.metadata.wordCount,
      },
    }
  } else {
    throw new Error(`Unsupported file type: ${fileType}`)
  }
}

export { parsePDF, parseDOCX }

