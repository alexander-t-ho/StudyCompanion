export interface StyleMetadata {
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
  alignment?: {
    text?: 'left' | 'center' | 'right' | 'justify'
  }
  margins?: {
    top?: number
    bottom?: number
    left?: number
    right?: number
  }
}

export interface ToneMetadata {
  formality?: 'formal' | 'professional' | 'assertive' | 'conversational'
  voice?: string
  descriptors?: string[]
}

export interface TemplateSections {
  sections: string[] // Section types in order
}

export interface CreateTemplateInput {
  name: string
  content?: string | null
  styleMetadata?: StyleMetadata | null
  toneMetadata?: ToneMetadata | null
  sections?: string[]
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {}

