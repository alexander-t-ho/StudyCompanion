# 🚀 Servers Started!

## Server Status

All servers have been started in the background:

### ✅ Redis
- Status: Running
- Purpose: Required for Sidekiq background jobs

### ✅ Sidekiq
- Status: Running (background)
- Log: `/tmp/sidekiq.log`
- Purpose: Processes background jobs (session summaries, etc.)

### ✅ Rails Server
- Status: Starting (background)
- URL: http://localhost:3000
- Log: `/tmp/rails.log`
- Purpose: Backend API server

### ✅ Frontend (Vite)
- Status: Starting (background)
- URL: http://localhost:3001 (or port shown in log)
- Log: `/tmp/frontend.log`
- Purpose: React frontend for transcript generation and validation

## Check Server Status

```bash
# Check Rails
curl http://localhost:3000/api/v1/transcripts

# Check processes
ps aux | grep -E "(sidekiq|rails|vite)" | grep -v grep

# View logs
tail -f /tmp/rails.log
tail -f /tmp/sidekiq.log
tail -f /tmp/frontend.log
```

## Stop Servers

```bash
# Find and kill processes
pkill -f sidekiq
pkill -f "rails server"
pkill -f vite

# Or kill by PID (check with ps aux)
kill <PID>
```

## Access the Application

1. **Frontend**: Open http://localhost:3001 (or check `/tmp/frontend.log` for the actual port)
2. **Backend API**: http://localhost:3000
3. **API Docs**: Check routes with `rails routes` or visit endpoints directly

## Generate Transcripts

1. Open the frontend URL
2. Fill in the "Generate New Transcript" form
3. Enter your OpenAI or OpenRouter API key
4. Click "Generate Transcript"
5. View and validate transcripts in the list

## Test API

```bash
# List transcripts
curl http://localhost:3000/api/v1/transcripts

# With authentication (from seed data)
curl -H "Authorization: Bearer 42b1845fdcd2da058dfcffda397ff613677e1b10268c35943a65767033b63d26" \
  http://localhost:3000/api/v1/transcripts
```

## Troubleshooting

- **Rails not responding**: Check `/tmp/rails.log` for errors
- **Frontend not loading**: Check `/tmp/frontend.log` for port conflicts
- **Sidekiq errors**: Check `/tmp/sidekiq.log`
- **Port conflicts**: Change ports in `config/puma.rb` (Rails) or `vite.config.js` (Frontend)

