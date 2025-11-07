# Product Requirements Document: AI Study Companion

## 1. Executive Summary

### 1.1 Product Vision
Build a persistent AI companion that extends learning beyond tutoring sessions by remembering previous lessons, providing adaptive practice, answering questions conversationally, and intelligently routing students back to human tutors when needed. The solution addresses critical retention challenges, particularly the 52% churn rate when students achieve their initial goals.

### 1.2 Business Problem
- **52% churn rate** when students complete their initial goals ("goal achieved" churn)
- Students with <3 sessions by Day 7 have significantly lower retention
- Lack of cross-subject engagement prevents students from expanding their learning journey
- No persistent learning companion between human tutoring sessions
- Inability to track and visualize multi-goal progress

### 1.3 Success Metrics
- **Business Impact**: Reduce "goal achieved" churn by 30% within 90 days
- **Engagement**: Increase average sessions per student from 3 to 5+ within 90 days
- **Retention**: Improve Day 7 retention rate from baseline to 60%+
- **Product Readiness**: Ship to production within 2 weeks after prototype approval
- **ROI Path**: Clear path to ROI within 90 days through increased session bookings and reduced churn

## 2. Product Requirements

### 2.1 Core Features

#### 2.1.1 Persistent AI Companion
- **Description**: AI companion that maintains context and memory across all interactions
- **Requirements**:
  - Store conversation history and learning context in persistent database
  - Maintain memory of previous lessons, topics covered, and student progress
  - Provide conversational interface for questions and learning support
  - Accessible 24/7 between tutoring sessions
  - Personalize interactions based on student's learning history and preferences

#### 2.1.2 Lesson Memory & Context
- **Description**: AI remembers and references previous tutoring sessions
- **Requirements**:
  - Integrate with existing session recording system
  - Extract and store key learning points from each session
  - Track topics covered, concepts mastered, and areas needing improvement
  - Reference previous sessions in conversations with students
  - Build cumulative knowledge profile for each student

#### 2.1.3 Adaptive Practice Assignment
- **Description**: AI generates and assigns practice exercises based on student progress
- **Requirements**:
  - Analyze student performance from session recordings and practice history
  - Generate practice problems at appropriate difficulty level
  - Focus on areas where student needs improvement
  - Adjust difficulty based on student performance
  - Provide immediate feedback on practice attempts
  - Track practice completion and performance metrics

#### 2.1.4 Conversational Q&A
- **Description**: Answer student questions in natural, conversational manner
- **Requirements**:
  - Support questions across all subjects covered in tutoring sessions
  - Provide step-by-step explanations when appropriate
  - Reference previous lessons and concepts when relevant
  - Escalate to human tutor when question complexity exceeds AI capability
  - Maintain conversation context within session

#### 2.1.5 Intelligent Tutor Routing
- **Description**: Drive students back to human tutors when needed
- **Requirements**:
  - Identify when student needs human intervention (complex concepts, emotional support, struggling significantly)
  - Suggest booking a session with specific tutor recommendations
  - Provide context to tutor about why routing occurred
  - Track routing success rate and student satisfaction

### 2.2 Retention Enhancement Features

#### 2.2.1 Goal Completion → Related Subjects Suggestion
- **Description**: When student completes a goal, automatically suggest related subjects to continue learning
- **Requirements**:
  - **SAT Completion**: Surface college essays, study skills, AP prep options
  - **Chemistry Completion**: Suggest physics, other STEM subjects
  - **Subject-specific mappings**: Pre-defined subject relationship graph
  - **Personalized recommendations**: Based on student's academic profile and interests
  - **Timing**: Trigger immediately upon goal completion with clear CTA
  - **Tracking**: Monitor conversion rate from suggestion to new goal creation

