import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import './AllSessionsCalendar.css'

const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

const CalendarDay = ({ day, isHeader, sessions, onClick, subjectColors }) => {
  if (isHeader) {
    return (
      <div className="calendar-day-header">
        <span className="calendar-day-text-header">{day}</span>
      </div>
    )
  }

  const hasSessions = sessions && sessions.length > 0
  const scheduledSessions = sessions.filter(s => s.is_scheduled)
  const completedSessions = sessions.filter(s => !s.is_scheduled)

  return (
    <div
      className={`calendar-day ${hasSessions ? 'calendar-day-has-sessions' : ''}`}
      onClick={onClick ? () => onClick(day) : undefined}
    >
      <span className="calendar-day-text">{day}</span>
      {hasSessions && (
        <div className="calendar-day-sessions">
          {/* Show scheduled sessions with border/ring */}
          {scheduledSessions.slice(0, 2).map((session, idx) => {
            const color = subjectColors[session.subject] || '#6366f1'
            return (
              <div
                key={`scheduled-${idx}`}
                className="calendar-day-session-dot calendar-day-session-scheduled"
                style={{ 
                  backgroundColor: color,
                  borderColor: color
                }}
                title={`Scheduled: ${session.subject}: ${session.topic || 'Session'}`}
              />
            )
          })}
          {/* Show completed sessions */}
          {completedSessions.slice(0, 4 - scheduledSessions.length).map((session, idx) => {
            const color = subjectColors[session.subject] || '#6366f1'
            return (
              <div
                key={`completed-${idx}`}
                className="calendar-day-session-dot"
                style={{ backgroundColor: color }}
                title={`${session.subject}: ${session.topic || 'Session'}`}
              />
            )
          })}
          {sessions.length > 4 && (
            <div 
              className="calendar-day-more-indicator"
              title={`${sessions.length} sessions total`}
            >
              +{sessions.length - 4}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AllSessionsCalendar({ allSessions = [], subjectColors = {}, onDayClick, loading = false }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [sessionsByDate, setSessionsByDate] = useState({})

  useEffect(() => {
    // Group sessions by date
    const grouped = {}
    allSessions.forEach(session => {
      if (session.date) {
        const date = new Date(session.date)
        const year = date.getFullYear()
        const month = date.getMonth()
        const day = date.getDate()
        const dateKey = `${year}-${month}-${day}`
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = []
        }
        grouped[dateKey].push(session)
      }
    })
    setSessionsByDate(grouped)
  }, [allSessions])

  const currentMonth = currentDate.toLocaleString("default", { month: "long" })
  const currentYear = currentDate.getFullYear()
  const firstDayOfMonth = new Date(currentYear, currentDate.getMonth(), 1)
  const firstDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = new Date(currentYear, currentDate.getMonth() + 1, 0).getDate()

  const getSessionsForDay = (day) => {
    const date = new Date(currentYear, currentDate.getMonth(), day)
    const year = date.getFullYear()
    const month = date.getMonth()
    const dayOfMonth = date.getDate()
    const dateKey = `${year}-${month}-${dayOfMonth}`
    return sessionsByDate[dateKey] || []
  }

  const handleDayClick = (day) => {
    if (onDayClick) {
      const date = new Date(currentYear, currentDate.getMonth(), day)
      const sessions = getSessionsForDay(day)
      onDayClick(date, sessions)
    }
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentDate.getMonth() + 1, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const renderCalendarDays = () => {
    let days = [
      ...dayNames.map((day, i) => (
        <CalendarDay key={`header-${day}`} day={day} isHeader subjectColors={subjectColors} />
      )),
      ...Array(firstDayOfWeek).fill(null).map((_, i) => (
        <div key={`empty-start-${i}`} className="calendar-day-empty" />
      )),
      ...Array(daysInMonth).fill(null).map((_, i) => {
        const day = i + 1
        const sessions = getSessionsForDay(day)
        return (
          <CalendarDay 
            key={`date-${day}`} 
            day={day} 
            sessions={sessions}
            onClick={handleDayClick}
            subjectColors={subjectColors}
          />
        )
      }),
    ]
    return days
  }

  // Calculate session counts per subject for current month
  const getSubjectBreakdown = () => {
    const breakdown = {}
    const currentMonthStart = new Date(currentYear, currentDate.getMonth(), 1)
    const currentMonthEnd = new Date(currentYear, currentDate.getMonth() + 1, 0)
    
    allSessions.forEach(session => {
      if (session.date && session.subject) {
        const sessionDate = new Date(session.date)
        // Check if session is in current month
        if (sessionDate >= currentMonthStart && sessionDate <= currentMonthEnd) {
          if (!breakdown[session.subject]) {
            breakdown[session.subject] = 0
          }
          breakdown[session.subject]++
        }
      }
    })
    
    // Convert to array and sort by count (descending)
    return Object.entries(breakdown)
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count)
  }

  const subjectBreakdown = getSubjectBreakdown()
  const uniqueSubjects = [...new Set(allSessions.map(s => s.subject).filter(Boolean))]

  if (loading) {
    return (
      <div className="all-sessions-calendar loading">
        <div className="loading-spinner"></div>
        <p>Loading all sessions...</p>
      </div>
    )
  }

  return (
    <div className="all-sessions-calendar">
      <div className="calendar-header-section">
        <h2 className="calendar-title">All Study Sessions</h2>
        <p className="calendar-subtitle">
          View all your study sessions across all subjects
        </p>
      </div>

      <div className="calendar-layout">
        <div className="calendar-wrapper">
          <div className="calendar-inner">
            <div className="calendar-month-header">
              <button 
                className="calendar-nav-button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
              >
                ←
              </button>
              <p className="calendar-month-year">
                <span className="calendar-month">{currentMonth}</span>
                <span className="calendar-year">{currentYear}</span>
              </p>
              <div className="calendar-nav-right">
                <button 
                  className="calendar-today-button"
                  onClick={handleToday}
                  aria-label="Go to today"
                >
                  Today
                </button>
                <button 
                  className="calendar-nav-button"
                  onClick={handleNextMonth}
                  aria-label="Next month"
                >
                  →
                </button>
              </div>
            </div>

            <div className="calendar-grid">
              {renderCalendarDays()}
            </div>
          </div>
        </div>

        {/* Subject Breakdown Panel */}
        <div className="subject-breakdown-panel">
          <h3 className="breakdown-title">{currentMonth} {currentYear}</h3>
          <p className="breakdown-subtitle">Sessions by Subject</p>
          
          {subjectBreakdown.length === 0 ? (
            <div className="no-sessions-message">No sessions this month</div>
          ) : (
            <div className="breakdown-list">
              {subjectBreakdown.map(({ subject, count }) => {
                const color = subjectColors[subject] || '#6366f1'
                return (
                  <div key={subject} className="breakdown-item">
                    <div className="breakdown-item-header">
                      <div 
                        className="breakdown-color-indicator"
                        style={{ backgroundColor: color }}
                      />
                      <div className="breakdown-subject-name">{subject}</div>
                    </div>
                    <div className="breakdown-count">{count} session{count !== 1 ? 's' : ''}</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Legend */}
          <div className="calendar-legend">
            <div className="legend-title">All Subjects:</div>
            <div className="legend-items">
              {uniqueSubjects.map((subject) => {
                const color = subjectColors[subject] || '#6366f1'
                return (
                  <div key={subject} className="legend-item">
                    <div 
                      className="legend-dot" 
                      style={{ backgroundColor: color }}
                    />
                    <span>{subject}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AllSessionsCalendar

