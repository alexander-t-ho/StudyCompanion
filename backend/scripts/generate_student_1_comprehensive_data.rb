#!/usr/bin/env ruby
# Script to generate comprehensive dummy data for student ID 1
# Includes transcripts, sessions, summaries, and goals for 4 subjects over 3 months

require_relative '../config/environment'
require 'set'

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

puts "=" * 80
puts "Generating comprehensive dummy data for Student #{student_id}"
puts "=" * 80
puts ""

# Step 1: Delete existing data
puts "Step 1: Deleting existing data..."

# Delete in proper order to handle foreign key constraints
# First delete records that don't have foreign key dependencies
PracticeProblem.where(student_id: student_id).delete_all
TutorRoutingEvent.where(student_id: student_id).delete_all
ConversationMessage.joins(:session).where(sessions: { student_id: student_id }).delete_all

# Delete session summaries BEFORE sessions (they have a foreign key to sessions)
SessionSummary.where(student_id: student_id).delete_all

# Then delete transcripts (which will cascade to transcript_analyses via dependent: :destroy)
Transcript.where(student_id: student_id).destroy_all

# Delete sessions after summaries are gone (to avoid foreign key violation)
Session.where(student_id: student_id).delete_all

# Finally delete goals
Goal.where(student_id: student_id).delete_all

puts "  ✅ Deleted all existing transcripts, sessions, summaries, goals, practice problems, and routing events"
puts ""

# Step 2: Define subjects and topics
subjects_data = {
  "SAT" => {
    topics: ["Algebra and Linear Equations", "Geometry and Trigonometry", "Data Analysis", "Problem Solving", "Functions"],
    target_progress: 43,
    start_progress: 18,
    duration_minutes: 60
  },
  "Chemistry" => {
    topics: ["Stoichiometry", "Chemical Bonding", "Acids and Bases", "Thermodynamics", "Equilibrium"],
    target_progress: 76,
    start_progress: 52,
    duration_minutes: 60
  },
  "AP Calculus" => {
    topics: ["Limits and Continuity", "Derivatives", "Integration Techniques", "Applications of Integration", "Series"],
    target_progress: 83,
    start_progress: 68,
    duration_minutes: 60
  },
  "Computer Science" => {
    topics: ["Arrays and Lists", "Functions and Methods", "Object-Oriented Programming"],
    target_progress: 22,
    start_progress: 12,
    duration_minutes: 60
  }
}

# Step 3: Generate session dates
def generate_friday_dates(months_back = 3)
  dates = []
  today = Date.current
  start_date = today - (months_back * 30).days
  
  # Find the first Friday before or on start_date
  first_friday = start_date
  first_friday -= 1 while first_friday.wday != 5 # 5 = Friday
  
  current = first_friday
  while current <= today
    dates << current
    current += 7.days
  end
  
  dates
end

def generate_biweekly_tuesday_dates(months_back = 3)
  dates = []
  today = Date.current
  start_date = today - (months_back * 30).days
  
  # Find the first Tuesday before or on start_date
  first_tuesday = start_date
  first_tuesday -= 1 while first_tuesday.wday != 2 # 2 = Tuesday
  
  current = first_tuesday
  while current <= today
    dates << current
    # Skip one week (biweekly = every 2 weeks)
    current += 14.days
  end
  
  dates
end

def generate_alternating_thursday_dates(chemistry_dates, months_back = 3)
  dates = []
  today = Date.current
  start_date = today - (months_back * 30).days
  
  # Find the first Thursday before or on start_date
  first_thursday = start_date
  first_thursday -= 1 while first_thursday.wday != 4 # 4 = Thursday
  
  # Create set of chemistry dates for quick lookup
  chemistry_dates_set = Set.new(chemistry_dates)
  
  current = first_thursday
  while current <= today
    # Only add if this date's week doesn't have a Chemistry session
    # Check if any chemistry date is in the same week (same year and week number)
    week_has_chemistry = chemistry_dates.any? do |chem_date|
      chem_date.year == current.year && chem_date.cweek == current.cweek
    end
    
    unless week_has_chemistry
      dates << current
    end
    current += 7.days
  end
  
  dates
