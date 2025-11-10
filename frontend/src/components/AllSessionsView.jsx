import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AllSessionsCalendar from './AllSessionsCalendar'
import EnhancedSessionBookingModal from './EnhancedSessionBookingModal'
import { studentDashboardApi } from '../services/studentDashboardApi'
import { transcriptsAPI } from '../services/api'
import { sessionsApi } from '../services/sessionsApi'
import './AllSessionsView.css'

function AllSessionsView({ studentId = 1, subjectColors = {}, onClose }) {
  const [allSessions, setAllSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSessions, setSelectedSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [selectedTranscript, setSelectedTranscript] = useState(null)
  const [loadingTranscript, setLoadingTranscript] = useState(false)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [bookingSubject, setBookingSubject] = useState(null)
  const [showSchedulePopup, setShowSchedulePopup] = useState(null) // { subject: string, shown: boolean }

  useEffect(() => {
    loadAllSessions()
  }, [studentId])

  useEffect(() => {
    // Check for subjects with < 2 sessions this week and show popup once per week
    checkAndShowSchedulePopup()
  }, [allSessions])

  const loadAllSessions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Use optimized endpoint that gets all sessions in a single API call
      const response = await studentDashboardApi.getAllSessions(studentId)
      const sessions = response.data.sessions || []
      
      setAllSessions(sessions)
    } catch (err) {
      console.error('Failed to load all sessions:', err)
      setError('Failed to load sessions: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  const checkAndShowSchedulePopup = () => {
    if (loading) return

    // Get current week (Monday to Sunday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    // Get all unique subjects from all sessions
    const allSubjects = [...new Set(allSessions.map(s => s.subject).filter(Boolean))]

    // Count sessions per subject for this week
    const sessionsThisWeek = allSessions.filter(session => {
      if (!session.date && !session.scheduled_at) return false
      const sessionDate = new Date(session.date || session.scheduled_at)
      return sessionDate >= monday && sessionDate <= sunday
    })

    const sessionsBySubject = {}
    sessionsThisWeek.forEach(session => {
      if (session.subject) {
        if (!sessionsBySubject[session.subject]) {
          sessionsBySubject[session.subject] = 0
        }
        sessionsBySubject[session.subject]++
      }
    })

    // Check if we've already shown a popup this week (stored in localStorage)
    const weekKey = `schedule_popup_week_${monday.toISOString().split('T')[0]}`
    const shownThisWeek = JSON.parse(localStorage.getItem(weekKey) || '{}')

    // Find subjects with < 2 sessions (including subjects with 0 sessions)
    const subjectsNeedingSessions = allSubjects.filter(subject => {
      const count = sessionsBySubject[subject] || 0
      return count < 2
    })

    // Show popup for first subject that needs sessions and hasn't been shown this week
    if (subjectsNeedingSessions.length > 0 && !showSchedulePopup) {
      const subjectToShow = subjectsNeedingSessions.find(subject => !shownThisWeek[subject])
      
      if (subjectToShow) {
        setShowSchedulePopup(subjectToShow)
        // Mark as shown for this week
        shownThisWeek[subjectToShow] = true
        localStorage.setItem(weekKey, JSON.stringify(shownThisWeek))
      }
    }
  }

  const handleScheduleClick = (subject) => {
    setBookingSubject(subject)
    setShowBookingModal(true)
    setShowSchedulePopup(null) // Close popup when scheduling
  }

  const handleBookingSuccess = () => {
    loadAllSessions() // Reload sessions after booking
  }

  const handleDayClick = async (date, sessions) => {
    setSelectedDate(date)
    setSelectedSessions(sessions)
    setSelectedSession(null)
    setSelectedTranscript(null)
    
    // If only one session, auto-select it
    if (sessions.length === 1) {
      handleSessionClick(sessions[0])
    }
  }

  const handleSessionClick = async (session) => {
    setSelectedSession(session)
    
    // Fetch the full transcript
    if (session.transcript_id) {
      try {
        setLoadingTranscript(true)
        const response = await transcriptsAPI.get(session.transcript_id)
        setSelectedTranscript(response.data)
      } catch (error) {
        console.error('Failed to load transcript:', error)
        setSelectedTranscript(null)
      } finally {
        setLoadingTranscript(false)
      }
    } else {
      setSelectedTranscript(null)
    }
  }

  const handleCloseDetails = () => {
    setSelectedDate(null)
    setSelectedSessions([])
    setSelectedSession(null)
    setSelectedTranscript(null)
  }

  const handleDeleteSession = async (session, e) => {
    e.stopPropagation() // Prevent triggering session click
    
    if (!session.is_scheduled || !session.session_id) {
      return // Only allow deleting scheduled sessions
    }

    // Confirm deletion
    if (!window.confirm(`Are you sure you want to cancel this ${session.subject} session scheduled for ${new Date(session.scheduled_at).toLocaleString()}?`)) {
      return
    }

    try {
      await sessionsApi.cancelSession(session.session_id, studentId)
      
      // Reload sessions to reflect the change
      await loadAllSessions()
      
      // If this was the selected session, clear the selection
      if (selectedSession?.id === session.id) {
        setSelectedSession(null)
        setSelectedTranscript(null)
      }
      
      // Update selected sessions list
      setSelectedSessions(prev => prev.filter(s => s.id !== session.id))
    } catch (err) {
      console.error('Failed to cancel session:', err)
      alert('Failed to cancel session: ' + (err.response?.data?.error || err.message))
    }
  }

  if (error) {
    return (
      <div className="all-sessions-view error">
        <div className="error-message">{error}</div>
        <button onClick={loadAllSessions} className="retry-button">Retry</button>
      </div>
    )
  }

  return (
    <div className="all-sessions-view">
      {onClose && (
        <button 
          className="close-sessions-view-button"
          onClick={onClose}
          aria-label="Close sessions view"
        >
          × Close
        </button>
      )}

      {/* Schedule Popup for subjects with < 2 sessions per week */}
      <AnimatePresence>
        {showSchedulePopup && (
          <motion.div
            className="schedule-popup"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="schedule-popup-content">
              <h3>Schedule a session for {showSchedulePopup} now!</h3>
              <p>You have less than 2 sessions scheduled this week for {showSchedulePopup}.</p>
              <div className="schedule-popup-actions">
                <button
                  className="schedule-popup-button schedule-popup-button-primary"
                  onClick={() => handleScheduleClick(showSchedulePopup)}
                >
                  Schedule Now
                </button>
                <button
                  className="schedule-popup-button schedule-popup-button-secondary"
                  onClick={() => setShowSchedulePopup(null)}
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AllSessionsCalendar
        allSessions={allSessions}
        subjectColors={subjectColors}
        onDayClick={handleDayClick}
        loading={loading}
      />

      {/* Enhanced Booking Modal */}
      <EnhancedSessionBookingModal
        isOpen={showBookingModal}
        onClose={() => {
          setShowBookingModal(false)
          setBookingSubject(null)
        }}
        studentId={studentId}
        subject={bookingSubject}
        onSuccess={handleBookingSuccess}
      />

      {/* Session Details Panel */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            className="session-details-panel"
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ duration: 0.3 }}
          >
            <div className="session-details-header">
              <h3>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h3>
              <button className="close-button" onClick={handleCloseDetails}>
                ×
              </button>
            </div>

            {selectedSessions.length === 0 ? (
              <div className="no-sessions">No sessions on this date</div>
            ) : (
              <div className="sessions-list">
                {selectedSessions.map((session, idx) => {
                  const color = subjectColors[session.subject] || '#6366f1'
                  const isSelected = selectedSession?.id === session.id
                  
                  return (
                    <div
                      key={idx}
                      className={`session-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSessionClick(session)}
                      style={{
                        borderLeftColor: color
                      }}
                    >
                      <div className="session-item-header">
                        <div className="session-subject" style={{ color }}>
                          {session.subject}
                          {session.is_scheduled && (
                            <span className="session-scheduled-badge">Scheduled</span>
                          )}
                        </div>
                        <div className="session-item-header-right">
                          {session.understanding_level != null && (
                            <div className="session-understanding">
                              {Number(session.understanding_level).toFixed(0)}%
                            </div>
                          )}
                          {session.is_scheduled && session.scheduled_at && (
                            <div className="session-scheduled-time">
                              {new Date(session.scheduled_at).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </div>
                          )}
                          {session.is_scheduled && (
                            <button
                              className="session-delete-button"
                              onClick={(e) => handleDeleteSession(session, e)}
                              title="Cancel this session"
                              aria-label="Cancel session"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="session-topic">{session.topic || 'General Session'}</div>
                      {session.duration_minutes && (
                        <div className="session-duration">{session.duration_minutes} min</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Selected Session Details */}
            {selectedSession && (
              <div className="selected-session-details">
                <h4>Session Details</h4>
                {loadingTranscript ? (
                  <div className="loading">Loading transcript...</div>
                ) : selectedTranscript ? (
                  <div className="transcript-preview">
                    <p className="transcript-excerpt">
                      {selectedTranscript.transcript_content?.substring(0, 500)}
                      {selectedTranscript.transcript_content?.length > 500 && '...'}
                    </p>
                  </div>
                ) : (
                  <div className="no-transcript">No transcript available</div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AllSessionsView

