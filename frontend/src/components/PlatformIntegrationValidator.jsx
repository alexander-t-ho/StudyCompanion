import React, { useState } from 'react'
import aiCompanionApi from '../services/aiCompanionApi'
import retentionApi from '../services/retentionApi'
import api from '../services/api'
import './PlatformIntegrationValidator.css'

function PlatformIntegrationValidator() {
  const [studentId, setStudentId] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [results, setResults] = useState({})
  const [testing, setTesting] = useState(false)

  const testEndpoint = async (name, apiCall) => {
    try {
      const response = await apiCall()
      return { success: true, data: response.data, error: null }
    } catch (error) {
      return { 
        success: false, 
        data: null, 
        error: error.response?.data?.error || error.message 
      }
    }
  }

  const runAllTests = async () => {
    setTesting(true)
    setResults({})

    // Set auth header if token provided
    if (authToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
    } else if (studentId) {
      // Use student_id in params
      api.defaults.params = { student_id: studentId }
    }

    const tests = {
      'AI Companion Profile': () => aiCompanionApi.getProfile(),
      'Session Summaries': () => aiCompanionApi.getSessionSummaries(),
      'Practice List': () => aiCompanionApi.getPracticeList(),
      'Conversation History': () => aiCompanionApi.getConversationHistory(),
      'Progress Dashboard': () => retentionApi.getProgressDashboard(),
      'Chat Endpoint (Stub)': () => aiCompanionApi.sendMessage('test'),
      'Practice Generate (Stub)': () => aiCompanionApi.generatePractice('Math', 'Algebra'),
      'Routing Check (Stub)': () => aiCompanionApi.checkRouting(1)
    }

    const testResults = {}
    for (const [name, apiCall] of Object.entries(tests)) {
      testResults[name] = await testEndpoint(name, apiCall)
    }

    setResults(testResults)
    setTesting(false)
  }

  return (
    <div className="platform-validator">
      <h2>Platform Integration Validator</h2>
      <p>Test all Platform Integration endpoints and verify they're ready for Core AI Companion</p>

      <div className="validator-config">
        <div className="config-field">
          <label>Student ID (for testing)</label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Enter student ID"
          />
        </div>

        <div className="config-field">
          <label>Authentication Token (optional)</label>
          <input
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Enter auth token or leave empty"
          />
        </div>

        <button 
          onClick={runAllTests} 
          disabled={testing || (!studentId && !authToken)}
          className="test-button"
        >
          {testing ? 'Testing...' : 'Run All Tests'}
        </button>
      </div>

      {Object.keys(results).length > 0 && (
        <div className="test-results">
          <h3>Test Results</h3>
          {Object.entries(results).map(([name, result]) => (
            <div key={name} className={`test-result ${result.success ? 'success' : 'error'}`}>
              <div className="result-header">
                <span className="result-name">{name}</span>
                <span className={`result-status ${result.success ? 'success' : 'error'}`}>
                  {result.success ? '✓ Pass' : '✗ Fail'}
                </span>
              </div>
              {result.error && (
                <div className="result-error">
                  Error: {result.error}
                </div>
              )}
              {result.success && result.data && (
                <div className="result-data">
                  <pre>{JSON.stringify(result.data, null, 2)}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="validation-checklist">
        <h3>Validation Checklist</h3>
        <ul>
          <li className={results['AI Companion Profile']?.success ? 'checked' : ''}>
            AI Companion Profile endpoint accessible
          </li>
          <li className={results['Session Summaries']?.success ? 'checked' : ''}>
            Session Summaries endpoint accessible
          </li>
          <li className={results['Practice List']?.success ? 'checked' : ''}>
            Practice endpoints accessible
          </li>
          <li className={results['Progress Dashboard']?.success ? 'checked' : ''}>
            Retention endpoints accessible
          </li>
          <li>
            All API endpoint structures in place (stubs ready)
          </li>
          <li>
            Database schema complete with all tables
          </li>
          <li>
            Models with relationships working
          </li>
        </ul>
      </div>
    </div>
  )
}

export default PlatformIntegrationValidator