end

def generate_random_cs_dates(count = 3, months_back = 1, exclude_dates: [])
  dates = []
  today = Date.current
  start_date = today - (months_back * 30).days
  
  # Available days: Monday (1), Wednesday (3), Saturday (6)
  # Not: Sunday (0), Tuesday (2), Thursday (4), Friday (5)
  available_days = [1, 3, 6]
  
  # Create set of excluded dates for quick lookup
  excluded_set = Set.new(exclude_dates)
  
  attempts = 0
  while dates.length < count && attempts < 200
    random_date = start_date + rand((today - start_date).to_i).days
    if available_days.include?(random_date.wday) && 
       !dates.include?(random_date) && 
       !excluded_set.include?(random_date)
      dates << random_date
    end
    attempts += 1
  end
  
  dates.sort
end

# Generate all session dates
sat_dates = generate_friday_dates(3)
chemistry_dates = generate_biweekly_tuesday_dates(3)
calculus_dates = generate_alternating_thursday_dates(chemistry_dates, 3)
# Exclude SAT, Chemistry, and Calculus dates from CS dates
excluded_dates = sat_dates + chemistry_dates + calculus_dates
cs_dates = generate_random_cs_dates(3, 1, exclude_dates: excluded_dates)

puts "Step 2: Generated session dates:"
puts "  SAT: #{sat_dates.length} sessions (every Friday)"
puts "  Chemistry: #{chemistry_dates.length} sessions (every other Tuesday)"
puts "  AP Calculus: #{calculus_dates.length} sessions (Thursdays without Chemistry)"
puts "  Computer Science: #{cs_dates.length} sessions (random, last month only)"
puts ""

# Step 4: Generate transcripts with understanding level progression
def calculate_understanding_level(session_number, total_sessions, start_level, target_level)
  # Linear progression with small random variation
  progress_ratio = session_number.to_f / total_sessions
  base_level = start_level + (target_level - start_level) * progress_ratio
  # Add small random variation (±2%)
  variation = (rand * 4 - 2) # -2 to +2
  [0, [100, base_level + variation].min].max.round(1)
end

all_transcripts = []

# SAT transcripts
puts "Step 3: Generating SAT transcripts..."
sat_config = subjects_data["SAT"]
sat_dates.each_with_index do |date, index|
  topic = sat_config[:topics][index % sat_config[:topics].length]
  understanding = calculate_understanding_level(
    index + 1,
    sat_dates.length,
    sat_config[:start_progress],
    sat_config[:target_progress]
  )
  
  all_transcripts << {
    subject: "SAT",
    topic: topic,
    date: date,
    understanding: understanding,
    duration: sat_config[:duration_minutes]
  }
end
puts "  ✅ Generated #{sat_dates.length} SAT transcripts"
puts ""

# Chemistry transcripts
puts "Step 4: Generating Chemistry transcripts..."
chemistry_config = subjects_data["Chemistry"]
chemistry_dates.each_with_index do |date, index|
  topic = chemistry_config[:topics][index % chemistry_config[:topics].length]
  understanding = calculate_understanding_level(
    index + 1,
    chemistry_dates.length,
    chemistry_config[:start_progress],
    chemistry_config[:target_progress]
  )
  
  all_transcripts << {
    subject: "Chemistry",
    topic: topic,
    date: date,
    understanding: understanding,
    duration: chemistry_config[:duration_minutes]
  }
end
puts "  ✅ Generated #{chemistry_dates.length} Chemistry transcripts"
puts ""