#### 2.2.2 Early Engagement Nudges
- **Description**: Proactively engage students who have <3 sessions by Day 7
- **Requirements**:
  - Identify students with <3 sessions on Day 7
  - Send personalized nudge via AI companion interface
  - Provide compelling reason to book next session (e.g., "Continue your momentum", "Don't lose progress")
  - Include easy booking CTA
  - Track nudge effectiveness (booking conversion rate)

#### 2.2.3 Multi-Goal Progress Tracking
- **Description**: Visualize progress across multiple subjects/goals simultaneously
- **Requirements**:
  - Display progress dashboard showing all active goals
  - Show completion percentage for each goal
  - Highlight recent achievements and milestones
  - Show relationships between related goals
  - Provide insights on learning velocity and patterns
  - Support goal creation from suggested subjects

### 2.3 Integration Requirements

#### 2.3.1 Rails/React Platform Integration
- **Description**: Seamless integration with existing platform
- **Requirements**:
  - Authenticate using existing authentication system
  - Access student profiles, goals, and session history via existing APIs
  - Store AI companion data in existing database schema (extend as needed)
  - Match existing UI/UX design patterns and component library
  - Follow existing code style and architecture patterns
  - Maintain backward compatibility with existing features

#### 2.3.2 Session Recording Integration
- **Description**: Integrate with existing session recording system
- **Requirements**:
  - Access session recordings (video/audio/transcripts)
  - Extract key learning points, topics covered, and concepts discussed
  - Store extracted information in structured format
  - Link extracted content to specific sessions and students
  - Update learning profile based on session content
  - Handle privacy and data retention policies

### 2.4 Measurable Learning Improvements

#### 2.4.1 Learning Analytics
- **Description**: Track and measure learning improvements
- **Requirements**:
  - Baseline metrics: Initial skill assessment, session frequency, goal completion time
  - Progress metrics: Practice completion rates, question accuracy, concept mastery
  - Engagement metrics: Daily active usage, conversation frequency, practice sessions
  - Outcome metrics: Test score improvements, goal completion rates, subject mastery
  - Reporting: Generate reports for students, parents, and tutors

#### 2.4.2 A/B Testing Framework
- **Description**: Test different approaches to optimize learning outcomes
- **Requirements**:
  - Test different practice problem types and difficulty curves
  - Test different suggestion algorithms for related subjects
  - Test different nudge messaging and timing
  - Measure impact on learning outcomes and retention

## 3. Technical Architecture

### 3.1 System Components

#### 3.1.1 AI Companion Service
- **Technology**: Python/FastAPI or Node.js/Express microservice
- **AI Provider**: OpenAI GPT-4 or Anthropic Claude (provider-agnostic design)
- **Features**:
  - Conversation management and context handling
  - Question answering with RAG (Retrieval Augmented Generation)
  - Practice problem generation
  - Tutor routing decision logic
  - Subject suggestion engine

#### 3.1.2 Memory & Context Store
- **Technology**: PostgreSQL with vector embeddings (pgvector) or dedicated vector DB (Pinecone/Weaviate)
- **Features**:
  - Store conversation history
  - Store extracted session content with embeddings
  - Enable semantic search across learning history
  - Store student learning profiles and progress

#### 3.1.3 Session Recording Processor
- **Technology**: Python service for audio/video processing
- **Features**:
  - Transcribe session recordings (using Whisper or similar)
  - Extract key learning points using LLM
  - Generate structured summaries
  - Store in memory store with embeddings

#### 3.1.4 Frontend Integration
- **Technology**: React components integrated into existing React app
- **Features**:
  - AI companion chat interface
  - Practice problem UI
  - Progress tracking dashboard
  - Goal suggestion and creation UI
  - Nudge notifications

#### 3.1.5 Backend API
- **Technology**: Rails API endpoints (extend existing Rails app)
- **Features**:
  - RESTful API for AI companion interactions
  - WebSocket support for real-time chat
  - Practice problem management endpoints
  - Progress tracking endpoints
  - Integration with existing student/tutor/goal models

