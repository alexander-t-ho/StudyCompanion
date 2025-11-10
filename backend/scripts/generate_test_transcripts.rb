#!/usr/bin/env ruby
# Script to generate 5 test transcripts across 3 subjects for student ID 1
# Run with: rails runner scripts/generate_test_transcripts.rb

student_id = 1
student = Student.find_by(id: student_id)

unless student
  puts "Student with ID #{student_id} not found. Creating student..."
  student = Student.create!(
    id: student_id,
    name: "Test Student",
    email: "test@example.com"
  )
end

# Define 3 subjects with topics
subjects_data = [
  {
    subject: "AP Calculus BC",
    topics: ["Derivatives", "Integration Techniques"]
  },
  {
    subject: "AP Physics C: Mechanics",
    topics: ["Kinematics", "Forces and Motion"]
  },
  {
    subject: "AP Chemistry",
    topics: ["Chemical Bonding"]
  }
]

# Generate 5 transcripts: 2 for first subject, 2 for second, 1 for third
transcript_configs = [
  { subject_index: 0, topic_index: 0, days_ago: 75 },  # AP Calculus BC - Derivatives (oldest)
  { subject_index: 0, topic_index: 1, days_ago: 60 },  # AP Calculus BC - Integration
  { subject_index: 1, topic_index: 0, days_ago: 45 },  # AP Physics - Kinematics
  { subject_index: 1, topic_index: 1, days_ago: 30 },  # AP Physics - Forces
  { subject_index: 2, topic_index: 0, days_ago: 15 }   # AP Chemistry - Bonding (most recent)
]

puts "Generating 5 transcripts for student ID #{student_id}..."
puts ""

transcript_configs.each_with_index do |config, index|
  subject_data = subjects_data[config[:subject_index]]
  subject = subject_data[:subject]
  topic = subject_data[:topics][config[:topic_index]]
  session_date = Date.current - config[:days_ago].days
  
  puts "Generating transcript #{index + 1}/5:"
  puts "  Subject: #{subject}"
  puts "  Topic: #{topic}"
  puts "  Session Date: #{session_date}"
  
  begin
    # Generate random learning objectives and personality
    service = TranscriptGenerationService.new(
      api_key: ENV['OPENAI_API_KEY'],
      use_openrouter: ENV['USE_OPENROUTER'] == 'true'
    )
    
    # Generate learning objectives
    field_service = FieldGenerationService.new(
      api_key: ENV['OPENAI_API_KEY'],
      use_openrouter: ENV['USE_OPENROUTER'] == 'true'
    )
    
    learning_objectives = begin
      result = field_service.generate_fields(
        subject: subject,
        topic: topic,
        student_level: 'intermediate'
      )
      result[:learning_objectives] || "Master #{topic} concepts in #{subject}"
    rescue => e
      puts "    Warning: Could not generate learning objectives: #{e.message}"
      "Master #{topic} concepts in #{subject}"
    end
    
    student_personality = begin
      result = field_service.generate_fields(
        subject: subject,
        topic: topic,
        student_level: 'intermediate'
      )
      result[:student_personality] || "Engaged and curious student"
    rescue => e
      puts "    Warning: Could not generate student personality: #{e.message}"
      "Engaged and curious student"
    end
    
    # Calculate understanding level
    understanding_service = UnderstandingLevelService.new(
      student_id: student_id,
      subject: subject,
      session_date: session_date
    )
    
    understanding_data = understanding_service.calculate_and_build_snapshots
    
    # Adjust for first session
    if understanding_data[:previous_understanding_level] == 0.0
      understanding_data[:understanding_level] = understanding_service.adjust_for_student_level(
        understanding_data[:understanding_level],
        'intermediate'
      )
    end
    
    # Generate session count (1-5, with some variation)
    session_count = [1, 2, 3, 4, 5].sample
    
    # Generate transcript
    generation_params = {
      student_id: student_id,
      subject: subject,
      topic: topic,
      student_level: 'intermediate',
      session_duration_minutes: 60,
      learning_objectives: learning_objectives,
      student_personality: student_personality,
      transcript_format: 'structured',
      session_date: session_date,
      session_count_this_week: session_count,
      understanding_level: understanding_data[:understanding_level],
      previous_understanding_level: understanding_data[:previous_understanding_level],
      goals_snapshot: understanding_data[:goals_snapshot],
      session_history_summary: understanding_data[:session_history_summary]
    }
    
    result = service.generate(generation_params)
    
    # Create transcript
    transcript = Transcript.create!(
      student_id: student_id,
      subject: subject,
      topic: topic,
      student_level: 'intermediate',
      session_duration_minutes: 60,
      learning_objectives: learning_objectives,
      student_personality: student_personality,
      transcript_content: result[:transcript_content],
      generation_parameters: generation_params,
      model_used: result[:model_used],
      token_count: result[:token_count],
      generation_cost: result[:cost],
      session_date: session_date,
      session_count_this_week: session_count,
      understanding_level: understanding_data[:understanding_level],
      previous_understanding_level: understanding_data[:previous_understanding_level],
      goals_snapshot: understanding_data[:goals_snapshot],
      session_history_summary: understanding_data[:session_history_summary],
      approved: true
    )
    
    puts "  ✅ Created transcript ID: #{transcript.id}"
    puts "  Understanding Level: #{transcript.understanding_level.round(1)}%"
    puts ""
    
    # Create session summary if possible
    begin
      # Create a session for this transcript
      session = Session.create!(
        student_id: student_id,
        subject: subject,
        topic: topic,
        scheduled_at: session_date.to_time,
        started_at: session_date.to_time,
        ended_at: session_date.to_time + 60.minutes,
        duration_minutes: 60,
        status: 'completed'
      )
      
      transcript.update!(session_id: session.id)
      
      # Create session summary
      summary_service = SessionSummaryService.new(
        api_key: ENV['OPENAI_API_KEY'],
        use_openrouter: ENV['USE_OPENROUTER'] == 'true'
      )
      
      summary_service.create_from_transcript(
        transcript,
        session_id: session.id,
        student_id: student_id
      )
      
      puts "  ✅ Created session and summary"
    rescue => e
      puts "  ⚠️  Could not create session/summary: #{e.message}"
    end
    
  rescue => e
    puts "  ❌ Error: #{e.message}"
    puts "  #{e.backtrace.first(3).join("\n  ")}"
    puts ""
  end
end

puts "✅ Completed generating test transcripts!"
puts ""
puts "Summary:"
Transcript.where(student_id: student_id).group(:subject).count.each do |subject, count|
  puts "  #{subject}: #{count} transcript(s)"
end


