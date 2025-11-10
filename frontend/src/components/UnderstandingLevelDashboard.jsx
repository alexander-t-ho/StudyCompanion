import React, { useState, useEffect } from 'react'
import { understandingLevelApi } from '../services/understandingLevelApi'
import './UnderstandingLevelDashboard.css'

function UnderstandingLevelDashboard({ studentId }) {
  const [summary, setSummary] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [progression, setProgression] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSummary()
  }, [studentId])

  useEffect(() => {
    if (selectedSubject) {
      loadProgression(selectedSubject)
    }
  }, [selectedSubject, studentId])

  const loadSummary = async () => {
    try {
      setLoading(true)
      const response = await understandingLevelApi.getSummary(studentId)
      setSummary(response.data.summary)
      setError(null)
    } catch (err) {
      setError('Failed to load understanding level summary')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadProgression = async (subject) => {
    try {
      const response = await understandingLevelApi.getProgression(studentId, subject)
      setProgression(response.data.progression)
    } catch (err) {
      console.error('Failed to load progression:', err)
    }
  }

  if (loading) {
    return <div className="understanding-dashboard loading">Loading...</div>
  }

  if (error) {
    return <div className="understanding-dashboard error">{error}</div>
  }

  if (!summary) {
    return <div className="understanding-dashboard">No data available</div>
  }

  return (
    <div className="understanding-dashboard">
      <h2>Understanding Level Dashboard</h2>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Overall Average</h3>
          <div className="big-number">{Number(summary.overall_current_average || 0).toFixed(1)}%</div>
        </div>
        <div className="summary-card">
          <h3>Subjects Studied</h3>
          <div className="big-number">{summary.subjects_studied}</div>
        </div>
        <div className="summary-card">
          <h3>Total Sessions</h3>
          <div className="big-number">{summary.total_sessions}</div>
        </div>
        <div className="summary-card">
          <h3>Highest Level</h3>
          <div className="big-number">{Number(summary.highest_understanding || 0).toFixed(1)}%</div>
        </div>
      </div>

      {/* Current Understanding by Subject */}
      <div className="section">
        <h3>Current Understanding by Subject</h3>
        <div className="subject-list">
          {summary.current_understanding_by_subject.map((subject) => (
            <div
              key={subject.subject}
              className={`subject-card ${selectedSubject === subject.subject ? 'selected' : ''}`}
              onClick={() => setSelectedSubject(subject.subject)}
            >
              <div className="subject-name">{subject.subject}</div>
              <div className="understanding-bar">
                <div
                  className="understanding-fill"
                  style={{ width: `${Number(subject.understanding_level || 0)}%` }}
                />
                <span className="understanding-value">{Number(subject.understanding_level || 0).toFixed(1)}%</span>
              </div>
              <div className="subject-date">
                Last session: {new Date(subject.session_date).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progression Chart */}
      {progression && (
        <div className="section">
          <h3>Progression: {progression.subject}</h3>
          <div className="progression-info">
            <div className="progression-stat">
              <span className="label">First Session:</span>
              <span className="value">{Number(progression.first_understanding_level || 0).toFixed(1)}%</span>
            </div>
            <div className="progression-stat">
              <span className="label">Current:</span>
              <span className="value">{Number(progression.current_understanding_level || 0).toFixed(1)}%</span>
            </div>
            <div className="progression-stat">
              <span className="label">Total Progress:</span>
              <span className={`value ${Number(progression.total_progress || 0) > 0 ? 'positive' : 'negative'}`}>
                {Number(progression.total_progress || 0) > 0 ? '+' : ''}{Number(progression.total_progress || 0).toFixed(1)}%
              </span>
            </div>
            <div className="progression-stat">
              <span className="label">Trend:</span>
              <span className={`value trend-${progression.trend}`}>{progression.trend}</span>
            </div>
          </div>
          <div className="progression-chart">
            {progression.progression.map((point, idx) => (
              <div key={idx} className="progression-point">
                <div className="point-value">{Number(point.understanding_level || 0).toFixed(0)}%</div>
                <div
                  className="point-bar"
                  style={{ height: `${Number(point.understanding_level || 0)}%` }}
                />
                <div className="point-date">
                  {new Date(point.session_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improving/Declining Subjects */}
      {(summary.improving_subjects.length > 0 || summary.declining_subjects.length > 0) && (
        <div className="section">
          <h3>Trends</h3>
          {summary.improving_subjects.length > 0 && (
            <div className="trend-list improving">
              <h4>📈 Improving Subjects</h4>
              <ul>
                {summary.improving_subjects.map((subject) => (
                  <li key={subject}>{subject}</li>
                ))}
              </ul>
            </div>
          )}
          {summary.declining_subjects.length > 0 && (
            <div className="trend-list declining">
              <h4>📉 Subjects Needing Attention</h4>
              <ul>
                {summary.declining_subjects.map((subject) => (
                  <li key={subject}>{subject}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default UnderstandingLevelDashboard

