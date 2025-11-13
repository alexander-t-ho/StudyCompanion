# PRD-009: Document Management Core

## Overview
Implement core document management functionality including CRUD operations, document state management, and section management for demand letters.

## Goals
- Create, read, update, delete documents
- Manage document sections
- Track document status
- Provide document metadata management

## Document States
- `draft`: Initial creation, not yet generated
- `generating`: AI generation in progress
- `completed`: All sections generated
- `archived`: Document archived (optional)

## API Endpoints

### GET /api/documents
**Query Parameters:**
- `userId?: string` - Filter by user (from auth)
- `status?: string` - Filter by status
- `limit?: number` - Pagination limit
- `offset?: number` - Pagination offset

**Response:**
```typescript
{
  documents: Array<{
    id: string
    filename: string
    status: string
    templateId: string | null
    createdAt: string
    updatedAt: string
  }>
  total: number
}
```

### GET /api/documents/:id
**Response:**
```typescript
{
  id: string
  filename: string
  status: string
  templateId: string | null
  template?: Template
  metadata: object
  sections: Array<{
    id: string
    sectionType: string
    content: string
    order: number
    isGenerated: boolean
    createdAt: string
    updatedAt: string
  }>
  createdAt: string
  updatedAt: string
}
```

### POST /api/documents
**Request:**
```typescript
{
  filename: string
  templateId?: string
  metadata?: object
}
```

**Response:**
```typescript
{
  success: boolean
  document?: Document
  error?: string
}
```

### PUT /api/documents/:id
**Request:**
```typescript
{
  filename?: string
  status?: string
  metadata?: object
}
```

**Response:**
```typescript
{
  success: boolean
  document?: Document
  error?: string
}
```

### DELETE /api/documents/:id
**Response:**
```typescript
{
  success: boolean
  error?: string
}
```

## Section Management

### POST /api/documents/:id/sections
**Request:**
```typescript
{
  sectionType: string
  content: string
  order?: number
  isGenerated?: boolean
}
```

**Response:**
```typescript
{
  success: boolean
  section?: DocumentSection
  error?: string
}
```

### PUT /api/documents/:id/sections/:sectionId
**Request:**
```typescript
{
  content?: string
  order?: number
  isGenerated?: boolean
}
```

**Response:**
```typescript
{
  success: boolean
  section?: DocumentSection
  error?: string
}
```

### DELETE /api/documents/:id/sections/:sectionId
**Response:**
```typescript
{
  success: boolean
  error?: string
}
```

### PUT /api/documents/:id/sections/reorder
**Request:**
```typescript
{
  sectionIds: string[]  // Ordered array of section IDs
}
```

**Response:**
```typescript
{
  success: boolean
  error?: string
}
```

## Document Metadata

### Metadata Structure
```typescript
{
  caseInfo?: {
    claimNumber?: string
    insured?: string
    dateOfLoss?: string
    client?: string
    adjuster?: string
  }
  selectedProviders?: string[]
  selectedTranscriptions?: string[]
  styleSettings?: {
    copyStyle?: boolean
    matchTone?: boolean
  }
  generationSettings?: {
    model?: string
    temperature?: number
  }
}
```

## Implementation Details

### Document Service
```typescript
// lib/documents/service.ts
export class DocumentService {
  async createDocument(data: CreateDocumentInput): Promise<Document>
  async getDocument(id: string): Promise<Document | null>
  async updateDocument(id: string, data: UpdateDocumentInput): Promise<Document>
  async deleteDocument(id: string): Promise<boolean>
  async listDocuments(filters: DocumentFilters): Promise<Document[]>
}
```

### Section Service
```typescript
// lib/documents/sections.ts
export class SectionService {
  async addSection(documentId: string, section: SectionInput): Promise<DocumentSection>
  async updateSection(sectionId: string, updates: SectionUpdate): Promise<DocumentSection>
  async deleteSection(sectionId: string): Promise<boolean>
  async reorderSections(documentId: string, sectionIds: string[]): Promise<boolean>
}
```

## File Structure
```
lib/
  documents/
    service.ts         # Document CRUD operations
    sections.ts        # Section management
    types.ts           # Document types
app/
  api/
    documents/
      route.ts         # GET, POST
      [id]/
        route.ts       # GET, PUT, DELETE
        sections/
          route.ts     # POST
          reorder/
            route.ts   # PUT
          [sectionId]/
            route.ts   # PUT, DELETE
```

## Dependencies
- **PRD-001**: Database & Data Models (Document, DocumentSection models)
- **PRD-002**: Authentication (for user context)

## Deliverables
1. Document service module
2. Section service module
3. Document CRUD API endpoints
4. Section management API endpoints
5. Document metadata management
6. Status tracking

## Success Criteria
- Documents can be created, read, updated, deleted
- Sections can be managed independently
- Document status tracked correctly
- Metadata stored and retrieved
- User isolation (users only see their documents)

## Testing Requirements
- Unit tests for document service
- Unit tests for section service
- Integration tests for API endpoints
- Test user isolation

## Error Handling
- Invalid document ID → 404 Not Found
- Unauthorized access → 403 Forbidden
- Validation errors → 400 Bad Request
- Database errors → 500 Internal Server Error

