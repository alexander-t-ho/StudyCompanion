# PRD-013: Dashboard & Navigation

## Overview
Create the main dashboard interface with document list, document creation flow, and navigation structure for the Demand Letter Generator application.

## Goals
- Display list of user's documents
- Provide document creation interface
- Enable document management (view, delete)
- Create intuitive navigation structure
- Support document search and filtering

## Dashboard Layout

### Header
- Application logo/title: "DemandsAI"
- User menu (logout)
- Navigation tabs (if needed)

### Main Content Area

#### Document Generation Section
- Filename input field
  - Label: "Filename"
  - Placeholder: "Demand letter name"
  - Character counter: "X/250"
  - File extension display: ".vine"
- Template selector dropdown
- "Generate" button (prominent, teal color)

#### Generated Documents Section
- Section title: "Generated Documents (X)"
- "show all" link (if paginated)
- Date Generated column header
- Document list table

### Document List Item
Each item displays:
- Document name (link to open)
- "Setup" button (gray)
- Date generated

## Document Creation Flow

### Step 1: Create Document
1. User enters filename
2. User selects template (optional)
3. User clicks "Generate"
4. Document created with status "draft"
5. Redirect to document editor

### Step 2: Overview Tab
1. User enters case information
2. User selects medical providers
3. User selects other data sources
4. User saves metadata

### Step 3: Document Tab
1. User generates sections
2. User edits content
3. User exports document

## Navigation Structure

### Routes
```
/ (or /dashboard)
  - Main dashboard with document list

/login
  - Authentication page

/documents/new
  - Create new document (optional separate page)

/documents/[id]
  - Document editor
  - Tabs: Overview | Document

/documents/[id]/overview
  - Overview panel (tab view)

/documents/[id]/document
  - Document editor (tab view)
```

### Navigation Components
- Sidebar navigation (optional)
- Breadcrumbs
- Tab navigation within document editor

## API Integration

### Get Documents
```typescript
GET /api/documents?limit=10&offset=0
```

### Create Document
```typescript
POST /api/documents
{
  filename: string
  templateId?: string
}
```

### Delete Document
```typescript
DELETE /api/documents/:id
```

## File Structure
```
app/
  (auth)/
    login/
      page.tsx
  (dashboard)/
    page.tsx              # Main dashboard
    layout.tsx            # Dashboard layout
    documents/
      new/
        page.tsx          # Create document (optional)
      [id]/
        page.tsx          # Document editor (with tabs)
        layout.tsx        # Document layout
components/
  dashboard/
    DocumentList.tsx
    DocumentItem.tsx
    CreateDocumentForm.tsx
    TemplateSelector.tsx
  layout/
    Header.tsx
    Sidebar.tsx
    Navigation.tsx
```

## Dependencies
- **PRD-002**: Authentication (for protected routes)
- **PRD-004**: Template Management (for template selector)
- **PRD-009**: Document Management Core (for document operations)
- **PRD-010**: Overview Panel (for overview tab)
- **PRD-011**: Document Editor (for document tab)

## Deliverables
1. Main dashboard page
2. Document list component
3. Document item component
4. Create document form
5. Navigation components
6. Layout components
7. Routing structure

## Success Criteria
- Dashboard displays user's documents
- Documents can be created successfully
- Documents can be opened and edited
- Documents can be deleted
- Navigation is intuitive
- UI matches design requirements
- Responsive design works

## Testing Requirements
- Unit tests for dashboard components
- Integration tests for document list
- E2E tests for document creation flow
- Test navigation and routing

## UI/UX Considerations

### Design Elements
- Teal color for primary actions
- Gray for secondary actions
- Clean, professional layout
- Clear visual hierarchy
- Consistent spacing

### User Experience
- Clear call-to-action for document creation
- Easy document access
- Quick document identification
- Intuitive navigation
- Loading states
- Error handling

### Responsive Design
- Mobile-friendly layout
- Tablet optimization
- Desktop full-featured view

## Features

### Document List
- Sort by date (newest first)
- Pagination (if many documents)
- Search/filter (optional for POC)
- Status indicators

### Document Actions
- View/Edit (click document name)
- Setup (opens overview)
- Delete (with confirmation)
- Export (from document editor)

## Error States
- No documents: Show empty state with CTA
- Loading: Show skeleton or spinner
- Error: Show error message with retry

