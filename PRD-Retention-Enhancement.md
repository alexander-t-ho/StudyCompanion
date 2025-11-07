# Sub-PRD: Retention Enhancement Features

## 1. Overview

### 1.1 Purpose
This sub-PRD defines features specifically designed to address retention challenges, particularly the 52% "goal achieved" churn rate and low early engagement. These features leverage the Core AI Companion to proactively engage students and guide them to their next learning goals.

### 1.2 Relationship to Other PRDs
- Depends on: **Core AI Companion PRD** (uses AI companion for suggestions and nudges)
- Depends on: **Platform Integration PRD** (goal tracking, session data, booking system)
- Measured by: **Analytics & Measurement PRD** (retention metrics, conversion rates)

### 1.3 Business Context
- **52% churn rate** when students complete their initial goals ("goal achieved" churn)
- Students with <3 sessions by Day 7 have significantly lower retention
- Lack of cross-subject engagement prevents students from expanding their learning journey
- Inability to track and visualize multi-goal progress

## 2. Retention Features

### 2.1 Goal Completion → Related Subjects Suggestion

#### 2.1.1 Description
When a student completes a goal, automatically suggest related subjects to continue their learning journey, preventing "goal achieved" churn.

#### 2.1.2 Requirements
- **Trigger**: Automatically trigger when student completes a goal
- **Subject Mappings**: Pre-defined subject relationship graph
  - SAT Completion → College Essays, Study Skills, AP Prep
  - Chemistry → Physics, Biology, Other STEM subjects
  - Algebra → Geometry, Pre-Calculus, Statistics
  - ESL → Advanced English, Business English, Test Prep
  - Custom mappings for other subjects
- **Personalization**: Recommendations based on:
  - Student's academic profile and interests
  - Performance in completed goal
  - Career or college aspirations
  - Similar students' learning paths
- **Timing**: Present suggestions immediately upon goal completion
- **Presentation**: Clear CTA and explanation for each suggestion
- **Tracking**: Monitor conversion rate from suggestion to new goal creation

#### 2.1.3 User Stories
- **As a student**, I want to know what to learn next after completing my goal, so I can continue my learning journey
- **As a student**, I want personalized suggestions based on what I've accomplished, not generic recommendations
- **As a student**, I want to understand why specific subjects are suggested, so I can make informed decisions
- **As a business**, we want to reduce churn when students complete goals by smoothly transitioning them to new goals

#### 2.1.4 Acceptance Criteria
- Suggestions presented within 5 minutes of goal completion
- Minimum 3 suggestions per completed goal
- Suggestions are relevant (validated by subject matter experts)
- Conversion rate from suggestion to new goal >25%
- Suggestions are personalized based on student profile

#### 2.1.5 Subject Relationship Graph
```
SAT Prep
  → College Essays
  → Study Skills
  → AP Prep (various subjects)
  → ACT Prep

Chemistry
  → Physics
  → Biology
  → Advanced Chemistry
  → Environmental Science

Mathematics (Algebra)
  → Geometry
  → Pre-Calculus
  → Statistics
  → Trigonometry

ESL
  → Advanced English
  → Business English
  → TOEFL/IELTS Prep
  → Academic Writing

[Additional mappings to be defined based on curriculum]
```

### 2.2 Early Engagement Nudges

#### 2.2.1 Description
Proactively engage students who have <3 sessions by Day 7 to encourage booking their next session and maintain momentum.

#### 2.2.2 Requirements
- **Detection**: Identify students with <3 sessions on Day 7 after first session
- **Personalization**: Personalized nudge message via AI companion interface
- **Messaging**: Compelling reasons to book next session:
  - "Continue your momentum - you've made great progress!"
  - "Don't lose progress - book your next session"
  - "Build on what you learned - schedule follow-up"
  - Highlight specific progress made
  - Reference specific topics that need reinforcement
- **Delivery**: Multiple channels (in-app, email, push notification)
- **CTAs**: Easy booking CTA with suggested time slots
- **Tracking**: Monitor nudge effectiveness (booking conversion rate)
- **Timing**: Send nudge on Day 7, with follow-up on Day 10 if no action

#### 2.2.3 User Stories
- **As a student**, I want to be reminded to continue my learning when I'm at risk of losing momentum
- **As a student**, I want the nudge to be helpful and not pushy
- **As a student**, I want easy ways to book a session when I'm nudged
- **As a business**, we want to increase retention by engaging students early in their journey

#### 2.2.4 Acceptance Criteria
- Nudges sent to 100% of eligible students (Day 7, <3 sessions)
- Nudge delivery within 24 hours of Day 7
- Booking conversion rate from nudge >15%
- Nudge messaging rated as helpful (>4.0/5.0)
- No negative feedback about nudge frequency or tone