# AP Calculus transcripts
puts "Step 5: Generating AP Calculus transcripts..."
calculus_config = subjects_data["AP Calculus"]
calculus_dates.each_with_index do |date, index|
  topic = calculus_config[:topics][index % calculus_config[:topics].length]
  understanding = calculate_understanding_level(
    index + 1,
    calculus_dates.length,
    calculus_config[:start_progress],
    calculus_config[:target_progress]
  )
  
  all_transcripts << {
    subject: "AP Calculus",
    topic: topic,
    date: date,
    understanding: understanding,
    duration: calculus_config[:duration_minutes]
  }
end
puts "  ✅ Generated #{calculus_dates.length} AP Calculus transcripts"
puts ""

# Computer Science transcripts
puts "Step 6: Generating Computer Science transcripts..."
cs_config = subjects_data["Computer Science"]
cs_dates.each_with_index do |date, index|
  topic = cs_config[:topics][index % cs_config[:topics].length]
  understanding = calculate_understanding_level(
    index + 1,
    cs_dates.length,
    cs_config[:start_progress],
    cs_config[:target_progress]
  )
  
  all_transcripts << {
    subject: "Computer Science",
    topic: topic,
    date: date,
    understanding: understanding,
    duration: cs_config[:duration_minutes]
  }
end
puts "  ✅ Generated #{cs_dates.length} Computer Science transcripts"
puts ""

# Sort all transcripts by date
all_transcripts.sort_by! { |t| t[:date] }

# Step 5: Create transcripts, sessions, and summaries
puts "Step 7: Creating transcripts, sessions, and summaries..."
transcript_service = TranscriptGenerationService.new(
  api_key: ENV['OPENAI_API_KEY'],
  use_openrouter: ENV['USE_OPENROUTER'] == 'true'
)

field_service = FieldGenerationService.new(
  api_key: ENV['OPENAI_API_KEY'],
  use_openrouter: ENV['USE_OPENROUTER'] == 'true'
)

summary_service = SessionSummaryService.new(
  api_key: ENV['OPENAI_API_KEY'],
  use_openrouter: ENV['USE_OPENROUTER'] == 'true'
)

created_transcripts = []
previous_understanding_by_subject = {}

all_transcripts.each_with_index do |config, index|
  subject = config[:subject]
  topic = config[:topic]
  date = config[:date]
  target_understanding = config[:understanding]
  duration = config[:duration]
  
  previous_understanding = previous_understanding_by_subject[subject] || 0.0
  
  puts "  Creating transcript #{index + 1}/#{all_transcripts.length}: #{subject} - #{topic} (#{date})"
  
  begin
    # Generate learning objectives and personality
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
    
    # Build understanding data
    understanding_service = UnderstandingLevelService.new(
      student_id: student_id,
      subject: subject,
      session_date: date
    )
    
    understanding_data = understanding_service.calculate_and_build_snapshots
    
    # Override with our calculated understanding level
    understanding_data[:understanding_level] = target_understanding
    understanding_data[:previous_understanding_level] = previous_understanding
    
    # Generate transcript
    generation_params = {
      student_id: student_id,
      subject: subject,
      topic: topic,
      student_level: 'intermediate',
      session_duration_minutes: duration,
      learning_objectives: learning_objectives,
      student_personality: student_personality,
      transcript_format: 'structured',
      session_date: date,
      session_count_this_week: 1,
      understanding_level: target_understanding,
      previous_understanding_level: previous_understanding,
      goals_snapshot: understanding_data[:goals_snapshot],
      session_history_summary: understanding_data[:session_history_summary]
    }
    
    result = transcript_service.generate(generation_params)
    
    # Create transcript
    transcript = Transcript.create!(
      student_id: student_id,
      subject: subject,
      topic: topic,
      student_level: 'intermediate',
      session_duration_minutes: duration,
      learning_objectives: learning_objectives,
      student_personality: student_personality,
      transcript_content: result[:transcript_content],
      generation_parameters: generation_params,
      model_used: result[:model_used],
      token_count: result[:token_count],
      generation_cost: result[:cost],
      session_date: date,
      session_count_this_week: 1,
      understanding_level: target_understanding,
      previous_understanding_level: previous_understanding,
      goals_snapshot: understanding_data[:goals_snapshot],
      session_history_summary: understanding_data[:session_history_summary],
      approved: true
    )
    
    # Create session
    session = Session.create!(
      student_id: student_id,
      subject: subject,
      topic: topic,
      scheduled_at: date.to_time,
      started_at: date.to_time,
      ended_at: date.to_time + duration.minutes,
      duration_minutes: duration,
      status: 'completed'
    )
    
    transcript.update!(session_id: session.id)
    
    # Create session summary
    begin
      summary_service.create_from_transcript(
        transcript,
        session_id: session.id,
        student_id: student_id
      )
      # Wait a bit for summary processing (if async)
      sleep(0.5) if summary_service.respond_to?(:async)
    rescue => e
      puts "    Warning: Could not create session summary: #{e.message}"
    end
    
    created_transcripts << transcript
    previous_understanding_by_subject[subject] = target_understanding
    
    puts "    ✅ Created transcript ID: #{transcript.id}, Understanding: #{target_understanding.round(1)}%"
    
  rescue => e
    puts "    ❌ Error: #{e.message}"
    puts "    #{e.backtrace.first(3).join("\n    ")}"
  end
