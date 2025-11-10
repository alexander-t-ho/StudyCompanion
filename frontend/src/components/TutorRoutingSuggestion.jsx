import React, { useState } from 'react'
import { aiCompanionApi } from '../services/aiCompanionApi'
import './TutorRoutingSuggestion.css'

function TutorRoutingSuggestion({ studentId, onBookSession, apiKey, useOpenRouter, onDismiss }) {
  const [checking, setChecking] = useState(false)
  const [routingData, setRoutingData] = useState(null)
  const [requesting, setRequesting] = useState(false)
  const [tutorSuggestions, setTutorSuggestions] = useState(null)
  const [error, setError] = useState(null)

  const handleCheckRouting = async () => {
    try {
      setChecking(true)
      setError(null)
      
      const response = await aiCompanionApi.checkRouting(null, apiKey, useOpenRouter)
      const data = response.data
      
      if (data.routing_needed && data.confidence >= 0.7) {
        setRoutingData(data)
        // Automatically request routing details
        handleRequestRouting(data)
      } else {
        setRoutingData({ ...data, routing_needed: false })
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check routing')
      console.error(err)
    } finally {
      setChecking(false)
    }
  }

  const handleRequestRouting = async (routingCheck = null) => {
    try {
      setRequesting(true)
      setError(null)
      
      const response = await aiCompanionApi.requestRouting(
        {
          routing_event_id: routingCheck?.routing_event_id,
          subject: routingCheck?.subject
        },
        apiKey,
        useOpenRouter
      )
      
      setTutorSuggestions(response.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get tutor suggestions')
      console.error(err)
    } finally {
      setRequesting(false)
    }
  }

  const handleBookTutor = (tutor) => {
    if (onBookSession) {
      onBookSession(tutor, routingData)
    } else {
      alert(`Booking session with ${tutor.name}... (Integration with booking system needed)`)
    }
  }

  if (!routingData && !checking) {
    return (
      <div className="routing-suggestion">
        <div className="routing-prompt">
          <h3>Need Help?</h3>
          <p>Check if you should connect with a human tutor</p>
          <button onClick={handleCheckRouting} className="check-button">
            Check Routing
          </button>
        </div>
      </div>
    )
  }

  if (checking || requesting) {
    return (
      <div className="routing-suggestion">
        <div className="loading-state">
          {checking ? 'Analyzing conversation...' : 'Finding tutors...'}
        </div>
      </div>
    )
  }

  if (routingData && !routingData.routing_needed) {
    return (
      <div className="routing-suggestion">
        <div className="no-routing-needed">
          <h3>✓ You're doing great!</h3>
          <p>The AI companion can help with your current questions. Keep learning!</p>
          {onDismiss && (
            <button onClick={onDismiss} className="dismiss-button">
              Dismiss
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="routing-suggestion">
      <div className="routing-card">
        {onDismiss && (
          <button className="close-button" onClick={onDismiss}>×</button>
        )}
        
        <div className="routing-header">
          <h3>💡 Consider Booking a Session</h3>
          <span className={`urgency-badge urgency-${routingData?.urgency || 'medium'}`}>
            {routingData?.urgency || 'medium'} priority
          </span>
        </div>

        {routingData?.reason && (
          <div className="routing-reason">
            <h4>Why we suggest this:</h4>
            <p>{routingData.reason}</p>
          </div>
        )}

        {routingData?.triggers && routingData.triggers.length > 0 && (
          <div className="routing-triggers">
            <h4>Indicators:</h4>
            <ul>
              {routingData.triggers.map((trigger, idx) => (
                <li key={idx}>{trigger}</li>
              ))}
            </ul>
          </div>
        )}

        {tutorSuggestions && tutorSuggestions.suggested_tutors && tutorSuggestions.suggested_tutors.length > 0 && (
          <div className="tutor-suggestions">
            <h4>Suggested Tutors:</h4>
            <div className="tutors-list">
              {tutorSuggestions.suggested_tutors.map((tutor) => (
                <div key={tutor.id} className="tutor-card">
                  <div className="tutor-info">
                    <div className="tutor-name">{tutor.name}</div>
                    {tutor.rating && (
                      <div className="tutor-rating">⭐ {tutor.rating}</div>
                    )}
                    {tutor.expertise && tutor.expertise.length > 0 && (
                      <div className="tutor-expertise">
                        Expertise: {tutor.expertise.join(', ')}
                      </div>
                    )}
                  </div>
                  {tutor.available_slots && tutor.available_slots.length > 0 && (
                    <div className="tutor-slots">
                      <div className="slots-label">Available:</div>
                      <div className="slots-list">
                        {tutor.available_slots.map((slot, idx) => (
                          <span key={idx} className="slot-badge">{slot}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => handleBookTutor(tutor)}
                    className="book-button"
                  >
                    Book Session
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!tutorSuggestions && (
          <div className="request-tutors">
            <button
              onClick={() => handleRequestRouting(routingData)}
              className="request-button"
            >
              Find Available Tutors
            </button>
          </div>
        )}

        {error && (
          <div className="error-message">{error}</div>
        )}
      </div>
    </div>
  )
}

export default TutorRoutingSuggestion


