# PRD-008: Media Transcription

## Overview
Implement video and audio file upload and transcription system to extract text content from media files for use in demand letter generation.

## Goals
- Upload video and audio files to S3
- Transcribe media content using AI services
- Store transcripts for document generation context
- Support multiple media formats

## Supported Media Formats
- **Video**: MP4, MOV, AVI, WebM
- **Audio**: MP3, WAV, M4A, OGG

## Transcription Service
- **Primary**: OpenAI Whisper API (via OpenRouter)
- **Alternative**: AWS Transcribe (if needed)
- **Model**: `openai/whisper-1` or similar

## API Endpoints

### POST /api/transcribe/upload
**Request:** Multipart form data
```typescript
{
  file: File  // Video or audio file
  documentId: string
  metadata?: {
    title?: string
    description?: string
  }
}
```

**Response:**
```typescript
{
  success: boolean
  transcription?: {
    id: string
    filename: string
    s3Key: string
    transcript: string
    duration?: number  // seconds
    wordCount: number
    status: 'processing' | 'completed' | 'failed'
  }
  error?: string
}
```

### POST /api/transcribe
**Request:**
```typescript
{
  s3Key: string  // Already uploaded file
  documentId: string
}
```

**Response:**
```typescript
{
  success: boolean
  transcription?: {
    id: string
    transcript: string
    duration?: number
    wordCount: number
  }
  error?: string
}
```

### GET /api/transcribe/:transcriptionId
**Response:**
```typescript
{
  id: string
  filename: string
  transcript: string
  duration?: number
  wordCount: number
  status: string
  createdAt: string
}
```

### GET /api/documents/:documentId/transcriptions
**Response:**
```typescript
{
  transcriptions: Array<{
    id: string
    filename: string
    transcript: string
    duration?: number
    wordCount: number
    createdAt: string
  }>
}
```

## Transcription Process

### Flow
1. User uploads video/audio file
2. File stored in S3 with `alexho-` prefix
3. File sent to transcription service
4. Transcript extracted and stored
5. Status updated to 'completed'
6. Transcript available for document generation

### Async Processing
- Large files may take time to process
- Use status field to track progress
- Webhook or polling for completion (POC: polling)

## Database Schema Addition

### Transcriptions Table
```prisma
model Transcription {
  id            String    @id @default(cuid())
  documentId    String    @map("document_id")
  filename      String
  s3Key         String    @map("s3_key")
  transcript    String    @db.Text
  duration      Int?      // seconds
  wordCount     Int       @map("word_count")
  status        String    @default("processing")
  metadata      Json?
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  
  document      Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  @@map("transcriptions")
}
```

### Update Document Model
Add relation to Document model:
```prisma
transcriptions Transcription[]
```

## Integration with Document Generation

### Context Usage
When generating document sections:
- Include relevant transcript excerpts
- Reference key testimony or statements
- Use for Statement of Facts section
- Use for deposition summaries

### Transcript Selection
- User can select which transcriptions to include
- Similar to medical provider selection
- Add to document generation context

## Implementation Details

### Transcription Service
```typescript
// lib/transcription/service.ts
export async function transcribeMedia(
  s3Key: string,
  fileType: string
): Promise<TranscriptionResult> {
  // Call OpenRouter Whisper API or AWS Transcribe
  // Process response
  // Return transcript
}
```

### File Validation
- Check file type
- Validate file size (max 100MB for POC)
- Verify format support

## File Structure
```
lib/
  transcription/
    service.ts         # Transcription service
    whisper.ts         # Whisper API integration
    types.ts           # Transcription types
app/
  api/
    transcribe/
      upload/
        route.ts
      route.ts         # POST /api/transcribe
      [transcriptionId]/
        route.ts       # GET
    documents/
      [documentId]/
        transcriptions/
          route.ts     # GET
components/
  transcription/
    MediaUploader.tsx
    TranscriptionView.tsx
    TranscriptSelector.tsx
```

## Dependencies
- **PRD-001**: Database & Data Models (Transcription model addition)
- **PRD-003**: File Storage (S3 upload)
- **PRD-005**: AI Generation Engine (for transcription API)

## Environment Variables
```
OPENROUTER_API_KEY=<api-key>  # For Whisper
# OR
AWS_TRANSCRIBE_REGION=us-east-1  # If using AWS Transcribe
```

## Deliverables
1. Media upload handler
2. Transcription service integration
3. Transcription API endpoints
4. Database schema updates
5. Media uploader component
6. Transcription viewer component
7. Transcript selector for document generation

## Success Criteria
- Video/audio files upload successfully
- Transcripts generated accurately
- Transcripts stored and retrievable
- Transcripts can be used in document generation
- Status tracking works correctly

## Testing Requirements
- Unit tests for transcription service
- Integration tests for upload and transcription
- Test with various media formats
- Test async processing

## Error Handling
- Unsupported file type → 400 Bad Request
- File too large → 413 Payload Too Large
- Transcription failure → 500 with error details
- Invalid document ID → 404 Not Found

## Limitations (POC)
- File size limit: 100MB
- Processing may be synchronous (no background jobs)
- Limited format support
- No video preview/playback

