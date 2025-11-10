import React, { useState, useEffect } from 'react'
import { transcriptsAPI } from '../services/api'
import './TranscriptList.css'

function TranscriptList({ onSelect, selectedId }) {
  const [transcripts, setTranscripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadTranscripts()
  }, [])

  const loadTranscripts = async () => {
    try {
      setLoading(true)
      const response = await transcriptsAPI.list()
      setTranscripts(response.data)
      setError(null)
    } catch (err) {
      setError('Failed to load transcripts')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="transcript-list">
        <h2>Transcripts</h2>
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="transcript-list">
      <div className="list-header">
        <h2>Generated Transcripts</h2>
        <button onClick={loadTranscripts} className="refresh-button">Refresh</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="transcript-items">
        {transcripts.length === 0 ? (
          <div className="empty-message">No transcripts yet. Generate one to get started!</div>
        ) : (
          transcripts.map(transcript => (
            <div
              key={transcript.id}
              className={`transcript-item ${selectedId === transcript.id ? 'selected' : ''} ${transcript.approved ? 'approved' : ''}`}
              onClick={() => onSelect(transcript)}
            >
              <div className="item-header">
                <span className="subject">{transcript.subject}</span>
                {transcript.approved && <span className="badge approved-badge">Approved</span>}
                {transcript.transcript_analysis && (
                  <span className="badge analysis-badge">Analyzed</span>
                )}
                {transcript.quality_rating && (
                  <span className="badge rating-badge">⭐ {transcript.quality_rating}/5</span>
                )}
                {transcript.understanding_level != null && (
                  <span className="badge" style={{ 
                    backgroundColor: transcript.understanding_level >= 70 ? '#4caf50' : 
                                     transcript.understanding_level >= 40 ? '#ff9800' : '#f44336',
                    color: 'white'
                  }}>
                    {Number(transcript.understanding_level).toFixed(0)}% Understanding
                  </span>
                )}
              </div>
              <div className="item-details">
                <span className="topic">{transcript.topic}</span>
                <span className="level">{transcript.student_level}</span>
                {transcript.student_id && (
                  <span className="level" style={{ fontSize: '0.85em', color: '#666' }}>
                    Student #{transcript.student_id}
                  </span>
                )}
              </div>
              <div className="item-meta">
                <span className="date">{formatDate(transcript.created_at)}</span>
                {transcript.model_used && (
                  <span className="model">{transcript.model_used}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default TranscriptList

