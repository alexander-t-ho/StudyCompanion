import React from 'react'
import { useNavigate } from 'react-router-dom'
import TranscriptGenerator from './TranscriptGenerator'
import './Settings.css'

function Settings({ onGenerated }) {
  const navigate = useNavigate()

  return (
    <div className="settings-container">
      <div className="settings-card">
        <div className="settings-header">
          <button className="settings-back-button" onClick={() => navigate('/main')}>
            ← Back to Dashboard
          </button>
          <h1 className="settings-title">Settings</h1>
        </div>
        <div className="settings-section">
          <h2>Transcript Generator</h2>
          <p className="settings-description">
            Generate tutoring session transcripts. You can specify a date to simulate sessions at different times.
          </p>
          <TranscriptGenerator onGenerated={onGenerated} />
        </div>
      </div>
    </div>
  )
}

export default Settings

