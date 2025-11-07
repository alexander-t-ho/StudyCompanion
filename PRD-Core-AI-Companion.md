# Sub-PRD: Core AI Companion

## 1. Overview

### 1.1 Purpose
This sub-PRD defines the core AI companion functionality that provides persistent learning support between tutoring sessions. It covers the foundational features of conversation, memory, practice generation, and intelligent tutor routing.

### 1.2 Relationship to Other PRDs
- Depends on: **Platform Integration PRD** (session recording access, data models)
- Enables: **Retention Enhancement PRD** (uses AI companion for goal suggestions and nudges)
- Measured by: **Analytics & Measurement PRD** (success metrics and learning improvements)

### 1.3 Business Context
Addresses the critical need for a persistent learning companion that extends learning beyond tutoring sessions, reducing the gap between sessions and maintaining student engagement.

## 2. Core Features

### 2.1 Persistent AI Companion

#### 2.1.1 Description
AI companion that maintains context and memory across all interactions, providing personalized learning support 24/7.

#### 2.1.2 Requirements
- Store conversation history and learning context in persistent database
- Maintain memory of previous lessons, topics covered, and student progress
- Provide conversational interface for questions and learning support
- Accessible 24/7 between tutoring sessions
- Personalize interactions based on student's learning history and preferences
- Maintain conversation state across sessions and devices

#### 2.1.3 User Stories
- **As a student**, I want to chat with an AI companion that remembers our previous conversations, so I don't have to re-explain context
- **As a student**, I want the AI to know what I've learned in my tutoring sessions, so it can help me better
- **As a student**, I want the AI companion to be available whenever I need help, not just during tutoring sessions

#### 2.1.4 Acceptance Criteria
- Conversation history persists across sessions
- AI references previous conversations accurately
- AI personalizes responses based on student's learning profile
- Response time < 2 seconds for chat messages
- 99.9% uptime availability

### 2.2 Lesson Memory & Context

#### 2.2.1 Description
AI remembers and references previous tutoring sessions, building a cumulative knowledge profile for each student.

#### 2.2.2 Requirements
- Integrate with existing session recording system (see Platform Integration PRD)
- Extract and store key learning points from each session
- Track topics covered, concepts mastered, and areas needing improvement
- Reference previous sessions in conversations with students
- Build cumulative knowledge profile for each student
- Support semantic search across session history

#### 2.2.3 User Stories
- **As a student**, I want the AI to remember what I learned in my last tutoring session, so it can help me practice those concepts
- **As a student**, I want the AI to reference concepts from previous sessions when answering my questions
- **As a tutor**, I want the AI to have context about what the student has learned, so it can provide appropriate support

#### 2.2.4 Acceptance Criteria
- Session summaries are extracted within 1 hour of session completion
- AI can reference specific topics from past sessions
- Knowledge profile accurately reflects student's learning history
- Semantic search returns relevant session content

### 2.3 Adaptive Practice Assignment

#### 2.3.1 Description
AI generates and assigns practice exercises based on student progress, adapting difficulty and focus areas.

#### 2.3.2 Requirements
- Analyze student performance from session recordings and practice history
- Generate practice problems at appropriate difficulty level
- Focus on areas where student needs improvement
- Adjust difficulty based on student performance
- Provide immediate feedback on practice attempts
- Track practice completion and performance metrics
- Support multiple question types (multiple choice, free response, coding, etc.)

#### 2.3.3 User Stories
- **As a student**, I want practice problems that match my current skill level, so I'm not overwhelmed or bored
- **As a student**, I want practice problems that focus on areas I'm struggling with, so I can improve
- **As a student**, I want immediate feedback on my practice answers, so I can learn from mistakes
- **As a student**, I want the difficulty to increase as I improve, so I'm always challenged

#### 2.3.4 Acceptance Criteria
- Practice problems generated within 5 seconds
- Difficulty level matches student's demonstrated skill level (±1 level)
- Practice problems focus on identified weak areas (80% of problems)
- Feedback provided within 1 second of answer submission
- Difficulty adjustment algorithm improves student performance over time

