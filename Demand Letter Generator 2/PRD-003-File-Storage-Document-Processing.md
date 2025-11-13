# PRD-003: File Storage & Document Processing

## Overview
Implement file upload, storage, and document processing system using AWS S3 for storage and text extraction from PDF/DOCX files.

## Goals
- Upload files to AWS S3 with `alexho-` prefix
- Extract text content from PDF and DOCX files
- Store document metadata in database
- Provide API endpoints for file operations

## Storage Configuration
- **Service**: AWS S3
- **Bucket Prefix**: `alexho-` (all resources)
- **Region**: Configurable via environment variable
- **Access**: Private bucket with presigned URLs for downloads

## Supported File Types
- PDF (`.pdf`)
- Microsoft Word (`.docx`)

## API Endpoints

### POST /api/upload
**Request:** Multipart form data
```typescript
{
  file: File
  documentId?: string  // Optional: associate with existing document
}
```

**Response:**
```typescript
{
  success: boolean
  sourceDocument?: {
    id: string
    filename: string
    s3Key: string
    fileType: string
    extractedText?: string
  }
  error?: string
}
```

### GET /api/documents/:documentId/sources/:sourceId/content
**Response:**
```typescript
{
  text: string
  metadata: {
    filename: string
    fileType: string
    wordCount: number
    pageCount?: number  // For PDFs
  }
}
```

### GET /api/documents/:documentId/sources/:sourceId/download
**Response:** Presigned S3 URL (redirect or JSON with URL)

## Implementation Details

### File Upload Flow
1. Receive file via multipart form upload
2. Validate file type (PDF or DOCX)
3. Generate unique S3 key: `alexho-{timestamp}-{random}-{filename}`
4. Upload to S3
5. Extract text content
6. Store metadata in `source_documents` table
7. Return source document ID

### Text Extraction

#### PDF Processing
- **Library**: `pdf-parse`
- Extract all text content
- Preserve basic structure (paragraphs)
- Extract metadata (page count, title, author)

#### DOCX Processing
- **Library**: `mammoth`
- Convert to HTML first, then extract text
- Preserve paragraph structure
- Extract metadata (word count, author)

### S3 Configuration
```typescript
// lib/aws/s3.ts
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET
const PREFIX = 'alexho-'
```

### File Size Limits
- **Max file size**: 50MB
- **Validation**: Check before upload

## File Structure
```
lib/
  aws/
    s3.ts              # S3 client and utilities
    upload.ts          # Upload handlers
  parsers/
    pdf.ts             # PDF text extraction
    docx.ts            # DOCX text extraction
    index.ts           # Unified parser interface
app/
  api/
    upload/
      route.ts
    documents/
      [documentId]/
        sources/
          [sourceId]/
            content/
              route.ts
            download/
              route.ts
```

## Dependencies
- **PRD-001**: Database & Data Models (SourceDocument model)

## Environment Variables
```
AWS_ACCESS_KEY_ID=<aws-access-key>
AWS_SECRET_ACCESS_KEY=<aws-secret-key>
AWS_REGION=us-east-1
AWS_S3_BUCKET=<bucket-name>
```

## Deliverables
1. AWS S3 client configuration
2. File upload handler
3. PDF text extraction module
4. DOCX text extraction module
5. Upload API endpoint
6. Content retrieval API endpoint
7. Download URL generation

## Success Criteria
- Files upload successfully to S3 with `alexho-` prefix
- Text extracted correctly from PDF files
- Text extracted correctly from DOCX files
- Metadata stored in database
- Content retrieval works via API
- File size validation prevents oversized uploads

## Testing Requirements
- Unit tests for text extraction
- Integration tests for S3 upload
- E2E tests for upload flow
- Test with various PDF/DOCX formats

## Error Handling
- Invalid file type → 400 Bad Request
- File too large → 413 Payload Too Large
- S3 upload failure → 500 Internal Server Error
- Extraction failure → 500 with error details

