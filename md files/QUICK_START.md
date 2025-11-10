# Quick Start Guide

## Current Status

✅ **Code**: All files ready and validated
⚠️ **Ruby**: Need Ruby 3.2.0+ (currently have 2.6.10)

## Option 1: Install Ruby 3.2.0 (Recommended)

Ruby installation takes 5-10 minutes. Run this in a terminal and let it complete:

```bash
# Install rbenv (if not already installed)
brew install rbenv ruby-build

# Initialize rbenv
eval "$(rbenv init - zsh)"
echo 'eval "$(rbenv init - zsh)"' >> ~/.zshrc

# Install Ruby 3.2.0 (this takes 5-10 minutes)
rbenv install 3.2.0
rbenv global 3.2.0

# Verify
ruby -v  # Should show 3.2.0

# Then run the setup script
./setup_ruby_and_install.sh
```

## Option 2: Use Docker (Alternative)

If you prefer Docker, we can create a Dockerfile and docker-compose.yml.

## Option 3: Manual Setup (After Ruby is Installed)

Once Ruby 3.2.0+ is available:

```bash
# 1. Install bundler
gem install bundler

# 2. Install backend dependencies
cd backend
bundle install

# 3. Set up database
rails db:create db:migrate db:seed

# 4. Install frontend dependencies
cd ../frontend
npm install

# 5. Start services (in separate terminals)
# Terminal 1: Redis
brew services start redis

# Terminal 2: Sidekiq
cd backend && bundle exec sidekiq

# Terminal 3: Rails
cd backend && rails server

# Terminal 4: Frontend
cd frontend && npm run dev

# 6. Open browser
# http://localhost:3001
```

## Generate and Review Transcripts

Once everything is running:

1. Open http://localhost:3001
2. Fill in the "Generate New Transcript" form:
   - Subject (e.g., "SAT Math")
   - Topic (e.g., "Algebra")
   - Student Level
   - Session Duration
   - Learning Objectives
   - Student Personality
   - Your OpenAI or OpenRouter API key
3. Click "Generate Transcript"
4. View and validate transcripts in the list
5. Click "Analyze Transcript" to get sentiment, concepts, engagement analysis

## Troubleshooting

- **Ruby installation slow**: This is normal - it compiles from source
- **PostgreSQL not found**: `brew install postgresql && brew services start postgresql`
- **Redis not found**: `brew install redis && brew services start redis`
- **Port conflicts**: Change ports in `config/puma.rb` (Rails) or `vite.config.js` (Frontend)

