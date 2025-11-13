# PRD-005: AI Generation Engine

## Overview
Implement AI-powered content generation system using OpenRouter API with thinking models to generate demand letter sections with professional, thoughtful responses.

## Goals
- Integrate OpenRouter API for AI generation
- Support streaming responses for better UX
- Generate section-specific content
- Apply style and tone matching
- Track generation history

## AI Provider
- **Service**: OpenRouter API
- **Models**: Thinking models (GPT-4o, Claude Sonnet 4.5, etc.)
- **API Key**: Environment variable `OPENROUTER_API_KEY`

## Model Selection
Default thinking models (configurable):
- `anthropic/claude-3.5-sonnet` (recommended for legal content)
- `openai/gpt-4o`
- `openai/gpt-4-turbo`

## API Endpoints

### POST /api/generate
**Request:**
```typescript
{
  documentId: string
  sectionType: string  // introduction, liability, damages, etc.
  context: {
    caseInfo?: object
    selectedProviders?: string[]
    sourceDocuments?: string[]
    styleMetadata?: object
    toneMetadata?: object
    copyStyle?: boolean
    matchTone?: boolean
  }
  prompt?: string  // Optional custom prompt
}
```

**Response (Non-streaming):**
```typescript
{
  success: boolean
  content?: string
  modelUsed?: string
  responseTime?: number
  error?: string
}
```

### POST /api/generate/stream
**Request:** Same as `/api/generate`

**Response:** Server-Sent Events (SSE) stream
```
data: {"chunk": "partial text..."}
data: {"chunk": "more text..."}
data: {"done": true, "modelUsed": "...", "responseTime": 1234}
```

## Prompt Engineering

### Base Prompt Structure
```
You are a legal assistant helping to draft a demand letter. 
Generate a professional, thoughtful [SECTION_TYPE] section.

Case Information:
- Claim Number: [CLAIM_NUMBER]
- Insured: [INSURED]
- Date of Loss: [DATE_OF_LOSS]
- Client: [CLIENT]

[ADDITIONAL_CONTEXT]

[STYLE_INSTRUCTIONS if copyStyle=true]
[TONE_INSTRUCTIONS if matchTone=true]

Generate the [SECTION_TYPE] section now:
```

### Section-Specific Prompts

#### Introduction
- Purpose: 60-day settlement demand
- Include case details
- Professional salutation

#### Statement of Facts
- Chronological narrative
- Objective tone
- Key incident details

#### Liability
- Legal analysis
- Negligence arguments
- Supporting facts

#### Damages
- Injury descriptions
- Medical treatment summary
- Economic impact

#### Medical Chronology
- Chronological treatment timeline
- Provider-specific details
- Treatment descriptions

## Style & Tone Application

### Style Matching (when `copyStyle=true`)
- Apply formatting instructions from style metadata
- Use specified fonts, spacing, headers
- Maintain document structure

### Tone Matching (when `matchTone=true`)
- Analyze tone metadata
- Adjust language formality
- Match voice characteristics
- Apply tone descriptors

## Implementation Details

### OpenRouter Client
```typescript
// lib/ai/openrouter.ts
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'anthropic/claude-3.5-sonnet',
    messages: [...],
    stream: true,  // For streaming
  }),
})
```

### Prompt Builder
- Dynamic prompt construction based on section type
- Context injection (case info, medical providers, etc.)
- Style/tone instruction injection
- Custom prompt override support

### Streaming Support
- Server-Sent Events (SSE) for real-time updates
- Chunk processing and forwarding
- Error handling in stream

### Generation History
- Log all generations to `generation_history` table
- Track: prompt used, model used, response time
- Enable regeneration with same parameters

## File Structure
```
lib/
  ai/
    openrouter.ts      # OpenRouter API client
    prompts.ts         # Prompt templates and builders
    streaming.ts       # SSE streaming utilities
    types.ts           # AI-related types
app/
  api/
    generate/
      route.ts         # Non-streaming generation
      stream/
        route.ts       # Streaming generation
```

## Dependencies
- **PRD-001**: Database & Data Models (GenerationHistory model)
- **PRD-004**: Template Management (for style/tone metadata)
- **PRD-006**: Style & Tone Analysis (for matching)

## Environment Variables
```
OPENROUTER_API_KEY=<api-key>
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
```

## Deliverables
1. OpenRouter API client
2. Prompt builder system
3. Generation API endpoint (non-streaming)
4. Streaming generation API endpoint
5. Generation history logging
6. Error handling and retries

## Success Criteria
- AI generates coherent, professional content
- Streaming works for real-time updates
- Style and tone matching applied correctly
- Generation history tracked
- Error handling robust

## Testing Requirements
- Unit tests for prompt building
- Integration tests for OpenRouter API
- Test streaming functionality
- Test style/tone application

## Error Handling
- API rate limits → Retry with backoff
- Invalid API key → 401 Unauthorized
- Model unavailable → Fallback to alternative
- Generation failure → Return error with details