### 2.4 Conversational Q&A

#### 2.4.1 Description
Answer student questions in natural, conversational manner, referencing previous lessons and concepts.

#### 2.4.2 Requirements
- Support questions across all subjects covered in tutoring sessions
- Provide step-by-step explanations when appropriate
- Reference previous lessons and concepts when relevant
- Escalate to human tutor when question complexity exceeds AI capability
- Maintain conversation context within session
- Support multi-turn conversations with follow-up questions
- Cite sources when referencing specific session content

#### 2.4.3 User Stories
- **As a student**, I want to ask questions about my homework and get helpful explanations
- **As a student**, I want step-by-step explanations for complex problems
- **As a student**, I want the AI to remember what we discussed earlier in the conversation
- **As a student**, I want to know when I should talk to my tutor instead of the AI

#### 2.4.4 Acceptance Criteria
- Questions answered within 2 seconds
- Answers are accurate and relevant (>90% accuracy)
- Step-by-step explanations provided for complex problems
- AI correctly identifies when to escalate to tutor (>85% accuracy)
- Conversation context maintained throughout session

### 2.5 Intelligent Tutor Routing

#### 2.5.1 Description
Drive students back to human tutors when needed, providing context to tutors about why routing occurred.

#### 2.5.2 Requirements
- Identify when student needs human intervention (complex concepts, emotional support, struggling significantly)
- Suggest booking a session with specific tutor recommendations
- Provide context to tutor about why routing occurred
- Track routing success rate and student satisfaction
- Support multiple routing triggers (complexity, emotional cues, repeated struggles)
- Integrate with existing booking system

#### 2.5.3 User Stories
- **As a student**, I want the AI to recognize when I need human help and suggest booking a session
- **As a student**, I want the AI to help me book a session with an appropriate tutor
- **As a tutor**, I want to know why the AI routed a student to me, so I can prepare
- **As a student**, I want the routing to feel helpful, not pushy

#### 2.5.4 Acceptance Criteria
- Routing triggers identified with >85% accuracy
- Tutor suggestions are relevant and available
- Routing context provided to tutor before session
- Routing conversion rate >40% (student books session)
- Student satisfaction with routing >4.0/5.0

## 3. Technical Architecture

### 3.1 AI Companion Service

#### 3.1.1 Technology Stack
- **Primary**: Python/FastAPI or Node.js/Express microservice
- **AI Provider**: OpenAI GPT-4 or Anthropic Claude (provider-agnostic design)
- **Deployment**: Containerized (Docker) on AWS ECS or Vercel

#### 3.1.2 Core Capabilities
- Conversation management and context handling
- Question answering with RAG (Retrieval Augmented Generation)
- Practice problem generation
- Tutor routing decision logic
- Context retrieval from memory store

#### 3.1.3 API Endpoints
```
POST /api/ai-companion/chat
  - Send message to AI companion
  - Returns AI response with context

GET /api/ai-companion/conversation-history
  - Retrieve conversation history for student

POST /api/ai-companion/generate-practice
  - Generate practice problems for student
  - Returns practice problems at appropriate difficulty

POST /api/ai-companion/check-routing
  - Check if student conversation requires tutor routing
  - Returns routing recommendation and confidence

GET /api/ai-companion/student-profile
  - Get AI-generated student learning profile
```

### 3.2 Memory & Context Store

#### 3.2.1 Technology
- **Primary Database**: PostgreSQL with pgvector extension
- **Alternative**: Dedicated vector DB (Pinecone/Weaviate) for scale
- **Storage**: Session summaries, conversation history, student profiles