#### 2.2.5 Nudge Variations (A/B Testing)
- **Progress-focused**: "You've completed 2 sessions and mastered 5 concepts. Continue your momentum!"
- **FOMO-focused**: "Don't lose the progress you've made. Book your next session soon."
- **Achievement-focused**: "You're on track! Keep going with your next session."
- **Personalized**: References specific topics learned and areas to improve

### 2.3 Multi-Goal Progress Tracking

#### 2.3.1 Description
Visualize progress across multiple subjects/goals simultaneously, enabling students to see their learning journey holistically and encouraging multi-subject engagement.

#### 2.3.2 Requirements
- **Dashboard**: Display progress dashboard showing all active goals
- **Progress Visualization**: 
  - Completion percentage for each goal
  - Visual progress bars or circular progress indicators
  - Time remaining estimates
  - Milestones achieved
- **Achievements**: Highlight recent achievements and milestones across all goals
- **Relationships**: Show relationships between related goals
- **Insights**: Provide insights on learning velocity and patterns
  - "You're progressing 20% faster in Math than average"
  - "You've completed 3 goals this month!"
  - "Chemistry and Physics progress together"
- **Goal Creation**: Support goal creation from suggested subjects
- **Filtering**: Allow filtering by subject, status, or date

#### 2.3.3 User Stories
- **As a student**, I want to see my progress across all my goals in one place, so I understand my overall learning journey
- **As a student**, I want to see how related subjects progress together, so I can plan my learning
- **As a student**, I want to celebrate achievements across all goals, not just one at a time
- **As a student**, I want to easily create new goals from the dashboard

#### 2.3.4 Acceptance Criteria
- Dashboard loads within 2 seconds
- All active goals displayed with accurate progress
- Progress updates in real-time as goals are updated
- Subject relationships visualized clearly
- Goal creation from suggestions works seamlessly
- Dashboard is responsive (mobile and desktop)

## 3. Technical Architecture

### 3.1 Goal Suggestion Engine

#### 3.1.1 Components
- **Subject Relationship Graph**: Directed graph stored in database
- **Recommendation Algorithm**: AI-powered suggestions using LLM
- **Personalization Engine**: Analyzes student profile for custom recommendations
- **Presentation Layer**: UI for displaying suggestions

#### 3.1.2 Data Models
```sql
-- Subject Relationship Graph
CREATE TABLE subject_relationships (
  id SERIAL PRIMARY KEY,
  source_subject VARCHAR(100) NOT NULL,
  target_subject VARCHAR(100) NOT NULL,
  relationship_type VARCHAR(50), -- 'prerequisite', 'related', 'next_level', etc.
  strength FLOAT DEFAULT 1.0, -- 0.0-1.0 relationship strength
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subject_relationships_source ON subject_relationships(source_subject);

-- Goal Suggestions
CREATE TABLE goal_suggestions (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  source_goal_id INTEGER REFERENCES goals(id),
  suggested_subject VARCHAR(100) NOT NULL,
  suggested_goal_type VARCHAR(50),
  reasoning TEXT, -- AI-generated explanation
  confidence FLOAT, -- 0.0-1.0 confidence score
  presented_at TIMESTAMP,
  accepted_at TIMESTAMP,
  created_goal_id INTEGER REFERENCES goals(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_goal_suggestions_student ON goal_suggestions(student_id, presented_at);
CREATE INDEX idx_goal_suggestions_source_goal ON goal_suggestions(source_goal_id);
```

#### 3.1.3 Recommendation Algorithm
1. **Trigger**: Goal completion event detected
2. **Subject Lookup**: Query subject relationship graph for related subjects
3. **Personalization**: Use LLM to analyze student profile and customize suggestions
4. **Ranking**: Rank suggestions by:
   - Relationship strength
   - Student profile match
   - Popularity among similar students
   - Career/college goal alignment
5. **Presentation**: Present top 3-5 suggestions to student

#### 3.1.4 AI Prompt for Suggestions
```
Student [STUDENT_NAME] has completed goal: [GOAL_NAME] in [SUBJECT].

Student Profile:
- Academic Level: [LEVEL]
- Interests: [INTERESTS]
- Career Goals: [CAREER_GOALS]
- Performance: [PERFORMANCE_METRICS]

Related Subjects Available:
- [SUBJECT_1]: [RELATIONSHIP_TYPE]
- [SUBJECT_2]: [RELATIONSHIP_TYPE]
- [SUBJECT_3]: [RELATIONSHIP_TYPE]

Generate personalized suggestions for next learning goals:
1. Rank subjects by relevance to student
2. Provide reasoning for each suggestion
3. Highlight how each subject relates to completed goal
4. Consider student's career/college goals

Return JSON:
{
  "suggestions": [
    {
      "subject": "...",
      "goal_type": "...",
      "reasoning": "...",
      "confidence": 0.0-1.0
    }
  ]
}
```

