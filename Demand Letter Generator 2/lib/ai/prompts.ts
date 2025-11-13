import type { GenerationContext, SectionType } from './types'

/**
 * Build prompt for a specific section type
 */
export function buildPrompt(
  sectionType: SectionType,
  context: GenerationContext
): string {
  // Ensure date defaults to current day
  const caseInfo = {
    ...context.caseInfo,
    dateOfLetter: context.caseInfo?.dateOfLetter || new Date().toISOString().split('T')[0],
  }
  
  let basePrompt = getBasePrompt(sectionType, caseInfo)
  
  // Add style instructions if copyStyle is enabled
  if (context.copyStyle && context.styleMetadata) {
    basePrompt += `\n\nStyle Instructions:\n${formatStyleInstructions(context.styleMetadata)}`
  }
  
  // Add tone instructions if matchTone is enabled
  if (context.matchTone && context.toneMetadata) {
    basePrompt += `\n\nTone Instructions:\n${formatToneInstructions(context.toneMetadata)}`
  }
  
  // Add analysis points if available
  if (context.analysisPoints) {
    basePrompt += `\n\nANALYSIS POINTS TO INCORPORATE:\n`
    
    const { legalPoints, facts, damages } = context.analysisPoints
    
    // Determine which points are relevant for this section type
    const relevantPoints: string[] = []
    
    if (legalPoints && legalPoints.length > 0) {
      const relevantLegal = getRelevantLegalPoints(sectionType, legalPoints)
      if (relevantLegal.length > 0) {
        basePrompt += `\nLegal Points to incorporate:\n`
        relevantLegal.forEach((point, idx) => {
          basePrompt += `${idx + 1}. [${point.category}] ${point.text}\n`
        })
      }
    }
    
    if (facts && facts.length > 0) {
      const relevantFacts = getRelevantFacts(sectionType, facts)
      if (relevantFacts.length > 0) {
        basePrompt += `\nFacts to incorporate:\n`
        relevantFacts.forEach((fact, idx) => {
          basePrompt += `${idx + 1}. ${fact.date ? `[${fact.date}] ` : ''}${fact.text}\n`
        })
      }
    }
    
    if (damages && damages.length > 0) {
      const relevantDamages = getRelevantDamages(sectionType, damages)
      if (relevantDamages.length > 0) {
        basePrompt += `\nDamages to incorporate:\n`
        relevantDamages.forEach((damage, idx) => {
          basePrompt += `${idx + 1}. [${damage.type}] ${damage.text}${damage.amount ? ` ($${damage.amount.toLocaleString()})` : ''}\n`
        })
      }
    }
    
    basePrompt += `\nIMPORTANT: When generating content, incorporate the relevant analysis points above naturally into the section. Reference specific points where appropriate.`
  } else {
    // IMPORTANT: Generate generic template-based content regardless of provided content
    basePrompt += `\n\nIMPORTANT INSTRUCTIONS:
- Generate generic, professional content based on the template structure and style
- Do NOT reference specific case details unless they are explicitly provided in the Case Information above
- Create content that follows the template's tone and style guidelines
- The content should be professional, well-structured, and appropriate for a demand letter
- Focus on creating template-based generic content that can be customized later
- Use placeholder language where specific details are not available`
  }
  
  // Add medical provider context if available
  if (context.selectedProviders && context.selectedProviders.length > 0) {
    basePrompt += `\n\nNote: This section should reference the selected medical providers and their treatments.`
  }
  
  // Add custom prompt/instructions if provided
  if (context.customPrompt) {
    basePrompt += `\n\nAdditional Instructions:\n${context.customPrompt}`
  }
  
  return basePrompt
}

/**
 * Get base prompt for section type
 */
