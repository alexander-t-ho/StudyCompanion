import { analyzeToneWithAI } from './ai-analyzer'
import type { ToneMetadata } from './types'
import { prisma } from '@/lib/db/client'

/**
 * Analyze tone from a source document
 */
export async function analyzeTone(
  sourceDocumentId: string,
  sampleSize: number = 5
): Promise<ToneMetadata> {
  // Get source document from database
  const sourceDocument = await prisma.sourceDocument.findUnique({
    where: { id: sourceDocumentId },
  })

  if (!sourceDocument) {
    throw new Error('Source document not found')
  }

  // Get extracted text
  if (!sourceDocument.extractedText) {
    throw new Error('No extracted text available for tone analysis')
  }

  // Analyze tone using AI
  return await analyzeToneWithAI(sourceDocument.extractedText, sampleSize)
}

export { analyzeToneWithAI }
export type { ToneMetadata }

