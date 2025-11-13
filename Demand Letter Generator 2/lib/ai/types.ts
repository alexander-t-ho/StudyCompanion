export interface GenerationContext {
  caseInfo?: {
    claimNumber?: string
    insured?: string
    dateOfLoss?: string
    client?: string
    adjuster?: string
    dateOfLetter?: string
    target?: string
  }
  selectedProviders?: string[]
  sourceDocuments?: string[]
  styleMetadata?: any
  toneMetadata?: any
  copyStyle?: boolean
  matchTone?: boolean
  customPrompt?: string
  analysisPoints?: {
    legalPoints?: Array<{id: string, text: string, category: string}>
    facts?: Array<{id: string, text: string, date?: string}>
    damages?: Array<{id: string, text: string, amount?: number, type: string}>
  }
  analysisId?: string
}

export interface GenerationRequest {
  documentId: string
  sectionType: string
  context: GenerationContext
  prompt?: string
  model?: string
}

export interface GenerationResponse {
  success: boolean
  content?: string
  modelUsed?: string
  responseTime?: number
  error?: string
}

export interface StreamChunk {
  chunk?: string
  done?: boolean
  modelUsed?: string
  responseTime?: number
  error?: string
}

export type SectionType =
  | 'introduction'
  | 'statement_of_facts'
  | 'liability'
  | 'damages'
  | 'medical_chronology'
  | 'economic_damages'
  | 'treatment_reasonableness'
  | 'conclusion'
  | 'coverage_analysis'
  | 'policy_limits'
  | 'negligence_analysis'
  | 'comparative_fault'
  | 'violations'
  | 'remedies'
  | 'statutory_damages'
  | 'contract_terms'
  | 'breach_analysis'
  | 'business_context'
  | 'business_impact'
  | 'legal_basis'
  | 'circumstances'
  | 'best_interests'
  | 'estate_context'

