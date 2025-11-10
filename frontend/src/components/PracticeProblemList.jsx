import React, { useState, useEffect } from 'react'
import { aiCompanionApi } from '../services/aiCompanionApi'
import PracticeProblem from './PracticeProblem'
import AiCompanionChat from './AiCompanionChat'
import './PracticeProblemList.css'

function PracticeProblemList({ studentId, subject = null, goalId = null, apiKey, useOpenRouter, goals = [], sessions = [] }) {
  const [problems, setProblems] = useState([])
  const [selectedProblem, setSelectedProblem] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [availableSubjects, setAvailableSubjects] = useState([])
  const [error, setError] = useState(null)
  const [showChat, setShowChat] = useState(false)
  const [generateForm, setGenerateForm] = useState({
    subject: subject || '',
    topic: '',
    difficulty: null
  })

  const loadProblems = async () => {
    try {
      setLoading(true)
      const params = { student_id: studentId }
      if (subject) {
        params.subject = subject
      }
      if (goalId) {
        params.goal_id = goalId
      }
      const response = await aiCompanionApi.getPracticeList(studentId, params)
      setProblems(response.data.problems || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load practice problems')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableSubjects = async () => {
    try {
      setLoadingSubjects(true)
      const response = await aiCompanionApi.getAvailableSubjects()
      const subjects = response.data.subjects || []
      
      // If subject prop is provided, filter to only that subject
      if (subject) {
        setAvailableSubjects(subjects.includes(subject) ? [subject] : [])
        // Pre-select the subject
        setGenerateForm(prev => ({ ...prev, subject: subject }))
      } else {
        setAvailableSubjects(subjects)
        // Auto-select first subject if available and none selected
        if (subjects.length > 0 && !generateForm.subject) {
          setGenerateForm(prev => ({ ...prev, subject: subjects[0] }))
        }
      }
    } catch (err) {
      console.error('Failed to load available subjects:', err)
      // Don't set error state - this is not critical
    } finally {
      setLoadingSubjects(false)
    }
  }

  useEffect(() => {
    if (studentId) {
      loadProblems()
      loadAvailableSubjects()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, subject, goalId])
  
  // Update form when subject prop changes
  useEffect(() => {
    if (subject) {
      setGenerateForm(prev => ({ ...prev, subject: subject }))
    }
  }, [subject])


  const handleGenerate = async (e) => {
    e.preventDefault()
    
    if (!generateForm.subject) {
      setError('Subject is required')
      return
    }

    // Determine which goal/session ID to use
    const targetGoalId = sourceType === 'goal' ? selectedGoalId : null
    const targetSessionId = sourceType === 'session' ? selectedSessionId : null

    try {
      setGenerating(true)
      setError(null)
      
      const response = await aiCompanionApi.generatePractice(
        generateForm.subject,
        generateForm.topic || null,
        generateForm.difficulty || null,
        targetGoalId || goalId || null,
        apiKey,
        useOpenRouter,
        targetSessionId || null
      )
      
      const newProblem = response.data.problem
      setProblems([newProblem, ...problems])
      setSelectedProblem(newProblem.id)
      setShowChat(false) // Reset chat when generating new problem
      setGenerateForm({ subject: generateForm.subject, topic: '', difficulty: null })
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to generate practice problem'
      setError(errorMessage)
      
      // If error includes available subjects, reload them
      if (err.response?.data?.available_subjects) {
        setAvailableSubjects(err.response.data.available_subjects)
      }
      
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateAdaptiveProblem = async () => {
    if (!generateForm.subject) {
      setError('Subject is required')
      return
    }

    try {
      setGenerating(true)
      setError(null)
      
      // Get active goals for this subject to prioritize
      const activeGoals = goals.filter(g => g.status === 'active')
      
      // If there are active goals, use the first one as context
      // The backend adaptive selection will use mastery data from all goals in the subject
      const targetGoalId = activeGoals.length > 0 ? activeGoals[0].id : null
      
      // Generate adaptive problem - backend will use adaptive selection
      // and consider goals for this subject
      const response = await aiCompanionApi.generatePractice(
        generateForm.subject,
        null, // No topic - triggers adaptive selection
        null, // No difficulty - triggers adaptive selection
        targetGoalId || null,
        apiKey,
        useOpenRouter,
        null // No session_id
      )
      
      const newProblem = response.data.problem
      setProblems([newProblem, ...problems])
      setSelectedProblem(newProblem.id)
      setShowChat(false) // Reset chat when generating new problem
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to generate practice problem'
      setError(errorMessage)
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const handleProblemComplete = (completedProblem) => {
    // Update the problem in the list
    setProblems(problems.map(p => 
      p.id === completedProblem.id ? completedProblem : p
    ))
  }

  if (loading) {
    return <div className="practice-list loading">Loading practice problems...</div>
  }

  return (
    <div className="practice-list">
      <div className="practice-header">
        <button onClick={loadProblems} className="refresh-button">Refresh</button>
      </div>

      {/* Generate Problem Button */}
      <div className="generate-problem-section">
        {error && (
          <div className="error-message">{error}</div>
        )}
        <button
          onClick={handleGenerateAdaptiveProblem}
          disabled={generating || !generateForm.subject}
          className="generate-problem-button"
        >
          {generating ? 'Generating...' : 'Generate Problem'}
        </button>
      </div>

      {/* Problem List */}
      <div className="problems-container">
        <div className="problems-sidebar">
          <h3>Your Practice Problems</h3>
          {problems.length === 0 ? (
            <div className="empty-message">No practice problems yet. Generate one to get started!</div>
          ) : (
            <div className="problems-list">
              {problems.map(problem => (
                <div
                  key={problem.id}
                  className={`problem-item ${selectedProblem === problem.id ? 'selected' : ''} ${problem.completed_at ? 'completed' : 'pending'}`}
                  onClick={() => {
                    setSelectedProblem(problem.id)
                    setShowChat(false) // Hide chat when selecting a new problem
                  }}
                >
                  <div className="problem-item-header">
                    <span className="problem-subject">{problem.subject}</span>
                    {problem.completed_at ? (
                      <span className={`status-badge ${problem.is_correct ? 'correct' : 'incorrect'}`}>
                        {problem.is_correct ? '✓' : '✗'}
                      </span>
                    ) : (
                      <span className="status-badge pending">Pending</span>
                    )}
                  </div>
                  {problem.topic && (
                    <div className="problem-topic">{problem.topic}</div>
                  )}
                  {problem.difficulty_level && (
                    <div className="problem-difficulty">Level {problem.difficulty_level}</div>
                  )}
                  <div className="problem-date">
                    {problem.completed_at 
                      ? `Completed: ${new Date(problem.completed_at).toLocaleDateString()}`
                      : `Assigned: ${new Date(problem.assigned_at).toLocaleDateString()}`
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="problem-viewer-wrapper">
          <div className="problem-viewer">
            {selectedProblem ? (
              <>
                <div className="problem-viewer-header">
                  <button 
                    onClick={() => setShowChat(!showChat)}
                    className="ai-help-button"
                    title="Get help from AI companion"
                  >
                    {showChat ? '✕ Close AI Help' : '💬 Get AI Help'}
                  </button>
                </div>
                <PracticeProblem
                  problemId={selectedProblem}
                  onComplete={handleProblemComplete}
                  apiKey={apiKey}
                  useOpenRouter={useOpenRouter}
                  studentId={studentId}
                />
              </>
            ) : (
              <div className="empty-state">
                <p>Select a practice problem to view and solve</p>
              </div>
            )}
          </div>

          {showChat && selectedProblem && (
            <div className="chat-panel">
              <AiCompanionChat
                studentId={studentId || 1}
                practiceProblemId={selectedProblem}
                subject={subject}
                apiKey={apiKey}
                useOpenRouter={useOpenRouter}
                onClose={() => setShowChat(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PracticeProblemList

