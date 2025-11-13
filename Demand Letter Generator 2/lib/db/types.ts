// Re-export Prisma types for convenience
export type {
  User,
  Template,
  Document,
  DocumentSection,
  SourceDocument,
  MedicalProvider,
  GenerationHistory,
  Transcription,
} from '@prisma/client'

// Extended types with relations
export type DocumentWithRelations = Document & {
  sections: DocumentSection[]
  template: Template | null
  sourceDocs: SourceDocument[]
  medicalProviders: MedicalProvider[]
  transcriptions: Transcription[]
}

export type TemplateWithMetadata = Template & {
  styleMetadata: {
    fonts?: {
      heading?: string
      body?: string
    }
    spacing?: {
      paragraph?: number
      section?: number
    }
    headers?: {
      style?: 'bold' | 'underline' | 'both'
      size?: number
    }
    lists?: {
      style?: 'bullet' | 'numbered'
    }
  } | null
  toneMetadata: {
    formality?: 'formal' | 'professional' | 'assertive' | 'conversational'
    voice?: string
    descriptors?: string[]
  } | null
}