### 3.2 Data Models

#### 3.2.1 Core Models
```
Student
- id
- existing fields...

AICompanionProfile
- student_id (foreign key)
- conversation_history (JSONB)
- learning_preferences (JSONB)
- last_interaction_at
- total_interactions_count

SessionSummary
- session_id (foreign key)
- student_id (foreign key)
- extracted_topics (array)
- key_concepts (array)
- learning_points (text)
- embeddings (vector)
- created_at

PracticeProblem
- id
- student_id (foreign key)
- subject
- topic
- difficulty_level
- problem_content (JSONB)
- assigned_at
- completed_at
- student_answer
- is_correct
- feedback

ConversationMessage
- id
- student_id (foreign key)
- role (user/assistant)
- content (text)
- context (JSONB)
- created_at

GoalSuggestion
- id
- student_id (foreign key)
- source_goal_id (foreign key)
- suggested_subject
- suggested_goal_type
- reasoning (text)
- presented_at
- accepted_at

TutorRoutingEvent
- id
- student_id (foreign key)
- conversation_id (foreign key)
- routing_reason (text)
- routing_confidence (float)
- session_booked
- session_id (foreign key, nullable)
```

### 3.3 AI Implementation Strategy

#### 3.3.1 Prompting Strategies
- **Conversation Management**: System prompts that maintain student context and learning goals
- **Question Answering**: RAG-based prompts that retrieve relevant session content and learning materials
- **Practice Generation**: Prompts that generate problems at appropriate difficulty with step-by-step solutions
- **Subject Suggestions**: Prompts that analyze student profile and recommend next learning goals
- **Tutor Routing**: Classification prompts that determine when human intervention is needed

#### 3.3.2 RAG (Retrieval Augmented Generation) Architecture
- Index session summaries, practice problems, and learning materials as vector embeddings
- Retrieve top-k relevant documents for each query
- Inject retrieved context into LLM prompts
- Enable citation of sources in responses

#### 3.3.3 Fine-tuning Considerations
- Fine-tune models on educational content and tutoring scenarios (future enhancement)
- Start with prompt engineering and RAG, measure results before fine-tuning

## 4. User Experience

### 4.1 User Flows

#### 4.1.1 First-Time Student Flow
1. Student completes initial tutoring session
2. AI companion welcomes student and explains capabilities
3. AI companion reviews first session summary
4. AI suggests practice problems based on session
5. Student can ask questions or start practice

#### 4.1.2 Returning Student Flow
1. Student opens app between sessions
2. AI companion greets with personalized message referencing recent progress
3. Student sees practice problems assigned since last visit
4. Student can chat with AI, do practice, or view progress
5. AI proactively suggests next session booking if appropriate

#### 4.1.3 Goal Completion Flow
1. Student completes goal (e.g., SAT prep)
2. Celebration message from AI companion
3. AI analyzes student profile and suggests related subjects
4. Student sees personalized recommendations (e.g., "College Essays", "AP Prep")
5. Student can create new goal from suggestions
6. AI provides context on why suggestions were made

#### 4.1.4 Early Engagement Nudge Flow
1. System detects student with <3 sessions on Day 7
2. AI companion sends personalized nudge message
3. Message highlights progress made and momentum
4. Includes easy booking CTA
5. Tracks whether student books session

#### 4.1.5 Tutor Routing Flow
1. Student asks complex question or shows signs of struggling
2. AI companion recognizes need for human intervention
3. AI explains why tutor would be helpful
4. AI suggests specific tutor and time slots
5. Student books session with context passed to tutor
6. Tutor receives briefing on why routing occurred

### 4.2 UI Components

#### 4.2.1 AI Companion Chat Interface
- Chat window with message history
- Message bubbles for user and AI
- Typing indicators
- Ability to attach practice problems or session references
- Quick action buttons (e.g., "Show me practice", "Book session")