end

puts ""
puts "  ✅ Created #{created_transcripts.length} transcripts with sessions and summaries"
puts ""

# Step 6: Generate long-term goals
puts "Step 8: Generating long-term goals..."

long_term_goals = {}

subjects_data.each do |subject_name, config|
  # Get unique topics for this subject from created transcripts
  subject_transcripts = created_transcripts.select { |t| t.subject == subject_name }
  unique_topics = subject_transcripts.map(&:topic).uniq
  
  # Create 1-2 long-term goals per subject
  goals_to_create = unique_topics.first(2) # Take first 2 topics
  
  goals_to_create.each do |topic|
    goal = Goal.create!(
      student_id: student_id,
      subject: subject_name,
      goal_type: 'long_term',
      title: "Master #{topic}",
      description: "Achieve mastery of #{topic} concepts in #{subject_name}",
      status: 'active',
      progress_percentage: 0,
      target_date: Date.current + 6.months
    )
    
    long_term_goals[subject_name] ||= []
    long_term_goals[subject_name] << goal
    
    puts "  ✅ Created long-term goal: #{goal.title} (#{subject_name})"
  end
end

puts ""
puts "  ✅ Created #{long_term_goals.values.flatten.length} long-term goals"
puts ""

# Step 7: Calculate progress for long-term goals
puts "Step 9: Calculating progress for long-term goals..."

long_term_goals.each do |subject_name, goals|
  goals.each do |goal|
    begin
      progress_service = LongTermGoalProgressService.new(goal.id)
      progress = progress_service.calculate_and_update
      puts "  ✅ Updated progress for '#{goal.title}': #{progress}%"
    rescue => e
      puts "    Warning: Could not calculate progress for '#{goal.title}': #{e.message}"
    end
  end
end

puts ""

# Step 8: Generate short-term goals
puts "Step 10: Generating short-term goals..."
puts "  Waiting for session summaries to be processed..."

# Wait for summaries to be processed (check every 2 seconds, max 30 seconds)
max_wait = 30
waited = 0
while waited < max_wait
  pending_summaries = SessionSummary.where(student_id: student_id, processing_status: ['pending', 'processing']).count
  if pending_summaries == 0
    break
  end
  sleep(2)
  waited += 2
  puts "    Waiting... (#{pending_summaries} summaries still processing)"
end

short_term_goals_created = 0

# Get all subjects that have transcripts
subjects_with_transcripts = Transcript.where(student_id: student_id).distinct.pluck(:subject)

# Get all subjects that have long-term goals
subjects_with_lt_goals = Goal.where(student_id: student_id, goal_type: 'long_term', status: 'active').distinct.pluck(:subject)

