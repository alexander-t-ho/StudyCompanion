# Local Testing Setup ✅

## Server Configuration

**Frontend:** http://localhost:3002  
**Backend API:** http://localhost:3003  
**Status:** Both servers running and tested

## Port Configuration

- Port 3000: Reserved for other project
- Port 3002: Frontend (Vite/React)
- Port 3003: Backend (Rails API)

## Test Results

✅ **Tutoring Session Transcripts:** Working  
✅ **Meeting Transcripts (Gemini Format):** Working

Both transcript types have been successfully tested via API.

## Access the Application

1. **Open your browser to:** http://localhost:3002
2. You'll see the Study Companion interface with:
   - Transcript Generator form (left panel)
   - Transcript List (below generator)
   - Transcript Viewer (right panel, appears when you select a transcript)

## Generate Transcripts

### Tutoring Session
1. Select "Tutoring Session" from Transcript Type
2. Fill in: Subject, Topic, Student Level, Duration, Learning Objectives, Student Personality
3. Click "Generate Transcript"
4. View in the list and click to see full transcript

### Meeting Transcript (Gemini Format)
1. Select "Meeting Notes (Gemini Format)" from Transcript Type
2. Fill in: Meeting Title, Participants, Topic, Duration, Meeting Context
3. Click "Generate Transcript"
4. Transcript will be generated using Gemini via OpenRouter
5. View formatted transcript with Summary, Details, and Next Steps

## API Testing

You can also test via API directly:

```bash
# Generate tutoring transcript
curl -X POST http://localhost:3003/api/v1/transcripts \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": {
      "subject": "SAT Math",
      "topic": "Algebra",
      "student_level": "intermediate",
      "session_duration_minutes": 30,
      "learning_objectives": "Learn algebra basics"
    }
  }'

# Generate meeting transcript
curl -X POST http://localhost:3003/api/v1/transcripts \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": {
      "transcript_type": "meeting",
      "meeting_title": "Team Standup",
      "participants": "Alice, Bob",
      "session_duration_minutes": 20,
      "learning_objectives": "Discuss progress"
    },
    "use_openrouter": true
  }'
```

Or use the test script:
```bash
./test_transcript_api.sh
```

## Troubleshooting

**Frontend not loading:**
- Check console (F12) for errors
- Verify backend is running: `curl http://localhost:3003/api/v1/transcripts`
- Try hard refresh: Cmd+Shift+R

**API errors:**
- Check backend logs: `tail -f /tmp/rails_3003.log`
- Verify API keys in `backend/.env`

**Port conflicts:**
- Frontend: `lsof -ti:3002`
- Backend: `lsof -ti:3003`

## Files

- Frontend logs: `/tmp/frontend_3002.log`
- Backend logs: `/tmp/rails_3003.log`
- Test script: `./test_transcript_api.sh`


