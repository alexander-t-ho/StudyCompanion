# Sub-PRD: Platform Integration

## 1. Overview

### 1.1 Purpose
This sub-PRD defines the integration requirements for connecting the AI Study Companion with the existing Rails/React platform. It covers authentication, data access, session recording integration, database extensions, and API design.

### 1.2 Relationship to Other PRDs
- **Enables**: Core AI Companion PRD (provides data access and session content)
- **Enables**: Retention Enhancement PRD (provides goal tracking and booking system access)
- **Measured by**: Analytics & Measurement PRD (integration success metrics)

### 1.3 Business Context
The AI Study Companion must integrate seamlessly with the existing platform without disrupting current functionality. Integration should be minimal, maintainable, and follow existing patterns.

## 2. Integration Requirements

### 2.1 Rails/React Platform Integration

#### 2.1.1 Description
Seamless integration with existing Rails backend and React frontend, maintaining consistency with current architecture and patterns.

#### 2.1.2 Requirements
- Authenticate using existing authentication system
- Access student profiles, goals, and session history via existing APIs
- Store AI companion data in existing database schema (extend as needed)
- Match existing UI/UX design patterns and component library
- Follow existing code style and architecture patterns
- Maintain backward compatibility with existing features
- Support existing deployment infrastructure

#### 2.1.3 Integration Points
- **Authentication**: Use existing JWT/OAuth/Devise authentication
- **Authorization**: Respect existing role-based access control
- **API Design**: Follow existing RESTful API patterns
- **Database**: Extend existing PostgreSQL schema
- **Frontend**: Integrate React components into existing app
- **Deployment**: Use existing CI/CD and deployment processes

### 2.2 Session Recording Integration

#### 2.2.1 Description
Integrate with existing session recording system to extract and process session content for AI companion memory and context.

#### 2.2.2 Requirements
- Access session recordings (video/audio/transcripts)
- Extract key learning points, topics covered, and concepts discussed
- Store extracted information in structured format
- Link extracted content to specific sessions and students
- Update learning profile based on session content
- Handle privacy and data retention policies
- Process recordings asynchronously (background jobs)

#### 2.2.3 Session Recording Sources
- **Video Recordings**: MP4, WebM, or other video formats
- **Audio Recordings**: MP3, WAV, or other audio formats
- **Transcripts**: Pre-generated transcripts (if available)
- **Storage**: S3, CloudFront, or existing storage solution

## 3. Technical Architecture

### 3.1 Authentication & Authorization

#### 3.1.1 Current System Analysis
- **Need to determine**: Current authentication mechanism
  - JWT tokens?
  - OAuth (Google, Facebook)?
  - Devise (Rails gem)?
  - Custom authentication?
- **Authorization**: Role-based access control structure

#### 3.1.2 Integration Approach
- Extend existing authentication to support AI companion access
- Use same session/token mechanism for AI companion API calls
- Respect existing authorization rules (students can only access their own data)
- Add new permissions if needed (e.g., `ai_companion_access`)

#### 3.1.3 API Authentication
```ruby
# Example Rails integration (assumes JWT)
class Api::AiCompanion::BaseController < ApplicationController
  before_action :authenticate_student!
  before_action :verify_ai_companion_access

  private

  def verify_ai_companion_access
    # Check if student has AI companion enabled
    # Could be feature flag, subscription tier, etc.
  end
end
```

### 3.2 Database Schema Extensions

#### 3.2.1 Existing Schema Analysis
- **Need to determine**: Current database schema
  - Students table structure
  - Sessions table structure
  - Goals table structure
  - Relationships and foreign keys

