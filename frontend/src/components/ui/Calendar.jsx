import React, { useState, useEffect } from "react"
import { Button } from "./Button"
import './Calendar.css'

const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

const CalendarDay = ({ day, isHeader, hasSession, isCurrentDay, onClick }) => {
  const dayClass = isHeader 
    ? "calendar-day-header" 
    : hasSession 
      ? "calendar-day calendar-day-has-session" 
      : "calendar-day"
  
  const currentDayClass = isCurrentDay ? "calendar-day-current" : ""
  
  return (
    <div
      className={`${dayClass} ${currentDayClass}`}
      onClick={!isHeader && onClick ? () => onClick(day) : undefined}
    >
      <span className={isHeader ? "calendar-day-text-header" : "calendar-day-text"}>
        {day}
      </span>
    </div>
  )
}

export function Calendar({ sessions = [], subject, onDayClick, onSwitchToList, compact = false }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [sessionDates, setSessionDates] = useState(new Set())

  useEffect(() => {
    // Extract dates from sessions and create a Set for quick lookup
    const dates = new Set()
    sessions.forEach(session => {
      if (session.date) {
        const date = new Date(session.date)
        // Use YYYY-MM-DD format for consistent comparison
        const year = date.getFullYear()
        const month = date.getMonth() // 0-indexed
        const day = date.getDate()
        dates.add(`${year}-${month}-${day}`)
      }
    })
    setSessionDates(dates)
  }, [sessions])

  const currentMonth = currentDate.toLocaleString("default", { month: "long" })
  const currentYear = currentDate.getFullYear()
  const firstDayOfMonth = new Date(currentYear, currentDate.getMonth(), 1)
  const firstDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = new Date(currentYear, currentDate.getMonth() + 1, 0).getDate()

  const hasSessionOnDay = (day) => {
    const date = new Date(currentYear, currentDate.getMonth(), day)
    const year = date.getFullYear()
    const month = date.getMonth() // 0-indexed
    const dayOfMonth = date.getDate()
    const dateKey = `${year}-${month}-${dayOfMonth}`
    return sessionDates.has(dateKey)
  }

  const handleDayClick = (day) => {
    if (onDayClick) {
      const date = new Date(currentYear, currentDate.getMonth(), day)
      onDayClick(date)
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

  const isCurrentDay = (day) => {
    const today = new Date()
    const date = new Date(currentYear, currentDate.getMonth(), day)
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const renderCalendarDays = () => {
    let days = [
      ...dayNames.map((day, i) => (
        <CalendarDay key={`header-${day}`} day={day} isHeader />
      )),
      ...Array(firstDayOfWeek).fill(null).map((_, i) => (
        <div key={`empty-start-${i}`} className="calendar-day-empty" />
      )),
      ...Array(daysInMonth).fill(null).map((_, i) => {
        const day = i + 1
        return (
          <CalendarDay 
            key={`date-${day}`} 
            day={day} 
            hasSession={hasSessionOnDay(day)}
            isCurrentDay={isCurrentDay(day)}
            onClick={handleDayClick}
          />
        )
      }),
    ]
    return days
  }

  return (
    <div className={`calendar-container ${compact ? 'calendar-container-compact' : ''}`}>
      <div className="calendar-header-section">
        <h2 className="calendar-title">
          {subject ? `${subject} Study Sessions` : "Study Sessions"}
        </h2>
        <p className="calendar-subtitle">
          Click on a highlighted date to view session details
        </p>
      </div>

      {onSwitchToList && (
        <div className="calendar-header-actions">
          <button 
            className="view-switch-button"
            onClick={onSwitchToList}
          >
            Switch to List View
          </button>
        </div>
      )}

      <div className={`calendar-wrapper ${compact ? 'calendar-wrapper-compact' : ''}`}>
        <div className={`calendar-inner ${compact ? 'calendar-inner-compact' : ''}`}>
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

          <div className="calendar-legend">
            <div className="legend-item">
              <div className="legend-dot legend-dot-session"></div>
              <span>Session Day</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

