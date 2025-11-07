import React, { useState, useEffect } from 'react'
import { transcriptsAPI } from '../services/api'
import './TranscriptGenerator.css'

function TranscriptGenerator({ onGenerated }) {
  // Load API key from localStorage on mount
  const [formData, setFormData] = useState({
    subject: 'SAT',
    topic: 'College Essays',
    student_level: 'intermediate',
    session_duration_minutes: 60,
    learning_objectives: 'Learn how to write compelling college application essays',
    student_personality: 'Engaged and curious, sometimes struggles with confidence'
  })
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('openai_api_key') || ''
  })
  const [useOpenRouter, setUseOpenRouter] = useState(() => {
    return localStorage.getItem('use_openrouter') === 'true'
  })
  const [useGPT4o, setUseGPT4o] = useState(false)
  const [transcriptFormat, setTranscriptFormat] = useState('structured') // 'structured' or 'conversational'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [generatingObjectives, setGeneratingObjectives] = useState(false)
  const [generatingPersonality, setGeneratingPersonality] = useState(false)

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey)
    }
  }, [apiKey])

  // Save useOpenRouter preference
  useEffect(() => {
    localStorage.setItem('use_openrouter', useOpenRouter.toString())
  }, [useOpenRouter])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Auto-select format based on subject
    if (name === 'subject') {
      const isSatOrAp = value.startsWith('SAT') || value.startsWith('AP ')
      setTranscriptFormat(isSatOrAp ? 'structured' : 'conversational')
    }
  }

  const handleGenerateRandom = async (field) => {
    if (!formData.subject || !formData.topic) {
      alert('Please select a subject and enter a topic first')
      return
    }

    const loadingState = field === 'objectives' ? setGeneratingObjectives : setGeneratingPersonality
    loadingState(true)
    
    try {
      const apiKeyToSend = apiKey || undefined
      const response = await transcriptsAPI.generateRandomFields(
        formData.subject,
        formData.topic,
        formData.student_level,
        apiKeyToSend,
        useOpenRouter
      )
      
      if (field === 'objectives') {
        setFormData(prev => ({ ...prev, learning_objectives: response.data.learning_objectives }))
      } else {
        setFormData(prev => ({ ...prev, student_personality: response.data.student_personality }))
      }
    } catch (err) {
      alert('Failed to generate: ' + (err.response?.data?.error || err.message))
    } finally {
      loadingState(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Only send API key if provided (otherwise backend will use .env)
      const apiKeyToSend = apiKey || undefined
      
      // Prepare submission data for tutoring sessions
      const submissionData = {
        ...formData,
        use_gpt4o: useGPT4o,
        transcript_format: transcriptFormat
      }
      
      const response = await transcriptsAPI.create(
        submissionData,
        apiKeyToSend,
        useOpenRouter
      )
      onGenerated()
      alert('Transcript generated successfully!')
      setFormData({
        subject: '',
        topic: '',
        student_level: 'intermediate',
        session_duration_minutes: 60,
        learning_objectives: '',
        student_personality: ''
      })
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to generate transcript')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="transcript-generator">
      <h2>Generate New Transcript</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>API Key (saved automatically)</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={useOpenRouter ? "Enter OpenRouter API key" : "Enter OpenAI API key"}
          />
          <small style={{ color: '#666', fontSize: '0.9em' }}>
            {apiKey ? '✓ API key saved' : 'API key will be saved automatically'}
          </small>
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={useOpenRouter}
              onChange={(e) => setUseOpenRouter(e.target.checked)}
            />
            Use OpenRouter API
          </label>
          <label>
            <input
              type="checkbox"
              checked={useGPT4o}
              onChange={(e) => setUseGPT4o(e.target.checked)}
            />
            Use GPT-4o (higher quality, more expensive)
          </label>
        </div>

        <div className="form-group">
          <label>Transcript Format *</label>
          <select
            value={transcriptFormat}
            onChange={(e) => setTranscriptFormat(e.target.value)}
            required
          >
            <option value="structured">Structured Format (Summary, Details, Next Steps)</option>
            <option value="conversational">Conversational Format (Tutor/Student dialogue)</option>
          </select>
          <small style={{ color: '#666', fontSize: '0.9em' }}>
            Structured format is recommended for SAT/AP subjects. Format auto-selects based on subject.
          </small>
        </div>

        <div className="form-group">
          <label>Subject *</label>
          <select
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
          >
            <option value="SAT">SAT</option>
            <option value="AP Biology">AP Biology</option>
            <option value="AP Chemistry">AP Chemistry</option>
            <option value="AP Physics 1">AP Physics 1</option>
            <option value="AP Physics 2">AP Physics 2</option>
            <option value="AP Physics C: Mechanics">AP Physics C: Mechanics</option>
            <option value="AP Physics C: Electricity and Magnetism">AP Physics C: Electricity and Magnetism</option>
            <option value="AP Calculus AB">AP Calculus AB</option>
            <option value="AP Calculus BC">AP Calculus BC</option>
            <option value="AP Statistics">AP Statistics</option>
            <option value="AP Computer Science A">AP Computer Science A</option>
            <option value="AP Computer Science Principles">AP Computer Science Principles</option>
            <option value="AP Environmental Science">AP Environmental Science</option>
          </select>
          <small style={{ color: '#666', fontSize: '0.9em' }}>
            All AP STEM subjects available. SAT includes: College essays, study skills, AP prep
          </small>
        </div>

        <div className="form-group">
          <label>Topic *</label>
          <input
            type="text"
            name="topic"
            value={formData.topic}
            onChange={handleChange}
            required
            placeholder={formData.subject === 'SAT' ? 'e.g., College Essays, Study Skills, AP Prep' : 'e.g., Specific topic within the AP subject'}
          />
        </div>

        <div className="form-group">
          <label>Student Level *</label>
          <select
            name="student_level"
            value={formData.student_level}
            onChange={handleChange}
            required
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div className="form-group">
          <label>Session Duration (minutes) *</label>
          <input
            type="number"
            name="session_duration_minutes"
            value={formData.session_duration_minutes}
            onChange={handleChange}
            required
            min="15"
            max="120"
          />
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label>Learning Objectives</label>
            <button
              type="button"
              onClick={() => handleGenerateRandom('objectives')}
              disabled={generatingObjectives || !formData.subject || !formData.topic}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.85rem',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: generatingObjectives ? 'not-allowed' : 'pointer',
                opacity: (generatingObjectives || !formData.subject || !formData.topic) ? 0.6 : 1
              }}
            >
              {generatingObjectives ? 'Generating...' : 'Generate Random'}
            </button>
          </div>
          <textarea
            name="learning_objectives"
            value={formData.learning_objectives}
            onChange={handleChange}
            rows="3"
            placeholder={formData.subject === 'SAT' ? 'e.g., Learn how to write compelling college essays, develop study skills, prepare for AP exams' : 'e.g., Understand key concepts, develop problem-solving skills, prepare for AP exam'}
          />
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label>Student Personality/Engagement Style</label>
            <button
              type="button"
              onClick={() => handleGenerateRandom('personality')}
              disabled={generatingPersonality || !formData.subject || !formData.topic}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.85rem',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: generatingPersonality ? 'not-allowed' : 'pointer',
                opacity: (generatingPersonality || !formData.subject || !formData.topic) ? 0.6 : 1
              }}
            >
              {generatingPersonality ? 'Generating...' : 'Generate Random'}
            </button>
          </div>
          <textarea
            name="student_personality"
            value={formData.student_personality}
            onChange={handleChange}
            rows="3"
            placeholder="e.g., Engaged and curious, sometimes struggles with confidence"
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading} className="generate-button">
          {loading ? 'Generating...' : 'Generate Transcript'}
        </button>
      </form>
    </div>
  )
}

export default TranscriptGenerator