#### 3.2.2 New Tables Required
```sql
-- AI Companion Profile (extends Student)
CREATE TABLE ai_companion_profiles (
  id SERIAL PRIMARY KEY,
  student_id INTEGER UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  conversation_history JSONB DEFAULT '[]',
  learning_preferences JSONB DEFAULT '{}',
  last_interaction_at TIMESTAMP,
  total_interactions_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Session Summaries (linked to Sessions)
CREATE TABLE session_summaries (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  extracted_topics TEXT[],
  key_concepts TEXT[],
  learning_points TEXT,
  strengths_identified TEXT[],
  areas_for_improvement TEXT[],
  embeddings VECTOR(1536), -- OpenAI embedding dimension
  processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversation Messages
CREATE TABLE conversation_messages (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  session_id INTEGER REFERENCES sessions(id), -- Optional: link to relevant session
  created_at TIMESTAMP DEFAULT NOW()
);

-- Practice Problems
CREATE TABLE practice_problems (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  goal_id INTEGER REFERENCES goals(id), -- Optional: link to specific goal
  subject VARCHAR(100),
  topic VARCHAR(200),
  difficulty_level INTEGER, -- 1-10 scale
  problem_content JSONB NOT NULL, -- Flexible format for different problem types
  correct_answer JSONB,
  solution_steps JSONB,
  assigned_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  student_answer JSONB,
  is_correct BOOLEAN,
  feedback TEXT,
  attempts_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Goal Suggestions (for retention features)
CREATE TABLE goal_suggestions (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  source_goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
  suggested_subject VARCHAR(100) NOT NULL,
  suggested_goal_type VARCHAR(50),
  reasoning TEXT,
  confidence FLOAT,
  presented_at TIMESTAMP,
  accepted_at TIMESTAMP,
  created_goal_id INTEGER REFERENCES goals(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Early Engagement Nudges
CREATE TABLE early_engagement_nudges (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  nudge_type VARCHAR(50),
  message TEXT NOT NULL,
  delivery_channel VARCHAR(50),
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  session_booked BOOLEAN DEFAULT FALSE,
  session_id INTEGER REFERENCES sessions(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tutor Routing Events
CREATE TABLE tutor_routing_events (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES conversation_messages(id),
  routing_reason TEXT,
  routing_confidence FLOAT,
  urgency VARCHAR(20), -- low, medium, high
  session_booked BOOLEAN DEFAULT FALSE,
  session_id INTEGER REFERENCES sessions(id),
  tutor_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_profiles_student ON ai_companion_profiles(student_id);
CREATE INDEX idx_session_summaries_session ON session_summaries(session_id);
CREATE INDEX idx_session_summaries_student ON session_summaries(student_id);
CREATE INDEX idx_session_summaries_status ON session_summaries(processing_status);
CREATE INDEX idx_conversation_student ON conversation_messages(student_id, created_at);
CREATE INDEX idx_practice_student ON practice_problems(student_id, assigned_at);
CREATE INDEX idx_practice_goal ON practice_problems(goal_id);
CREATE INDEX idx_goal_suggestions_student ON goal_suggestions(student_id, presented_at);
CREATE INDEX idx_nudges_student ON early_engagement_nudges(student_id, sent_at);
CREATE INDEX idx_routing_student ON tutor_routing_events(student_id, created_at);

-- Vector similarity search index (pgvector)
CREATE INDEX idx_session_summaries_embeddings ON session_summaries 
USING ivfflat (embeddings vector_cosine_ops) WITH (lists = 100);
```

#### 3.2.3 Migration Strategy
- Use Rails migrations for schema changes
- Add indexes for performance
- Add foreign key constraints for data integrity
- Consider adding pgvector extension if not already present
- Plan for zero-downtime migrations if needed

### 3.3 Rails API Extensions

#### 3.3.1 API Endpoints Structure
```ruby
# config/routes.rb
namespace :api do
  namespace :ai_companion do
    # Chat endpoints
    post '/chat', to: 'chat#create'
    get '/conversation-history', to: 'chat#history'
    
    # Practice endpoints
    post '/practice/generate', to: 'practice#generate'
    get '/practice/list', to: 'practice#index'
    post '/practice/:id/submit', to: 'practice#submit'
    
    # Student profile endpoints
    get '/profile', to: 'profile#show'
    patch '/profile', to: 'profile#update'
    
    # Session summary endpoints
    get '/session-summaries', to: 'session_summaries#index'
    get '/session-summaries/:id', to: 'session_summaries#show'
    
    # Tutor routing endpoints
    post '/routing/check', to: 'routing#check'
    post '/routing/request', to: 'routing#request'
  end
  
  namespace :retention do
    # Goal suggestions
    get '/goal-suggestions/:goal_id', to: 'goal_suggestions#index'
    post '/goal-suggestions/:id/accept', to: 'goal_suggestions#accept'
    
    # Nudges
    get '/nudges/eligibility', to: 'nudges#eligibility'
    post '/nudges/send', to: 'nudges#send'
    
    # Progress dashboard
    get '/progress-dashboard', to: 'progress_dashboard#show'
    get '/progress-dashboard/insights', to: 'progress_dashboard#insights'
  end
end
```

#### 3.3.2 API Response Format
- Follow existing API response format (JSON)
- Consistent error handling
- Pagination for list endpoints
- Rate limiting (if implemented)

#### 3.3.3 Example Controller
```ruby
# app/controllers/api/ai_companion/chat_controller.rb
module Api
  module AiCompanion
    class ChatController < BaseController
      def create
        message = params[:message]
        context = params[:context] || {}
        
        # Call AI companion service
        response = AiCompanionService.new(current_student).chat(
          message: message,
          context: context
        )
        
        render json: {
          response: response[:content],
          context: response[:context],
          routing_suggested: response[:routing_suggested]
        }
      rescue StandardError => e
        render json: { error: e.message }, status: :internal_server_error
      end
      
      def history
        messages = current_student.conversation_messages
          .order(created_at: :desc)
          .limit(50)
          .reverse
        
        render json: {
          messages: messages.map { |m| message_json(m) }
        }
      end
      
      private
      
      def message_json(message)
        {
          id: message.id,
          role: message.role,
          content: message.content,
          created_at: message.created_at
        }
      end
    end
  end
end
```

