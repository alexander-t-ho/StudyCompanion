#!/usr/bin/env ruby
# Direct test script for transcript generation
# This bypasses the web server and tests the service directly

require_relative 'backend/config/environment'

puts "🧪 Testing Transcript Generation Service"
puts "=" * 50
puts ""

# Load environment variables
require 'dotenv/rails-now'
Dotenv.load('backend/.env')

# Test 1: Tutoring Session
puts "📚 Test 1: Generating Tutoring Session Transcript..."
puts ""

service = TranscriptGenerationService.new(
  api_key: ENV['OPENAI_API_KEY'],
  use_openrouter: false  # Use OpenAI directly for tutoring
)

tutoring_params = {
  subject: "SAT Math",
  topic: "Quadratic Equations",
  student_level: "intermediate",
  session_duration_minutes: 45,
  learning_objectives: "Understand how to solve quadratic equations using factoring and the quadratic formula",
  student_personality: "Engaged and curious, sometimes struggles with confidence on word problems"
}

begin
  result = service.generate(tutoring_params)
  
  puts "✅ Tutoring transcript generated successfully!"
  puts "Model used: #{result[:model_used]}"
  puts "Token count: #{result[:token_count]}"
  puts "Cost: $#{result[:cost].round(4)}"
  puts ""
  puts "Transcript preview (first 500 chars):"
  puts "-" * 50
  puts result[:transcript_content][0..500]
  puts "..."
  puts ""
  
  # Save to file
  File.write('test_tutoring_output.txt', result[:transcript_content])
  puts "📄 Full transcript saved to: test_tutoring_output.txt"
rescue => e
  puts "❌ Error: #{e.message}"
  puts e.backtrace.first(5).join("\n")
end

puts ""
puts "-" * 50
puts ""

# Test 2: Meeting Transcript (Gemini Format)
puts "📝 Test 2: Generating Meeting Transcript (Gemini Format)..."
puts ""

service2 = TranscriptGenerationService.new(
  api_key: ENV['OPENROUTER_API_KEY'],
  use_openrouter: true  # Use OpenRouter for Gemini
)

meeting_params = {
  transcript_type: "meeting",
  meeting_title: "Weekly Team Standup",
  participants: "Alice Johnson, Bob Smith, Carol Williams",
  meeting_recording: "Recording",
  topic: "Sprint Planning and Project Updates",
  session_duration_minutes: 30,
  learning_objectives: "Discuss sprint progress, blockers, and plan next week tasks. Review project milestones and coordinate team efforts."
}

begin
  result2 = service2.generate(meeting_params)
  
  puts "✅ Meeting transcript generated successfully!"
  puts "Model used: #{result2[:model_used]}"
  puts "Token count: #{result2[:token_count]}"
  puts "Cost: $#{result2[:cost].round(4)}"
  puts ""
  puts "Transcript preview (first 800 chars):"
  puts "-" * 50
  puts result2[:transcript_content][0..800]
  puts "..."
  puts ""
  
  # Save to file
  File.write('test_meeting_output.txt', result2[:transcript_content])
  puts "📄 Full transcript saved to: test_meeting_output.txt"
rescue => e
  puts "❌ Error: #{e.message}"
  puts e.backtrace.first(5).join("\n")
end

puts ""
puts "=" * 50
puts "✅ Testing complete!"
puts ""
puts "Full transcripts saved to:"
puts "  - test_tutoring_output.txt"
puts "  - test_meeting_output.txt"



