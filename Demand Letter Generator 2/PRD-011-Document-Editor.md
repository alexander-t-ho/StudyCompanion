# PRD-011: Document Editor

## Overview
Build the document editor interface with section-based editing, inline editing capabilities, context menus, and real-time preview of the demand letter.

## Goals
- Display document with all sections
- Enable section-by-section generation
- Support inline editing of any content
- Provide context menus for section operations
- Show real-time preview
- Support re-generation of sections

## Editor Layout

### Document Header
- Document title (editable)
- Claim details (from Overview)
- Date and recipient information

### Section Display
Each section shows:
- Section title/heading
- Section content (editable)
- Generate/Re-generate button (if not generated)
- Context menu (three dots icon)
- Edit mode toggle

### Section Types
- Introduction
- Statement of Facts
- Liability
- Damages
- Medical/Injury Chronology
- Economic Damages
- Reasonableness and Necessity of Treatment
- Conclusion

## Context Menu Actions

### Available Actions
- **Edit section**: Enter edit mode
- **Add section before**: Insert new section above
- **Add section after**: Insert new section below
- **Add subsection**: Add nested section
- **Move section up**: Reorder sections
- **Move section down**: Reorder sections
- **Toggle numbering**: Enable/disable section numbering
- **Indent section**: Increase indentation
- **Outdent section**: Decrease indentation (disabled if at root)
- **Add page break**: Insert page break before section
- **Delete section**: Remove section

## Generation Controls

### Generate Button
- Appears for sections without content
- Starred/highlighted styling
- Click triggers AI generation
- Shows loading state during generation

### Re-generate Button
- Appears for generated sections
- Allows regeneration with variations
- Preserves section type and context

## Inline Editing

### Edit Mode
- Click on section content to edit
- Rich text editing (basic formatting)
- Save on blur or Ctrl+S
- Cancel with Escape

### Content Formatting
- Bold, italic, underline
- Paragraph breaks
- Lists (bulleted, numbered)
- Basic text styling

## Real-time Preview

### Preview Features
- Live update as content changes
- Formatted display matching export style
- Scroll synchronization (optional)
- Print preview styling

## API Integration

### Generate Section
```typescript
POST /api/generate
{
  documentId: string
  sectionType: string
  context: { ... }
}
```

### Update Section
```typescript
PUT /api/documents/:id/sections/:sectionId
{
  content: string
}
```

### Reorder Sections
```typescript
PUT /api/documents/:id/sections/reorder
{
  sectionIds: string[]
}
```

## File Structure
```
components/
  editor/
    DocumentEditor.tsx
    SectionEditor.tsx
    SectionHeader.tsx
    SectionContextMenu.tsx
    GenerateButton.tsx
    InlineEditor.tsx
    DocumentPreview.tsx
app/
  (dashboard)/
    documents/
      [id]/
        document/
          page.tsx  # Document tab page
```

## Dependencies
- **PRD-005**: AI Generation Engine (for generation)
- **PRD-009**: Document Management Core (for section updates)
- **PRD-010**: Overview Panel (for case context)

## Deliverables
1. DocumentEditor main component
2. SectionEditor component
3. SectionContextMenu component
4. GenerateButton component
5. InlineEditor component
6. DocumentPreview component
7. Section reordering functionality
8. Real-time preview

## Success Criteria
- Sections display correctly
- Generation works for each section
- Inline editing functions properly
- Context menu actions work
- Section reordering works
- Preview updates in real-time
- UI is responsive and intuitive

## Testing Requirements
- Unit tests for editor components
- Integration tests for generation flow
- E2E tests for editing workflow
- Test section operations

## UI/UX Considerations
- Clear visual hierarchy
- Intuitive editing controls
- Loading states for generation
- Error handling and feedback
- Keyboard shortcuts support
- Mobile-responsive design

## Keyboard Shortcuts
- `Ctrl+S` / `Cmd+S`: Save current section
- `Escape`: Cancel edit mode
- `Ctrl+Z` / `Cmd+Z`: Undo (if implemented)
- `Tab`: Indent section
- `Shift+Tab`: Outdent section

