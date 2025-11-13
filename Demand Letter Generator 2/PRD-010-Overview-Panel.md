# PRD-010: Overview Panel

## Overview
Build the Overview panel UI component that allows users to input case information and select data sources (medical providers, transcriptions, etc.) for demand letter generation.

## Goals
- Provide intuitive interface for case data input
- Enable selection of medical providers
- Enable selection of transcriptions
- Support other data selection interfaces
- Update document metadata

## Panel Structure

### Case Information Section
Input fields for:
- Claim Number
- Your Insured
- Date of Loss
- Our Client
- Adjuster Name (optional)
- Date of Letter (optional)

### Data Selection Sections

#### Medical Providers
- Display count of available providers
- "Select Medical" button opens modal
- Show selected provider count
- Link to provider selection modal (PRD-007)

#### Deposition Materials
- Display available transcriptions
- "Select Depositions" button
- Show selected transcription count
- Link to transcription selector

#### Expert Reports
- Upload/select expert reports
- "Select Reports" button
- Show selected report count

#### Submission Details
- Text area for additional submission information
- Free-form notes

#### Strategic Positioning
- Text area for strategic notes
- Case strategy input

## UI Components

### OverviewPanel Component
```typescript
interface OverviewPanelProps {
  documentId: string
  onUpdate?: (metadata: DocumentMetadata) => void
}
```

### CaseInfoForm Component
- Form with labeled inputs
- Date picker for Date of Loss
- Validation for required fields

### DataSelector Component
- Reusable component for data selection
- Shows count and "Select" button
- Opens appropriate modal

## API Integration

### Update Document Metadata
```typescript
PUT /api/documents/:id
{
  metadata: {
    caseInfo: { ... },
    selectedProviders: [...],
    selectedTranscriptions: [...],
    submissionDetails: "...",
    strategicPositioning: "..."
  }
}
```

### Get Available Data
```typescript
GET /api/documents/:id/available-data
{
  providers: MedicalProvider[],
  transcriptions: Transcription[],
  expertReports: SourceDocument[]
}
```

## Modal Integrations

### Medical Provider Modal
- Opens from "Select Medical" button
- Uses MedicalProviderModal component (PRD-007)
- Updates selected providers on "Update"

### Transcription Selector Modal
- Opens from "Select Depositions" button
- Shows list of transcriptions
- Multi-select checkboxes
- Update/Cancel buttons

### Expert Report Selector
- Opens from "Select Reports" button
- Shows uploaded source documents
- Filter by document type
- Multi-select interface

## File Structure
```
components/
  overview/
    OverviewPanel.tsx
    CaseInfoForm.tsx
    DataSelector.tsx
    SubmissionDetails.tsx
    StrategicPositioning.tsx
app/
  (dashboard)/
    documents/
      [id]/
        overview/
          page.tsx  # Overview tab page
```

## Dependencies
- **PRD-007**: Medical Data Processing (MedicalProviderModal)
- **PRD-008**: Media Transcription (TranscriptionSelector)
- **PRD-009**: Document Management Core (metadata updates)

## Deliverables
1. OverviewPanel main component
2. CaseInfoForm component
3. DataSelector reusable component
4. SubmissionDetails component
5. StrategicPositioning component
6. Integration with selection modals
7. API integration for metadata updates

## Success Criteria
- Case information can be entered and saved
- Medical provider selection works
- Transcription selection works
- Expert report selection works
- All data persists to document metadata
- UI is intuitive and user-friendly

## Testing Requirements
- Unit tests for form components
- Integration tests for data selection
- E2E tests for overview panel flow

## UI/UX Considerations
- Clear section headers
- Visual separation between sections
- Save indicators
- Validation feedback
- Loading states during data fetch

