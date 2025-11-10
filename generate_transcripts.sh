#!/bin/bash
# Script to generate 5 transcripts across 3 subjects for student ID 1
# Uses the API endpoints

API_URL="http://localhost:3004/api/v1/transcripts"
STUDENT_ID=1

# Get API key from environment or use default
API_KEY="${OPENAI_API_KEY:-}"
USE_OPENROUTER="${USE_OPENROUTER:-true}"

echo "Generating 5 transcripts for student ID $STUDENT_ID..."
echo ""

# Transcript 1: AP Calculus BC - Derivatives (75 days ago)
echo "1/5: AP Calculus BC - Derivatives"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"student_id\": $STUDENT_ID,
    \"subject\": \"AP Calculus BC\",
    \"topic\": \"Derivatives\",
    \"student_level\": \"intermediate\",
    \"session_duration_minutes\": 60,
    \"learning_objectives\": \"Master derivative rules and applications\",
    \"student_personality\": \"Engaged and curious, sometimes struggles with confidence\",
    \"transcript_format\": \"structured\",
    \"session_date\": \"$(date -v-75d +%Y-%m-%d 2>/dev/null || date -d '75 days ago' +%Y-%m-%d)\",
    \"session_count_this_week\": 2,
    \"api_key\": \"$API_KEY\",
    \"use_openrouter\": $USE_OPENROUTER
  }" | jq -r '.id // "Error"'
echo ""

# Transcript 2: AP Calculus BC - Integration (60 days ago)
echo "2/5: AP Calculus BC - Integration Techniques"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"student_id\": $STUDENT_ID,
    \"subject\": \"AP Calculus BC\",
    \"topic\": \"Integration Techniques\",
    \"student_level\": \"intermediate\",
    \"session_duration_minutes\": 60,
    \"learning_objectives\": \"Learn various integration techniques including substitution and parts\",
    \"student_personality\": \"Engaged and curious, sometimes struggles with confidence\",
    \"transcript_format\": \"structured\",
    \"session_date\": \"$(date -v-60d +%Y-%m-%d 2>/dev/null || date -d '60 days ago' +%Y-%m-%d)\",
    \"session_count_this_week\": 3,
    \"api_key\": \"$API_KEY\",
    \"use_openrouter\": $USE_OPENROUTER
  }" | jq -r '.id // "Error"'
echo ""

# Transcript 3: AP Physics C: Mechanics - Kinematics (45 days ago)
echo "3/5: AP Physics C: Mechanics - Kinematics"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"student_id\": $STUDENT_ID,
    \"subject\": \"AP Physics C: Mechanics\",
    \"topic\": \"Kinematics\",
    \"student_level\": \"intermediate\",
    \"session_duration_minutes\": 60,
    \"learning_objectives\": \"Understand motion in one and two dimensions, velocity, acceleration\",
    \"student_personality\": \"Engaged and curious, sometimes struggles with confidence\",
    \"transcript_format\": \"structured\",
    \"session_date\": \"$(date -v-45d +%Y-%m-%d 2>/dev/null || date -d '45 days ago' +%Y-%m-%d)\",
    \"session_count_this_week\": 1,
    \"api_key\": \"$API_KEY\",
    \"use_openrouter\": $USE_OPENROUTER
  }" | jq -r '.id // "Error"'
echo ""

# Transcript 4: AP Physics C: Mechanics - Forces and Motion (30 days ago)
echo "4/5: AP Physics C: Mechanics - Forces and Motion"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"student_id\": $STUDENT_ID,
    \"subject\": \"AP Physics C: Mechanics\",
    \"topic\": \"Forces and Motion\",
    \"student_level\": \"intermediate\",
    \"session_duration_minutes\": 60,
    \"learning_objectives\": \"Master Newton's laws and force diagrams\",
    \"student_personality\": \"Engaged and curious, sometimes struggles with confidence\",
    \"transcript_format\": \"structured\",
    \"session_date\": \"$(date -v-30d +%Y-%m-%d 2>/dev/null || date -d '30 days ago' +%Y-%m-%d)\",
    \"session_count_this_week\": 2,
    \"api_key\": \"$API_KEY\",
    \"use_openrouter\": $USE_OPENROUTER
  }" | jq -r '.id // "Error"'
echo ""

# Transcript 5: AP Chemistry - Chemical Bonding (15 days ago)
echo "5/5: AP Chemistry - Chemical Bonding"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"student_id\": $STUDENT_ID,
    \"subject\": \"AP Chemistry\",
    \"topic\": \"Chemical Bonding\",
    \"student_level\": \"intermediate\",
    \"session_duration_minutes\": 60,
    \"learning_objectives\": \"Understand ionic, covalent, and metallic bonding\",
    \"student_personality\": \"Engaged and curious, sometimes struggles with confidence\",
    \"transcript_format\": \"structured\",
    \"session_date\": \"$(date -v-15d +%Y-%m-%d 2>/dev/null || date -d '15 days ago' +%Y-%m-%d)\",
    \"session_count_this_week\": 4,
    \"api_key\": \"$API_KEY\",
    \"use_openrouter\": $USE_OPENROUTER
  }" | jq -r '.id // "Error"'
echo ""

echo "✅ Completed generating 5 transcripts!"
echo ""
echo "Check the transcripts in the frontend or via:"
echo "  curl $API_URL?student_id=$STUDENT_ID"


