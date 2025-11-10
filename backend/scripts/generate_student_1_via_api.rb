#!/usr/bin/env ruby
# Script to generate 5 transcripts for student ID 1 via API calls

require 'net/http'
require 'json'
require 'uri'
require 'date'

API_BASE = 'http://localhost:3004/api/v1'
STUDENT_ID = 1

# Define 3 subjects with topics - including SAT Math Prep
transcript_configs = [
  {
    subject: "SAT Math Prep",
    topic: "Algebra and Linear Equations",
    days_ago: 75,
    understanding_base: 25
  },
  {
    subject: "SAT Math Prep",
    topic: "Geometry and Trigonometry",
    days_ago: 60,
    understanding_base: 45
  },
  {
    subject: "AP Calculus BC",
    topic: "Derivatives",
    days_ago: 45,
    understanding_base: 30
  },
  {
    subject: "AP Calculus BC",
    topic: "Integration Techniques",
    days_ago: 30,
    understanding_base: 50
  },
  {
    subject: "AP Physics C: Mechanics",
    topic: "Kinematics",
    days_ago: 15,
    understanding_base: 35
  }
]

def generate_random_fields(subject, topic)
  uri = URI("#{API_BASE}/transcripts/generate_random_fields")
  http = Net::HTTP.new(uri.host, uri.port)
  request = Net::HTTP::Post.new(uri.path)
  request['Content-Type'] = 'application/json'
  request.body = {
    subject: subject,
    topic: topic,
    student_level: 'intermediate',
    api_key: ENV['OPENAI_API_KEY'],
    use_openrouter: ENV['USE_OPENROUTER'] == 'true'
  }.to_json
  
  response = http.request(request)
  if response.code == '200'
    JSON.parse(response.body)
  else
    {
      'learning_objectives' => "Master #{topic} concepts in #{subject}",
      'student_personality' => "Engaged and curious student"
    }
  end
rescue => e
  puts "  Warning: Could not generate random fields: #{e.message}"
  {
    'learning_objectives' => "Master #{topic} concepts in #{subject}",
    'student_personality' => "Engaged and curious student"
  }
end

def create_transcript(config, learning_objectives, student_personality)
  uri = URI("#{API_BASE}/transcripts")
  http = Net::HTTP.new(uri.host, uri.port)
  request = Net::HTTP::Post.new(uri.path)
  request['Content-Type'] = 'application/json'
  
  session_date = (Date.today - config[:days_ago]).to_s
  session_count = [1, 1, 2, 2, 2].sample
  
  request.body = {
    transcript: {
      student_id: STUDENT_ID,
      subject: config[:subject],
      topic: config[:topic],
      student_level: 'intermediate',
      session_duration_minutes: 60,
      learning_objectives: learning_objectives,
      student_personality: student_personality,
      transcript_format: 'structured',
      session_date: session_date,
      session_count_this_week: session_count
    },
    api_key: ENV['OPENAI_API_KEY'],
    use_openrouter: ENV['USE_OPENROUTER'] == 'true'
  }.to_json
  
  response = http.request(request)
  if response.code == '201'
    JSON.parse(response.body)
  else
    puts "  Error: #{response.code} - #{response.body}"
    nil
  end
end

puts "Generating 5 transcripts for student ID #{STUDENT_ID} with progression..."
puts "Subjects: SAT Math Prep (2 sessions), AP Calculus BC (2 sessions), AP Physics C: Mechanics (1 session)"
puts ""

transcript_configs.each_with_index do |config, index|
  puts "Generating transcript #{index + 1}/5:"
  puts "  Subject: #{config[:subject]}"
  puts "  Topic: #{config[:topic]}"
  session_date_display = Date.today - config[:days_ago]
  puts "  Session Date: #{session_date_display} (#{config[:days_ago]} days ago)"
  
  begin
    # Generate random fields
    fields = generate_random_fields(config[:subject], config[:topic])
    learning_objectives = fields['learning_objectives'] || "Master #{config[:topic]} concepts in #{config[:subject]}"
    student_personality = fields['student_personality'] || "Engaged and curious student"
    
    # Create transcript
    result = create_transcript(config, learning_objectives, student_personality)
    
    if result
      transcript = result
      understanding_level = (transcript['understanding_level'] || 0).to_f
      previous_level = (transcript['previous_understanding_level'] || 0).to_f
      
      progress_indicator = previous_level > 0 ? 
        " (↑ from #{previous_level.round(1)}%)" : 
        " (first session)"
      
      puts "  ✅ Created transcript ID: #{transcript['id']}"
      puts "  Understanding Level: #{understanding_level.round(1)}%#{progress_indicator}"
    else
      puts "  ❌ Failed to create transcript"
    end
    
  rescue => e
    puts "  ❌ Error: #{e.message}"
    puts "  #{e.backtrace.first(3).join("\n  ")}"
  end
  
  puts ""
  sleep(2) # Small delay between requests
end

puts "✅ Completed generating transcripts!"
puts ""
puts "You can now view them in the Student Dashboard (Student ID: #{STUDENT_ID})"