function getBasePrompt(sectionType: SectionType, caseInfo: any): string {
  const caseDetails = formatCaseInfo(caseInfo)
  
  switch (sectionType) {
    case 'introduction':
      return `You are a legal assistant helping to draft a demand letter. Generate a professional, thoughtful introduction section for a 60-day settlement demand.

${caseDetails}

The introduction should:
- Include a professional salutation (use the Target/Recipient if provided, otherwise use a generic salutation)
- Clearly state the purpose of the letter (60-day settlement demand)
- Reference the case details above if provided, otherwise use generic placeholder language
- Include the date of the letter (use the Date of Letter provided above)
- Set a professional and respectful tone
- Be concise but comprehensive
- Generate generic template-based content that follows standard demand letter format

Generate the introduction section now:`

    case 'statement_of_facts':
      return `You are a legal assistant helping to draft a demand letter. Generate a professional, thoughtful statement of facts section.

${caseDetails}

The statement of facts should:
- Provide a chronological narrative of the incident
- Be objective and factual
- Include all relevant details about what happened
- Be clear and easy to follow
- Support the liability arguments

Generate the statement of facts section now:`

    case 'liability':
      return `You are a legal assistant helping to draft a demand letter. Generate a professional, thoughtful liability section.

${caseDetails}

The liability section should:
- Analyze the legal basis for liability
- Present clear negligence arguments
- Reference supporting facts from the statement of facts
- Be persuasive and well-reasoned
- Use appropriate legal terminology

Generate the liability section now:`

    case 'damages':
      return `You are a legal assistant helping to draft a demand letter. Generate a professional, thoughtful damages section.

${caseDetails}

The damages section should:
- Describe the injuries sustained
- Summarize medical treatment received
- Discuss the impact on the client's life
- Reference medical providers and treatments
- Be comprehensive and detailed

Generate the damages section now:`

    case 'medical_chronology':
      return `You are a legal assistant helping to draft a demand letter. Generate a professional, thoughtful medical chronology section.

${caseDetails}

The medical chronology should:
- Provide a chronological timeline of all medical treatments
- Include provider names and dates of service
- Describe treatments and procedures
- Be organized and easy to follow
- Reference specific medical providers

Generate the medical chronology section now:`

    case 'economic_damages':
      return `You are a legal assistant helping to draft a demand letter. Generate a professional, thoughtful economic damages section.

${caseDetails}

The economic damages section should:
- Itemize all economic losses
- Include medical expenses, lost wages, and other costs
- Provide specific amounts where available
- Be detailed and well-documented
- Support the demand amount

Generate the economic damages section now:`

    case 'treatment_reasonableness':
      return `You are a legal assistant helping to draft a demand letter. Generate a professional, thoughtful section on the reasonableness and necessity of treatment.

${caseDetails}

This section should:
- Explain why all treatments were necessary
- Reference medical provider opinions
- Address any potential challenges to treatment necessity
- Be persuasive and well-supported
- Demonstrate the reasonableness of the treatment plan

Generate the treatment reasonableness section now:`

    case 'conclusion':
      return `You are a legal assistant helping to draft a demand letter. Generate a professional, thoughtful conclusion section.

${caseDetails}

The conclusion should:
- Summarize the key points of the demand
- Restate the settlement demand
- Include a deadline for response (60 days)
- Be professional and firm
- Encourage settlement

Generate the conclusion section now:`

    case 'coverage_analysis':
      return `You are a legal assistant helping to draft a UIM demand letter. Generate a professional, thoughtful coverage analysis section.

${caseDetails}

The coverage analysis should:
- Analyze the insurance coverage available
- Discuss policy limits and coverage types
- Explain why UIM coverage applies
- Be detailed and legally sound
- Support the demand

Generate the coverage analysis section now:`

    case 'policy_limits':
      return `You are a legal assistant helping to draft a UIM demand letter. Generate a professional, thoughtful policy limits section.

${caseDetails}

This section should:
- Reference the applicable policy limits
- Explain the demand in relation to policy limits
- Be clear and specific
- Support the full policy limits demand

Generate the policy limits section now:`

    case 'negligence_analysis':
      return `You are a legal assistant helping to draft a third-party liability demand letter. Generate a professional, thoughtful negligence analysis section.

${caseDetails}

The negligence analysis should:
- Analyze the defendant's negligence
- Apply relevant legal standards
- Be detailed and well-reasoned
- Support the liability claim
- Use appropriate legal terminology

Generate the negligence analysis section now:`

    case 'comparative_fault':
      return `You are a legal assistant helping to draft a third-party liability demand letter. Generate a professional, thoughtful comparative fault section.

${caseDetails}

This section should:
- Address any potential comparative fault arguments
- Explain why the client was not at fault
- Be persuasive and well-supported
- Anticipate and counter opposing arguments

Generate the comparative fault section now:`

    case 'violations':
      return `You are a legal assistant helping to draft a demand letter. Generate a professional, thoughtful violations section.

${caseDetails}

The violations section should:
- Identify specific legal violations or statutory violations
- Reference applicable laws, regulations, or statutes
- Explain how each violation occurred
- Be detailed and legally precise
- Support the liability claim

Generate the violations section now:`

    case 'remedies':
      return `You are a legal assistant helping to draft a demand letter. Generate a professional, thoughtful remedies section.

${caseDetails}

The remedies section should:
- Specify the requested remedies or relief
- Explain why each remedy is appropriate
- Reference legal authority for the remedies
- Be clear and specific
- Support the demand

Generate the remedies section now:`

    case 'statutory_damages':
      return `You are a legal assistant helping to draft a demand letter. Generate a professional, thoughtful statutory damages section.

${caseDetails}

The statutory damages section should:
- Identify applicable statutory damages
- Calculate statutory damages where applicable
- Reference the relevant statutes
- Explain the basis for statutory damages
- Be precise and well-documented

Generate the statutory damages section now:`

    case 'contract_terms':
      return `You are a legal assistant helping to draft a contractual dispute demand letter. Generate a professional, thoughtful contract terms section.

${caseDetails}

The contract terms section should:
- Identify and summarize relevant contract terms
- Quote or reference specific contract provisions
- Explain the meaning and intent of the terms
- Be precise and accurate
- Support the breach analysis

Generate the contract terms section now:`

    case 'breach_analysis':
      return `You are a legal assistant helping to draft a contractual dispute demand letter. Generate a professional, thoughtful breach analysis section.

${caseDetails}

The breach analysis should:
- Identify how the contract was breached
- Explain which specific terms were violated
- Analyze the nature and extent of the breach
- Be detailed and legally sound
- Support the liability claim

Generate the breach analysis section now:`

    case 'business_context':
      return `You are a legal assistant helping to draft a business/commercial demand letter. Generate a professional, thoughtful business context section.

${caseDetails}

The business context section should:
- Provide background on the business relationship
- Explain the commercial context of the dispute
- Describe the parties' business dealings
- Be clear and professional
- Set the stage for the dispute

Generate the business context section now:`

    case 'business_impact':
      return `You are a legal assistant helping to draft a business/commercial demand letter. Generate a professional, thoughtful business impact section.

${caseDetails}

The business impact section should:
- Describe the impact on the business
- Quantify business losses where possible
- Explain operational disruptions
- Be detailed and specific
- Support the damages claim

Generate the business impact section now:`

    case 'legal_basis':
      return `You are a legal assistant helping to draft a demand letter. Generate a professional, thoughtful legal basis section.

${caseDetails}

The legal basis section should:
- Identify the legal foundation for the claim
- Reference applicable laws, statutes, or case law
- Explain the legal theory
- Be legally sound and well-reasoned
- Support the overall claim

Generate the legal basis section now:`

    case 'circumstances':
      return `You are a legal assistant helping to draft a demand letter. Generate a professional, thoughtful circumstances section.

${caseDetails}

The circumstances section should:
- Describe the relevant circumstances surrounding the dispute
- Provide context for understanding the situation
- Be detailed and comprehensive
- Support the legal arguments
- Be clear and well-organized

Generate the circumstances section now:`

    case 'best_interests':
      return `You are a legal assistant helping to draft a family law demand letter. Generate a professional, thoughtful best interests section.

${caseDetails}

The best interests section should:
- Address the best interests standard where applicable
- Explain why the requested relief serves best interests
- Be sensitive and respectful
- Be well-reasoned and supported
- Focus on the relevant factors

Generate the best interests section now:`

    case 'estate_context':
      return `You are a legal assistant helping to draft an estate/probate demand letter. Generate a professional, thoughtful estate context section.

${caseDetails}

The estate context section should:
- Provide background on the estate
- Explain the probate context
- Describe relevant estate documents
- Be respectful and professional
- Set the stage for the dispute

Generate the estate context section now:`

    default:
      return `You are a legal assistant helping to draft a demand letter. Generate a professional, thoughtful ${sectionType} section.

${caseDetails}

Generate the ${sectionType} section now:`
  }
}

