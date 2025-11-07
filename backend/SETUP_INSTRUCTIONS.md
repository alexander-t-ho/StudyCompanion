# Platform Integration Setup Instructions

## Prerequisites

Before running the setup, ensure you have:
- Ruby 3.2.0+ (current: check with `ruby --version`)
- PostgreSQL installed and running
- Redis installed and running (for background jobs)
- Node.js and npm (for frontend)

## Setup Steps

### 1. Install Ruby Dependencies

```bash
cd backend
bundle install
```

**Note**: If you get Ruby version errors, you may need to:
- Install Ruby 3.2.0+ using rbenv, rvm, or asdf
- Or update the Gemfile to match your Ruby version

### 2. Set Up Database

```bash
# Create database
rails db:create

# Run migrations
rails db:migrate

# Seed test data
rails db:seed
```

**Note**: Make sure PostgreSQL is running and configured in `config/database.yml`

### 3. Configure Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit .env and add your API keys
# Required: OPENAI_API_KEY
# Optional: OPENROUTER_API_KEY, USE_OPENROUTER
```

### 4. Start Services

You'll need multiple terminals:

**Terminal 1 - Redis:**
```bash
redis-server
```

**Terminal 2 - Sidekiq (Background Jobs):**
```bash
cd backend
bundle exec sidekiq
```

**Terminal 3 - Rails Server:**
```bash
cd backend
rails server
```

**Terminal 4 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 5. Validate Setup

**Option A: CLI Validation**
```bash
cd backend
./validate_complete.sh
```

**Option B: Frontend Validator**
- Open http://localhost:3001
- Go to "Platform Integration Validator" tab
- Enter student ID from seed data
- Run all tests

## Troubleshooting

### Ruby Version Issues
- Check Ruby version: `ruby --version`
- If wrong version, install correct one or update Gemfile

### Database Connection Issues
- Check PostgreSQL is running: `pg_isready`
- Verify database credentials in `config/database.yml`
- Check database exists: `rails db:version`

### Missing Dependencies
- Install PostgreSQL: `brew install postgresql` (macOS)
- Install Redis: `brew install redis` (macOS)
- Install Node.js: `brew install node` (macOS)

## Quick Test

Once everything is running, test with:

```bash
# Get test student token from seed output
# Then test an endpoint:
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/ai_companion/profile
```

## Validation Checklist

- [ ] Dependencies installed (`bundle install` successful)
- [ ] Database created and migrated
- [ ] Test data seeded
- [ ] Environment variables configured
- [ ] Redis running
- [ ] Sidekiq running
- [ ] Rails server running
- [ ] Frontend running
- [ ] All validation tests passing