#### 3.2.2 Data Models
```sql
-- Conversation History
CREATE TABLE conversation_messages (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  context JSONB, -- Additional context metadata
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversation_student ON conversation_messages(student_id, created_at);

-- AI Companion Profile
CREATE TABLE ai_companion_profiles (
  id SERIAL PRIMARY KEY,
  student_id INTEGER UNIQUE REFERENCES students(id),
  conversation_history JSONB,
  learning_preferences JSONB,
  last_interaction_at TIMESTAMP,
  total_interactions_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Session Summaries (see Platform Integration PRD for full schema)
-- Referenced here for context
CREATE TABLE session_summaries (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id),
  student_id INTEGER REFERENCES students(id),
  extracted_topics TEXT[],
  key_concepts TEXT[],
  learning_points TEXT,
  embeddings VECTOR(1536), -- OpenAI embedding dimension
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_session_summaries_embeddings ON session_summaries 
USING ivfflat (embeddings vector_cosine_ops);
```

### 3.3 RAG (Retrieval Augmented Generation) Implementation

#### 3.3.1 Architecture
- **Embedding Model**: OpenAI text-embedding-3-small or similar
- **Retrieval**: Vector similarity search using pgvector
- **Top-K Retrieval**: Retrieve top 5-10 relevant documents per query
- **Context Injection**: Inject retrieved context into LLM prompts

#### 3.3.2 Retrieval Strategy
1. Convert user query to embedding
2. Search session summaries and conversation history for relevant context
3. Rank results by cosine similarity
4. Filter by relevance threshold (>0.7 similarity)
5. Inject top-k results into LLM prompt as context

#### 3.3.3 Prompt Templates

**Conversation Management Prompt:**
```
You are an AI study companion for [STUDENT_NAME]. You help students learn between tutoring sessions.

Student Context:
- Learning Goals: [GOALS]
- Recent Topics: [TOPICS]
- Weak Areas: [WEAK_AREAS]
- Strong Areas: [STRONG_AREAS]

Previous Conversation:
[CONVERSATION_HISTORY]

Relevant Session Content:
[SESSION_CONTENT]

Current Question: [USER_MESSAGE]

Provide a helpful, conversational response that references relevant previous learning when appropriate.
```

**Practice Generation Prompt:**
```
Generate a practice problem for [STUDENT_NAME] in [SUBJECT] on [TOPIC].

Student Level: [DIFFICULTY_LEVEL]
Areas Needing Practice: [WEAK_AREAS]
Recently Covered: [RECENT_TOPICS]

Generate a problem that:
1. Matches the student's skill level
2. Focuses on areas needing improvement
3. Includes step-by-step solution
4. Provides educational value
```

**Tutor Routing Classification Prompt:**
```
Classify whether this student conversation requires human tutor intervention.

Student Question: [USER_MESSAGE]
Conversation Context: [CONVERSATION_CONTEXT]
Student Profile: [STUDENT_PROFILE]

Consider:
- Question complexity beyond AI capability
- Emotional distress indicators
- Repeated struggles with same concept
- Need for personalized attention

Respond with:
- routing_needed: true/false
- confidence: 0.0-1.0
- reason: explanation
- urgency: low/medium/high
```

### 3.4 Practice Problem Generation

#### 3.4.1 Generation Strategy
- **Difficulty Calibration**: Base on student's practice history and session performance
- **Topic Selection**: Prioritize weak areas (80%) vs. reinforcement (20%)
- **Problem Types**: Support multiple formats (multiple choice, free response, coding, math equations)
- **Solution Generation**: Generate step-by-step solutions for each problem

#### 3.4.2 Adaptive Difficulty Algorithm
- Start with baseline difficulty from student profile
- Adjust based on practice performance:
  - >80% correct → increase difficulty by 1 level
  - 60-80% correct → maintain difficulty
  - <60% correct → decrease difficulty by 1 level
- Recalibrate weekly based on aggregate performance

## 4. User Experience

### 4.1 Chat Interface

