import React, { useState, useEffect } from 'react'
import { sessionsApi } from '../services/sessionsApi'
import { Calendar } from './ui/Calendar'
import './SessionBookingModal.css'

function EnhancedSessionBookingModal({ isOpen, onClose, studentId, subject = null, onSuccess }) {
  const [formData, setFormData] = useState({
    subject: subject || '',
    topic: '',
    scheduled_at: '',
    selectedDate: null,
    selectedTime: '',
    duration_minutes: 60,
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showCalendar, setShowCalendar] = useState(true)
  const [showTimePicker, setShowTimePicker] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        subject: subject || '',
        topic: '',
        scheduled_at: '',
        selectedDate: null,
        selectedTime: '',
        duration_minutes: 60,
        notes: ''
      })
      setShowCalendar(true)
      setShowTimePicker(false)
      setError(null)
    }
  }, [isOpen, subject])

  if (!isOpen) return null

  const handleDateSelect = (date) => {
    // Calendar component passes a Date object
    const selectedDate = date instanceof Date ? date : new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selected = new Date(selectedDate)
    selected.setHours(0, 0, 0, 0)
    
    // Can't select past dates
    if (selected < today) {
      setError('Cannot select past dates')
      return
    }
    
    setFormData(prev => ({
      ...prev,
      selectedDate: selectedDate,
      error: null
    }))
    setError(null)
    setShowTimePicker(true)
  }

  const handleTimeChange = (e) => {
    setFormData(prev => ({
      ...prev,
      selectedTime: e.target.value
    }))
  }

  const generateTimeSlots = () => {
    const slots = []
    const startHour = 8 // 8 AM
    const endHour = 20 // 8 PM
    const interval = 30 // 30 minutes

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(timeString)
      }
    }
    return slots
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.selectedDate) {
      setError('Please select a date')
      return
    }

    if (!formData.selectedTime) {
      setError('Please select a time')
      return
    }

    // Combine date and time
    const [hours, minutes] = formData.selectedTime.split(':')
    const scheduledDate = new Date(formData.selectedDate)
    scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)

    // Validate scheduled time is at least 1 hour in the future
    const now = new Date()
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    
    if (scheduledDate <= oneHourFromNow) {
      setError('Sessions must be scheduled at least 1 hour in advance')
      return
    }

    setLoading(true)

    try {
      await sessionsApi.createSession(studentId, {
        subject: formData.subject,
        topic: formData.topic || null,
        scheduled_at: scheduledDate.toISOString(),
        duration_minutes: formData.duration_minutes,
        notes: formData.notes || null
      })

      // Reset form
      setFormData({
        subject: subject || '',
        topic: '',
        scheduled_at: '',
        selectedDate: null,
        selectedTime: '',
        duration_minutes: 60,
        notes: ''
      })
      setShowCalendar(true)
      setShowTimePicker(false)

      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to book session')
      console.error('Booking error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration_minutes' ? parseInt(value) : value
    }))
  }

  const timeSlots = generateTimeSlots()

  return (
    <div className="booking-modal-overlay" onClick={onClose}>
      <div className="booking-modal-content enhanced-booking-modal" onClick={(e) => e.stopPropagation()}>
        <div className="booking-modal-header">
          <h2>Schedule a New Session</h2>
          <button className="booking-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="booking-modal-form">
          {!subject && (
            <div className="booking-form-group">
              <label htmlFor="subject">Subject *</label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                placeholder="e.g., Chemistry, AP Calculus"
                className="booking-form-input"
              />
            </div>
          )}

          <div className="booking-form-group">
            <label htmlFor="topic">Topic (Optional)</label>
            <input
              type="text"
              id="topic"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              placeholder="e.g., Organic Reactions, Derivatives"
              className="booking-form-input"
            />
          </div>

          {/* Calendar Picker */}
          <div className="booking-form-group">
            <label>Select Date *</label>
            {showCalendar && (
              <div className="calendar-picker-container">
                <div className="calendar-compact-wrapper">
                  <Calendar
                    sessions={[]}
                    subject={null}
                    onDayClick={handleDateSelect}
                    compact={true}
                  />
                </div>
                {formData.selectedDate && (
                  <div className="selected-date-display">
                    Selected: {new Date(formData.selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Time Picker */}
          {formData.selectedDate && showTimePicker && (
            <div className="booking-form-group">
              <label htmlFor="selectedTime">Select Time *</label>
              <div className="time-picker-container">
                <div className="time-picker-grid">
                  {timeSlots.map((time) => {
                    const [hours, minutes] = time.split(':')
                    const slotDate = new Date(formData.selectedDate)
                    slotDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
                    const now = new Date()
                    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
                    const isDisabled = slotDate <= oneHourFromNow

                    return (
                      <button
                        key={time}
                        type="button"
                        className={`time-slot-button ${formData.selectedTime === time ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                        onClick={() => !isDisabled && setFormData(prev => ({ ...prev, selectedTime: time }))}
                        disabled={isDisabled}
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="booking-form-group">
            <label htmlFor="duration_minutes">Duration *</label>
            <select
              id="duration_minutes"
              name="duration_minutes"
              value={formData.duration_minutes}
              onChange={handleChange}
              required
              className="booking-form-select"
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>

          <div className="booking-form-group">
            <label htmlFor="notes">Notes (Optional)</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any specific topics or questions you'd like to cover..."
              rows={3}
              className="booking-form-textarea"
            />
          </div>

          {error && (
            <div className="booking-form-error">
              {error}
            </div>
          )}

          <div className="booking-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="booking-button booking-button-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="booking-button booking-button-primary"
              disabled={loading || !formData.selectedDate || !formData.selectedTime}
            >
              {loading ? 'Booking...' : 'Book Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EnhancedSessionBookingModal