#### 4.2.2 Practice Problem Interface
- Problem display with rich formatting (math equations, code blocks, etc.)
- Answer input (text, multiple choice, code editor, etc.)
- Submit button
- Immediate feedback display
- "Explain solution" button
- "Ask AI" button for additional help

#### 4.2.3 Progress Dashboard
- Multi-goal progress visualization
- Progress bars for each active goal
- Recent achievements section
- Learning velocity graph
- Practice completion stats
- Subject relationship map

#### 4.2.4 Goal Suggestion Interface
- Card-based layout for suggested goals
- Explanation for each suggestion
- "Create Goal" CTA on each card
- Subject relationship visualization
- Preview of what goal entails

## 5. Deliverables

### 5.1 Working Prototype
- **Deployment**: Deployed to AWS or Vercel
- **Scope**: Core features functional with realistic demo data
- **Access**: Demo environment accessible via URL
- **Documentation**: Setup and access instructions

### 5.2 Documentation

#### 5.2.1 AI Tools Documentation
- **AI Providers Used**: List of AI services (OpenAI, Anthropic, etc.)
- **Models Used**: Specific models (GPT-4, Claude, etc.) and versions
- **API Usage**: How each AI service is integrated
- **Rate Limits**: Handling and considerations
- **Cost Drivers**: What operations drive costs

#### 5.2.2 Prompting Strategies Documentation
- **Prompt Templates**: All system prompts and user prompts used
- **Prompt Engineering Decisions**: Why specific prompts were chosen
- **RAG Implementation**: How retrieval and augmentation works
- **Context Management**: How conversation context is maintained
- **Iteration History**: How prompts were refined based on testing

#### 5.2.3 Technical Documentation
- **Architecture Diagram**: System architecture and component interactions
- **API Documentation**: Endpoints, request/response formats
- **Database Schema**: Data models and relationships
- **Integration Guide**: How to integrate with existing Rails/React platform
- **Deployment Guide**: How to deploy to production

### 5.3 Demo Video
- **Duration**: 5 minutes
- **Content**:
  - Product overview and problem statement
  - Key features demonstration
  - User flows walkthrough
  - Integration with existing platform
  - Measurable outcomes demonstration
- **Format**: Screen recording with voiceover
- **Delivery**: Uploaded to accessible location (YouTube, Vimeo, or cloud storage)

### 5.4 Cost Analysis

#### 5.4.1 Development Costs
- AI API costs for development and testing
- Infrastructure costs for prototype
- Development time estimates

#### 5.4.2 Production Cost Estimates
- **Per-Student Monthly Costs**:
  - AI API costs (conversations, practice generation, session processing)
  - Vector database costs
  - Storage costs (conversations, session summaries)
  - Compute costs (API servers, processing workers)
- **Scaling Assumptions**: Costs at 100, 1,000, 10,000 students
- **Cost Optimization Strategies**: How to reduce costs at scale
- **ROI Calculation**: Cost per student vs. increased session bookings and reduced churn

### 5.5 90-Day Roadmap

#### 5.5.1 Phase 1: Weeks 1-2 (Prototype to Production Ready)
- Fix critical bugs and performance issues
- Complete integration with production Rails/React platform
- Security audit and compliance review
- Load testing and optimization
- Production deployment

#### 5.5.2 Phase 2: Weeks 3-6 (Core Features)
- Session recording integration (if not complete)
- Enhanced practice problem generation
- Improved subject suggestion algorithm
- Early engagement nudge automation
- Multi-goal progress tracking dashboard

#### 5.5.3 Phase 3: Weeks 7-10 (Enhancement & Optimization)
- A/B testing framework implementation
- Fine-tune AI models based on usage data
- Optimize costs (caching, batching, model selection)
- Enhance tutor routing logic
- Advanced analytics and reporting

