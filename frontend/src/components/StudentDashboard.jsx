import React, { useState, useEffect } from 'react'
import { studentDashboardApi } from '../services/studentDashboardApi'
import SubjectDetailView from './SubjectDetailView'
import './StudentDashboard.css'

function StudentDashboard({ studentId = 1 }) {
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboard()
  }, [studentId])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await studentDashboardApi.getDashboard(studentId)
      setSubjects(response.data.subjects || [])
    } catch (err) {
      setError('Failed to load dashboard: ' + (err.response?.data?.error || err.message))
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubjectClick = (subject) => {
    setSelectedSubject(subject)
  }

  const handleBackToDashboard = () => {
    setSelectedSubject(null)
  }

  const getMasteryColor = (level) => {
    switch (level) {
      case 'Needs Work':
        return '#dc3545' // Red
      case 'Proficient':
        return '#ffc107' // Yellow/Orange
      case 'Advanced':
        return '#007bff' // Blue
      case 'Master':
        return '#28a745' // Green
      default:
        return '#6c757d' // Gray
    }
  }

  if (loading) {
    return (
      <div className="student-dashboard loading">
        <div>Loading your subjects...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="student-dashboard error">
        <div className="error-message">{error}</div>
        <button onClick={loadDashboard} className="retry-button">Retry</button>
      </div>
    )
  }

  // If a subject is selected, show the detail view
  if (selectedSubject) {
    return (
      <SubjectDetailView
        studentId={studentId}
        subject={selectedSubject}
        onBack={handleBackToDashboard}
      />
    )
  }

  // Show subject list
  return (
    <div className="student-dashboard">
      <div className="dashboard-header">
        <h2>My Subjects</h2>
        <p className="dashboard-subtitle">Select a subject to view your progress and practice</p>
      </div>

      {subjects.length === 0 ? (
        <div className="no-subjects">
          <p>You don't have any subjects yet. Start by creating a goal or completing a tutoring session.</p>
        </div>
      ) : (
        <div className="subjects-grid">
          {subjects.map((item) => {
            const { subject, mastery } = item
            const masteryColor = getMasteryColor(mastery.level)
            
            return (
              <div
                key={subject}
                className="subject-card"
                onClick={() => handleSubjectClick(subject)}
              >
                <div className="subject-header">
                  <h3 className="subject-name">{subject}</h3>
                  <span
                    className="mastery-badge"
                    style={{ backgroundColor: masteryColor }}
                  >
                    {mastery.level}
                  </span>
                </div>
                
                <div className="subject-stats">
                  <div className="progress-bar-container">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${mastery.percentage}%`,
                          backgroundColor: masteryColor
                        }}
                      />
                    </div>
                    <span className="progress-percentage">{mastery.percentage}%</span>
                  </div>
                  
                  <div className="goals-info">
                    <span>{mastery.goals_count} goal{mastery.goals_count !== 1 ? 's' : ''}</span>
                    {mastery.active_goals > 0 && (
                      <span className="active-goals">{mastery.active_goals} active</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default StudentDashboard


