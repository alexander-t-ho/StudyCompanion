import React, { useState, useEffect } from 'react'
import { retentionApi } from '../services/retentionApi'
import './NudgeNotification.css'

function NudgeNotification({ onDismiss, onBookSession }) {
  const [nudge, setNudge] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    checkForNudges()
  }, [])

  const checkForNudges = async () => {
    try {
      setLoading(true)
      
      // Check eligibility first
      const eligibilityResponse = await retentionApi.checkNudgeEligibility()
      
      if (eligibilityResponse.data.eligible) {
        // Get the most recent unsent nudge or create one
        const nudgesResponse = await retentionApi.checkNudgeEligibility()
        
        // If eligible, send the nudge
        if (eligibilityResponse.data.eligible) {
          const sendResponse = await retentionApi.sendNudge({ delivery_channel: 'in_app' })
          if (sendResponse.data.success) {
            setNudge(sendResponse.data.nudge)
            // Mark as opened when displayed
            if (sendResponse.data.nudge.id) {
              try {
                await retentionApi.markNudgeOpened(sendResponse.data.nudge.id)
              } catch (err) {
                console.error('Failed to mark nudge as opened:', err)
              }
            }
          }
        }
      } else {
        // Check if there are any recent unsent nudges
        try {
          const nudgesResponse = await retentionApi.getNudges()
          const unsentNudges = nudgesResponse.data.nudges?.filter(
            (n) => n.sent_at && !n.opened_at && n.delivery_channel === 'in_app'
          )
          if (unsentNudges && unsentNudges.length > 0) {
            const latestNudge = unsentNudges[0]
            setNudge(latestNudge)
            // Mark as opened
            try {
              await retentionApi.markNudgeOpened(latestNudge.id)
            } catch (err) {
              console.error('Failed to mark nudge as opened:', err)
            }
          }
        } catch (err) {
          console.error('Failed to load nudges:', err)
        }
      }
    } catch (err) {
      console.error('Failed to check for nudges:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = async () => {
    setDismissed(true)
    if (onDismiss) {
      onDismiss()
    }
  }

  const handleClick = async () => {
    if (nudge && nudge.id) {
      try {
        await retentionApi.markNudgeClicked(nudge.id)
      } catch (err) {
        console.error('Failed to mark nudge as clicked:', err)
      }
    }
    
    if (onBookSession) {
      onBookSession()
    }
  }

  if (loading || dismissed || !nudge) {
    return null
  }

  return (
    <div className="nudge-notification">
      <div className="nudge-content">
        <div className="nudge-icon">📚</div>
        <div className="nudge-message">
          <div className="nudge-title">Keep Your Momentum Going!</div>
          <div className="nudge-text">{nudge.message}</div>
        </div>
        <button className="nudge-close" onClick={handleDismiss} aria-label="Dismiss">
          ×
        </button>
      </div>
      <div className="nudge-actions">
        <button className="nudge-button primary" onClick={handleClick}>
          Book Session
        </button>
        <button className="nudge-button secondary" onClick={handleDismiss}>
          Maybe Later
        </button>
      </div>
    </div>
  )
}

export default NudgeNotification







