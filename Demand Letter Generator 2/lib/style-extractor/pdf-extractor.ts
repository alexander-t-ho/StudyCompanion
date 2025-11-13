import pdfParse from 'pdf-parse'
import type { StyleMetadata } from './types'

/**
 * Extract style metadata from PDF
 */
export async function extractStyleFromPDF(buffer: Buffer): Promise<StyleMetadata> {
  try {
    const data = await pdfParse(buffer)
    const metadata: StyleMetadata = {}

    // Extract font information from PDF metadata
    if (data.info) {
      // Try to extract font information from PDF structure
      // Note: pdf-parse has limited style extraction capabilities
      // For more advanced extraction, we'd need a library like pdf.js
      
      // Extract basic metadata
      if (data.info.Title) {
        // Could indicate heading style preferences
      }
    }

    // Analyze text structure for style hints
    const text = data.text || ''
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    
    // Detect heading patterns (lines that are shorter and might be headings)
    const potentialHeadings = lines.filter(line => 
      line.length < 100 && 
      line.split(' ').length < 10 &&
      /^[A-Z]/.test(line.trim())
    )

    if (potentialHeadings.length > 0) {
      metadata.headers = {
        style: 'bold', // Default assumption
        sizeHierarchy: [1, 2, 3], // Default hierarchy
      }
    }

    // Default values for common legal document styles
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

    metadata.alignment = {
      default: 'left',
    }

    metadata.margins = {
      page: {
        top: 72, // 1 inch in points
        bottom: 72,
        left: 72,
        right: 72,
      },
    }

    return metadata
  } catch (error) {
    throw new Error(`Failed to extract style from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

