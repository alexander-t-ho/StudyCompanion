import React, { useState, useEffect } from 'react'
import { goalsApi } from '../services/goalsApi'
import LongTermGoalCard from './LongTermGoalCard'
import './LongTermGoalsView.css'

function LongTermGoalsView({ studentId = 1, onClose }) {
  const [goalsBySubject, setGoalsBySubject] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedSubjects, setExpandedSubjects] = useState({})
  const [recalculating, setRecalculating] = useState({})

  useEffect(() => {
    loadGoals()
  }, [studentId])

  const loadGoals = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await goalsApi.getLongTermGoalsFromDashboard(studentId)
      setGoalsBySubject(response.data.goals_by_subject || {})
    } catch (err) {
      console.error('Failed to load long-term goals:', err)
      setError('Failed to load goals: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleRecalculate = async (goalId) => {
    try {
      setRecalculating(prev => ({ ...prev, [goalId]: true }))
      await goalsApi.recalculateProgress(studentId, goalId)
      // Reload goals to get updated progress
      await loadGoals()
    } catch (err) {
      console.error('Failed to recalculate progress:', err)
      alert('Failed to recalculate progress: ' + (err.response?.data?.error || err.message))
    } finally {
      setRecalculating(prev => ({ ...prev, [goalId]: false }))
    }
  }

  const toggleSubject = (subject) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subject]: !prev[subject]
    }))
  }

  if (loading) {
    return (
      <div className="long-term-goals-view loading">
        <div className="loading-spinner"></div>
        <p>Loading long-term goals...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="long-term-goals-view error">
        <div className="error-message">{error}</div>
        <button onClick={loadGoals} className="retry-button">Retry</button>
      </div>
    )
  }

  const subjects = Object.keys(goalsBySubject)

  if (subjects.length === 0) {
    return (
      <div className="long-term-goals-view empty">
        <p>No long-term goals found. Create your first long-term goal to get started!</p>
      </div>
    )
  }

  return (
    <div className="long-term-goals-view">
      {onClose && (
        <button 
          className="close-sessions-view-button"
          onClick={onClose}
          aria-label="Close goals view"
        >
          × Close
        </button>
      )}
      <div className="goals-view-header">
        <h2>Long-Term Goals</h2>
        <p className="goals-view-subtitle">Track your progress toward major learning objectives</p>
      </div>

      <div className="goals-by-subject">
        {subjects.map((subject) => {
          const goals = goalsBySubject[subject]
          const isExpanded = expandedSubjects[subject]

          return (
            <div key={subject} className="subject-goals-section">
              <div 
                className="subject-header"
                onClick={() => toggleSubject(subject)}
              >
                <h3 className="subject-title">{subject}</h3>
                <div className="subject-meta">
                  <span className="goals-count">{goals.length} goal{goals.length !== 1 ? 's' : ''}</span>
                  <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="subject-goals-list">
                  {goals.map((goal) => (
                    <LongTermGoalCard
                      key={goal.id}
                      goal={goal}
                      onRecalculate={handleRecalculate}
                      recalculating={recalculating[goal.id]}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default LongTermGoalsView


