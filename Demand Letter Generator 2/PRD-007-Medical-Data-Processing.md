# PRD-007: Medical Data Processing

## Overview
Implement medical records processing system to extract provider information, generate medical chronologies, and enable provider selection for demand letter generation.

## Goals
- Extract medical provider data from uploaded documents
- Generate AI-powered medical chronologies
- Create provider selection interface
- Support medical data in document generation

## Medical Provider Data Structure

### Provider Information
- Provider name
- Amount billed
- AI-generated chronology
- AI-generated summary
- Selection status (for document generation)

## API Endpoints

### POST /api/medical/extract
**Request:**
```typescript
{
  documentId: string
  sourceDocumentId: string
}
```

**Response:**
```typescript
{
  success: boolean
  providers?: Array<{
    id: string
    providerName: string
    amount: number
    chronology: string
    summary: string
  }>
  error?: string
}
```

### GET /api/medical/:documentId/providers
**Response:**
```typescript
{
  providers: Array<{
    id: string
    providerName: string
    amount: number
    chronology: string
    summary: string
    isSelected: boolean
  }>
}
```

### PUT /api/medical/:documentId/providers/:providerId
**Request:**
```typescript
{
  isSelected: boolean
}
```

**Response:**
```typescript
{
  success: boolean
  provider?: MedicalProvider
  error?: string
}
```

### POST /api/medical/:documentId/providers/bulk-select
**Request:**
```typescript
{
  providerIds: string[]
  isSelected: boolean
}
```

**Response:**
```typescript
{
  success: boolean
  updated: number
}
```

## Medical Chronology Generation

### Process
1. Extract medical records text from source document
2. Use AI to identify providers, dates, treatments
3. Generate chronological timeline
4. Create provider-specific summaries
5. Extract billing amounts

### AI Prompt for Chronology
```
Analyze the following medical records and extract:
1. Medical provider names
2. Dates of service
3. Treatments and procedures
4. Diagnoses and injuries
5. Billing amounts

For each provider, create:
- A chronological timeline of treatments
- A summary of injuries and treatments

Format the output as structured data.
```

### Chronology Structure
```typescript
{
  provider: string
  timeline: Array<{
    date: string
    service: string
    description: string
    amount?: number
  }>
  summary: {
    injuries: string[]
    treatments: string[]
    totalAmount: number
  }
}
```

## Medical Provider Selection Modal

### UI Requirements
- Table view with columns:
  - Checkbox (select all functionality)
  - Medical Provider
  - Amount
  - AI Chronology (scrollable)
  - AI Summary (scrollable)
- Select all checkbox in header
- Update and Cancel buttons
- Modal overlay

### Component Props
```typescript
interface MedicalProviderModalProps {
  documentId: string
  open: boolean
  onClose: () => void
  onUpdate: (selectedIds: string[]) => void
}
```

## Integration with Document Generation

### Context Injection
When generating document sections that reference medical providers:
- Include selected providers' chronologies
- Include provider summaries
- Include total medical amounts
- Reference specific providers by name

### Section Types Using Medical Data
- Medical/Injury Chronology section
- Damages section
- Economic Damages section
- Treatment Reasonableness section

## Implementation Details

### Medical Data Extractor
```typescript
// lib/medical/extractor.ts
export async function extractMedicalData(
  text: string,
  documentId: string
): Promise<MedicalProvider[]> {
  // Use AI to extract provider data
  // Generate chronologies
  // Generate summaries
  // Store in database
}
```

### Chronology Generator
```typescript
// lib/medical/chronology.ts
export async function generateChronology(
  providerData: MedicalProviderData
): Promise<string> {
  // Use AI to create chronological narrative
  // Format as readable text
}
```

## File Structure
```
lib/
  medical/
    extractor.ts       # Medical data extraction
    chronology.ts      # Chronology generation
    types.ts           # Medical data types
app/
  api/
    medical/
      extract/
        route.ts
      [documentId]/
        providers/
          route.ts     # GET, POST
          bulk-select/
            route.ts
          [providerId]/
            route.ts   # PUT
components/
  medical/
    MedicalProviderModal.tsx
    ProviderTable.tsx
    ChronologyView.tsx
```

## Dependencies
- **PRD-001**: Database & Data Models (MedicalProvider model)
- **PRD-003**: File Storage (for source document access)
- **PRD-005**: AI Generation Engine (for AI-powered extraction)

## Deliverables
1. Medical data extraction module
2. Chronology generation module
3. Medical provider API endpoints
4. Provider selection modal component
5. Integration with document generation

## Success Criteria
- Medical providers extracted from documents
- Chronologies generated accurately
- Provider selection works correctly
- Selected providers included in document generation
- Modal UI is user-friendly

## Testing Requirements
- Unit tests for medical extraction
- Integration tests for provider APIs
- E2E tests for provider selection flow
- Test with various medical record formats

## Error Handling
- No medical data found → Return empty array
- Extraction failure → 500 with error details
- Invalid document ID → 404 Not Found

