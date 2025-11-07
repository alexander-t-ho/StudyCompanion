import React, { useState } from 'react'
import { analysesAPI } from '../services/api'
import './AnalysisViewer.css'

function AnalysisViewer({ analysis, transcriptId, onUpdate }) {
  const [validationRating, setValidationRating] = useState(analysis.validation_rating || 0)
  const [validationNotes, setValidationNotes] = useState(analysis.validation_notes || '')
  const [validated, setValidated] = useState(analysis.validated || false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await analysesAPI.validate(analysis.id, {
        validation_rating: validationRating,
        validation_notes: validationNotes,
        validated: validated
      })
      onUpdate()
      alert('Analysis validation saved successfully!')
    } catch (err) {
      alert('Failed to save validation: ' + (err.response?.data?.error || err.message))
    } finally {
      setSaving(false)
    }
  }

  const renderSentiment = (sentiment) => {
    if (!sentiment) return null
    
    return (
      <div className="sentiment-section">
        <h4>Overall Sentiment: <span className={`sentiment-${sentiment.overall_sentiment?.toLowerCase()}`}>
          {sentiment.overall_sentiment}
        </span></h4>
        <div className="sentiment-details">
          <div className="sentiment-item">
            <strong>Student:</strong> {sentiment.student_sentiment?.overall || 'N/A'}
          </div>
          <div className="sentiment-item">
            <strong>Tutor:</strong> {sentiment.tutor_sentiment?.overall || 'N/A'}
          </div>
          <div className="sentiment-item">
            <strong>Engagement:</strong> {sentiment.engagement_level || 'N/A'}
          </div>
        </div>
        {sentiment.confidence_indicators && sentiment.confidence_indicators.length > 0 && (
          <div className="confidence-indicators">
            <strong>Confidence Indicators:</strong>
            <ul>
              {sentiment.confidence_indicators.map((indicator, idx) => (
                <li key={idx}>{indicator}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  const renderConcepts = (concepts) => {
    if (!concepts || !concepts.concepts_discussed) return null

    return (
      <div className="concepts-section">
        <h4>Concepts Discussed</h4>
        <div className="concepts-list">
          {concepts.concepts_discussed.map((concept, idx) => (
            <div key={idx} className="concept-item">
              <div className="concept-header">
                <span className="concept-name">{concept.concept}</span>
                <span className={`mastery-badge mastery-${concept.mastery_level}`}>
                  {concept.mastery_level}
                </span>
              </div>
              {concept.evidence && (
                <div className="concept-evidence">
                  <em>"{concept.evidence}"</em>
                </div>
              )}
            </div>
          ))}
        </div>
        {concepts.topics_covered && concepts.topics_covered.length > 0 && (
          <div className="topics-covered">
            <strong>Topics:</strong> {concepts.topics_covered.join(', ')}
          </div>
        )}
      </div>
    )
  }

  const renderEngagement = (metrics, score) => {
    return (
      <div className="engagement-section">
        <h4>Engagement Score: <span className="engagement-score">{score}/100</span></h4>
        {metrics && (
          <div className="engagement-metrics">
            <div className="metric-item">
              <strong>Question Frequency:</strong> {metrics.question_frequency || 'N/A'}
            </div>
            <div className="metric-item">
              <strong>Response Patterns:</strong> {metrics.response_patterns || 'N/A'}
            </div>
            <div className="metric-item">
              <strong>Interaction Quality:</strong> {metrics.interaction_quality || 'N/A'}
            </div>
            <div className="metric-item">
              <strong>Participation Level:</strong> {metrics.participation_level || 'N/A'}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="analysis-viewer">
      <div className="analysis-header">
        <h3>Analysis Results</h3>
        {analysis.validated && <span className="status-badge validated">✓ Validated</span>}
      </div>

      {analysis.summary && (
        <div className="summary-section">
          <h4>Summary</h4>
          <p>{analysis.summary}</p>
        </div>
      )}

      {renderSentiment(analysis.sentiment_analysis)}
      {renderConcepts(analysis.concept_extraction)}
      {renderEngagement(analysis.engagement_metrics, analysis.engagement_score)}

      <div className="analysis-meta">
        <div className="meta-item">
          <strong>Model:</strong> {analysis.model_used}
        </div>
        {analysis.analysis_cost && (
          <div className="meta-item">
            <strong>Cost:</strong> ${analysis.analysis_cost.toFixed(4)}
          </div>
        )}
        {analysis.token_count && (
          <div className="meta-item">
            <strong>Tokens:</strong> {analysis.token_count.toLocaleString()}
          </div>
        )}
      </div>

      <div className="analysis-validation">
        <h4>Validate Analysis</h4>
        
        <div className="validation-field">
          <label>Validation Rating (1-5)</label>
          <div className="rating-buttons">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                className={`rating-button ${validationRating === rating ? 'selected' : ''}`}
                onClick={() => setValidationRating(rating)}
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
            placeholder="Add notes about analysis accuracy, quality, etc."
          />
        </div>

        <div className="validation-field">
          <label>
            <input
              type="checkbox"
              checked={validated}
              onChange={(e) => setValidated(e.target.checked)}
            />
            Mark as validated
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

export default AnalysisViewer

