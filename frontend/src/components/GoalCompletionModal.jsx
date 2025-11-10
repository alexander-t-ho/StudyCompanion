import React, { useState, useEffect } from 'react'
import { retentionApi } from '../services/retentionApi'
import './GoalCompletionModal.css'

function GoalCompletionModal({ goal, onClose, onGoalCreated }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [acceptingId, setAcceptingId] = useState(null)

  useEffect(() => {
    if (goal && goal.id) {
      loadSuggestions()
    }
  }, [goal])

  const loadSuggestions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await retentionApi.getGoalSuggestions(goal.id)
      setSuggestions(response.data.suggestions || [])
    } catch (err) {
      setError('Failed to load suggestions')
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
    } catch (err) {
      alert('Failed to create goal from suggestion')
      console.error(err)
    } finally {
      setAcceptingId(null)
    }
  }

  if (!goal) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="goal-completion-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="celebration">
            <div className="celebration-icon">🎉</div>
            <h2>Congratulations!</h2>
            <p>You've completed your goal: <strong>{goal.title || goal.subject}</strong></p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="suggestions-section">
            <h3>What's Next?</h3>
            <p className="suggestions-intro">
              Based on your success, here are some great next steps for your learning journey:
            </p>

            {loading ? (
              <div className="loading-state">Loading suggestions...</div>
            ) : error ? (
              <div className="error-state">{error}</div>
            ) : suggestions.length === 0 ? (
              <div className="empty-state">
                No suggestions available at this time. Check back later or explore new goals!
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
        </div>

        <div className="modal-footer">
          <button className="skip-button" onClick={onClose}>
            I'll decide later
          </button>
        </div>
      </div>
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
            ✓ Goal created successfully!
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
    </div>
  )
}

export default GoalCompletionModal


