# PRD-004: Template Management System

## Overview
Create a template management system that allows users to create, manage, and use pre-built demand letter templates with customizable content and metadata.

## Goals
- Provide pre-built templates for common demand letter types
- Enable template CRUD operations
- Store template style and tone metadata
- Support template selection during document creation

## Pre-built Templates

### 1. Standard Demand Letter
- Generic demand letter structure
- Sections: Introduction, Liability, Damages, Conclusion

### 2. Personal Injury Demand
- Personal injury specific sections
- Medical chronology section
- Treatment reasonableness section

### 3. UIM Demand Letter
- Underinsured motorist specific format
- Policy limit references
- Coverage analysis section

### 4. 3P Liability Demand
- Third-party liability format
- Negligence analysis section
- Comparative fault considerations

## Template Structure
Each template includes:
- **Name**: Template identifier
- **Content**: Base template structure (optional, can be empty)
- **Style Metadata**: Formatting preferences (fonts, spacing, headers)
- **Tone Metadata**: Writing tone descriptors
- **Sections**: Defined section types and order

## API Endpoints

### GET /api/templates
**Query Parameters:**
- `includeDefault?: boolean` - Include default templates

**Response:**
```typescript
{
  templates: Array<{
    id: string
    name: string
    isDefault: boolean
    createdAt: string
  }>
}
```

### GET /api/templates/:id
**Response:**
```typescript
{
  id: string
  name: string
  content: string | null
  styleMetadata: object | null
  toneMetadata: object | null
  isDefault: boolean
  sections: string[]  // Section types in order
  createdAt: string
  updatedAt: string
}
```

### POST /api/templates
**Request:**
```typescript
{
  name: string
  content?: string
  styleMetadata?: object
  toneMetadata?: object
  sections?: string[]
}
```

**Response:**
```typescript
{
  success: boolean
  template?: Template
  error?: string
}
```

### PUT /api/templates/:id
**Request:** Same as POST

**Response:** Same as POST

### DELETE /api/templates/:id
**Response:**
```typescript
{
  success: boolean
  error?: string
}
```

## Template Metadata Structure

### Style Metadata
```typescript
{
  fonts: {
    heading: string
    body: string
  }
  spacing: {
    paragraph: number
    section: number
  }
  headers: {
    style: 'bold' | 'underline' | 'both'
    size: number
  }
  lists: {
    style: 'bullet' | 'numbered'
  }
}
```

### Tone Metadata
```typescript
{
  formality: 'formal' | 'professional' | 'assertive'
  tone: string[]  // Array of tone descriptors
  voice: string   // Overall voice description
}
```

## Initialization
On first deployment, seed database with pre-built templates:
- Standard Demand Letter
- Personal Injury Demand
- UIM Demand Letter
- 3P Liability Demand

## File Structure
```
lib/
  templates/
    service.ts        # Template CRUD operations
    seed.ts           # Seed pre-built templates
    types.ts          # Template type definitions
app/
  api/
    templates/
      route.ts        # GET, POST
      [id]/
        route.ts      # GET, PUT, DELETE
components/
  templates/
    TemplateSelector.tsx
    TemplateManager.tsx
```

## Dependencies
- **PRD-001**: Database & Data Models (Template model)

## Deliverables
1. Template service module
2. Template CRUD API endpoints
3. Pre-built template seed data
4. Template selector component
5. Template management UI (optional for POC)

## Success Criteria
- Pre-built templates available on first load
- Templates can be created, read, updated, deleted
- Template metadata stored and retrieved correctly
- Template selection works in document creation flow

## Testing Requirements
- Unit tests for template service
- Integration tests for CRUD operations
- Test template seeding

