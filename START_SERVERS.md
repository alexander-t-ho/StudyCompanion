# Starting the Servers for Testing

## Backend (Rails API)

The backend is already running on port 3000. If you need to restart it:

```bash
cd backend
eval "$(rbenv init - zsh)"
bundle exec rails server -p 3000
```

## Frontend (React/Vite)

To start the frontend, open a new terminal and run:

```bash
cd frontend
npm run dev
```

The frontend will start on **http://localhost:3001**

## Access the Application

Once both servers are running:

1. Open your browser to: **http://localhost:3001**
2. You'll see the Study Companion interface with:
   - **Transcript Generator** form on the left
   - **Transcript List** below the generator
   - **Transcript Viewer** on the right (appears when you select a transcript)

## Testing Transcript Generation

### For Tutoring Sessions:
1. Select "Tutoring Session" from the Transcript Type dropdown
2. Fill in the form fields (Subject, Topic, Student Level, etc.)
3. Click "Generate Transcript"
4. The transcript will appear in the list below
5. Click on it to view the full transcript in the viewer

### For Meeting Transcripts (Gemini Format):
1. Select "Meeting Notes (Gemini Format)" from the Transcript Type dropdown
2. Fill in:
   - Meeting Title
   - Participants
   - Meeting Recording (optional)
   - Topic/Subject
   - Meeting Duration
   - Meeting Context / Discussion Points
3. Click "Generate Transcript"
4. The meeting transcript will be generated using Gemini via OpenRouter
5. Click on it to view the formatted transcript

## API Keys

The API keys are already configured in `backend/.env`:
- OpenAI API Key: For tutoring sessions
- OpenRouter API Key: For meeting transcripts (Gemini)

You can also enter API keys in the form if you want to override the .env settings.

## Troubleshooting

If the frontend doesn't start:
- Make sure Node.js is installed: `node --version`
- Install dependencies: `cd frontend && npm install`
- Check for port conflicts: `lsof -ti:3001`

If the backend doesn't respond:
- Check Rails logs: `tail -f /tmp/rails.log`
- Verify database is set up: `cd backend && rails db:migrate`
- Check API endpoint: `curl http://localhost:3000/api/v1/transcripts`



