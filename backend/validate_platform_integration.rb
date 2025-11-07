#!/usr/bin/env ruby
# Platform Integration Validation Script

require 'fileutils'
require 'json'

class PlatformIntegrationValidator
  def initialize
    @errors = []
    @warnings = []
    @success = []
  end

  def validate
    puts "=" * 60
    puts "Platform Integration Validation"
    puts "=" * 60
    puts

    check_database_migrations
    check_models
    check_controllers
    check_services
    check_routes
    check_jobs
    check_config

    print_results
  end

  private

  def check_database_migrations
    puts "Checking database migrations..."
    migrations_dir = "db/migrate"
    
    required_migrations = [
      "enable_pgvector_extension",
      "create_transcripts",
      "create_transcript_analyses",
      "create_students",
      "create_sessions",
      "create_goals",
      "create_ai_companion_profiles",
      "create_session_summaries",
      "create_conversation_messages",
      "create_practice_problems",
      "create_goal_suggestions",
      "create_early_engagement_nudges",
      "create_tutor_routing_events"
    ]

    if Dir.exist?(migrations_dir)
      migration_files = Dir.glob("#{migrations_dir}/*.rb")
      found_migrations = migration_files.map { |f| File.basename(f) }
      
      required_migrations.each do |migration_name|
        found = found_migrations.any? { |f| f.include?(migration_name) }
        if found
          @success << "✓ Migration: #{migration_name}"
        else
          @errors << "✗ Missing migration: #{migration_name}"
        end
      end
    else
      @errors << "✗ Migrations directory not found: #{migrations_dir}"
    end
    puts
  end

  def check_models
    puts "Checking models..."
    models_dir = "app/models"
    
    required_models = [
      "student.rb",
      "session.rb",
      "goal.rb",
      "transcript.rb",
      "transcript_analysis.rb",
      "ai_companion_profile.rb",
      "session_summary.rb",
      "conversation_message.rb",
      "practice_problem.rb",
      "goal_suggestion.rb",
      "early_engagement_nudge.rb",
      "tutor_routing_event.rb"
    ]

    if Dir.exist?(models_dir)
      required_models.each do |model|
        path = File.join(models_dir, model)
        if File.exist?(path)
          @success << "✓ Model: #{model}"
        else
          @errors << "✗ Missing model: #{model}"
        end
      end
    else
      @errors << "✗ Models directory not found: #{models_dir}"
    end
    puts
  end

  def check_controllers
    puts "Checking controllers..."
    controllers_dir = "app/controllers"
    
    required_controllers = [
      "api/ai_companion/base_controller.rb",
      "api/ai_companion/chat_controller.rb",
      "api/ai_companion/practice_controller.rb",
      "api/ai_companion/profile_controller.rb",
      "api/ai_companion/session_summaries_controller.rb",
      "api/ai_companion/routing_controller.rb",
      "api/retention/base_controller.rb",
      "api/retention/goal_suggestions_controller.rb",
      "api/retention/nudges_controller.rb",
      "api/retention/progress_dashboard_controller.rb",
      "api/v1/transcripts_controller.rb",
      "api/v1/transcript_analyses_controller.rb",
      "api/v1/session_summaries_controller.rb"
    ]

    required_controllers.each do |controller|
      path = File.join(controllers_dir, controller)
      if File.exist?(path)
        @success << "✓ Controller: #{controller}"
      else
        @errors << "✗ Missing controller: #{controller}"
      end
    end
    puts
  end

  def check_services
    puts "Checking services..."
    services_dir = "app/services"
    
    required_services = [
      "transcript_generation_service.rb",
      "transcript_analysis_service.rb",
      "embedding_service.rb",
      "session_summary_service.rb"
    ]

    if Dir.exist?(services_dir)
      required_services.each do |service|
        path = File.join(services_dir, service)
        if File.exist?(path)
          @success << "✓ Service: #{service}"
        else
          @errors << "✗ Missing service: #{service}"
        end
      end
    else
      @errors << "✗ Services directory not found: #{services_dir}"
    end
    puts
  end

  def check_routes
    puts "Checking routes..."
    routes_file = "config/routes.rb"
    
    if File.exist?(routes_file)
      content = File.read(routes_file)
      
      required_routes = [
        "ai_companion",
        "retention",
        "transcripts",
        "session-summaries"
      ]
      
      required_routes.each do |route|
        if content.include?(route)
          @success << "✓ Route namespace: #{route}"
        else
          @warnings << "⚠ Route namespace may be missing: #{route}"
        end
      end
    else
      @errors << "✗ Routes file not found: #{routes_file}"
    end
    puts
  end

  def check_jobs
    puts "Checking background jobs..."
    jobs_dir = "app/jobs"
    
    required_jobs = [
      "application_job.rb",
      "session_summary_processor_job.rb"
    ]

    if Dir.exist?(jobs_dir)
      required_jobs.each do |job|
        path = File.join(jobs_dir, job)
        if File.exist?(path)
          @success << "✓ Job: #{job}"
        else
          @errors << "✗ Missing job: #{job}"
        end
      end
    else
      @errors << "✗ Jobs directory not found: #{jobs_dir}"
    end
    puts
  end

  def check_config
    puts "Checking configuration..."
    
    config_files = [
      "config/application.rb",
      "config/database.yml",
      "config/routes.rb",
      "config/initializers/sidekiq.rb",
      "config/sidekiq.yml"
    ]

    config_files.each do |config|
      if File.exist?(config)
        @success << "✓ Config: #{config}"
      else
        @warnings << "⚠ Missing config: #{config}"
      end
    end
    puts
  end

  def print_results
    puts "=" * 60
    puts "Validation Results"
    puts "=" * 60
    puts

    if @success.any?
      puts "✅ SUCCESS (#{@success.count}):"
      @success.each { |msg| puts "  #{msg}" }
      puts
    end

    if @warnings.any?
      puts "⚠️  WARNINGS (#{@warnings.count}):"
      @warnings.each { |msg| puts "  #{msg}" }
      puts
    end

    if @errors.any?
      puts "❌ ERRORS (#{@errors.count}):"
      @errors.each { |msg| puts "  #{msg}" }
      puts
    end

    puts "=" * 60
    if @errors.empty?
      puts "✅ Platform Integration structure is VALID"
      puts
      puts "Next steps:"
      puts "1. Install dependencies: bundle install"
      puts "2. Set up database: rails db:create db:migrate"
      puts "3. Seed test data: rails db:seed"
      puts "4. Start server: rails server"
      puts "5. Test endpoints using the validation UI or curl commands"
    else
      puts "❌ Platform Integration has ERRORS that need to be fixed"
    end
    puts "=" * 60
  end
end

# Run validation
validator = PlatformIntegrationValidator.new
validator.validate

