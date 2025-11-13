# Dockerfile for Railway deployment
# Migrations run in release phase, NOT during build

FROM ruby:3.2.0

WORKDIR /app

# Install system dependencies
RUN apt-get update -qq && \
    apt-get install -y build-essential libpq-dev nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install bundler
RUN gem install bundler

# Copy dependency files first (for better Docker layer caching)
COPY backend/Gemfile backend/Gemfile.lock ./

# Install dependencies
RUN bundle install --deployment --without development test

# Copy application code
COPY backend/ ./

# Set production environment
ENV RAILS_ENV=production
ENV RACK_ENV=production

# Expose port (Railway will set PORT env var)
EXPOSE 8080

# DO NOT run migrations here - they run in release phase via Procfile/releaseCommand
# The Procfile in backend/ has: release: bundle exec rails db:migrate || true
# Railway will run this in the release phase, not during build

# Start command
CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]

