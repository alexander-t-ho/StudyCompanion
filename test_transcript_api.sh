#!/bin/bash
# Test script to generate transcripts via API

API_BASE="http://localhost:3003/api/v1"

echo "🧪 Testing Transcript Generation API"
echo "===================================="
echo ""

# Test 1: Generate a Tutoring Session Transcript
echo "📚 Test 1: Generating Tutoring Session Transcript..."
echo ""

RESPONSE=$(curl -s -X POST "${API_BASE}/transcripts" \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": {
      "subject": "SAT Math",
      "topic": "Quadratic Equations",
      "student_level": "intermediate",
      "session_duration_minutes": 30,
      "learning_objectives": "Understand how to solve quadratic equations",
      "student_personality": "Engaged and curious"
    },
    "use_openrouter": false
  }')

if echo "$RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
  TRANSCRIPT_ID=$(echo "$RESPONSE" | jq -r '.id')
  echo "✅ Tutoring transcript generated successfully!"
  echo "📄 Transcript ID: $TRANSCRIPT_ID"
  echo ""
  echo "Preview:"
  echo "$RESPONSE" | jq -r '.transcript_content' | head -10
  echo ""
else
  echo "❌ Failed to generate transcript"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
  echo ""
fi

echo "---"
echo ""

# Test 2: Generate a Meeting Transcript (Gemini Format)
echo "📝 Test 2: Generating Meeting Transcript (Gemini Format)..."
echo ""

RESPONSE2=$(curl -s -X POST "${API_BASE}/transcripts" \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": {
      "transcript_type": "meeting",
      "meeting_title": "Weekly Team Standup",
      "participants": "Alice Johnson, Bob Smith",
      "meeting_recording": "Recording",
      "topic": "Sprint Planning",
      "session_duration_minutes": 20,
      "learning_objectives": "Discuss sprint progress and blockers"
    },
    "use_openrouter": true
  }')

if echo "$RESPONSE2" | jq -e '.id' > /dev/null 2>&1; then
  TRANSCRIPT_ID2=$(echo "$RESPONSE2" | jq -r '.id')
  echo "✅ Meeting transcript generated successfully!"
  echo "📄 Transcript ID: $TRANSCRIPT_ID2"
  echo ""
  echo "Preview:"
  echo "$RESPONSE2" | jq -r '.transcript_content' | head -15
  echo ""
else
  echo "❌ Failed to generate meeting transcript"
  echo "$RESPONSE2" | jq '.' 2>/dev/null || echo "$RESPONSE2"
  echo ""
fi

echo "===================================="
echo "✅ Testing complete!"
echo ""
echo "View transcripts at: http://localhost:3002"