# Generate short-term goals for all subjects that have both transcripts and long-term goals
subjects_to_process = (subjects_with_transcripts & subjects_with_lt_goals).uniq

puts "  Processing #{subjects_to_process.length} subjects with transcripts and long-term goals..."

subjects_to_process.each do |subject_name|
  begin
    api_key = ENV['OPENAI_API_KEY']
    use_openrouter = ENV['USE_OPENROUTER'] == 'true'
    
    suggestion_service = ShortTermGoalSuggestionService.new(
      student_id, 
      subject_name,
      api_key: api_key,
      use_openrouter: use_openrouter
    )
    
    # Use the new generate_and_save_goals method which handles creation and updates
    result = suggestion_service.generate_and_save_goals(subject_name)
    
    if result[:created].empty? && result[:updated].empty?
      # If no goals were generated but subject has transcripts and long-term goals,
      # create a fallback short-term goal linked to the first long-term goal
      long_term_goal = Goal.where(student_id: student_id, subject: subject_name, goal_type: 'long_term', status: 'active').first
      if long_term_goal
        fallback_goal = Goal.create!(
          student_id: student_id,
          subject: subject_name,
          goal_type: 'short_term',
          parent_goal_id: long_term_goal.id,
          title: "Work on #{subject_name} fundamentals",
          description: "Build foundational skills in #{subject_name} to support long-term goals",
          status: 'active',
          progress_percentage: 0,
          target_date: Date.current + 2.weeks,
          metadata: {
            'source' => 'fallback',
            'generation_date' => Date.current.iso8601,
            'priority' => 0.5,
            'confidence' => 0.5
          }
        )
        short_term_goals_created += 1
        puts "  ✅ Created fallback short-term goal: #{fallback_goal.title} (linked to #{long_term_goal.title})"
      else
        puts "    ⚠️  No short-term goals generated for #{subject_name} (no long-term goal found)"
      end
      next
    end
    
    result[:created].each do |goal|
      short_term_goals_created += 1
      parent_info = goal.parent_goal ? " (linked to #{goal.parent_goal.title})" : ""
      puts "  ✅ Created short-term goal: #{goal.title}#{parent_info}"
    end
    
    result[:updated].each do |goal|
      puts "  🔄 Updated short-term goal: #{goal.title}"
    end
  rescue => e
    puts "    ⚠️  Warning: Could not generate short-term goals for #{subject_name}: #{e.message}"
    puts "    #{e.backtrace.first(2).join("\n    ")}"
  end
end

puts ""
puts "  ✅ Created #{short_term_goals_created} short-term goals"
puts ""

# Final summary
puts "=" * 80
puts "✅ COMPLETED: Comprehensive dummy data generation"
puts "=" * 80
puts ""
puts "Summary:"
puts "  Transcripts: #{created_transcripts.length}"
puts "  Sessions: #{Session.where(student_id: student_id).count}"
puts "  Session Summaries: #{SessionSummary.where(student_id: student_id).count}"
puts "  Long-term Goals: #{Goal.where(student_id: student_id, goal_type: 'long_term').count}"
puts "  Short-term Goals: #{Goal.where(student_id: student_id, goal_type: 'short_term').count}"
puts ""
puts "By Subject:"
subjects_data.keys.each do |subject|
  transcripts_count = created_transcripts.count { |t| t.subject == subject }
  latest_understanding = created_transcripts.select { |t| t.subject == subject }
                                      .max_by(&:session_date)&.understanding_level
  puts "  #{subject}:"
  puts "    Transcripts: #{transcripts_count}"
  puts "    Latest Understanding: #{latest_understanding&.round(1) || 'N/A'}%"
  puts "    Long-term Goals: #{long_term_goals[subject]&.length || 0}"
  puts "    Short-term Goals: #{Goal.where(student_id: student_id, subject: subject, goal_type: 'short_term').count}"
end
puts ""

