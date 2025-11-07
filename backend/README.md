# Study Companion Backend

Rails API backend for the AI Study Companion application.

## Setup

1. Install dependencies:
```bash
bundle install
```

2. Set up database:
```bash
rails db:create
rails db:migrate
rails db:seed  # Creates test student
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Start Redis (required for background jobs):
```bash
redis-server
```

5. Start Sidekiq (in separate terminal):
```bash
bundle exec sidekiq
```

6. Start the server:
```bash
rails server
```

## API Endpoints

### Transcripts (Phase 1 & 2)
- `GET /api/v1/transcripts` - List all transcripts
- `GET /api/v1/transcripts/:id` - Get a specific transcript
- `POST /api/v1/transcripts` - Generate a new transcript
- `POST /api/v1/transcripts/:id/validate` - Validate/approve a transcript
- `POST /api/v1/transcripts/:id/analyze` - Analyze a transcript

### Session Summaries
- `POST /api/v1/session-summaries/create-from-transcript` - Create session summary from transcript

### AI Companion (Platform Integration - Stubs)
- `POST /api/v1/ai_companion/chat` - Send chat message (stub)
- `GET /api/v1/ai_companion/conversation-history` - Get conversation history
- `POST /api/v1/ai_companion/practice/generate` - Generate practice (stub)
- `GET /api/v1/ai_companion/practice/list` - List practice problems
- `GET /api/v1/ai_companion/profile` - Get AI companion profile
- `PATCH /api/v1/ai_companion/profile` - Update profile
- `GET /api/v1/ai_companion/session-summaries` - List session summaries

### Retention (Platform Integration - Stubs)
- `GET /api/v1/retention/goal-suggestions/:goal_id` - Get goal suggestions
- `GET /api/v1/retention/progress-dashboard` - Get progress dashboard

## Authentication

For development/testing, you can:
1. Use the test student created by `rails db:seed`
2. Include `student_id` parameter in requests
3. Or use the authentication token in the Authorization header:
   ```
   Authorization: Bearer <token>
   ```

## Environment Variables

- `OPENAI_API_KEY` - OpenAI API key (required)
- `OPENROUTER_API_KEY` - OpenRouter API key (optional)
- `USE_OPENROUTER` - Set to 'true' to use OpenRouter instead of OpenAI
- `DATABASE_USER` - PostgreSQL username
- `DATABASE_PASSWORD` - PostgreSQL password
- `DATABASE_HOST` - PostgreSQL host
- `REDIS_URL` - Redis connection URL (default: redis://localhost:6379/0)
- `APP_URL` - Application URL (for OpenRouter)

## Database Schema

All tables are created via migrations:
- `students` - Student accounts
- `sessions` - Tutoring sessions
- `goals` - Student learning goals
- `transcripts` - Generated transcripts
- `transcript_analyses` - Transcript analysis results
- `ai_companion_profiles` - AI companion profiles
- `session_summaries` - Session summaries with embeddings
- `conversation_messages` - Chat messages
- `practice_problems` - Practice problems
- `goal_suggestions` - Goal suggestions
- `early_engagement_nudges` - Engagement nudges
- `tutor_routing_events` - Tutor routing events

## Background Jobs

- `SessionSummaryProcessorJob` - Processes transcripts into session summaries
- Run Sidekiq: `bundle exec sidekiq`

## Rake Tasks

- `rails session_summaries:create_from_transcripts` - Create summaries from all approved transcripts
- `rails session_summaries:reprocess_failed` - Reprocess failed summaries
