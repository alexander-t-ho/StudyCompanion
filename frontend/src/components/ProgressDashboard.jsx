import React, { useState, useEffect } from 'react'
import { retentionApi } from '../services/retentionApi'
import api from '../services/api'
import CircularProgress from './CircularProgress'
import './ProgressDashboard.css'

function ProgressDashboard({ onGoalCompleted }) {
  const [dashboardData, setDashboardData] = useState(null)
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [studentId, setStudentId] = useState('1') // Default to student ID 1 for testing
  
  // Filtering state
  const [filterSubject, setFilterSubject] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [progressView, setProgressView] = useState('bars') // 'bars' or 'circles'
  const [showCreateGoal, setShowCreateGoal] = useState(false)
  const [newGoalSubject, setNewGoalSubject] = useState('')
  const [newGoalTitle, setNewGoalTitle] = useState('')

  useEffect(() => {
    // Set up authentication - use student_id in params
    if (studentId) {
      api.defaults.params = { student_id: studentId }
    }
    loadDashboard()
    loadInsights()
  }, [studentId])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const response = await retentionApi.getProgressDashboard()
      setDashboardData(response.data)
      setError(null)
    } catch (err) {
      setError('Failed to load dashboard data: ' + (err.response?.data?.error || err.message))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadInsights = async () => {
    try {
      const response = await retentionApi.getProgressInsights()
      setInsights(response.data.insights || [])
    } catch (err) {
      console.error('Failed to load insights:', err)
    }
  }

  const handleCreateGoal = async () => {
    if (!newGoalSubject || !newGoalTitle) {
      alert('Please fill in both subject and title')
      return
    }

    try {
      // Create goal via API
      const response = await api.post('/goals', {
        goal: {
          subject: newGoalSubject,
          title: newGoalTitle,
          status: 'active',
          progress_percentage: 0
        }
      })
      
      setShowCreateGoal(false)
      setNewGoalSubject('')
      setNewGoalTitle('')
      loadDashboard() // Refresh dashboard
      alert('Goal created successfully!')
    } catch (err) {
      alert('Failed to create goal: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleMarkComplete = async (goal) => {
    if (!window.confirm(`Mark "${goal.title || goal.subject}" as completed?`)) {
      return
    }

    try {
      await api.patch(`/goals/${goal.id}`, {
        goal: {
          status: 'completed',
          completed_at: new Date().toISOString().split('T')[0],
          progress_percentage: 100
        }
      })
      
      // Trigger modal if callback provided
      if (onGoalCompleted) {
        onGoalCompleted({ ...goal, status: 'completed' })
      }
      
      loadDashboard() // Refresh dashboard
    } catch (err) {
      alert('Failed to mark goal as complete: ' + (err.response?.data?.error || err.message))
    }
  }

  // Filter goals based on filters
  const getFilteredGoals = (goals) => {
    return goals.filter(goal => {
      if (filterSubject && !goal.subject.toLowerCase().includes(filterSubject.toLowerCase())) {
        return false
      }
      if (filterStatus !== 'all' && goal.status !== filterStatus) {
        return false
      }
      if (filterDateFrom) {
        const goalDate = goal.created_at ? new Date(goal.created_at) : null
        const fromDate = new Date(filterDateFrom)
        if (!goalDate || goalDate < fromDate) {
          return false
        }
      }
      if (filterDateTo) {
        const goalDate = goal.created_at ? new Date(goal.created_at) : null
        const toDate = new Date(filterDateTo)
        toDate.setHours(23, 59, 59, 999) // Include entire day
        if (!goalDate || goalDate > toDate) {
          return false
        }
      }
      return true
    })
  }

  if (loading) {
    return <div className="progress-dashboard loading">Loading dashboard...</div>
  }

  if (error) {
    return <div className="progress-dashboard error">{error}</div>
  }

  if (!dashboardData) {
    return <div className="progress-dashboard">No data available</div>
  }

  const { active_goals, completed_goals, summary, subject_relationships } = dashboardData
  const filteredActiveGoals = getFilteredGoals(active_goals)
  const filteredCompletedGoals = getFilteredGoals(completed_goals)
  
  // Get unique subjects for filter dropdown
  const allSubjects = [...new Set([...active_goals, ...completed_goals].map(g => g.subject))]

  return (
    <div className="progress-dashboard">
      <div className="dashboard-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h2>My Progress Dashboard</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '14px' }}>Student ID:</label>
            <input
              type="number"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '80px' }}
            />
            <button 
              onClick={() => setShowCreateGoal(!showCreateGoal)}
              style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              + New Goal
            </button>
          </div>
        </div>

        {showCreateGoal && (
          <div className="create-goal-form" style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h4>Create New Goal</h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Subject:</label>
                <input
                  type="text"
                  value={newGoalSubject}
                  onChange={(e) => setNewGoalSubject(e.target.value)}
                  placeholder="e.g., SAT Math"
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '200px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Title:</label>
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g., SAT Math Prep"
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '200px' }}
                />
              </div>
              <button onClick={handleCreateGoal} style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Create
              </button>
              <button onClick={() => setShowCreateGoal(false)} style={{ padding: '8px 16px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="filters" style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Filter by Subject:</label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '150px' }}
            >
              <option value="">All Subjects</option>
              {allSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Filter by Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '150px' }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>From Date:</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>To Date:</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>View:</label>
            <select
              value={progressView}
              onChange={(e) => setProgressView(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '120px' }}
            >
              <option value="bars">Progress Bars</option>
              <option value="circles">Circular</option>
            </select>
          </div>
          {(filterSubject || filterStatus !== 'all' || filterDateFrom || filterDateTo) && (
            <button
              onClick={() => {
                setFilterSubject('')
                setFilterStatus('all')
                setFilterDateFrom('')
                setFilterDateTo('')
              }}
              style={{ padding: '8px 16px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Clear Filters
            </button>
          )}
        </div>
        <div className="summary-stats">
          <div className="stat-card">
            <div className="stat-value">{summary.total_goals}</div>
            <div className="stat-label">Total Goals</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summary.active_goals}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summary.completed_goals}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summary.average_progress}%</div>
            <div className="stat-label">Avg Progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summary.total_sessions}</div>
            <div className="stat-label">Total Sessions</div>
          </div>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="insights-section">
          <h3>Insights</h3>
          <div className="insights-list">
            {insights.map((insight, index) => (
              <div key={index} className={`insight-card priority-${insight.priority}`}>
                <div className="insight-type">{insight.type.replace('_', ' ')}</div>
                <div className="insight-message">{insight.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="goals-section">
        <div className="active-goals">
          <h3>Active Goals ({filteredActiveGoals.length})</h3>
          {filteredActiveGoals.length === 0 ? (
            <div className="empty-state">No active goals{filterSubject || filterStatus !== 'all' ? ' matching filters' : ''}</div>
          ) : (
            <div className="goals-grid">
              {filteredActiveGoals.map((goal) => (
                <GoalCard 
                  key={goal.id} 
                  goal={goal} 
                  onMarkComplete={handleMarkComplete}
                  progressView={progressView}
                />
              ))}
            </div>
          )}
        </div>

        {filteredCompletedGoals.length > 0 && (
          <div className="completed-goals">
            <h3>Completed Goals ({filteredCompletedGoals.length})</h3>
            <div className="goals-grid">
              {filteredCompletedGoals.map((goal) => (
                <GoalCard 
                  key={goal.id} 
                  goal={goal} 
                  completed 
                  progressView={progressView}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {subject_relationships && subject_relationships.length > 0 && (
        <div className="relationships-section">
          <h3>Subject Relationships</h3>
          <div className="relationships-graph">
            {subject_relationships.map((rel, index) => (
              <div key={index} className="relationship-item">
                <span className="source-subject">{rel.source}</span>
                <span className="relationship-arrow">→</span>
                <span className="target-subject">{rel.target}</span>
                <span className="relationship-type">({rel.type})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GoalCard({ goal, completed = false, onMarkComplete, progressView = 'bars' }) {
  const milestones = goal.metadata?.milestones || []
  const completedMilestones = milestones.filter(m => m.completed).length

  return (
    <div className={`goal-card ${completed ? 'completed' : 'active'}`}>
      <div className="goal-header">
        <h4>{goal.title || goal.subject}</h4>
        <span className={`goal-status status-${goal.status}`}>{goal.status}</span>
      </div>
      {goal.description && <p className="goal-description">{goal.description}</p>}
      <div className="goal-progress">
        {progressView === 'circles' ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <CircularProgress percentage={goal.progress_percentage} size={100} />
          </div>
        ) : (
          <>
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${goal.progress_percentage}%` }}
              />
            </div>
            <div className="progress-text">{goal.progress_percentage}%</div>
          </>
        )}
      </div>
      {milestones.length > 0 && (
        <div className="goal-milestones" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e0e0e0' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
            Milestones: {completedMilestones}/{milestones.length}
          </div>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {milestones.slice(0, 3).map((milestone, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: milestone.completed ? '#d1fae5' : '#f3f4f6',
                  color: milestone.completed ? '#059669' : '#6b7280'
                }}
              >
                {milestone.completed ? '✓' : '○'} {milestone.name}
              </span>
            ))}
            {milestones.length > 3 && (
              <span style={{ fontSize: '11px', color: '#999' }}>+{milestones.length - 3} more</span>
            )}
          </div>
        </div>
      )}
      <div className="goal-meta">
        {goal.days_remaining !== null && goal.days_remaining !== undefined && (
          <span className="days-remaining">
            {goal.days_remaining > 0
              ? `${goal.days_remaining} days remaining`
              : goal.days_remaining === 0
              ? 'Due today'
              : `${Math.abs(goal.days_remaining)} days overdue`}
          </span>
        )}
        {goal.related_sessions_count !== undefined && (
          <span className="sessions-count">
            {goal.related_sessions_count} session{goal.related_sessions_count !== 1 ? 's' : ''}
          </span>
        )}
        {goal.created_at && (
          <span className="created-date" style={{ fontSize: '11px', color: '#999' }}>
            Created: {new Date(goal.created_at).toLocaleDateString()}
          </span>
        )}
      </div>
      {!completed && goal.status === 'active' && onMarkComplete && goal.progress_percentage >= 100 && (
        <div className="goal-actions" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e0e0e0' }}>
          <button
            onClick={() => onMarkComplete(goal)}
            style={{
              width: '100%',
              padding: '10px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Mark as Complete
          </button>
        </div>
      )}
      {goal.completed_at && (
        <div className="completed-date">
          Completed: {new Date(goal.completed_at).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}

export default ProgressDashboard

