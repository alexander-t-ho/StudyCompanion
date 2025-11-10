# Understanding Level System Documentation

## Overview

The Understanding Level system tracks student mastery and progress across subjects over time. It provides a 0-100% score that represents how well a student understands a subject, calculated based on previous sessions, AI usage, and natural progression.

## Architecture

### Core Components

1. **UnderstandingLevelService** - Calculates understanding levels and builds snapshots
2. **UnderstandingLevelAnalyticsService** - Provides analytics and aggregation
3. **AdaptiveDifficultyService** - Maps understanding levels to practice problem difficulty
4. **Database Tables**:
   - `transcripts` - Stores understanding_level, previous_understanding_level, goals_snapshot, session_history_summary
   - `session_summaries` - Stores understanding_level and previous_understanding_level

## Understanding Level Calculation

### Formula

```
Base Understanding = Previous Max Understanding

If First Session:
  Base = 0-20% (based on student level: beginner 0-10%, intermediate 10-20%, advanced 15-25%)

If Not First Session:
  - Apply time decay if gap > 90 days: -3% to -5%
  - Add natural progression: +0% to +5%
  - Add AI usage boost: +5% to +15% (based on interactions)

Final Understanding = min(Base + Natural Progression + AI Boost - Time Decay, 100%)
```

### Factors

1. **Previous Max Understanding**: Minimum understanding level for next session
2. **Natural Progression**: 0-5% improvement per session even without AI
3. **AI Usage Boost**: 
   - Light usage (1-3 interactions): +5% to +8%
   - Moderate usage (4-10 interactions): +8% to +12%
   - Heavy usage (10+ interactions): +12% to +15%
4. **Time Decay**: -3% to -5% for gaps > 90 days

### AI Usage Detection

The system counts:
- AI companion conversations (user messages)
- Completed practice problems

Between the last session date and current session date.

## Data Snapshots

### Goals Snapshot (JSONB)

Captured at session time:
```json
{
  "active_goals": [
    {
      "id": 1,
      "progress": 45,
      "title": "AP Calculus BC",
      "goal_type": "test_preparation",
      "target_date": "2024-05-01",
      "milestones_completed": 2
    }
  ],
  "completed_goals_count": 3,
  "total_goals_count": 4,
  "snapshot_date": "2024-11-07"
}
```

### Session History Summary (JSONB)

```json
{
  "total_sessions_this_subject": 5,
  "last_session_date": "2024-10-15",
  "days_since_last_session": 23,
  "previous_max_understanding": 45.5,
  "topics_covered": ["Derivatives", "Integrals", "Limits"],
  "topics_covered_count": 3,
  "concepts_mastered": ["Chain Rule", "Product Rule"],
  "concepts_mastered_count": 2,
  "concepts_struggling": ["Integration by Parts"],
  "concepts_struggling_count": 1,
  "recent_sessions_count": 3
}
```

## API Endpoints

### Understanding Levels

- `GET /api/v1/students/:student_id/understanding-levels` - Get all levels (optional ?subject= filter)
- `GET /api/v1/students/:student_id/understanding-levels/summary` - Get summary statistics
- `GET /api/v1/students/:student_id/understanding-levels/:subject/progression` - Get progression for a subject
- `GET /api/v1/students/:student_id/understanding-levels/all-subjects` - Get all subjects summary

### Response Format

**Summary Response:**
```json
{
  "student_id": 1,
  "summary": {
    "total_sessions": 10,
    "subjects_studied": 3,
    "current_understanding_by_subject": [
      {
        "subject": "AP Calculus BC",
        "understanding_level": 65.5,
        "session_date": "2024-11-07"
      }
    ],
    "average_understanding_by_subject": {
      "AP Calculus BC": 58.2,
      "AP Physics C": 42.1
    },
    "overall_average": 50.15,
    "overall_current_average": 53.8,
    "highest_understanding": 75.0,
    "lowest_understanding": 15.0,
    "improving_subjects": ["AP Calculus BC"],
    "declining_subjects": []
  }
}
```

**Progression Response:**
```json
{
  "student_id": 1,
  "progression": {
    "subject": "AP Calculus BC",
    "total_sessions": 5,
    "first_session_date": "2024-09-01",
    "last_session_date": "2024-11-07",
    "first_understanding_level": 20.0,
    "current_understanding_level": 65.5,
    "total_progress": 45.5,
    "average_progress_per_session": 11.4,
    "trend": "improving",
    "progression": [
      {
        "transcript_id": 1,
        "topic": "Derivatives",
        "session_date": "2024-09-01",
        "understanding_level": 20.0,
        "previous_understanding_level": 0.0,
        "progress": null,
        "created_at": "2024-09-01T10:00:00Z"
      }
    ]
  }
}
```

## Integration Points

### 1. Transcript Generation

Understanding level is calculated before transcript generation and included in the prompt context, making transcripts more realistic and reflective of student progress.

### 2. Session Summaries

Understanding level is stored in session summaries and included in embedding text for better semantic search in RAG.

### 3. RAG Service

Understanding level is included in retrieved context, allowing the AI companion to reference student progress.

### 4. AI Companion

Understanding level is included in student context, allowing:
- Response complexity adjustment
- Progress acknowledgment
- Personalized encouragement

### 5. Practice Problems

Understanding level maps to difficulty:
- 0-30%: Difficulty 1 (Beginner)
- 31-50%: Difficulty 2 (Easy)
- 51-70%: Difficulty 3 (Intermediate)
- 71-85%: Difficulty 4 (Advanced)
- 86-100%: Difficulty 5 (Expert)

### 6. Goal Suggestions

Understanding level trends influence goal suggestions:
- Improving subjects get higher confidence scores
- Declining subjects get lower confidence scores
- Reasoning includes understanding level context

## Frontend Components

### UnderstandingLevelDashboard

Displays:
- Summary statistics (overall average, subjects studied, total sessions)
- Current understanding by subject with progress bars
- Progression charts for selected subjects
- Improving/declining subject trends

**Usage:**
```jsx
<UnderstandingLevelDashboard studentId={studentId} />
```

## Best Practices

1. **Always calculate understanding level before generating transcripts** - This ensures transcripts reflect actual student progress
2. **Use understanding level in AI prompts** - Provides better context for personalized responses
3. **Track trends over time** - Use analytics service to identify improving/declining subjects
4. **Adjust difficulty based on understanding** - Use AdaptiveDifficultyService for practice problems
5. **Consider understanding level in goal suggestions** - Prioritize subjects where student is improving

## Edge Cases

1. **First Session**: Understanding level is 0-20% based on student level
2. **Multiple Sessions Same Day**: Uses highest understanding level
3. **Long Gaps (>90 days)**: Applies time decay
4. **No Previous Data**: Starts at 0% or student level baseline
5. **Subject Change**: Each subject tracked independently

## Performance Considerations

- Understanding level calculation is done synchronously during transcript creation
- Analytics queries use database indexes on `student_id`, `subject`, and `understanding_level`
- Session summaries include understanding level in embeddings for efficient RAG retrieval

## Future Enhancements

1. Machine learning model for more accurate understanding level prediction
2. Subject-specific understanding level curves
3. Peer comparison and benchmarking
4. Predictive analytics for goal completion
5. Understanding level-based adaptive learning paths