/**
 * Format case information for prompt
 */
function formatCaseInfo(caseInfo: any): string {
  const parts: string[] = []
  
  if (caseInfo.claimNumber) {
    parts.push(`- Claim Number: ${caseInfo.claimNumber}`)
  }
  if (caseInfo.insured) {
    parts.push(`- Your Insured: ${caseInfo.insured}`)
  }
  if (caseInfo.dateOfLoss) {
    parts.push(`- Date of Loss: ${caseInfo.dateOfLoss}`)
  }
  if (caseInfo.client) {
    parts.push(`- Our Client: ${caseInfo.client}`)
  }
  if (caseInfo.adjuster) {
    parts.push(`- Adjuster: ${caseInfo.adjuster}`)
  }
  if (caseInfo.target) {
    parts.push(`- Target/Recipient: ${caseInfo.target}`)
  }
  if (caseInfo.dateOfLetter) {
    const date = new Date(caseInfo.dateOfLetter)
    parts.push(`- Date of Letter: ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`)
  } else {
    const today = new Date()
    parts.push(`- Date of Letter: ${today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`)
  }
  
  if (parts.length === 0) {
    return 'Case Information: (To be provided)'
  }
  
  return `Case Information:\n${parts.join('\n')}`
}

/**
 * Format style instructions for prompt
 */
