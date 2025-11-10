#!/usr/bin/env ruby
# Script to check and generate missing short-term goals for all subjects

student_id = 1

puts "=" * 80
puts "Checking and Generating Short-Term Goals"
puts "=" * 80
puts ""

# Get all subjects that have transcripts
subjects_with_transcripts = Transcript.where(student_id: student_id).distinct.pluck(:subject)
puts "Subjects with transcripts: #{subjects_with_transcripts.inspect}"
puts ""

# Get all subjects that have long-term goals
subjects_with_lt_goals = Goal.where(student_id: student_id, goal_type: 'long_term', status: 'active').distinct.pluck(:subject)
puts "Subjects with long-term goals: #{subjects_with_lt_goals.inspect}"
puts ""

# Get all subjects that have short-term goals
subjects_with_st_goals = Goal.where(student_id: student_id, goal_type: 'short_term').distinct.pluck(:subject)
puts "Subjects with short-term goals: #{subjects_with_st_goals.inspect}"
puts ""

# Find subjects that need short-term goals
subjects_needing_st_goals = (subjects_with_transcripts & subjects_with_lt_goals) - subjects_with_st_goals
puts "Subjects needing short-term goals: #{subjects_needing_st_goals.inspect}"
puts ""

if subjects_needing_st_goals.empty?
  puts "✅ All subjects with transcripts and long-term goals already have short-term goals!"
  puts ""
  
  # Show current counts
  subjects_with_transcripts.each do |subject|
    lt_count = Goal.where(student_id: student_id, subject: subject, goal_type: 'long_term', status: 'active').count
    st_count = Goal.where(student_id: student_id, subject: subject, goal_type: 'short_term', status: 'active').count
    puts "  #{subject}: #{lt_count} long-term, #{st_count} short-term goals"
  end
else
  puts "Generating short-term goals for #{subjects_needing_st_goals.length} subjects..."
  puts ""
  
  api_key = ENV['OPENAI_API_KEY']
  use_openrouter = ENV['USE_OPENROUTER'] == 'true'
  
  short_term_goals_created = 0
  
  subjects_needing_st_goals.each do |subject_name|
    begin
      puts "Processing #{subject_name}..."
      
      suggestion_service = ShortTermGoalSuggestionService.new(
        student_id, 
        subject_name,
        api_key: api_key,
        use_openrouter: use_openrouter
      )
      
      result = suggestion_service.generate_and_save_goals(subject_name)
      
      if result[:created].empty? && result[:updated].empty?
        # Create fallback goal
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
          puts "  ✅ Created fallback short-term goal: #{fallback_goal.title}"
        else
          puts "  ⚠️  No long-term goal found for #{subject_name}"
        end
      else
        result[:created].each do |goal|
          short_term_goals_created += 1
          parent_info = goal.parent_goal ? " (linked to #{goal.parent_goal.title})" : ""
          puts "  ✅ Created short-term goal: #{goal.title}#{parent_info}"
        end
        
        result[:updated].each do |goal|
          puts "  🔄 Updated short-term goal: #{goal.title}"
        end
      end
    rescue => e
      puts "  ❌ Error: #{e.message}"
      puts "    #{e.backtrace.first(2).join("\n    ")}"
    end
    puts ""
  end
  
  puts "✅ Created #{short_term_goals_created} short-term goals"
  puts ""
end

# Final summary
puts "=" * 80
puts "Final Summary:"
puts "=" * 80
subjects_with_transcripts.each do |subject|
  lt_count = Goal.where(student_id: student_id, subject: subject, goal_type: 'long_term', status: 'active').count
  st_count = Goal.where(student_id: student_id, subject: subject, goal_type: 'short_term', status: 'active').count
  st_all_count = Goal.where(student_id: student_id, subject: subject, goal_type: 'short_term').count
  puts "  #{subject}:"
  puts "    Long-term goals: #{lt_count}"
  puts "    Short-term goals (active): #{st_count}"
  puts "    Short-term goals (all): #{st_all_count}"
end
puts ""

