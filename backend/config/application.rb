require_relative "boot"

require "rails/all"

Bundler.require(*Rails.groups)

module StudyCompanion
  class Application < Rails::Application
    config.load_defaults 7.1
    config.api_only = true
    
    # Active Storage configuration
    # Use local storage unless AWS S3 bucket is configured
    config.active_storage.service = (Rails.env.production? && ENV['AWS_S3_BUCKET'].present?) ? :amazon : :local
    
    # ActiveJob adapter - use async in production if Redis not available, otherwise use sidekiq
    config.active_job.queue_adapter = ENV['REDIS_URL'].present? ? :sidekiq : :async
    
    config.middleware.insert_before 0, Rack::Cors do
      allow do
        # Allow all origins in development, specific origins in production
        origins ENV.fetch('CORS_ORIGINS', '*').split(',')
        resource '*',
          headers: :any,
          methods: [:get, :post, :put, :patch, :delete, :options, :head],
          credentials: false
      end
    end
  end
end