### 3.2 Early Engagement Nudge System

#### 3.2.1 Components
- **Eligibility Detector**: Identifies students eligible for nudges
- **Nudge Generator**: Creates personalized nudge messages using AI
- **Delivery System**: Sends nudges via multiple channels
- **Tracking System**: Monitors nudge effectiveness

#### 3.2.2 Data Models
```sql
-- Early Engagement Nudges
CREATE TABLE early_engagement_nudges (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  nudge_type VARCHAR(50), -- 'day_7_reminder', 'day_10_followup', etc.
  message TEXT NOT NULL,
  delivery_channel VARCHAR(50), -- 'in_app', 'email', 'push'
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  session_booked BOOLEAN DEFAULT FALSE,
  session_id INTEGER REFERENCES sessions(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_nudges_student ON early_engagement_nudges(student_id, sent_at);
CREATE INDEX idx_nudges_conversion ON early_engagement_nudges(session_booked, sent_at);
```

#### 3.2.3 Nudge Generation Logic
1. **Eligibility Check** (Daily batch job):
   - Query students with <3 sessions
   - Check if Day 7 after first session
   - Exclude students who already received nudge
2. **Message Generation**: Use AI to personalize message
3. **Delivery**: Send via in-app notification (primary), email (backup)
4. **Tracking**: Monitor open, click, and booking rates
5. **Follow-up**: Send follow-up on Day 10 if no action

#### 3.2.4 AI Prompt for Nudge Generation
```
Generate a personalized nudge message for [STUDENT_NAME] to book their next session.

Student Context:
- Sessions Completed: [SESSION_COUNT]
- Days Since First Session: [DAYS]
- Topics Covered: [TOPICS]
- Progress Made: [PROGRESS_METRICS]
- Recent Achievements: [ACHIEVEMENTS]

Generate a friendly, encouraging message that:
1. Acknowledges their progress
2. Highlights why continuing is important
3. Makes it easy to book next session
4. Feels helpful, not pushy

Tone: Encouraging, supportive, personalized
Length: 2-3 sentences
```

### 3.3 Multi-Goal Progress Dashboard

#### 3.3.1 Components
- **Progress Aggregator**: Collects progress data from all goals
- **Visualization Engine**: Generates progress visualizations
- **Relationship Mapper**: Maps relationships between goals
- **Insights Generator**: Generates learning insights using AI

#### 3.3.2 Data Models
```sql
-- Progress Snapshots (for historical tracking)
CREATE TABLE goal_progress_snapshots (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  goal_id INTEGER REFERENCES goals(id),
  completion_percentage FLOAT,
  milestones_completed INTEGER,
  estimated_completion_date DATE,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_progress_snapshots_student ON goal_progress_snapshots(student_id, snapshot_date);
CREATE INDEX idx_progress_snapshots_goal ON goal_progress_snapshots(goal_id, snapshot_date);
```

#### 3.3.3 API Endpoints
```
GET /api/retention/goal-suggestions/:goal_id
  - Get suggested next goals after completing a goal
  - Returns personalized suggestions with reasoning

POST /api/retention/goal-suggestions/:suggestion_id/accept
  - Accept a goal suggestion and create new goal
  - Returns created goal ID

GET /api/retention/nudges/eligibility
  - Check if student is eligible for early engagement nudge
  - Returns eligibility status and suggested nudge

POST /api/retention/nudges/send
  - Send early engagement nudge to student
  - Returns nudge delivery status

GET /api/retention/progress-dashboard/:student_id
  - Get multi-goal progress dashboard data
  - Returns progress data for all active goals

GET /api/retention/insights/:student_id
  - Get learning insights and patterns
  - Returns AI-generated insights about learning velocity, patterns, etc.
```

## 4. User Experience

### 4.1 Goal Completion Flow

#### 4.1.1 User Journey
1. Student completes final milestone of goal
2. Celebration animation/message appears
3. AI companion congratulates student
4. Goal suggestions appear below celebration
5. Each suggestion shows:
   - Subject name and icon
   - Brief explanation of why it's suggested
   - Estimated time commitment
   - "Explore" and "Create Goal" buttons
6. Student can explore suggestion details or create goal immediately
7. If student creates goal, they're taken to goal setup flow

