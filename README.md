# AI Study Companion

A persistent AI companion that extends learning beyond tutoring sessions by remembering previous lessons, providing adaptive practice, answering questions conversationally, and intelligently routing students back to human tutors when needed.

## Project Structure

- `backend/` - Rails API backend
- `frontend/` - React frontend application
- `PRD*.md` - Product Requirements Documents

## Quick Start

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
bundle install
```

3. Set up database:
```bash
rails db:create
rails db:migrate
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

5. Start the server:
```bash
rails server
```

The API will be available at http://localhost:3000

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at http://localhost:3001

## Current Phase

**Phase 1: Transcript Generation System**

- Generate realistic tutor-student conversation transcripts using GPT models
- Simple frontend UI for transcript evaluation and validation
- API endpoints for transcript generation and management

## Documentation

See the PRD documents for complete requirements:
- **[PRD.md](./PRD.md)** - Complete Product Requirements Document
- **[PRD-Index.md](./PRD-Index.md)** - Index of all sub-PRDs
- **[features-and-tech-stack-plan.plan.md](./features-and-tech-stack-plan.plan.md)** - Implementation plan

## Environment Variables

### Backend (.env)
- `OPENAI_API_KEY` - OpenAI API key (required)
- `OPENROUTER_API_KEY` - OpenRouter API key (optional)
- `USE_OPENROUTER` - Set to 'true' to use OpenRouter instead of OpenAI
- `DATABASE_USER` - PostgreSQL username
- `DATABASE_PASSWORD` - PostgreSQL password
- `DATABASE_HOST` - PostgreSQL host
