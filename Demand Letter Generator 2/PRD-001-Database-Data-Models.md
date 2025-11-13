# PRD-001: Database & Data Models

## Overview
Design and implement the database schema and data models for the Demand Letter Generator POC. This PRD establishes the foundation for all data persistence requirements.

## Goals
- Define complete database schema using Prisma
- Establish data relationships and constraints
- Create migration system for schema versioning
- Provide type-safe database client interface

## Database Technology
- **Database**: PostgreSQL (Vercel Postgres or Supabase)
- **ORM**: Prisma
- **Migration Tool**: Prisma Migrate

## Schema Design

### Users Table
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String    @map("password_hash")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  
  documents     Document[]
  
  @@map("users")
}
```

### Templates Table
```prisma
model Template {
  id            String    @id @default(cuid())
  name          String
  content       String?   @db.Text
  styleMetadata Json?     @map("style_metadata")
  toneMetadata  Json?     @map("tone_metadata")
  isDefault     Boolean   @default(false) @map("is_default")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  
  documents     Document[]
  
  @@map("templates")
}
```

### Documents Table
```prisma
model Document {
  id            String    @id @default(cuid())
  userId        String    @map("user_id")
  templateId    String?   @map("template_id")
  filename      String
  status        String    @default("draft") // draft, generating, completed
  metadata      Json?
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  template      Template? @relation(fields: [templateId], references: [id])
  sections      DocumentSection[]
  sourceDocs    SourceDocument[]
  medicalProviders MedicalProvider[]
  generationHistory GenerationHistory[]
  
  @@map("documents")
}
```

### Document Sections Table
```prisma
model DocumentSection {
  id            String    @id @default(cuid())
  documentId    String    @map("document_id")
  sectionType   String    @map("section_type") // introduction, liability, damages, etc.
  content       String    @db.Text
  order         Int
  isGenerated   Boolean   @default(false) @map("is_generated")
  metadata      Json?
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  
  document      Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  @@unique([documentId, sectionType])
  @@map("document_sections")
}
```

### Source Documents Table
```prisma
model SourceDocument {
  id            String    @id @default(cuid())
  documentId    String    @map("document_id")
  filename      String
  s3Key         String    @map("s3_key")
  fileType      String    @map("file_type") // pdf, docx
  extractedText String?   @db.Text @map("extracted_text")
  metadata      Json?
  createdAt     DateTime  @default(now()) @map("created_at")
  
  document      Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  @@map("source_documents")
}
```

### Medical Providers Table
```prisma
model MedicalProvider {
  id            String    @id @default(cuid())
  documentId    String    @map("document_id")
  providerName  String    @map("provider_name")
  amount        Decimal?  @db.Decimal(10, 2)
  chronology    String?   @db.Text
  summary       String?   @db.Text
  isSelected    Boolean   @default(false) @map("is_selected")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  
  document      Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  @@map("medical_providers")
}
```

### Generation History Table
```prisma
model GenerationHistory {
  id            String    @id @default(cuid())
  documentId    String    @map("document_id")
  sectionType   String    @map("section_type")
  promptUsed    String    @db.Text @map("prompt_used")
  modelUsed     String    @map("model_used")
  responseTime  Int?      @map("response_time") // milliseconds
  createdAt     DateTime  @default(now()) @map("created_at")
  
  document      Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  @@map("generation_history")
}
```

## API Interface

### Database Client
```typescript
// lib/db/client.ts
export const prisma = new PrismaClient()
```

### Common Queries
- User by email
- Documents by user
- Document with sections
- Template by ID
- Medical providers by document

## Dependencies
- None (Foundation PRD)

## Deliverables
1. Prisma schema file (`prisma/schema.prisma`)
2. Database client module (`lib/db/client.ts`)
3. Initial migration script
4. Type definitions exported from Prisma
5. Database connection configuration

## Success Criteria
- All tables created successfully
- Relationships properly defined
- Migrations run without errors
- Type-safe database client available
- All CRUD operations functional

## Testing Requirements
- Unit tests for database client
- Integration tests for migrations
- Data integrity tests for relationships

