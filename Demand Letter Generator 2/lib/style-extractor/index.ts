import { extractStyleFromPDF } from './pdf-extractor'
import { extractStyleFromDOCX } from './docx-extractor'
import type { StyleMetadata } from './types'
import { prisma } from '@/lib/db/client'
import { getFileFromS3 } from '@/lib/aws/s3'

/**
 * Extract style metadata from a source document
 */
export async function extractStyle(sourceDocumentId: string): Promise<StyleMetadata> {
  // Get source document from database
  const sourceDocument = await prisma.sourceDocument.findUnique({
    where: { id: sourceDocumentId },
  })

  if (!sourceDocument) {
    throw new Error('Source document not found')
  }

  // Get file from S3
  const buffer = await getFileFromS3(sourceDocument.s3Key)

  // Extract style based on file type
  if (sourceDocument.fileType === 'pdf') {
    return await extractStyleFromPDF(buffer)
  } else if (sourceDocument.fileType === 'docx') {
    return await extractStyleFromDOCX(buffer)
  } else {
    throw new Error(`Unsupported file type: ${sourceDocument.fileType}`)
  }
}

export { extractStyleFromPDF, extractStyleFromDOCX }
export type { StyleMetadata }

