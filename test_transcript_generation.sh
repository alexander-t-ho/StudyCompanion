#!/bin/bash

# Test script to generate transcripts locally
# This tests both tutoring sessions and meeting transcripts

API_BASE="http://localhost:3002/api/v1"

echo "🧪 Testing Transcript Generation"
echo "================================"
echo ""

# Test 1: Tutoring Session Transcript
echo "📚 Test 1: Generating Tutoring Session Transcript..."
echo ""

curl -X POST "${API_BASE}/transcripts" \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": {
      "subject": "SAT Math",
      "topic": "Quadratic Equations",
      "student_level": "intermediate",
      "session_duration_minutes": 45,
      "learning_objectives": "Understand how to solve quadratic equations using factoring and the quadratic formula",
      "student_personality": "Engaged and curious, sometimes struggles with confidence on word problems"
    },
    "use_openrouter": true,
    "use_gemini": false
  }' \
  | jq '.' > test_tutoring_transcript.json

if [ $? -eq 0 ]; then
  echo "✅ Tutoring transcript generated successfully!"
  echo "📄 Saved to: test_tutoring_transcript.json"
  echo ""
  echo "Preview:"
  cat test_tutoring_transcript.json | jq -r '.transcript_content' | head -20
  echo ""
else
  echo "❌ Failed to generate tutoring transcript"
  echo ""
fi

echo ""
echo "---"
echo ""

# Test 2: Meeting Transcript (Gemini Format)
echo "📝 Test 2: Generating Meeting Transcript (Gemini Format)..."
echo ""

curl -X POST "${API_BASE}/transcripts" \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": {
      "transcript_type": "meeting",
      "meeting_title": "Weekly Team Standup",
      "participants": "Alice Johnson, Bob Smith, Carol Williams",
      "meeting_recording": "Recording",
      "topic": "Sprint Planning and Project Updates",
      "session_duration_minutes": 30,
      "learning_objectives": "Discuss sprint progress, blockers, and plan next week tasks. Review project milestones and coordinate team efforts."
    },
    "use_openrouter": true
  }' \
  | jq '.' > test_meeting_transcript.json

if [ $? -eq 0 ]; then
  echo "✅ Meeting transcript generated successfully!"
  echo "📄 Saved to: test_meeting_transcript.json"
  echo ""
  echo "Preview:"
  cat test_meeting_transcript.json | jq -r '.transcript_content' | head -30
  echo ""
else
  echo "❌ Failed to generate meeting transcript"
  echo ""
fi

echo ""
echo "================================"
echo "✅ Testing complete!"
echo ""
echo "Full transcripts saved to:"
echo "  - test_tutoring_transcript.json"
echo "  - test_meeting_transcript.json"
echo ""
echo "To view full transcripts:"
echo "  cat test_tutoring_transcript.json | jq -r '.transcript_content'"
echo "  cat test_meeting_transcript.json | jq -r '.transcript_content'"