#### 5.5.4 Phase 4: Weeks 11-13 (Scale & Measure)
- Scale infrastructure for increased load
- Measure retention improvements
- Analyze ROI and cost per student
- Iterate on features based on user feedback
- Prepare for full launch

## 6. Success Criteria

### 6.1 Business Problem Solved
- **Churn Reduction**: 30% reduction in "goal achieved" churn within 90 days
- **Session Increase**: Average sessions per student increases from 3 to 5+
- **Retention**: Day 7 retention rate improves to 60%+
- **Engagement**: Students using AI companion have higher session booking rates

### 6.2 Production Readiness (2 Weeks)
- All core features functional and tested
- Integration with existing platform complete
- Performance meets requirements (response times <2s for chat, <5s for practice generation)
- Security and privacy compliance verified
- Monitoring and error tracking in place
- Documentation complete for operations team

### 6.3 AI Sophistication
- **Contextual Awareness**: AI remembers and references previous sessions accurately
- **Personalization**: Recommendations and practice adapt to individual student needs
- **Intelligence**: Tutor routing decisions are accurate and helpful
- **Natural Conversation**: Students find AI interactions natural and helpful

### 6.4 ROI Path (90 Days)
- **Cost per Student**: Documented and optimized
- **Revenue Impact**: Increased session bookings directly attributable to AI companion
- **Churn Reduction Value**: Calculate value of retained students
- **Break-even Analysis**: Number of students needed to break even on AI costs
- **Scale Projections**: ROI at 1,000 and 10,000 students

## 7. Risks & Mitigation

### 7.1 Technical Risks
- **AI API Costs**: May exceed budget if usage is high
  - *Mitigation*: Implement caching, rate limiting, and cost monitoring
- **AI Accuracy**: May provide incorrect answers or poor suggestions
  - *Mitigation*: Extensive testing, human review of initial outputs, clear tutor routing
- **Integration Complexity**: Existing platform may have unexpected constraints
  - *Mitigation*: Early integration testing, API-first design, minimal dependencies

### 7.2 Product Risks
- **Low Adoption**: Students may not use AI companion
  - *Mitigation*: Strong onboarding, clear value proposition, gamification elements
- **Tutor Resistance**: Tutors may feel threatened by AI
  - *Mitigation*: Position as enhancement, show how it drives more bookings, involve tutors in design

### 7.3 Business Risks
- **ROI Not Achieved**: Costs may exceed revenue gains
  - *Mitigation*: Careful cost monitoring, optimization, clear success metrics
- **Regulatory/Privacy**: Education data privacy requirements
  - *Mitigation*: Compliance review, data encryption, clear privacy policy

## 8. Open Questions & Assumptions

### 8.1 Assumptions
- Existing Rails/React platform has RESTful APIs for student, session, and goal data
- Session recordings are stored in accessible format (S3, database, etc.)
- Authentication system can be extended for AI companion access
- Existing database can be extended with new tables/columns
- Budget allows for AI API usage (OpenAI/Anthropic pricing)

### 8.2 Open Questions
- What is the current session recording format and storage location?
- What are the specific API endpoints available in existing Rails backend?
- What authentication mechanism is used (JWT, OAuth, etc.)?
- What is the current database schema for students, sessions, and goals?
- Are there any compliance requirements (FERPA, COPPA, etc.)?
- What is the target number of students for initial launch?
- What is the budget for AI API costs per student per month?

## 9. Appendices

### 9.1 Glossary
- **RAG**: Retrieval Augmented Generation - AI technique that retrieves relevant documents and includes them in prompts
- **Vector Embeddings**: Numerical representations of text that enable semantic search
- **Goal Achieved Churn**: Students who leave the platform after completing their initial learning goal

### 9.2 References
- Existing platform documentation (to be added)
- Session recording system documentation (to be added)
- API documentation (to be added)

---

**Document Version**: 1.0  
**Last Updated**: [Date]  
**Author**: [Name]  
**Status**: Draft


