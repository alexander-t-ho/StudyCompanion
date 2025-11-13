import mammoth from 'mammoth'
import type { StyleMetadata } from './types'

/**
 * Extract style metadata from DOCX
 */
export async function extractStyleFromDOCX(buffer: Buffer): Promise<StyleMetadata> {
  try {
    // Use mammoth to extract style information
    const result = await mammoth.extractRawText({ buffer })
    
    // For more detailed style extraction, we'd need to parse the DOCX XML directly
    // mammoth.extractRawText doesn't provide style information
    // For now, we'll use mammoth's style extraction capabilities
    
    const metadata: StyleMetadata = {}

    // Try to extract styles using mammoth's style mapping
    const styleResult = await mammoth.convertToHtml(
      { buffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
        ],
      }
    )

    // Analyze the HTML to extract style information
    // For now, we'll set defaults based on common legal document styles
    metadata.fonts = {
      heading: 'Times New Roman',
      body: 'Times New Roman',
      headingSize: 12,
      bodySize: 12,
    }

    metadata.spacing = {
      paragraph: '1.15',
      section: '12pt',
      lineHeight: 1.15,
    }

    metadata.headers = {
      style: 'bold',
      sizeHierarchy: [1, 2, 3],
    }

    metadata.lists = {
      bulletStyle: 'disc',
      numberingStyle: 'decimal',
      indentation: 0.5,
    }

    metadata.alignment = {
      default: 'left',
    }

    metadata.margins = {
      page: {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72,
      },
      section: {
        top: 12,
        bottom: 12,
      },
    }

    return metadata
  } catch (error) {
    throw new Error(`Failed to extract style from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

