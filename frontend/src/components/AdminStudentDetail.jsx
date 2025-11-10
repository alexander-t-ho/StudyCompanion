import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { adminApi } from '../services/adminApi'
import './AdminStudentDetail.css'

function AdminStudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [studentData, setStudentData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    loadStudentData()
  }, [id])

  const loadStudentData = async () => {
    try {
      setLoading(true)
      const response = await adminApi.getStudent(id)
      setStudentData(response.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load student data')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="admin-student-detail-container">
        <div className="loading-text">Loading student data...</div>
      </div>
    )
  }

  if (error || !studentData) {
    return (
      <div className="admin-student-detail-container">
        <div className="error-message">{error || 'Student not found'}</div>
        <button className="back-button" onClick={() => navigate('/admin')}>
          ← Back to Admin Dashboard
        </button>
      </div>
    )
  }

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'goals', label: 'Goals' },
    { id: 'sessions', label: 'Study Sessions' },
    { id: 'upcoming', label: 'Upcoming Sessions' },
    { id: 'progress', label: 'Progress Analytics' },
    { id: 'study-notes', label: 'Study Notes' },
    { id: 'practice', label: 'Practice Problems' }
  ]

  return (
    <div className="admin-student-detail-container">
      <div className="admin-student-header">
        <div>
          <button className="back-button" onClick={() => navigate('/admin')}>
            ← Back to Admin Dashboard
          </button>
          <h1 className="student-detail-title">{studentData.student.name || studentData.student.username}</h1>
          <div className="student-detail-meta">
            <span>{studentData.student.email}</span>
          </div>
        </div>
      </div>

      <div className="admin-student-nav">
        {sections.map((section) => (
          <button
            key={section.id}
            className={`nav-button ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>

      <div className="admin-student-content">
        {activeSection === 'overview' && (
          <div className="overview-section">
            <div className="overview-stats">
              <div className="overview-stat-card">
                <div className="overview-stat-value">{studentData.goals?.length || 0}</div>
                <div className="overview-stat-label">Total Goals</div>
              </div>
              <div className="overview-stat-card">
                <div className="overview-stat-value">{studentData.sessions?.length || 0}</div>
                <div className="overview-stat-label">Total Sessions</div>
              </div>
              <div className="overview-stat-card">
                <div className="overview-stat-value">{studentData.upcoming_sessions?.length || 0}</div>
                <div className="overview-stat-label">Upcoming Sessions</div>
              </div>
              <div className="overview-stat-card">
                <div className="overview-stat-value">{studentData.practice_problems_count || 0}</div>
                <div className="overview-stat-label">Practice Problems</div>
              </div>
              <div className="overview-stat-card">
                <div className="overview-stat-value">{studentData.study_notes?.length || 0}</div>
                <div className="overview-stat-label">Study Notes</div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'goals' && (
          <div className="section-content">
            <h2>Goals</h2>
            {studentData.goals && studentData.goals.length > 0 ? (
              <div className="goals-list">
                {studentData.goals.map((goal) => (
                  <div key={goal.id} className="goal-card">
                    <div className="goal-header">
                      <h3>{goal.title}</h3>
                      <span className={`goal-status ${goal.status}`}>{goal.status}</span>
                    </div>
                    <p className="goal-description">{goal.description}</p>
                    <div className="goal-meta">
                      <span>Subject: {goal.subject}</span>
                      <span>Type: {goal.goal_type}</span>
                      <span>Progress: {goal.progress_percentage || 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No goals found</div>
            )}
          </div>
        )}

        {activeSection === 'sessions' && (
          <div className="section-content">
            <h2>Study Sessions</h2>
            {studentData.sessions && studentData.sessions.length > 0 ? (
              <div className="sessions-list">
                {studentData.sessions.map((session) => (
                  <div key={session.id} className="session-card">
                    <div className="session-header">
                      <h3>{session.subject}</h3>
                      <span className={`session-status ${session.status}`}>{session.status}</span>
                    </div>
                    <div className="session-details">
                      <p><strong>Topic:</strong> {session.topic || 'N/A'}</p>
                      <p><strong>Scheduled:</strong> {formatDate(session.scheduled_at)}</p>
                      {session.started_at && <p><strong>Started:</strong> {formatDate(session.started_at)}</p>}
                      {session.ended_at && <p><strong>Ended:</strong> {formatDate(session.ended_at)}</p>}
                      {session.duration_minutes && <p><strong>Duration:</strong> {session.duration_minutes} minutes</p>}
                      {session.notes && <p><strong>Notes:</strong> {session.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No sessions found</div>
            )}
          </div>
        )}

        {activeSection === 'upcoming' && (
          <div className="section-content">
            <h2>Upcoming Study Sessions</h2>
            {studentData.upcoming_sessions && studentData.upcoming_sessions.length > 0 ? (
              <div className="sessions-list">
                {studentData.upcoming_sessions.map((session) => (
                  <div key={session.id} className="session-card upcoming">
                    <div className="session-header">
                      <h3>{session.subject}</h3>
                      <span className={`session-status ${session.status}`}>{session.status}</span>
                    </div>
                    <div className="session-details">
                      <p><strong>Topic:</strong> {session.topic || 'N/A'}</p>
                      <p><strong>Scheduled:</strong> {formatDate(session.scheduled_at)}</p>
                      {session.notes && <p><strong>Notes:</strong> {session.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No upcoming sessions</div>
            )}
          </div>
        )}

        {activeSection === 'progress' && (
          <div className="section-content">
            <h2>Progress Analytics</h2>
            {studentData.progress_analytics && Object.keys(studentData.progress_analytics).length > 0 ? (
              <div className="progress-analytics">
                {Object.entries(studentData.progress_analytics).map(([subject, data]) => (
                  <div key={subject} className="progress-card">
                    <h3>{subject}</h3>
                    <div className="progress-mastery">
                      <div className="mastery-value">{data.mastery?.toFixed(1) || 0}%</div>
                      <div className="mastery-label">Mastery</div>
                    </div>
                    {data.breakdown && (
                      <div className="progress-breakdown">
                        <h4>Breakdown</h4>
                        <pre>{JSON.stringify(data.breakdown, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No progress data available</div>
            )}
          </div>
        )}

        {activeSection === 'study-notes' && (
          <div className="section-content">
            <h2>Study Notes</h2>
            <p className="section-description">
              AI-detected areas where the student is struggling. These notes are automatically created when the AI detects consistent struggling patterns.
            </p>
            {studentData.study_notes && studentData.study_notes.length > 0 ? (
              <div className="study-notes-list">
                {studentData.study_notes.map((note) => (
                  <div key={note.id} className="study-note-card">
                    <div className="study-note-header">
                      <div>
                        <h3>{note.concept}</h3>
                        {note.subject && <span className="study-note-subject">{note.subject}</span>}
                      </div>
                      <span className={`study-note-status ${note.notified_tutor ? 'notified' : 'pending'}`}>
                        {note.notified_tutor ? 'Notified' : 'Pending'}
                      </span>
                    </div>
                    <p className="study-note-message">{note.message}</p>
                    <div className="study-note-meta">
                      <span>Detected: {formatDate(note.detected_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No study notes found</div>
            )}
          </div>
        )}

        {activeSection === 'practice' && (
          <div className="section-content">
            <h2>Practice Problems</h2>
            <div className="practice-stats">
              <div className="practice-stat-card">
                <div className="practice-stat-value">{studentData.practice_problems_count || 0}</div>
                <div className="practice-stat-label">Total Practice Problems Completed</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminStudentDetail

