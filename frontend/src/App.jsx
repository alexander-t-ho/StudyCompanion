import React, { useState } from 'react'
import TranscriptGenerator from './components/TranscriptGenerator'
import TranscriptList from './components/TranscriptList'
import TranscriptViewer from './components/TranscriptViewer'
import PlatformIntegrationValidator from './components/PlatformIntegrationValidator'
import './App.css'

function App() {
  const [selectedTranscript, setSelectedTranscript] = useState(null)
  const [refreshList, setRefreshList] = useState(0)

  const handleTranscriptGenerated = () => {
    setRefreshList(prev => prev + 1)
  }

  const handleTranscriptSelected = (transcript) => {
    setSelectedTranscript(transcript)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Study Companion</h1>
        <p>AI Study Companion Platform - Transcript Generation & Platform Integration</p>
      </header>

      <div className="app-content">
        <div className="tabs">
          <button 
            className={selectedTranscript ? '' : 'active'}
            onClick={() => setSelectedTranscript(null)}
          >
            Transcripts
          </button>
          <button 
            className={selectedTranscript === 'validator' ? 'active' : ''}
            onClick={() => setSelectedTranscript('validator')}
          >
            Platform Integration Validator
          </button>
        </div>

        {selectedTranscript === 'validator' ? (
          <PlatformIntegrationValidator />
        ) : (
          <>
            <div className="left-panel">
              <TranscriptGenerator onGenerated={handleTranscriptGenerated} />
              <TranscriptList 
                key={refreshList}
                onSelect={handleTranscriptSelected}
                selectedId={typeof selectedTranscript === 'object' ? selectedTranscript?.id : null}
              />
            </div>

            <div className="right-panel">
              {typeof selectedTranscript === 'object' && selectedTranscript ? (
                <TranscriptViewer 
                  transcript={selectedTranscript}
                  onUpdate={handleTranscriptGenerated}
                />
              ) : (
                <div className="empty-state">
                  <p>Select a transcript to view and validate</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App

