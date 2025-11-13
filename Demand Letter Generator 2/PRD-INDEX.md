# Demand Letter Generator POC - PRD Index

## Overview
This document provides an index and overview of all Product Requirements Documents (PRDs) for the Demand Letter Generator POC project. The PRDs are organized into phases to enable parallel development.

## PRD Structure

### Phase 1: Foundation Infrastructure
These PRDs can be built in parallel as they form the foundation of the system.

1. **[PRD-001: Database & Data Models](./PRD-001-Database-Data-Models.md)**
   - Database schema design
   - Prisma setup and migrations
   - Data models for all entities
   - **Dependencies**: None
   - **Status**: Foundation

2. **[PRD-002: Authentication & Authorization](./PRD-002-Authentication-Authorization.md)**
   - Simple email/password auth (password: `123456`)
   - JWT session management
   - Protected routes
   - **Dependencies**: PRD-001
   - **Status**: Foundation

3. **[PRD-003: File Storage & Document Processing](./PRD-003-File-Storage-Document-Processing.md)**
   - AWS S3 integration (alexho- prefix)
   - PDF/DOCX upload and text extraction
   - **Dependencies**: PRD-001
   - **Status**: Foundation

### Phase 2: Core Feature Modules
These PRDs can be built in parallel after Phase 1 is complete.

4. **[PRD-004: Template Management System](./PRD-004-Template-Management-System.md)**
   - Template CRUD operations
   - Pre-built templates (Standard, PI, UIM, 3P Liability)
   - **Dependencies**: PRD-001
   - **Status**: Core Feature

5. **[PRD-005: AI Generation Engine](./PRD-005-AI-Generation-Engine.md)**
   - OpenRouter API integration
   - Streaming generation support
   - Prompt engineering
   - **Dependencies**: PRD-001
   - **Status**: Core Feature

6. **[PRD-006: Style & Tone Analysis](./PRD-006-Style-Tone-Analysis.md)**
   - Document style extraction
   - AI-powered tone analysis
   - Firm style learning
   - **Dependencies**: PRD-001, PRD-003, PRD-005
   - **Status**: Core Feature

7. **[PRD-007: Medical Data Processing](./PRD-007-Medical-Data-Processing.md)**
   - Medical records extraction
   - Medical chronology generation
   - Provider selection interface
   - **Dependencies**: PRD-001, PRD-003, PRD-005
   - **Status**: Specialized Feature

8. **[PRD-008: Media Transcription](./PRD-008-Media-Transcription.md)**
   - Video/audio upload
   - Transcription service integration
   - Transcript storage
   - **Dependencies**: PRD-001, PRD-003, PRD-005
   - **Status**: Specialized Feature

### Phase 3: Integration & UI
These PRDs are built after Phase 2 modules are complete.

9. **[PRD-009: Document Management Core](./PRD-009-Document-Management-Core.md)**
   - Document CRUD operations
   - Section management
   - Document state tracking
   - **Dependencies**: PRD-001, PRD-002
   - **Status**: Integration

10. **[PRD-010: Overview Panel](./PRD-010-Overview-Panel.md)**
    - Case information input
    - Data selection interfaces
    - Medical provider selection modal
    - **Dependencies**: PRD-007, PRD-008, PRD-009
    - **Status**: UI Component

11. **[PRD-011: Document Editor](./PRD-011-Document-Editor.md)**
    - Section-based editor
    - Inline editing
    - Context menus
    - Real-time preview
    - **Dependencies**: PRD-005, PRD-009, PRD-010
    - **Status**: UI Component

12. **[PRD-012: Export System](./PRD-012-Export-System.md)**
    - Word (.docx) export
    - PDF export
    - Style preservation
    - **Dependencies**: PRD-001, PRD-006, PRD-009
    - **Status**: Integration

13. **[PRD-013: Dashboard & Navigation](./PRD-013-Dashboard-Navigation.md)**
    - Main dashboard UI
    - Document list
    - Document creation flow
    - Navigation structure
    - **Dependencies**: PRD-002, PRD-004, PRD-009, PRD-010, PRD-011
    - **Status**: UI Component

## Development Strategy

### Parallel Development Teams

**Team 1 (Infrastructure)** - Can work in parallel:
- PRD-001: Database & Data Models
- PRD-002: Authentication (after PRD-001)
- PRD-003: File Storage (after PRD-001)

**Team 2 (Core Features)** - Can work in parallel after Phase 1:
- PRD-004: Template Management
- PRD-005: AI Generation Engine
- PRD-006: Style & Tone Analysis (after PRD-005)

**Team 3 (Specialized Features)** - Can work in parallel after Phase 1:
- PRD-007: Medical Data Processing
- PRD-008: Media Transcription

**Team 4 (Integration & UI)** - After Phase 2:
- PRD-009: Document Management Core
- PRD-010: Overview Panel (after PRD-009)
- PRD-011: Document Editor (after PRD-009, PRD-010)
- PRD-012: Export System (after PRD-009)
- PRD-013: Dashboard (after all above)

## API Contract Points

### Between PRDs
- **PRD-001 → All**: Database models and client
- **PRD-002 → PRD-009, PRD-013**: Auth middleware and user context
- **PRD-003 → PRD-006, PRD-007, PRD-008**: File access and text extraction
- **PRD-004 → PRD-009, PRD-013**: Template selection
- **PRD-005 → PRD-006, PRD-007, PRD-011**: AI generation endpoints
- **PRD-006 → PRD-005, PRD-012**: Style/tone metadata
- **PRD-007 → PRD-010, PRD-011**: Medical provider data
- **PRD-008 → PRD-010, PRD-011**: Transcription data
- **PRD-009 → PRD-010, PRD-011, PRD-012, PRD-013**: Document operations

## Technology Stack Summary

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Prisma ORM)
- **Storage**: AWS S3 (alexho- prefix)
- **AI**: OpenRouter API (thinking models)
- **Auth**: JWT (hardcoded password: `123456`)
- **Deployment**: Vercel

## Key Features Summary

1. **Document Management**: Create, edit, manage demand letters
2. **AI Generation**: Generate sections using AI with style/tone matching
3. **Template System**: Pre-built and custom templates
4. **Medical Processing**: Extract and process medical records
5. **Media Transcription**: Transcribe video/audio for case context
6. **Style Matching**: Copy formatting from uploaded documents
7. **Tone Matching**: Match writing tone from firm documents
8. **Export**: Word and PDF export with style preservation

## Getting Started

1. Review Phase 1 PRDs (001-003) to understand foundation
2. Set up development environment
3. Begin with PRD-001 (Database)
4. Proceed with parallel development based on team assignments
5. Follow dependency chain for integration

## Notes

- All test passwords: `123456`
- AWS resources use `alexho-` prefix
- This is a POC - some features may be simplified
- Focus on core functionality first, polish later

