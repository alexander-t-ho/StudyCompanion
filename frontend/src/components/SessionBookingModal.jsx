import React, { useState } from 'react'
import { sessionsApi } from '../services/sessionsApi'
import './SessionBookingModal.css'

function SessionBookingModal({ isOpen, onClose, studentId, subject = null, onSuccess }) {
  const [formData, setFormData] = useState({
    subject: subject || '',
    topic: '',
    scheduled_at: '',
    duration_minutes: 60,
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Combine date and time into ISO string
      const scheduledDateTime = new Date(formData.scheduled_at).toISOString()

      await sessionsApi.createSession(studentId, {
        subject: formData.subject,
        topic: formData.topic || null,
        scheduled_at: scheduledDateTime,
        duration_minutes: formData.duration_minutes,
        notes: formData.notes || null
      })

      // Reset form
      setFormData({
        subject: subject || '',
        topic: '',
        scheduled_at: '',
        duration_minutes: 60,
        notes: ''
      })

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

  // Get minimum datetime (current time + 1 hour)
  const getMinDateTime = () => {
    const now = new Date()
    now.setHours(now.getHours() + 1)
    return now.toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:mm
  }

  return (
    <div className="booking-modal-overlay" onClick={onClose}>
      <div className="booking-modal-content" onClick={(e) => e.stopPropagation()}>
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

          <div className="booking-form-group">
            <label htmlFor="scheduled_at">Date & Time *</label>
            <input
              type="datetime-local"
              id="scheduled_at"
              name="scheduled_at"
              value={formData.scheduled_at}
              onChange={handleChange}
              min={getMinDateTime()}
              required
              className="booking-form-input"
            />
            <small className="booking-form-hint">Sessions must be scheduled at least 1 hour in advance</small>
          </div>

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
              disabled={loading}
            >
              {loading ? 'Booking...' : 'Book Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SessionBookingModal

