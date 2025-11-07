# Frontend Testing Guide

## Current Status

✅ **Backend**: Running on http://localhost:3000  
⚠️ **Frontend**: Needs to be started manually (see below)

## Starting the Frontend

There's a Node.js library dependency issue that needs to be resolved. Try one of these options:

### Option 1: Use nvm (if installed)
```bash
cd frontend
nvm use 18  # or another version
npm run dev
```

### Option 2: Fix Node.js library issue
The error indicates a missing ICU library. Try:
```bash
brew install icu4c
# Then restart terminal and try again
cd frontend
npm run dev
```

### Option 3: Use a different Node.js installation
If you have multiple Node.js installations, try finding one that works:
```bash
which -a node
# Try using a different node path
/usr/local/bin/node --version  # or /opt/homebrew/bin/node
```

## Once Frontend is Running

1. Open browser to: **http://localhost:3001**

2. You'll see the Study Companion interface:
   - **Left Panel**: Transcript Generator form
   - **Left Panel (below)**: List of all transcripts
   - **Right Panel**: Transcript viewer (appears when you select a transcript)

## Testing Transcript Generation

### Test 1: Tutoring Session Transcript

1. In the form, select **"Tutoring Session"** from Transcript Type
2. Fill in:
   - Subject: `SAT Math`
   - Topic: `Quadratic Equations`
   - Student Level: `Intermediate`
   - Duration: `45` minutes
   - Learning Objectives: `Understand how to solve quadratic equations`
   - Student Personality: `Engaged and curious`
3. Click **"Generate Transcript"**
4. Wait for generation (may take 10-30 seconds)
5. The transcript will appear in the list below
6. Click on it to view the full transcript in the right panel

### Test 2: Meeting Transcript (Gemini Format)

1. In the form, select **"Meeting Notes (Gemini Format)"** from Transcript Type
2. Fill in:
   - Meeting Title: `Weekly Team Standup`
   - Participants: `Alice Johnson, Bob Smith, Carol Williams`
   - Meeting Recording: `Recording`
   - Topic: `Sprint Planning`
   - Duration: `30` minutes
   - Meeting Context: `Discuss sprint progress, blockers, and plan next week tasks`
3. Click **"Generate Transcript"**
4. Wait for generation (uses Gemini via OpenRouter)
5. The transcript will appear in the list
6. Click on it to view - it should be formatted with:
   - Meeting Title
   - Invited Participants
   - Summary section
   - Details section with headings
   - Suggested next steps

## Viewing Transcripts

When you click on a transcript in the list:

- **Top Section**: Shows transcript metadata (Subject, Topic, Duration, Model used, Cost)
- **Transcript Content**: The full transcript text, formatted appropriately:
  - Tutoring sessions: Speaker labels (Tutor/Student) with different styling
  - Meeting transcripts: Formatted with headers, sections, and bullet points
- **Validation Section**: Rate quality (1-5), add notes, approve transcript
- **Analyze Button**: Analyze the transcript for sentiment, concepts, engagement

## Features to Test

✅ Generate tutoring session transcripts  
✅ Generate meeting transcripts in Gemini format  
✅ View transcripts with proper formatting  
✅ Validate transcripts (rate, add notes, approve)  
✅ Analyze transcripts (sentiment, concepts, engagement)  
✅ API keys saved in localStorage  
✅ OpenRouter integration for Gemini  

## Troubleshooting

**Frontend won't start:**
- Check Node.js version: `node --version` (should be 16+)
- Install dependencies: `cd frontend && npm install`
- Check for port conflicts: `lsof -ti:3001`

**Can't generate transcripts:**
- Check backend is running: `curl http://localhost:3000/api/v1/transcripts`
- Check API keys in `backend/.env` file
- Check browser console for errors (F12)

**Transcripts not displaying:**
- Check browser console for errors
- Verify transcript content exists in database
- Try refreshing the page

## API Keys

API keys are configured in `backend/.env`:
- `OPENAI_API_KEY`: For tutoring sessions
- `OPENROUTER_API_KEY`: For meeting transcripts (Gemini)
- `USE_OPENROUTER=true`: Default to OpenRouter

You can also enter API keys in the frontend form to override .env settings.



