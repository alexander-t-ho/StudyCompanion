require_relative "boot"

require "rails/all"

Bundler.require(*Rails.groups)

module StudyCompanion
  class Application < Rails::Application
    config.load_defaults 7.1
    config.api_only = true
    
    # ActiveJob adapter
    config.active_job.queue_adapter = :sidekiq
    
    config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins '*'
        resource '*',
          headers: :any,
          methods: [:get, :post, :put, :patch, :delete, :options, :head]
      end
    end
  end
end