#### 4.1.1 UI Components
- Chat window with scrollable message history
- Message bubbles for user and AI (distinct styling)
- Typing indicators when AI is responding
- Timestamp display for messages
- Quick action buttons (e.g., "Show me practice", "Book session")
- Ability to attach screenshots or files (future enhancement)

#### 4.1.2 Interaction Patterns
- Real-time messaging with WebSocket support
- Markdown support for formatted responses
- Code syntax highlighting for programming questions
- Math equation rendering (LaTeX/MathJax)
- Link previews for external resources

### 4.2 Practice Problem Interface

#### 4.2.1 UI Components
- Problem display with rich formatting
- Answer input (text, multiple choice, code editor, etc.)
- Submit button with loading state
- Immediate feedback display
- "Explain solution" expandable section
- "Ask AI" button for additional help
- Progress indicator (e.g., "3 of 5 problems completed")

#### 4.2.2 Feedback Display
- Correct/incorrect indicator
- Explanation of correct answer
- Common mistakes highlighted
- Suggestions for improvement
- Link to related practice problems

## 5. Integration Points

### 5.1 Platform Integration
- **Authentication**: Use existing student authentication (see Platform Integration PRD)
- **Student Data**: Access student profiles, goals, and session history via existing APIs
- **Session Data**: Access session recordings and transcripts (see Platform Integration PRD)
- **Booking System**: Integrate with existing tutor booking system for routing

### 5.2 Data Dependencies
- Requires session summaries from session recording processor (see Platform Integration PRD)
- Requires student profile data from existing platform
- Requires practice problem responses for adaptive algorithm

## 6. Success Metrics

### 6.1 Engagement Metrics
- **Daily Active Users (DAU)**: % of students using AI companion daily
- **Conversation Frequency**: Average conversations per student per week
- **Practice Completion Rate**: % of assigned practice problems completed
- **Session Length**: Average conversation length in messages

### 6.2 Quality Metrics
- **Answer Accuracy**: % of AI answers rated as helpful by students (>4.0/5.0)
- **Routing Accuracy**: % of routing decisions validated as correct by tutors
- **Context Relevance**: % of AI responses that reference relevant previous content
- **Practice Difficulty Match**: % of practice problems at appropriate difficulty level

### 6.3 Business Impact Metrics
- **Tutor Routing Conversion**: % of routing suggestions that lead to session bookings
- **Session Booking Increase**: Increase in session bookings from students using AI companion
- **Student Retention**: Retention rate of students using AI companion vs. non-users

## 7. Risks & Mitigation

### 7.1 Technical Risks
- **AI API Costs**: High conversation volume may exceed budget
  - *Mitigation*: Implement response caching, rate limiting, cost monitoring
- **AI Accuracy**: Incorrect answers may mislead students
  - *Mitigation*: Extensive testing, confidence thresholds, clear tutor routing
- **Context Window Limits**: Large conversation history may exceed model limits
  - *Mitigation*: Summarize old conversations, use sliding window approach

### 7.2 Product Risks
- **Low Adoption**: Students may not use AI companion
  - *Mitigation*: Strong onboarding, clear value proposition, proactive engagement
- **Over-reliance**: Students may rely too heavily on AI instead of learning
  - *Mitigation*: Encourage critical thinking, limit direct answers, promote learning

## 8. Dependencies

### 8.1 Required from Platform Integration PRD
- Session recording access and processing
- Student authentication and profile access
- Database schema extensions
- API integration patterns

### 8.2 Enables for Other PRDs
- **Retention Enhancement PRD**: Uses AI companion for goal suggestions and nudges
- **Analytics & Measurement PRD**: Provides data for learning analytics

## 9. Open Questions

- What is the maximum conversation history length to maintain?
- Should we support multiple AI "personalities" or learning styles?
- How should we handle AI responses for subjects outside the student's current goals?
- What is the budget for AI API costs per student per month?

---

**Document Version**: 1.0  
**Related PRDs**: Platform Integration, Retention Enhancement, Analytics & Measurement  
**Status**: Draft


