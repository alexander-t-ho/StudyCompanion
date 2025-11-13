import mammoth from 'mammoth'

export interface DOCXMetadata {
  wordCount: number
  author?: string
  title?: string
}

export interface DOCXParseResult {
  text: string
  metadata: DOCXMetadata
}

/**
 * Parse DOCX file and extract text
 */
export async function parseDOCX(buffer: Buffer): Promise<DOCXParseResult> {
  try {
    const result = await mammoth.extractRawText({ buffer })

    // Count words (simple word count)
    const wordCount = result.value.split(/\s+/).filter(word => word.length > 0).length

    // Extract text (mammoth gives us plain text)
    const text = result.value

    return {
      text,
      metadata: {
        wordCount,
        // Note: mammoth doesn't extract metadata like author/title
        // Would need to use a different library for that
      },
    }
  } catch (error) {
    throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