### 3.4 Session Recording Processor

#### 3.4.1 Architecture
- **Service**: Background job processor (Sidekiq, DelayedJob, or ActiveJob)
- **Processing Steps**:
  1. Fetch session recording from storage
  2. Transcribe audio/video (using Whisper or similar)
  3. Extract key learning points using LLM
  4. Generate structured summary
  5. Create embeddings for semantic search
  6. Store in database

#### 3.4.2 Background Job
```ruby
# app/jobs/session_recording_processor_job.rb
class SessionRecordingProcessorJob < ApplicationJob
  queue_as :default
  
  def perform(session_id)
    session = Session.find(session_id)
    
    # Update status to processing
    summary = SessionSummary.find_or_create_by(session_id: session_id)
    summary.update(processing_status: 'processing')
    
    begin
      # 1. Fetch recording
      recording_url = session.recording_url
      recording_data = fetch_recording(recording_url)
      
      # 2. Transcribe
      transcript = transcribe_recording(recording_data)
      
      # 3. Extract learning points
      learning_points = extract_learning_points(transcript, session)
      
      # 4. Generate embeddings
      embeddings = generate_embeddings(transcript)
      
      # 5. Save summary
      summary.update(
        student_id: session.student_id,
        extracted_topics: learning_points[:topics],
        key_concepts: learning_points[:concepts],
        learning_points: learning_points[:summary],
        strengths_identified: learning_points[:strengths],
        areas_for_improvement: learning_points[:improvements],
        embeddings: embeddings,
        processing_status: 'completed',
        processed_at: Time.current
      )
      
    rescue StandardError => e
      summary.update(
        processing_status: 'failed',
        error_message: e.message
      )
      raise e
    end
  end
  
  private
  
  def fetch_recording(url)
    # Fetch from S3 or storage
  end
  
  def transcribe_recording(data)
    # Use Whisper API or similar
    TranscriptionService.new.transcribe(data)
  end
  
  def extract_learning_points(transcript, session)
    # Use LLM to extract structured information
    LearningPointExtractor.new.extract(transcript, session)
  end
  
  def generate_embeddings(text)
    # Use OpenAI embeddings API
    EmbeddingService.new.generate(text)
  end
end
```

#### 3.4.3 Trigger Points
- **Automatic**: Triggered when session recording becomes available
- **Manual**: Admin can trigger reprocessing if needed
- **Retry**: Automatic retry on failure (with exponential backoff)

### 3.5 React Frontend Integration

#### 3.5.1 Component Structure
```
src/
  components/
    ai-companion/
      ChatInterface.jsx
      MessageBubble.jsx
      PracticeProblem.jsx
      ProgressDashboard.jsx
      GoalSuggestions.jsx
    retention/
      EarlyEngagementNudge.jsx
      MultiGoalProgress.jsx
```

#### 3.5.2 Integration Points
- Use existing routing (React Router)
- Use existing state management (Redux/Context)
- Use existing UI component library
- Follow existing styling patterns (CSS modules, styled-components, etc.)

#### 3.5.3 API Client
```javascript
// src/services/aiCompanionApi.js
import api from './api'; // Existing API client

export const aiCompanionApi = {
  sendMessage: (message, context) => 
    api.post('/api/ai_companion/chat', { message, context }),
  
  getConversationHistory: () => 
    api.get('/api/ai_companion/conversation-history'),
  
  generatePractice: (subject, topic) => 
    api.post('/api/ai_companion/practice/generate', { subject, topic }),
  
  submitPractice: (problemId, answer) => 
    api.post(`/api/ai_companion/practice/${problemId}/submit`, { answer }),
  
  getGoalSuggestions: (goalId) => 
    api.get(`/api/retention/goal-suggestions/${goalId}`),
  
  acceptGoalSuggestion: (suggestionId) => 
    api.post(`/api/retention/goal-suggestions/${suggestionId}/accept`),
  
  getProgressDashboard: () => 
    api.get('/api/retention/progress-dashboard'),
};
```

### 3.6 WebSocket Integration (Optional)

#### 3.6.1 Real-time Chat
- Use ActionCable (Rails) or similar for real-time chat
- Support typing indicators
- Handle reconnection logic
- Maintain message order

#### 3.6.2 Implementation
```ruby
# app/channels/ai_companion_channel.rb
class AiCompanionChannel < ApplicationCable::Channel
  def subscribed
    stream_from "ai_companion_#{current_student.id}"
  end
  
  def receive(data)
    # Handle incoming message
    message = data['message']
    response = AiCompanionService.new(current_student).chat(message: message)
    
    # Broadcast response
    broadcast_to(current_student, {
      role: 'assistant',
      content: response[:content]
    })
  end
end
```

