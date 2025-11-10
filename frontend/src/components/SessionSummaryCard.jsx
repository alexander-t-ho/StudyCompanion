import React, { useState } from 'react'
import './SessionSummaryCard.css'

function SessionSummaryCard({ session, studentId, subject, apiKey, useOpenRouter, compact = false, onAskAI }) {
  const [expanded, setExpanded] = useState(false)
  
  const summary = session.summary || {}
  const date = session.date ? new Date(session.date) : new Date(session.created_at)
  
  const handleAskAI = () => {
    if (onAskAI) {
      onAskAI(session)
    }
  }

  return (
    <div className={`session-summary-card ${compact ? 'compact' : ''}`}>
      <div className="session-header" onClick={() => !compact && setExpanded(!expanded)}>
        <div className="session-info">
          <div className="session-date">{date.toLocaleDateString()}</div>
          <div className="session-topic">{session.topic || 'General Session'}</div>
          {session.duration_minutes && (
            <div className="session-duration">{session.duration_minutes} min</div>
          )}
        </div>
        {session.understanding_level != null && (
          <div className="understanding-level-badge">
            {Number(session.understanding_level).toFixed(0)}% understanding
          </div>
        )}
        {!compact && (
          <button className="expand-button">
            {expanded ? '−' : '+'}
          </button>
        )}
      </div>

      {/* Key Concepts */}
      {summary.key_concepts && summary.key_concepts.length > 0 && (
        <div className="session-concepts">
          <strong>Key Concepts:</strong>
          <div className="concept-tags">
            {summary.key_concepts.slice(0, compact ? 3 : undefined).map((concept, idx) => (
              <span key={idx} className="concept-tag">{concept}</span>
            ))}
            {compact && summary.key_concepts.length > 3 && (
              <span className="concept-tag more">+{summary.key_concepts.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      {/* Topics */}
      {summary.extracted_topics && summary.extracted_topics.length > 0 && (
        <div className="session-topics">
          <strong>Topics:</strong>
          <div className="topic-tags">
            {summary.extracted_topics.slice(0, compact ? 3 : undefined).map((topic, idx) => (
              <span key={idx} className="topic-tag">{topic}</span>
            ))}
            {compact && summary.extracted_topics.length > 3 && (
              <span className="topic-tag more">+{summary.extracted_topics.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      {/* Learning Points (expanded view) */}
      {!compact && expanded && summary.learning_points && (
        <div className="session-learning-points">
          <strong>What We Covered:</strong>
          <p>{summary.learning_points}</p>
        </div>
      )}

      {/* Strengths and Areas for Improvement (expanded view) */}
      {!compact && expanded && (
        <>
          {summary.strengths_identified && summary.strengths_identified.length > 0 && (
            <div className="session-strengths">
              <strong>Strengths:</strong>
              <ul>
                {summary.strengths_identified.map((strength, idx) => (
                  <li key={idx}>{strength}</li>
                ))}
              </ul>
            </div>
          )}

          {summary.areas_for_improvement && summary.areas_for_improvement.length > 0 && (
            <div className="session-improvements">
              <strong>Areas for Improvement:</strong>
              <ul>
                {summary.areas_for_improvement.map((area, idx) => (
                  <li key={idx}>{area}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Ask AI Button */}
      <div className="session-actions">
        <button
          className="ask-ai-button"
          onClick={handleAskAI}
        >
          Ask AI About This Session
        </button>
      </div>
    </div>
  )
}

export default SessionSummaryCard

