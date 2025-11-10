import React, { useState, useEffect } from 'react'
import { studentDashboardApi } from '../services/studentDashboardApi'
import SessionSummaryCard from './SessionSummaryCard'
import PracticeProblemList from './PracticeProblemList'
import AiCompanionChat from './AiCompanionChat'
import './SubjectDetailView.css'

function SubjectDetailView({ studentId, subject, onBack }) {
  const [subjectData, setSubjectData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '')
  const [useOpenRouter, setUseOpenRouter] = useState(localStorage.getItem('use_openrouter') === 'true')
  const [selectedSessionForChat, setSelectedSessionForChat] = useState(null)

  useEffect(() => {
    loadSubjectDetail()
  }, [studentId, subject])

  const loadSubjectDetail = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await studentDashboardApi.getSubjectDetail(studentId, subject)
      setSubjectData(response.data)
    } catch (err) {
      setError('Failed to load subject details: ' + (err.response?.data?.error || err.message))
      console.error('Subject detail load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getMasteryColor = (level) => {
    switch (level) {
      case 'Needs Work':
        return '#dc3545'
      case 'Proficient':
        return '#ffc107'
      case 'Advanced':
        return '#007bff'
      case 'Master':
        return '#28a745'
      default:
        return '#6c757d'
    }
  }

  if (loading) {
    return (
      <div className="subject-detail-view loading">
        <div>Loading {subject}...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="subject-detail-view error">
        <div className="error-message">{error}</div>
        <button onClick={loadSubjectDetail} className="retry-button">Retry</button>
        <button onClick={onBack} className="back-button">Back to Dashboard</button>
      </div>
    )
  }

  if (!subjectData) {
    return (
      <div className="subject-detail-view">
        <div>No data available for {subject}</div>
        <button onClick={onBack} className="back-button">Back to Dashboard</button>
      </div>
    )
  }

  const { mastery, sessions, goals, learning_concepts } = subjectData
  const masteryColor = getMasteryColor(mastery.level)
  const activeGoals = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')

  return (
    <div className="subject-detail-view">
      <div className="detail-header">
        <button onClick={onBack} className="back-button">← Back to Subjects</button>
        <h2>{subject}</h2>
      </div>

      {/* Mastery Overview */}
      <div className="mastery-overview" style={{ borderLeftColor: masteryColor }}>
        <div className="mastery-content">
          <div className="mastery-level-large" style={{ color: masteryColor }}>
            {mastery.level}
          </div>
          <div className="mastery-details">
            <div className="mastery-percentage">{mastery.percentage}%</div>
            <div className="mastery-stats">
              <span>{mastery.goals_count} goal{mastery.goals_count !== 1 ? 's' : ''}</span>
              <span>•</span>
              <span>{mastery.completed_goals} completed</span>
              {mastery.active_goals > 0 && (
                <>
                  <span>•</span>
                  <span>{mastery.active_goals} active</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="mastery-progress-bar">
          <div
            className="mastery-progress-fill"
            style={{
              width: `${Number(mastery.percentage || 0)}%`,
              backgroundColor: masteryColor
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'sessions' ? 'active' : ''}
          onClick={() => setActiveTab('sessions')}
        >
          Sessions ({sessions.length})
        </button>
        <button
          className={activeTab === 'goals' ? 'active' : ''}
          onClick={() => setActiveTab('goals')}
        >
          Goals ({goals.length})
        </button>
        <button
          className={activeTab === 'practice' ? 'active' : ''}
          onClick={() => setActiveTab('practice')}
        >
          Practice
        </button>
        <button
          className={activeTab === 'chat' ? 'active' : ''}
          onClick={() => setActiveTab('chat')}
        >
          Ask AI
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {/* Learning Concepts */}
            {learning_concepts && (learning_concepts.key_concepts?.length > 0 || learning_concepts.topics?.length > 0) && (
              <div className="learning-concepts-section">
                <h3>Learning Concepts</h3>
                {learning_concepts.key_concepts?.length > 0 && (
                  <div className="concepts-list">
                    <h4>Key Concepts</h4>
                    <div className="concept-tags">
                      {learning_concepts.key_concepts.map((concept, idx) => (
                        <span key={idx} className="concept-tag">{concept}</span>
                      ))}
                    </div>
                  </div>
                )}
                {learning_concepts.topics?.length > 0 && (
                  <div className="topics-list">
                    <h4>Topics Covered</h4>
                    <div className="topic-tags">
                      {learning_concepts.topics.map((topic, idx) => (
                        <span key={idx} className="topic-tag">{topic}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recent Sessions Preview */}
            {sessions.length > 0 && (
              <div className="recent-sessions-preview">
                <h3>Recent Sessions</h3>
                <div className="sessions-preview-list">
                  {sessions.slice(0, 3).map((session) => (
                    <SessionSummaryCard
                      key={session.id || session.transcript_id}
                      session={session}
                      studentId={studentId}
                      subject={subject}
                      apiKey={apiKey}
                      useOpenRouter={useOpenRouter}
                      compact={true}
                      onAskAI={() => {
                        setSelectedSessionForChat(session)
                        setActiveTab('chat')
                      }}
                    />
                  ))}
                </div>
                {sessions.length > 3 && (
                  <button
                    className="view-all-button"
                    onClick={() => setActiveTab('sessions')}
                  >
                    View All Sessions ({sessions.length})
                  </button>
                )}
              </div>
            )}

            {/* Goals Preview */}
            {goals.length > 0 && (
              <div className="goals-preview">
                <h3>Goals</h3>
                <div className="goals-preview-list">
                  {activeGoals.slice(0, 3).map((goal) => (
                    <div key={goal.id} className="goal-preview-item">
                      <div className="goal-title">{goal.title || `${subject} Goal`}</div>
                      <div className="goal-progress">
                        <div className="goal-progress-bar">
                          <div
                            className="goal-progress-fill"
                            style={{ width: `${Number(goal.progress_percentage || 0)}%` }}
                          />
                        </div>
                        <span>{goal.progress_percentage || 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                {goals.length > 3 && (
                  <button
                    className="view-all-button"
                    onClick={() => setActiveTab('goals')}
                  >
                    View All Goals ({goals.length})
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="sessions-tab">
            <h3>Past Tutoring Sessions</h3>
            {sessions.length === 0 ? (
              <div className="empty-state">
                <p>No sessions found for {subject}.</p>
              </div>
            ) : (
              <div className="sessions-list">
                {sessions.map((session) => (
                  <SessionSummaryCard
                    key={session.id || session.transcript_id}
                    session={session}
                    studentId={studentId}
                    subject={subject}
                    apiKey={apiKey}
                    useOpenRouter={useOpenRouter}
                    onAskAI={() => {
                      setSelectedSessionForChat(session)
                      setActiveTab('chat')
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="goals-tab">
            <h3>Goals for {subject}</h3>
            {goals.length === 0 ? (
              <div className="empty-state">
                <p>No goals found for {subject}.</p>
              </div>
            ) : (
              <div className="goals-list">
                {activeGoals.length > 0 && (
                  <div className="goals-section">
                    <h4>Active Goals</h4>
                    {activeGoals.map((goal) => (
                      <div key={goal.id} className="goal-item">
                        <div className="goal-header">
                          <div className="goal-title">{goal.title || `${subject} Goal`}</div>
                          <span className={`goal-status ${goal.status}`}>{goal.status}</span>
                        </div>
                        {goal.description && (
                          <div className="goal-description">{goal.description}</div>
                        )}
                        <div className="goal-progress">
                          <div className="goal-progress-bar">
                            <div
                              className="goal-progress-fill"
                              style={{ width: `${Number(goal.progress_percentage || 0)}%` }}
                            />
                          </div>
                          <span>{goal.progress_percentage || 0}%</span>
                        </div>
                        {goal.target_date && (
                          <div className="goal-target-date">
                            Target: {new Date(goal.target_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {completedGoals.length > 0 && (
                  <div className="goals-section">
                    <h4>Completed Goals</h4>
                    {completedGoals.map((goal) => (
                      <div key={goal.id} className="goal-item completed">
                        <div className="goal-header">
                          <div className="goal-title">{goal.title || `${subject} Goal`}</div>
                          <span className="goal-status completed">Completed</span>
                        </div>
                        {goal.completed_at && (
                          <div className="goal-completed-date">
                            Completed: {new Date(goal.completed_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'practice' && (
          <div className="practice-tab">
            <PracticeProblemList
              studentId={studentId}
              subject={subject}
              goalId={null}
              apiKey={apiKey}
              useOpenRouter={useOpenRouter}
            />
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="chat-tab">
            <AiCompanionChat
              studentId={studentId}
              subject={subject}
              apiKey={apiKey}
              useOpenRouter={useOpenRouter}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default SubjectDetailView

