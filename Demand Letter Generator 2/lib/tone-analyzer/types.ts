export interface ToneMetadata {
  formality: 'formal' | 'professional' | 'assertive' | 'conversational'
  voice: string // e.g., 'Authoritative', 'Empathetic', 'Neutral'
  descriptors: string[] // e.g., ['direct', 'confident', 'respectful']
}

