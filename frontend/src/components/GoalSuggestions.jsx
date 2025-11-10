import React, { useState, useEffect } from 'react'
import { retentionApi } from '../services/retentionApi'
import './GoalSuggestions.css'

function GoalSuggestions({ goalId, onGoalCreated }) {
  const [suggestions, setSuggestions] = useState([])
  const [sourceGoal, setSourceGoal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [acceptingId, setAcceptingId] = useState(null)

  useEffect(() => {
    if (goalId) {
      loadSuggestions()
    }
  }, [goalId])

  const loadSuggestions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await retentionApi.getGoalSuggestions(goalId)
      setSuggestions(response.data.suggestions || [])
      setSourceGoal(response.data.source_goal)
    } catch (err) {
      setError('Failed to load goal suggestions')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (suggestionId) => {
    try {
      setAcceptingId(suggestionId)
      const response = await retentionApi.acceptGoalSuggestion(suggestionId)
      
      // Update the suggestion in the list
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId
            ? { ...s, accepted_at: new Date().toISOString(), created_goal_id: response.data.created_goal.id }
            : s
        )
      )

      // Notify parent component
      if (onGoalCreated) {
        onGoalCreated(response.data.created_goal)
      }

      alert('Goal created successfully!')
    } catch (err) {
      alert('Failed to create goal from suggestion')
      console.error(err)
    } finally {
      setAcceptingId(null)
    }
  }

  if (!goalId) {
    return (
      <div className="goal-suggestions">
        <div className="empty-state">Select a completed goal to see suggestions</div>
      </div>
    )
  }

  if (loading) {
    return <div className="goal-suggestions loading">Loading suggestions...</div>
  }

  if (error) {
    return <div className="goal-suggestions error">{error}</div>
  }

  return (
    <div className="goal-suggestions">
      {sourceGoal && (
        <div className="source-goal-info">
          <h3>Suggestions for: {sourceGoal.title || sourceGoal.subject}</h3>
          <p className="source-goal-subject">Completed: {sourceGoal.subject}</p>
        </div>
      )}

      {suggestions.length === 0 ? (
        <div className="empty-state">
          No suggestions available. Complete a goal to get personalized suggestions for your next learning goal.
        </div>
      ) : (
        <div className="suggestions-list">
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onAccept={handleAccept}
              isAccepting={acceptingId === suggestion.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SuggestionCard({ suggestion, onAccept, isAccepting }) {
  const isAccepted = suggestion.accepted_at !== null

  return (
    <div className={`suggestion-card ${isAccepted ? 'accepted' : ''}`}>
      <div className="suggestion-header">
        <h4>{suggestion.suggested_subject}</h4>
        {suggestion.confidence && (
          <div className="confidence-badge">
            {Math.round(suggestion.confidence * 100)}% match
          </div>
        )}
      </div>

      {suggestion.suggested_goal_type && (
        <div className="goal-type-badge">
          {suggestion.suggested_goal_type.replace('_', ' ')}
        </div>
      )}

      {suggestion.reasoning && (
        <p className="suggestion-reasoning">{suggestion.reasoning}</p>
      )}

      <div className="suggestion-actions">
        {isAccepted ? (
          <div className="accepted-message">
            ✓ Accepted - Goal created
            {suggestion.created_goal_id && (
              <span className="goal-id"> (Goal #{suggestion.created_goal_id})</span>
            )}
          </div>
        ) : (
          <button
            className="accept-button"
            onClick={() => onAccept(suggestion.id)}
            disabled={isAccepting}
          >
            {isAccepting ? 'Creating Goal...' : 'Create Goal'}
          </button>
        )}
      </div>

      {suggestion.presented_at && (
        <div className="suggestion-meta">
          Suggested: {new Date(suggestion.presented_at).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}

export default GoalSuggestions







