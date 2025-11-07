# Local Development Setup

## Port Configuration

- **Frontend:** http://localhost:3002 (Vite/React)
- **Backend API:** http://localhost:3004 (Rails)
- **Ports 3000 and 8000:** Reserved for other projects

## Quick Start

### Option 1: Use the startup script
```bash
./START_SERVERS.sh
```

### Option 2: Manual start

**Backend:**
```bash
cd backend
eval "$(rbenv init - zsh)"
bundle exec rails server -p 3004
```

**Frontend (in a new terminal):**
```bash
cd frontend
source "$HOME/.nvm/nvm.sh"
nvm use default
npm run dev
```

## Verify Servers

**Check if servers are running:**
```bash
lsof -ti:3002,3004
```

**Test backend API:**
```bash
curl http://localhost:3004/api/v1/transcripts
```

**Test frontend:**
Open http://localhost:3002 in your browser

## Logs

- Backend logs: `tail -f /tmp/rails_3004.log`
- Frontend logs: `tail -f /tmp/frontend_3002.log`

## Stop Servers

```bash
# Stop by port
lsof -ti:3002 | xargs kill -9
lsof -ti:3004 | xargs kill -9

# Or stop by PID (if using START_SERVERS.sh)
kill <BACKEND_PID> <FRONTEND_PID>
```

## Features

✅ All AP STEM subjects available  
✅ SAT preparation (college essays, study skills, AP prep)  
✅ Fixed white page issue  
✅ Better error handling  
✅ Transcript generation and validation  

## API Keys

Configured in `backend/.env`:
- `OPENAI_API_KEY` - For tutoring sessions
- `OPENROUTER_API_KEY` - For OpenRouter (optional)
- `USE_OPENROUTER` - Set to `true` to use OpenRouter by default

## Troubleshooting

**Frontend not loading:**
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Check console for errors: F12 → Console tab

**Backend not responding:**
- Check logs: `tail -f /tmp/rails_3004.log`
- Verify database: `cd backend && rails db:migrate`

**Port conflicts:**
- Check what's using ports: `lsof -ti:3002,3004`
- Kill processes: `lsof -ti:3002 | xargs kill -9`

