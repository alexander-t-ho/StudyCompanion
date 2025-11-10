import React, { useState, useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import TranscriptGenerator from './components/TranscriptGenerator'
import TranscriptList from './components/TranscriptList'
import TranscriptViewer from './components/TranscriptViewer'
import PlatformIntegrationValidator from './components/PlatformIntegrationValidator'
import ProgressDashboard from './components/ProgressDashboard'
import GoalSuggestions from './components/GoalSuggestions'
import NudgeNotification from './components/NudgeNotification'
import GoalCompletionModal from './components/GoalCompletionModal'
import NudgeAnalytics from './components/NudgeAnalytics'
import UnderstandingLevelDashboard from './components/UnderstandingLevelDashboard'
import PracticeProblemList from './components/PracticeProblemList'
import TutorRoutingSuggestion from './components/TutorRoutingSuggestion'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import StudentDashboard from './components/StudentDashboard'
import StudentDashboardTest from './components/StudentDashboardTest'
import Login from './components/Login'
import Profile from './components/Profile'
import Settings from './components/Settings'
import AdminDashboard from './components/AdminDashboard'
import AdminStudentDetail from './components/AdminStudentDetail'
import { authApi } from './services/authApi'
import './App.css'

function App() {
  const [selectedTranscript, setSelectedTranscript] = useState(null)
  const [refreshList, setRefreshList] = useState(0)
  const [activeTab, setActiveTab] = useState('transcripts')
  const [selectedGoalId, setSelectedGoalId] = useState(null)
  const [showNudge, setShowNudge] = useState(true)
  const [completedGoal, setCompletedGoal] = useState(null)
  const [dashboardRefresh, setDashboardRefresh] = useState(0)
  const [studentId, setStudentId] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)

  // Get student ID from authenticated user
  useEffect(() => {
    const currentUser = authApi.getCurrentUser()
    if (currentUser?.id) {
      setStudentId(currentUser.id)
    }
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  const handleTranscriptGenerated = () => {
    setRefreshList(prev => prev + 1)
  }

  const handleTranscriptSelected = (transcript) => {
    setSelectedTranscript(transcript)
  }

  const handleGoalCreated = (newGoal) => {
    // Refresh dashboard or show success message
    setSelectedGoalId(null) // Reset selection
    setDashboardRefresh(prev => prev + 1) // Trigger dashboard refresh
  }

  const handleGoalCompleted = (goal) => {
    // Show modal when goal is completed
    setCompletedGoal(goal)
  }

  const handleModalClose = () => {
    setCompletedGoal(null)
    setDashboardRefresh(prev => prev + 1) // Refresh dashboard after modal closes
  }

  const handleBookSession = () => {
    // Navigate to booking or show booking modal
    alert('Booking session... (Integration with booking system needed)')
  }

  const location = useLocation()
  const isStudentDashboardRoute = location.pathname.startsWith('/main') || location.pathname.startsWith('/subject')

  // Protected Route component
  const ProtectedRoute = ({ children, requireAdmin = false }) => {
    if (!authApi.isAuthenticated()) {
      return <Navigate to="/login" replace />
    }
    if (requireAdmin && !authApi.isAdmin()) {
      return <Navigate to="/main" replace />
    }
    return children
  }

  return (
    <Routes>
      {/* Login Route */}
      <Route path="/login" element={
        authApi.isAuthenticated() ? (
          authApi.isAdmin() ? <Navigate to="/admin" replace /> : <Navigate to="/main" replace />
        ) : <Login />
      } />

      {/* Student Dashboard Routes */}
      <Route path="/main" element={
        <ProtectedRoute>
          <StudentDashboardTest />
        </ProtectedRoute>
      } />
      <Route path="/subject/:subjectName" element={
        <ProtectedRoute>
          <StudentDashboardTest />
        </ProtectedRoute>
      } />
      <Route path="/subject/:subjectName/:section" element={
        <ProtectedRoute>
          <StudentDashboardTest />
        </ProtectedRoute>
      } />

      {/* Profile and Settings Routes */}
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings onGenerated={() => {}} />
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/students/:id" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminStudentDetail />
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to="/main" replace />} />
      
      {/* Legacy Tab-based Routes */}
      <Route path="*" element={
        <div className={`app ${activeTab === 'student-dashboard-test' ? 'no-scroll' : 'allow-scroll'}`}>
          <div className="tabs-container">
            <div className="tabs">
              <button 
                className={activeTab === 'transcripts' ? 'active' : ''}
                onClick={() => setActiveTab('transcripts')}
              >
                Transcripts
              </button>
              <button 
                className={activeTab === 'dashboard' ? 'active' : ''}
                onClick={() => setActiveTab('dashboard')}
              >
                Progress Dashboard
              </button>
              <button 
                className={activeTab === 'suggestions' ? 'active' : ''}
                onClick={() => setActiveTab('suggestions')}
              >
                Goal Suggestions
              </button>
              <button 
                className={activeTab === 'validator' ? 'active' : ''}
                onClick={() => setActiveTab('validator')}
              >
                Platform Integration Validator
              </button>
              <button 
                className={activeTab === 'analytics' ? 'active' : ''}
                onClick={() => setActiveTab('analytics')}
              >
                Nudge Analytics
              </button>
              <button 
                className={activeTab === 'understanding' ? 'active' : ''}
                onClick={() => setActiveTab('understanding')}
              >
                Understanding Levels
              </button>
              <button 
                className={activeTab === 'practice' ? 'active' : ''}
                onClick={() => setActiveTab('practice')}
              >
                Practice Problems
              </button>
              <button 
                className={activeTab === 'analytics-dashboard' ? 'active' : ''}
                onClick={() => setActiveTab('analytics-dashboard')}
              >
                Analytics Dashboard
              </button>
              <button 
                className={activeTab === 'student-dashboard' ? 'active' : ''}
                onClick={() => setActiveTab('student-dashboard')}
              >
                Student Dashboard
              </button>
              <button 
                className={activeTab === 'student-dashboard-test' ? 'active' : ''}
                onClick={() => setActiveTab('student-dashboard-test')}
              >
                Student Dashboard Test
              </button>
            </div>
          </div>

          {showNudge && (
            <NudgeNotification
              onDismiss={() => setShowNudge(false)}
              onBookSession={handleBookSession}
            />
          )}

          {completedGoal && (
            <GoalCompletionModal
              goal={completedGoal}
              onClose={handleModalClose}
              onGoalCreated={handleGoalCreated}
            />
          )}

          <div className="app-content">
            {activeTab === 'validator' ? (
              <PlatformIntegrationValidator />
            ) : activeTab === 'analytics' ? (
              <NudgeAnalytics />
            ) : activeTab === 'understanding' ? (
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label>
                    Student ID:
                    <input
                      type="number"
                      value={studentId}
                      onChange={(e) => setStudentId(parseInt(e.target.value) || 1)}
                      style={{ marginLeft: '10px', padding: '5px' }}
                    />
                  </label>
                </div>
                <UnderstandingLevelDashboard studentId={studentId} />
              </div>
            ) : activeTab === 'practice' ? (
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label>
                    Student ID:
                    <input
                      type="number"
                      value={studentId}
                      onChange={(e) => setStudentId(parseInt(e.target.value) || 1)}
                      style={{ marginLeft: '10px', padding: '5px' }}
                    />
                  </label>
                </div>
                <PracticeProblemList 
                  studentId={studentId}
                  apiKey={localStorage.getItem('openai_api_key')}
                  useOpenRouter={localStorage.getItem('use_openrouter') === 'true'}
                />
              </div>
            ) : activeTab === 'analytics-dashboard' ? (
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label>
                    Student ID:
                    <input
                      type="number"
                      value={studentId}
                      onChange={(e) => setStudentId(parseInt(e.target.value) || 1)}
                      style={{ marginLeft: '10px', padding: '5px' }}
                    />
                  </label>
                </div>
                <AnalyticsDashboard studentId={studentId} />
              </div>
            ) : activeTab === 'student-dashboard' ? (
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label>
                    Student ID:
                    <input
                      type="number"
                      value={studentId}
                      onChange={(e) => setStudentId(parseInt(e.target.value) || 1)}
                      style={{ marginLeft: '10px', padding: '5px' }}
                    />
                  </label>
                </div>
                <StudentDashboard studentId={studentId} />
              </div>
            ) : activeTab === 'student-dashboard-test' ? (
              <StudentDashboardTest studentId={studentId} />
            ) : activeTab === 'dashboard' ? (
              <ProgressDashboard 
                key={dashboardRefresh}
                onGoalCompleted={handleGoalCompleted}
              />
            ) : activeTab === 'suggestions' ? (
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label>
                    Select Goal ID for Suggestions:
                    <input
                      type="number"
                      value={selectedGoalId || ''}
                      onChange={(e) => setSelectedGoalId(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Enter goal ID"
                      style={{ marginLeft: '10px', padding: '5px' }}
                    />
                  </label>
                </div>
                <GoalSuggestions goalId={selectedGoalId} onGoalCreated={handleGoalCreated} />
              </div>
            ) : (
              <>
                <div className="left-panel">
                  <TranscriptGenerator onGenerated={handleTranscriptGenerated} />
                  <TranscriptList 
                    key={refreshList}
                    onSelect={handleTranscriptSelected}
                    selectedId={typeof selectedTranscript === 'object' ? selectedTranscript?.id : null}
                  />
                </div>

                <div className="right-panel">
                  {typeof selectedTranscript === 'object' && selectedTranscript ? (
                    <TranscriptViewer 
                      transcript={selectedTranscript}
                      onUpdate={handleTranscriptGenerated}
                    />
                  ) : (
                    <div className="empty-state">
                      <p>Select a transcript to view and validate</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      } />
    </Routes>
  )
}

export default App

