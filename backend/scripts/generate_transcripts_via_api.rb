#!/usr/bin/env ruby
# Generate transcripts via API calls
# This can be run as a standalone script if HTTParty is available

require 'httparty'
require 'json'
require 'date'

API_URL = ENV['API_URL'] || 'http://localhost:3004/api/v1/transcripts'
STUDENT_ID = 1
API_KEY = ENV['OPENAI_API_KEY'] || ''
USE_OPENROUTER = ENV['USE_OPENROUTER'] == 'true'

transcripts = [
  {
    subject: "AP Calculus BC",
    topic: "Derivatives",
    days_ago: 75,
    session_count: 2,
    learning_objectives: "Master derivative rules and applications including chain rule, product rule, and quotient rule",
    student_personality: "Engaged and curious, sometimes struggles with confidence but shows strong problem-solving skills"
  },
  {
    subject: "AP Calculus BC",
    topic: "Integration Techniques",
    days_ago: 60,
    session_count: 3,
    learning_objectives: "Learn various integration techniques including u-substitution, integration by parts, and partial fractions",
    student_personality: "Engaged and curious, sometimes struggles with confidence but shows strong problem-solving skills"
  },
  {
    subject: "AP Physics C: Mechanics",
    topic: "Kinematics",
    days_ago: 45,
    session_count: 1,
    learning_objectives: "Understand motion in one and two dimensions, velocity, acceleration, and projectile motion",
    student_personality: "Engaged and curious, sometimes struggles with confidence but shows strong problem-solving skills"
  },
  {
    subject: "AP Physics C: Mechanics",
    topic: "Forces and Motion",
    days_ago: 30,
    session_count: 2,
    learning_objectives: "Master Newton's laws of motion, force diagrams, and applications to real-world problems",
    student_personality: "Engaged and curious, sometimes struggles with confidence but shows strong problem-solving skills"
  },
  {
    subject: "AP Chemistry",
    topic: "Chemical Bonding",
    days_ago: 15,
    session_count: 4,
    learning_objectives: "Understand ionic, covalent, and metallic bonding, Lewis structures, and molecular geometry",
    student_personality: "Engaged and curious, sometimes struggles with confidence but shows strong problem-solving skills"
  }
]

puts "Generating 5 transcripts for student ID #{STUDENT_ID} via API..."
puts "API URL: #{API_URL}"
puts ""

transcripts.each_with_index do |config, index|
  session_date = (Date.today - config[:days_ago]).strftime('%Y-%m-%d')
  
  puts "#{index + 1}/5: #{config[:subject]} - #{config[:topic]}"
  puts "  Date: #{session_date}"
  
  payload = {
    student_id: STUDENT_ID,
    subject: config[:subject],
    topic: config[:topic],
    student_level: 'intermediate',
    session_duration_minutes: 60,
    learning_objectives: config[:learning_objectives],
    student_personality: config[:student_personality],
    transcript_format: 'structured',
    session_date: session_date,
    session_count_this_week: config[:session_count],
    api_key: API_KEY,
    use_openrouter: USE_OPENROUTER
  }
  
  begin
    response = HTTParty.post(
      API_URL,
      body: payload.to_json,
      headers: {
        'Content-Type' => 'application/json'
      },
      timeout: 300 # 5 minute timeout for generation
    )
    
    if response.success?
      transcript_id = response.parsed_response['id']
      puts "  ✅ Created transcript ID: #{transcript_id}"
    else
      puts "  ❌ Error: #{response.code} - #{response.body}"
    end
  rescue => e
    puts "  ❌ Error: #{e.message}"
  end
  
  puts ""
  sleep 2 # Small delay between requests
end

puts "✅ Completed!"


