# Quick Setup Guide

## Current Status

✅ **Structure Validation**: PASSED (53/53 files)
⚠️ **Dependencies**: Need to install (Ruby version compatibility adjusted)

## Ruby Version Compatibility

Your system has Ruby 2.6.10. The Gemfile has been adjusted for compatibility:
- Rails 6.1 (supports Ruby 2.5+)
- Sidekiq 6.5 (supports Ruby 2.5+)
- Faker 2.23 (supports Ruby 2.6+)

## Setup Commands

Run these commands in order:

```bash
cd backend

# 1. Install dependencies (may take a few minutes)
bundle install

# 2. Create and setup database
rails db:create
rails db:migrate
rails db:seed

# 3. Start services (in separate terminals)
# Terminal 1:
redis-server

# Terminal 2:
bundle exec sidekiq

# Terminal 3:
rails server

# 4. Validate (in another terminal)
./validate_api_endpoints.sh
```

## Alternative: Use Setup Script

```bash
cd backend
./setup.sh
```

This will run all setup steps automatically.

## Validation

After setup, validate with:

```bash
# Structure validation
ruby validate_platform_integration.rb

# API endpoint validation (requires server running)
./validate_api_endpoints.sh

# Complete validation
./validate_complete.sh
```

## Notes

- If `bundle install` fails, you may need to upgrade Ruby to 2.7.0+
- PostgreSQL must be installed and running
- Redis must be installed for background jobs
- All setup steps are ready to run when dependencies are installed

