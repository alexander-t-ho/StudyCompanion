/**
 * Prompts for document analysis to extract key points
 */

export interface AnalysisResult {
  legalPoints: Array<{
    id: string
    text: string
    category: string
  }>
  facts: Array<{
    id: string
    text: string
    date?: string
  }>
  damages: Array<{
    id: string
    text: string
    amount?: number
    type: string
  }>
  summary: string
}

/**
 * Build prompt for document analysis
 */
export function buildAnalysisPrompt(documentText: string): string {
  return `You are a legal document analyst. Analyze the following legal document and extract key information for use in drafting a demand letter.

IMPORTANT: Even if the document is short, unclear, or contains minimal information, you MUST extract whatever information is available. Do not return empty arrays unless absolutely no relevant information exists. Extract ANY information that could be useful for a demand letter, even if it seems incomplete or brief.

Document Text:
${documentText.substring(0, 50000)} ${documentText.length > 50000 ? '... (truncated)' : ''}

Extract and categorize the following information:

1. **Legal Points**: Identify liability arguments, negligence findings, legal violations, and legal theories
   - For each point, provide: a unique ID, the point text, and a category (e.g., "negligence", "breach_of_duty", "statutory_violation", "causation")
   - If no specific legal points are found, extract any legal terminology, concepts, or legal language mentioned in the document
   - Look for words like: negligence, liability, breach, duty, causation, fault, violation, etc.

2. **Facts**: Extract chronological events, key dates, parties involved, and factual findings
   - For each fact, provide: a unique ID, the fact text, and an optional date if mentioned
   - Extract ANY factual information, even if brief or incomplete
   - Include: who, what, when, where, how - any factual details mentioned

3. **Damages**: Identify all types of damages mentioned
   - For each damage, provide: a unique ID, the damage description, an optional amount if specified, and a type (e.g., "medical", "lost_wages", "pain_suffering", "property", "economic")
   - Look for: monetary amounts, injury descriptions, loss descriptions, medical treatment, expenses, etc.
   - Extract any mention of costs, expenses, losses, or injuries

4. **Summary**: Provide a brief overall summary of the case (2-3 sentences)
   - If the document is brief, summarize what information is available
   - Include key details about the incident, parties, and any damages mentioned

Return your response as a JSON object with this exact structure:
{
  "legalPoints": [
    {"id": "lp1", "text": "...", "category": "..."}
  ],
  "facts": [
    {"id": "f1", "text": "...", "date": "..."}
  ],
  "damages": [
    {"id": "d1", "text": "...", "amount": 0, "type": "..."}
  ],
  "summary": "..."
}

Be thorough and extract all relevant information. Focus on information that would be useful for drafting a demand letter. Even if the document is minimal, extract whatever is available. Always return at least some facts and a summary, even if legal points and damages are empty.`
}