#### 4.1.2 UI Components
- **Celebration Modal**: Congratulatory message with goal completion details
- **Suggestion Cards**: Card-based layout for each suggestion
  - Subject icon and name
  - Reasoning text
  - Progress indicator (if related goal exists)
  - CTA buttons
- **Subject Relationship Visualization**: Visual graph showing how subjects relate

### 4.2 Early Engagement Nudge Flow

#### 4.2.1 User Journey
1. Student opens app on Day 7 (or receives notification)
2. In-app notification appears with personalized message
3. Notification includes:
   - Progress summary
   - Encouraging message
   - "Book Session" CTA button
4. If student clicks CTA, they're taken to booking flow with suggested time slots
5. If student dismisses, follow-up sent on Day 10

#### 4.2.2 UI Components
- **In-App Notification**: Dismissible notification banner
- **Nudge Card**: Expanded card view with full message and CTAs
- **Booking Integration**: Seamless transition to booking flow

### 4.3 Multi-Goal Progress Dashboard

#### 4.3.1 User Journey
1. Student navigates to "My Progress" or dashboard
2. Dashboard displays:
   - Overview stats (total goals, completion rate, active goals)
   - Progress cards for each active goal
   - Recent achievements section
   - Learning insights section
   - Subject relationship map
3. Student can click on any goal to see details
4. Student can create new goal from dashboard

#### 4.3.2 UI Components
- **Progress Cards**: Individual cards for each goal with progress bar
- **Achievement Badges**: Visual badges for milestones
- **Insights Panel**: AI-generated insights about learning patterns
- **Relationship Graph**: Interactive graph showing subject relationships
- **Quick Actions**: "Create Goal", "View All Goals", "Book Session"

## 5. Integration Points

### 5.1 Core AI Companion Integration
- Uses AI companion for generating personalized suggestions
- Uses AI companion for generating nudge messages
- Uses AI companion for generating learning insights

### 5.2 Platform Integration
- Goal completion events from existing goal system
- Session booking integration for nudge CTAs
- Student profile data for personalization
- Progress data from existing goal tracking system

## 6. Success Metrics

### 6.1 Goal Completion Suggestions
- **Presentation Rate**: % of completed goals that result in suggestions shown
- **Acceptance Rate**: % of suggestions that result in new goal creation (>25% target)
- **Time to Goal Creation**: Average time from suggestion to goal creation
- **Churn Reduction**: Reduction in "goal achieved" churn rate (30% target)

### 6.2 Early Engagement Nudges
- **Delivery Rate**: % of eligible students who receive nudge (100% target)
- **Open Rate**: % of nudges opened by students (>60% target)
- **Booking Conversion**: % of nudges that result in session booking (>15% target)
- **Retention Impact**: Retention rate improvement for nudge recipients vs. non-recipients

### 6.3 Multi-Goal Progress Tracking
- **Dashboard Usage**: % of students who view dashboard weekly (>40% target)
- **Multi-Goal Adoption**: % of students with >1 active goal (>30% target)
- **Goal Creation from Dashboard**: % of new goals created from dashboard
- **Engagement Increase**: Increase in overall engagement for students using dashboard

## 7. Risks & Mitigation

### 7.1 Product Risks
- **Suggestion Quality**: Poor suggestions may reduce trust
  - *Mitigation*: Extensive testing, human review, iterative improvement
- **Nudge Fatigue**: Too many nudges may annoy students
  - *Mitigation*: Limit frequency, make nudges valuable, allow opt-out
- **Complexity**: Multi-goal tracking may overwhelm students
  - *Mitigation*: Simple visualizations, progressive disclosure, clear organization

### 7.2 Technical Risks
- **Performance**: Dashboard may be slow with many goals
  - *Mitigation*: Efficient queries, caching, pagination
- **Personalization Accuracy**: AI suggestions may not be accurate
  - *Mitigation*: Fallback to rule-based suggestions, continuous improvement

## 8. Dependencies

### 8.1 Required from Other PRDs
- **Core AI Companion PRD**: AI companion for suggestions and nudges
- **Platform Integration PRD**: Goal system, booking system, student data

### 8.2 Enables for Other PRDs
- **Analytics & Measurement PRD**: Provides retention metrics and conversion data

## 9. Open Questions

- What is the complete subject relationship graph? (Need curriculum mapping)
- Should suggestions be time-limited (e.g., show for 7 days after goal completion)?
- How many nudges is too many? (Frequency limits)
- Should students be able to customize nudge preferences?
- What is the target multi-goal adoption rate?

---

**Document Version**: 1.0  
**Related PRDs**: Core AI Companion, Platform Integration, Analytics & Measurement  
**Status**: Draft


