namespace :transcripts do
  desc "Generate 5 transcripts for student ID 1 across 3 subjects including SAT Math Prep with progression"
  task generate_student_1: :environment do
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
    
    # Define 3 subjects with topics - including SAT Math Prep
    subjects_data = [
      {
        subject: "SAT Math Prep",
        topics: ["Algebra and Linear Equations", "Geometry and Trigonometry"]
      },
      {
        subject: "AP Calculus BC",
        topics: ["Derivatives", "Integration Techniques"]
      },
      {
        subject: "AP Physics C: Mechanics",
        topics: ["Kinematics"]
      }
    ]
    
    # Generate 5 transcripts with progression:
    # SAT Math Prep: 2 sessions (showing progress)
    # AP Calculus BC: 2 sessions (showing progress)
    # AP Physics: 1 session
    transcript_configs = [
      { subject_index: 0, topic_index: 0, days_ago: 75, understanding_base: 25 },  # SAT Math - Algebra (oldest, first session)
      { subject_index: 0, topic_index: 1, days_ago: 60, understanding_base: 45 },  # SAT Math - Geometry (progress from 25%)
      { subject_index: 1, topic_index: 0, days_ago: 45, understanding_base: 30 },  # AP Calculus - Derivatives (first session)
      { subject_index: 1, topic_index: 1, days_ago: 30, understanding_base: 50 },  # AP Calculus - Integration (progress from 30%)
      { subject_index: 2, topic_index: 0, days_ago: 15, understanding_base: 35 }   # AP Physics - Kinematics (most recent, first session)
    ]
    
    puts "Generating 5 transcripts for student ID #{student_id} with progression..."
    puts "Subjects: SAT Math Prep (2 sessions), AP Calculus BC (2 sessions), AP Physics C: Mechanics (1 session)"
    puts ""
    
    transcript_configs.each_with_index do |config, index|
      subject_data = subjects_data[config[:subject_index]]
      subject = subject_data[:subject]
      topic = subject_data[:topics][config[:topic_index]]
      session_date = Date.current - config[:days_ago].days
      
      puts "Generating transcript #{index + 1}/5:"
      puts "  Subject: #{subject}"
      puts "  Topic: #{topic}"
      puts "  Session Date: #{session_date} (#{config[:days_ago]} days ago)"
      
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
        
        # Calculate understanding level with progression
        understanding_service = UnderstandingLevelService.new(
          student_id: student_id,
          subject: subject,
          session_date: session_date
        )
        
        understanding_data = understanding_service.calculate_and_build_snapshots
        
        # For first session in a subject, use the base understanding level
        # For subsequent sessions, ensure progression (should be higher than previous)
        if understanding_data[:previous_understanding_level] == 0.0
          # First session - use base level adjusted for student level
          base_level = config[:understanding_base]
          understanding_data[:understanding_level] = understanding_service.adjust_for_student_level(
            base_level,
            'intermediate'
          )
        else
          # Subsequent session - ensure it's higher than previous (with some variation)
          previous = understanding_data[:previous_understanding_level]
          # Add 10-25% progress, but ensure it's at least the base level
          progress = rand(10..25)
          new_level = [previous + progress, config[:understanding_base]].max
          # Cap at 100%
          understanding_data[:understanding_level] = [new_level, 100.0].min
        end
        
        # Generate session count (1-2 for showing progress, occasionally 3)
        session_count = [1, 1, 2, 2, 2].sample
        
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
        
        progress_indicator = understanding_data[:previous_understanding_level] > 0 ? 
          " (↑ from #{understanding_data[:previous_understanding_level].round(1)}%)" : 
          " (first session)"
        
        puts "  ✅ Created transcript ID: #{transcript.id}"
        puts "  Understanding Level: #{transcript.understanding_level.round(1)}%#{progress_indicator}"
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
    
    puts ""
    puts "✅ Completed generating transcripts!"
    puts ""
    puts "Summary by Subject:"
    Transcript.where(student_id: student_id).order(:session_date).group(:subject).each do |subject, transcripts|
      transcript_list = Transcript.where(student_id: student_id, subject: subject).order(:session_date)
      puts "  #{subject}:"
      transcript_list.each do |t|
        progress = t.previous_understanding_level > 0 ? 
          " (↑ from #{t.previous_understanding_level.round(1)}%)" : 
          " (first session)"
        puts "    - #{t.topic} (#{t.session_date}): #{t.understanding_level.round(1)}%#{progress}"
      end
    end
    puts ""
    puts "Total transcripts: #{Transcript.where(student_id: student_id).count}"
  end
end