function formatStyleInstructions(styleMetadata: any): string {
  const instructions: string[] = []
  
  if (styleMetadata.fonts) {
    if (styleMetadata.fonts.heading) {
      instructions.push(`- Use "${styleMetadata.fonts.heading}" font for headings`)
    }
    if (styleMetadata.fonts.body) {
      instructions.push(`- Use "${styleMetadata.fonts.body}" font for body text`)
    }
  }
  
  if (styleMetadata.spacing) {
    if (styleMetadata.spacing.paragraph) {
      instructions.push(`- Paragraph spacing: ${styleMetadata.spacing.paragraph}`)
    }
    if (styleMetadata.spacing.section) {
      instructions.push(`- Section spacing: ${styleMetadata.spacing.section}`)
    }
  }
  
  if (styleMetadata.headers) {
    if (styleMetadata.headers.style) {
      instructions.push(`- Header style: ${styleMetadata.headers.style}`)
    }
  }
  
  if (styleMetadata.lists) {
    if (styleMetadata.lists.style) {
      instructions.push(`- List style: ${styleMetadata.lists.style}`)
    }
  }
  
  return instructions.length > 0 
    ? instructions.join('\n')
    : 'Follow standard legal document formatting.'
}

/**
 * Format tone instructions for prompt
 */
function formatToneInstructions(toneMetadata: any): string {
  const instructions: string[] = []
  
  if (toneMetadata.formality) {
    instructions.push(`- Formality level: ${toneMetadata.formality}`)
  }
  
  if (toneMetadata.voice) {
    instructions.push(`- Voice: ${toneMetadata.voice}`)
  }
  
  if (toneMetadata.descriptors && Array.isArray(toneMetadata.descriptors)) {
    instructions.push(`- Tone descriptors: ${toneMetadata.descriptors.join(', ')}`)
  }
  
  return instructions.length > 0
    ? instructions.join('\n')
    : 'Use a professional and appropriate tone.'
}

/**
 * Get relevant legal points for a section type
 */
function getRelevantLegalPoints(
  sectionType: SectionType,
  legalPoints: Array<{id: string, text: string, category: string}>
): Array<{id: string, text: string, category: string}> {
  // Map section types to relevant legal point categories
  const sectionCategoryMap: Record<string, string[]> = {
    liability: ['negligence', 'breach_of_duty', 'causation', 'duty_of_care'],
    negligence_analysis: ['negligence', 'breach_of_duty', 'causation', 'duty_of_care'],
    violations: ['statutory_violation', 'legal_violation', 'regulatory_violation'],
    legal_basis: ['legal_theory', 'statutory_violation', 'legal_violation'],
    introduction: [], // Introduction may reference any legal points
    conclusion: [], // Conclusion may reference any legal points
  }
  
  const relevantCategories = sectionCategoryMap[sectionType] || []
  
  if (relevantCategories.length === 0) {
    // If no specific mapping, include all legal points for most sections
    return legalPoints
  }
  
  return legalPoints.filter(point => 
    relevantCategories.some(cat => 
      point.category.toLowerCase().includes(cat.toLowerCase())
    )
  )
}

/**
 * Get relevant facts for a section type
 */
function getRelevantFacts(
  sectionType: SectionType,
  facts: Array<{id: string, text: string, date?: string}>
): Array<{id: string, text: string, date?: string}> {
  // Facts are relevant for statement of facts, introduction, and most sections
  const factRelevantSections = [
    'introduction',
    'statement_of_facts',
    'liability',
    'circumstances',
  ]
  
  if (factRelevantSections.includes(sectionType)) {
    return facts
  }
  
  // For other sections, return a subset (most recent or most relevant)
  return facts.slice(0, 5)
}

/**
 * Get relevant damages for a section type
 */
function getRelevantDamages(
  sectionType: SectionType,
  damages: Array<{id: string, text: string, amount?: number, type: string}>
): Array<{id: string, text: string, amount?: number, type: string}> {
  // Map section types to relevant damage types
  const sectionDamageMap: Record<string, string[]> = {
    damages: ['medical', 'pain_suffering', 'property', 'economic'],
    economic_damages: ['medical', 'lost_wages', 'economic', 'property'],
    medical_chronology: ['medical'],
    conclusion: [], // Conclusion may reference all damages
  }
  
  const relevantTypes = sectionDamageMap[sectionType] || []
  
  if (relevantTypes.length === 0 && ['introduction', 'conclusion'].includes(sectionType)) {
    // Introduction and conclusion may reference all damages
    return damages
  }
  
  if (relevantTypes.length === 0) {
    return []
  }
  
  return damages.filter(damage =>
    relevantTypes.some(type =>
      damage.type.toLowerCase().includes(type.toLowerCase())
    )
  )
}

