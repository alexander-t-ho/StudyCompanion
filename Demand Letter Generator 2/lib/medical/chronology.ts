import { generateChronology } from './extractor'
import type { MedicalProviderData } from './types'

/**
 * Generate a formatted chronology narrative from provider data
 */
export async function generateChronologyNarrative(
  providerData: MedicalProviderData
): Promise<string> {
  return await generateChronology(providerData)
}

export { generateChronology }

