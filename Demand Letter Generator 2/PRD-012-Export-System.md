# PRD-012: Export System

## Overview
Implement document export functionality to convert demand letters to Word (.docx) and PDF formats while preserving formatting and styles.

## Goals
- Export documents to Word format
- Export documents to PDF format
- Preserve document formatting
- Maintain style consistency
- Support download and preview

## Export Formats

### Microsoft Word (.docx)
- Full formatting support
- Styles preserved
- Headers and footers
- Page breaks
- Lists and numbering

### PDF
- Print-ready format
- Consistent formatting
- Page breaks respected
- Professional appearance

## API Endpoints

### POST /api/export/word
**Request:**
```typescript
{
  documentId: string
  includeMetadata?: boolean  // Include case info header
}
```

**Response:**
- File download (application/vnd.openxmlformats-officedocument.wordprocessingml.document)
- Or JSON with download URL

### POST /api/export/pdf
**Request:**
```typescript
{
  documentId: string
  includeMetadata?: boolean
}
```

**Response:**
- File download (application/pdf)
- Or JSON with download URL

### GET /api/export/preview/:documentId
**Response:**
- HTML preview of document
- Styled for export appearance

## Implementation Details

### Word Export

#### Library: `docx`
```typescript
// lib/export/word.ts
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

export async function exportToWord(
  document: Document,
  sections: DocumentSection[]
): Promise<Buffer> {
  // Build Word document structure
  // Apply styles from metadata
  // Generate .docx file
  // Return buffer
}
```

#### Style Application
- Apply fonts from style metadata
- Set paragraph spacing
- Format headers
- Apply list styles
- Set margins

### PDF Export

#### Option 1: Puppeteer (HTML to PDF)
```typescript
// lib/export/pdf.ts
import puppeteer from 'puppeteer'

export async function exportToPDF(
  htmlContent: string
): Promise<Buffer> {
  // Convert HTML to PDF
  // Apply print styles
  // Generate PDF buffer
}
```

#### Option 2: @react-pdf/renderer
```typescript
// lib/export/pdf-react.ts
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

export function generatePDFDocument(
  document: Document,
  sections: DocumentSection[]
) {
  // Build PDF structure
  // Apply styles
  // Return PDF document
}
```

### Style Preservation

#### From Style Metadata
- Font family and size
- Paragraph spacing
- Header formatting
- List styles
- Alignment

#### From Document Content
- Bold, italic, underline
- Paragraph breaks
- Section breaks
- Page breaks

## Export Process Flow

1. Fetch document and sections
2. Fetch style metadata (if available)
3. Build document structure
4. Apply formatting
5. Generate file (Word or PDF)
6. Return file for download

## File Structure
```
lib/
  export/
    word.ts            # Word export logic
    pdf.ts             # PDF export logic
    styles.ts          # Style application
    formatter.ts       # Content formatting
app/
  api/
    export/
      word/
        route.ts
      pdf/
        route.ts
      preview/
        [documentId]/
          route.ts
components/
  export/
    ExportButton.tsx
    ExportMenu.tsx
```

## Dependencies
- **PRD-001**: Database & Data Models (Document, DocumentSection)
- **PRD-006**: Style & Tone Analysis (for style metadata)
- **PRD-009**: Document Management Core (for document retrieval)

## Deliverables
1. Word export module
2. PDF export module
3. Style application logic
4. Export API endpoints
5. Export button/menu component
6. Preview functionality

## Success Criteria
- Documents export to Word correctly
- Documents export to PDF correctly
- Formatting preserved in exports
- Styles applied correctly
- Files download successfully
- Export works for all section types

## Testing Requirements
- Unit tests for export functions
- Integration tests for export endpoints
- Test style preservation
- Test with various document structures

## Error Handling
- Invalid document ID → 404 Not Found
- Export failure → 500 with error details
- Missing sections → Warning or error
- Large documents → Handle memory limits

## Performance Considerations
- Large documents may take time
- Consider async export with status polling
- Stream large files if possible
- Cache generated exports (optional)

## UI Integration

### Export Button
- Located in document editor header
- Dropdown menu: "Export to Word", "Export to PDF"
- Shows loading state during export
- Triggers download on completion

### Export Options
- Include/exclude metadata
- Page size selection
- Margin settings (optional)