## 4. Data Access Patterns

### 4.1 Existing Data Access
- **Students**: Access via `Student` model
- **Sessions**: Access via `Session` model
- **Goals**: Access via `Goal` model
- **Tutors**: Access via `Tutor` model (for routing)

### 4.2 New Data Access
- **AI Companion Profile**: New model, linked to Student
- **Session Summaries**: New model, linked to Session
- **Conversation Messages**: New model, linked to Student
- **Practice Problems**: New model, linked to Student and Goal

### 4.3 Data Privacy & Security
- Students can only access their own data
- Tutors can access session summaries for their sessions
- Admins can access aggregated data for analytics
- All data encrypted at rest
- All API calls encrypted in transit (HTTPS)
- Compliance with FERPA/COPPA if applicable

## 5. Deployment & Infrastructure

### 5.1 Deployment Strategy
- **Database Migrations**: Run migrations as part of deployment
- **Background Jobs**: Deploy job processors separately if needed
- **API Deployments**: Deploy API changes with zero downtime
- **Frontend Deployments**: Deploy React components with existing frontend

### 5.2 Infrastructure Requirements
- **Vector Database**: PostgreSQL with pgvector extension OR separate vector DB
- **Background Job Processor**: Sidekiq, DelayedJob, or ActiveJob with Redis
- **Storage**: S3 or existing storage for session recordings
- **API Servers**: Existing Rails API servers (scale if needed)

### 5.3 Monitoring & Logging
- Use existing monitoring solution (New Relic, DataDog, etc.)
- Log all AI API calls for cost tracking
- Monitor background job processing times
- Alert on processing failures

## 6. Integration Checklist

### 6.1 Pre-Integration
- [ ] Document existing authentication system
- [ ] Document existing API patterns
- [ ] Document existing database schema
- [ ] Document session recording storage location and format
- [ ] Identify integration points and dependencies

### 6.2 Database
- [ ] Create migrations for new tables
- [ ] Add indexes for performance
- [ ] Add foreign key constraints
- [ ] Install pgvector extension (if needed)
- [ ] Test migrations on staging

### 6.3 Backend
- [ ] Create API endpoints
- [ ] Implement authentication/authorization
- [ ] Create background jobs for session processing
- [ ] Integrate with existing models
- [ ] Write tests for new endpoints

### 6.4 Frontend
- [ ] Create React components
- [ ] Integrate with existing routing
- [ ] Integrate with existing state management
- [ ] Match existing UI/UX patterns
- [ ] Write component tests

### 6.5 Session Processing
- [ ] Set up transcription service
- [ ] Set up LLM extraction service
- [ ] Set up embedding generation
- [ ] Test end-to-end processing flow
- [ ] Monitor processing times and costs

## 7. Success Metrics

### 7.1 Integration Success
- **API Response Times**: <200ms for most endpoints
- **Processing Times**: Session summaries processed within 1 hour
- **Error Rates**: <1% error rate for API calls
- **Uptime**: 99.9% availability

### 7.2 Data Quality
- **Session Summary Accuracy**: >90% accuracy (validated by tutors)
- **Processing Success Rate**: >95% of sessions processed successfully
- **Data Completeness**: 100% of conversations stored

## 8. Risks & Mitigation

### 8.1 Technical Risks
- **Schema Changes**: Breaking existing functionality
  - *Mitigation*: Thorough testing, gradual rollout, rollback plan
- **Performance**: New queries may slow down existing system
  - *Mitigation*: Proper indexing, query optimization, caching
- **Data Migration**: Issues migrating existing data
  - *Mitigation*: Test migrations thoroughly, backup data

### 8.2 Integration Risks
- **API Incompatibility**: Existing APIs may not support needed data
  - *Mitigation*: Early API analysis, request extensions if needed
- **Authentication Issues**: New endpoints may have auth problems
  - *Mitigation*: Reuse existing auth, thorough testing

## 9. Open Questions

- What is the current authentication mechanism? (JWT, OAuth, Devise?)
- What is the current database schema for students, sessions, goals?
- Where are session recordings stored? (S3, database, other?)
- What is the format of session recordings? (MP4, WebM, MP3, etc.)
- Are there existing transcripts, or do we need to transcribe?
- What is the current API response format?
- What UI component library is used? (Material-UI, Chakra, custom?)
- What is the deployment process? (Heroku, AWS, custom?)
- Are there compliance requirements? (FERPA, COPPA, etc.)

---

**Document Version**: 1.0  
**Related PRDs**: Core AI Companion, Retention Enhancement, Analytics & Measurement  
**Status**: Draft


