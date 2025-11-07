import React, { useState } from 'react'
import { transcriptsAPI } from '../services/api'
import AnalysisViewer from './AnalysisViewer'
import './TranscriptViewer.css'

function TranscriptViewer({ transcript, onUpdate }) {
  if (!transcript) {
    return (
      <div className="transcript-viewer">
        <div className="error-message">No transcript selected</div>
      </div>
    )
  }

  const [qualityRating, setQualityRating] = useState(transcript?.quality_rating || 0)
  const [validationNotes, setValidationNotes] = useState(transcript?.validation_notes || '')
  const [approved, setApproved] = useState(transcript?.approved || false)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState(transcript)
  const [error, setError] = useState(null)

  React.useEffect(() => {
    if (transcript) {
    setCurrentTranscript(transcript)
    setQualityRating(transcript.quality_rating || 0)
    setValidationNotes(transcript.validation_notes || '')
    setApproved(transcript.approved || false)
      setError(null)
    }
  }, [transcript])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await transcriptsAPI.validate(currentTranscript.id, {
        quality_rating: qualityRating,
        validation_notes: validationNotes,
        approved: approved
      })
      setCurrentTranscript(response.data)
      onUpdate()
      alert('Validation saved successfully!')
    } catch (err) {
      alert('Failed to save validation: ' + (err.response?.data?.error || err.message))
    } finally {
      setSaving(false)
    }
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      // Get API key and preferences from localStorage
      const apiKey = localStorage.getItem('openai_api_key') || ''
      const useOpenRouter = localStorage.getItem('use_openrouter') === 'true'
      
      const response = await transcriptsAPI.analyze(currentTranscript.id, apiKey, useOpenRouter)
      // Reload transcript to get analysis
      const updated = await transcriptsAPI.get(currentTranscript.id)
      setCurrentTranscript(updated.data)
      onUpdate()
      alert('Analysis completed successfully!')
    } catch (err) {
      alert('Failed to analyze transcript: ' + (err.response?.data?.error || err.message))
    } finally {
      setAnalyzing(false)
    }
  }

  const formatTranscript = (content) => {
    try {
      if (!content || typeof content !== 'string') {
        return <p style={{ color: '#999', fontStyle: 'italic' }}>No transcript content available</p>
      }
      
      // Check if this is a structured format (Summary, Details, Suggested next steps)
      const isStructuredFormat = content.includes('Summary') && 
                                 (content.includes('Details') || content.includes('Suggested next steps'))
      
      // Check if this is a meeting transcript (Gemini format)
      const isMeetingFormat = content.includes('**Summary**') || content.includes('**Invited**')
      
      if (isMeetingFormat) {
        // Format meeting transcript with markdown-like styling
        const lines = content.split('\n')
        return lines.map((line, index) => {
          try {
            // Handle bold headers (e.g., **Title**)
            if (line.match(/^\*\*.*\*\*$/)) {
              const text = line.replace(/\*\*/g, '')
              return <h4 key={index} className="transcript-header">{text}</h4>
            }
            // Handle section headers (e.g., **Section Name**)
            if (line.match(/^\*\*[^*]+\*\*$/)) {
              const text = line.replace(/\*\*/g, '')
              return <h5 key={index} className="transcript-section">{text}</h5>
            }
            // Handle bullet points
            if (line.trim().startsWith('*')) {
              return <div key={index} className="transcript-bullet">{line.trim()}</div>
            }
            // Handle regular lines
            if (line.trim()) {
              return <div key={index} className="transcript-line">{line}</div>
            }
            return <br key={index} />
          } catch (err) {
            console.error('Error formatting line:', err)
            return <div key={index} className="transcript-line">{line}</div>
          }
        })
      } else if (isStructuredFormat) {
        // Format structured tutoring transcript
        return formatStructuredTranscript(content)
      } else {
        // Format conversational tutoring transcript with speaker labels
    const lines = content.split('\n')
    return lines.map((line, index) => {
          try {
            if (line.startsWith('Tutor:') || line.startsWith('Student:') || line.startsWith('**Tutor:**') || line.startsWith('**Student:**')) {
              // Handle both "Tutor:" and "**Tutor:**" formats
              const match = line.match(/^(\*\*)?(Tutor|Student)(\*\*)?:\s*(.*)$/)
              if (match) {
                const speaker = match[2]
                const text = match[4] || ''
                const isTutor = speaker === 'Tutor'
        return (
          <div key={index} className={`transcript-line ${isTutor ? 'tutor' : 'student'}`}>
            <span className="speaker-label">{speaker}:</span>
                    <span className="speaker-text">{text.trim()}</span>
          </div>
        )
      }
            }
            return <div key={index} className="transcript-line">{line}</div>
          } catch (err) {
            console.error('Error formatting line:', err)
      return <div key={index} className="transcript-line">{line}</div>
          }
        })
      }
    } catch (err) {
      console.error('Error formatting transcript:', err)
      setError('Error displaying transcript content')
      return <p style={{ color: '#d32f2f' }}>Error displaying transcript. Please check the console for details.</p>
    }
  }

  const formatStructuredTranscript = (content) => {
    const lines = content.split('\n')
    const elements = []
    let currentSection = null
    let currentSectionContent = []
    let inSummary = false
    let inDetails = false
    let inNextSteps = false
    let title = null

    lines.forEach((line, index) => {
      const trimmed = line.trim()
      
      // Extract title (first non-empty line that's not a section header)
      if (!title && trimmed && !trimmed.match(/^(Summary|Details|Suggested next steps)$/i)) {
        title = trimmed
        elements.push(<h3 key={`title-${index}`} className="transcript-title">{trimmed}</h3>)
        return
      }

      // Detect section headers
      if (trimmed.match(/^Summary$/i)) {
        inSummary = true
        inDetails = false
        inNextSteps = false
        if (currentSectionContent.length > 0) {
          elements.push(renderSection(currentSection, currentSectionContent, index))
        }
        currentSection = 'Summary'
        currentSectionContent = []
        elements.push(<h4 key={`section-${index}`} className="transcript-section-header">Summary</h4>)
        return
      }

      if (trimmed.match(/^Details$/i)) {
        inSummary = false
        inDetails = true
        inNextSteps = false
        if (currentSectionContent.length > 0) {
          elements.push(renderSection(currentSection, currentSectionContent, index))
        }
        currentSection = 'Details'
        currentSectionContent = []
        elements.push(<h4 key={`section-${index}`} className="transcript-section-header">Details</h4>)
        return
      }

      if (trimmed.match(/^Suggested next steps$/i)) {
        inSummary = false
        inDetails = false
        inNextSteps = true
        if (currentSectionContent.length > 0) {
          elements.push(renderSection(currentSection, currentSectionContent, index))
        }
        currentSection = 'NextSteps'
        currentSectionContent = []
        elements.push(<h4 key={`section-${index}`} className="transcript-section-header">Suggested next steps</h4>)
        return
      }

      // Check for subsection headings (lines that look like headings)
      if (trimmed && inDetails && trimmed.match(/^[A-Z][^:]*$/)) {
        // Might be a subsection heading - check if next line is content
        if (currentSectionContent.length > 0) {
          elements.push(renderSection(currentSection, currentSectionContent, index))
        }
        currentSection = trimmed
        currentSectionContent = []
        elements.push(<h5 key={`subsection-${index}`} className="transcript-subsection">{trimmed}</h5>)
        return
      }

      // Collect content for current section
      if (trimmed) {
        currentSectionContent.push(trimmed)
      } else if (currentSectionContent.length > 0) {
        // Empty line - render accumulated content
        elements.push(renderSection(currentSection, currentSectionContent, index))
        currentSectionContent = []
      }
    })

    // Render any remaining content
    if (currentSectionContent.length > 0) {
      elements.push(renderSection(currentSection, currentSectionContent, lines.length))
    }

    return elements
  }

  const renderSection = (sectionType, content, keyBase) => {
    if (!content || content.length === 0) return null

    const text = content.join(' ')

    if (sectionType === 'NextSteps' || sectionType === 'Suggested next steps') {
      // Format next steps as list items
      const items = text.split(/(?=\[.*?\]:)/).filter(item => item.trim())
      return (
        <ul key={`nextsteps-${keyBase}`} className="transcript-next-steps">
          {items.map((item, idx) => {
            const match = item.match(/\[([^\]]+)\]:\s*(.+)/)
            if (match) {
              return (
                <li key={`step-${keyBase}-${idx}`} className="transcript-step">
                  <strong>{match[1]}:</strong> {match[2].trim()}
                </li>
              )
            }
            return <li key={`step-${keyBase}-${idx}`} className="transcript-step">{item.trim()}</li>
          })}
        </ul>
      )
    }

    // Regular paragraph content
    return (
      <div key={`section-${keyBase}`} className="transcript-section-content">
        {text.split('\n').map((para, idx) => 
          para.trim() ? <p key={`para-${keyBase}-${idx}`}>{para.trim()}</p> : null
        )}
      </div>
    )
  }

  return (
    <div className="transcript-viewer">
      {error && <div className="error-message">{error}</div>}
      
      <div className="viewer-header">
        <h2>Transcript Details</h2>
        {transcript?.approved && <span className="status-badge approved">✓ Approved</span>}
      </div>

      <div className="transcript-info">
        <div className="info-row">
          <span className="info-label">Subject:</span>
          <span className="info-value">{transcript?.subject || 'N/A'}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Topic:</span>
          <span className="info-value">{transcript?.topic || 'N/A'}</span>
        </div>
        {transcript?.student_level && (
        <div className="info-row">
          <span className="info-label">Student Level:</span>
          <span className="info-value">{transcript.student_level}</span>
        </div>
        )}
        <div className="info-row">
          <span className="info-label">Duration:</span>
          <span className="info-value">{transcript?.session_duration_minutes || 0} minutes</span>
        </div>
        {transcript?.model_used && (
          <div className="info-row">
            <span className="info-label">Model:</span>
            <span className="info-value">{transcript.model_used}</span>
          </div>
        )}
        {transcript?.generation_cost != null && (
          <div className="info-row">
            <span className="info-label">Cost:</span>
            <span className="info-value">${Number(transcript.generation_cost).toFixed(4)}</span>
          </div>
        )}
      </div>

      <div className="transcript-content">
        <div className="content-header">
          <h3>Transcript</h3>
          {!currentTranscript?.transcript_analysis && (
            <button 
              onClick={handleAnalyze} 
              disabled={analyzing}
              className="analyze-button"
            >
              {analyzing ? 'Analyzing...' : 'Analyze Transcript'}
            </button>
          )}
        </div>
        <div className="transcript-text">
          {currentTranscript?.transcript_content ? (
            formatTranscript(currentTranscript.transcript_content)
          ) : (
            <p style={{ color: '#999', fontStyle: 'italic' }}>No transcript content available</p>
          )}
        </div>
      </div>

      {currentTranscript?.transcript_analysis && (
        <AnalysisViewer 
          analysis={currentTranscript.transcript_analysis}
          transcriptId={currentTranscript.id}
          onUpdate={onUpdate}
        />
      )}

      <div className="validation-section">
        <h3>Validation</h3>
        
        <div className="validation-field">
          <label>Quality Rating (1-5)</label>
          <div className="rating-buttons">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                className={`rating-button ${qualityRating === rating ? 'selected' : ''}`}
                onClick={() => setQualityRating(rating)}
              >
                {rating}
              </button>
            ))}
          </div>
        </div>

        <div className="validation-field">
          <label>Validation Notes</label>
          <textarea
            value={validationNotes}
            onChange={(e) => setValidationNotes(e.target.value)}
            rows="4"
            placeholder="Add notes about transcript quality, realism, educational value, etc."
          />
        </div>

        <div className="validation-field">
          <label>
            <input
              type="checkbox"
              checked={approved}
              onChange={(e) => setApproved(e.target.checked)}
            />
            Approve this transcript
          </label>
        </div>

        <button 
          onClick={handleSave} 
          disabled={saving}
          className="save-button"
        >
          {saving ? 'Saving...' : 'Save Validation'}
        </button>
      </div>
    </div>
  )
}

export default TranscriptViewer

