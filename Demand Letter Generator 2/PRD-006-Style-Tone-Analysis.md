# PRD-006: Style & Tone Analysis

## Overview
Implement document style extraction and AI-powered tone analysis to enable style copying and tone matching in generated content.

## Goals
- Extract formatting and style metadata from documents
- Analyze writing tone using AI
- Store style and tone metadata
- Provide separate toggles for style copying and tone matching
- Enable firm style learning from uploaded documents

## Style Extraction

### Extracted Style Properties
- **Fonts**: Heading font, body font, font sizes
- **Spacing**: Paragraph spacing, section spacing, line height
- **Headers**: Style (bold, underline, both), size hierarchy
- **Lists**: Bullet style, numbering style, indentation
- **Alignment**: Text alignment preferences
- **Margins**: Page margins, section margins

### Implementation
- **PDF**: Extract via `pdf-parse` metadata and structure analysis
- **DOCX**: Extract via `mammoth` style extraction
- Store as JSON in `style_metadata` field

## Tone Analysis

### Tone Dimensions
- **Formality**: formal, professional, assertive, conversational
- **Voice**: Authoritative, empathetic, neutral, etc.
- **Descriptors**: Array of tone keywords (e.g., ["direct", "confident", "respectful"])

### AI-Powered Analysis
- Use OpenRouter API with thinking model
- Analyze sample text from document
- Generate tone profile
- Store as JSON in `tone_metadata` field

## API Endpoints

### POST /api/analyze/style
**Request:**
```typescript
{
  sourceDocumentId: string
  documentId?: string  // Optional: apply to document
}
```

**Response:**
```typescript
{
  success: boolean
  styleMetadata?: {
    fonts: object
    spacing: object
    headers: object
    lists: object
    alignment: object
    margins: object
  }
  error?: string
}
```

### POST /api/analyze/tone
**Request:**
```typescript
{
  sourceDocumentId: string
  documentId?: string  // Optional: apply to document
  sampleSize?: number  // Number of paragraphs to analyze (default: 5)
}
```

**Response:**
```typescript
{
  success: boolean
  toneMetadata?: {
    formality: string
    voice: string
    descriptors: string[]
  }
  error?: string
}
```

### POST /api/analyze/full
**Request:**
```typescript
{
  sourceDocumentId: string
  documentId?: string
}
```

**Response:**
```typescript
{
  success: boolean
  styleMetadata?: object
  toneMetadata?: object
  error?: string
}
```

## Firm Style Learning

### Process
1. User uploads multiple firm documents
2. System analyzes each document's style and tone
3. Aggregates patterns across documents
4. Creates firm style profile
5. Applies to all generated content when enabled

### Aggregation Logic
- **Style**: Most common formatting choices
- **Tone**: Average/consensus tone across documents
- **Confidence**: Based on consistency across samples

### API Endpoint

### POST /api/analyze/firm-style
**Request:**
```typescript
{
  sourceDocumentIds: string[]  // Multiple documents to analyze
}
```

**Response:**
```typescript
{
  success: boolean
  firmStyle?: {
    styleMetadata: object
    toneMetadata: object
    confidence: number  // 0-1
    sampleCount: number
  }
  error?: string
}
```

## UI Controls

### Toggle Controls
- **Copy Style**: Checkbox to enable style copying
- **Match Tone**: Separate checkbox to enable tone matching
- Both can be enabled independently

### Style Preview
- Show extracted style properties
- Preview how style will be applied
- Allow manual style adjustments

## Implementation Details

### Style Extractor
```typescript
// lib/style-extractor/index.ts
export async function extractStyle(sourceDocument: SourceDocument): Promise<StyleMetadata> {
  // Extract from PDF or DOCX
  // Parse formatting
  // Return structured metadata
}
```

### Tone Analyzer
```typescript
// lib/tone-analyzer/index.ts
export async function analyzeTone(
  text: string,
  sampleSize: number = 5
): Promise<ToneMetadata> {
  // Use AI to analyze tone
  // Return tone profile
}
```

## File Structure
```
lib/
  style-extractor/
    index.ts           # Style extraction logic
    pdf-extractor.ts   # PDF style extraction
    docx-extractor.ts  # DOCX style extraction
  tone-analyzer/
    index.ts           # Tone analysis logic
    ai-analyzer.ts     # AI-powered tone analysis
app/
  api/
    analyze/
      style/
        route.ts
      tone/
        route.ts
      full/
        route.ts
      firm-style/
        route.ts
components/
  StyleToneControls.tsx
  StylePreview.tsx
```

## Dependencies
- **PRD-001**: Database & Data Models (Template, Document models)
- **PRD-003**: File Storage (for source document access)
- **PRD-005**: AI Generation Engine (for tone analysis AI calls)

## Deliverables
1. Style extraction module
2. Tone analysis module
3. Style analysis API endpoints
4. Tone analysis API endpoints
5. Firm style learning system
6. UI toggle controls
7. Style preview component

## Success Criteria
- Style metadata extracted accurately from PDF/DOCX
- Tone analysis produces meaningful results
- Style and tone can be applied to generated content
- Firm style learning aggregates patterns correctly
- Toggle controls work independently

## Testing Requirements
- Unit tests for style extraction
- Unit tests for tone analysis
- Integration tests for analysis endpoints
- Test with various document formats

## Error Handling
- Unsupported file type → 400 Bad Request
- Extraction failure → 500 with error details
- AI analysis failure → Fallback to default tone

