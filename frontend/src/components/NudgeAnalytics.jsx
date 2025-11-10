import React, { useState, useEffect } from 'react'
import { retentionApi } from '../services/retentionApi'
import api from '../services/api'
import './NudgeAnalytics.css'

function NudgeAnalytics() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [studentId, setStudentId] = useState('1')

  useEffect(() => {
    if (studentId) {
      api.defaults.params = { student_id: studentId }
    }
    loadAnalytics()
  }, [studentId])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await retentionApi.getNudgeAnalytics()
      setAnalytics(response.data)
    } catch (err) {
      setError('Failed to load analytics: ' + (err.response?.data?.error || err.message))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="nudge-analytics loading">Loading analytics...</div>
  }

  if (error) {
    return <div className="nudge-analytics error">{error}</div>
  }

  if (!analytics) {
    return <div className="nudge-analytics">No analytics data available</div>
  }

  const { overall, by_type, recent_nudges } = analytics

  return (
    <div className="nudge-analytics">
      <div className="analytics-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Nudge Analytics</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ fontSize: '14px' }}>Student ID:</label>
            <input
              type="number"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '80px' }}
            />
            <button onClick={loadAnalytics} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="overall-metrics">
        <h3>Overall Metrics</h3>
        <div className="metrics-grid">
          <MetricCard label="Total Sent" value={overall.total_sent} />
          <MetricCard label="Total Opened" value={overall.total_opened} />
          <MetricCard label="Total Clicked" value={overall.total_clicked} />
          <MetricCard label="Total Converted" value={overall.total_converted} />
          <MetricCard label="Open Rate" value={`${overall.open_rate}%`} highlight={overall.open_rate >= 60} />
          <MetricCard label="Click Rate" value={`${overall.click_rate}%`} highlight={overall.click_rate >= 40} />
          <MetricCard label="Conversion Rate" value={`${overall.conversion_rate}%`} highlight={overall.conversion_rate >= 15} />
        </div>
      </div>

      <div className="by-type-metrics">
        <h3>Metrics by Nudge Type</h3>
        <div className="type-metrics-grid">
          <TypeMetricsCard type="Day 7 Reminder" metrics={by_type.day_7_reminder} />
          <TypeMetricsCard type="Day 10 Follow-up" metrics={by_type.day_10_followup} />
        </div>
      </div>

      {recent_nudges && recent_nudges.length > 0 && (
        <div className="recent-nudges">
          <h3>Recent Nudges</h3>
          <div className="nudges-table">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Sent At</th>
                  <th>Opened</th>
                  <th>Clicked</th>
                  <th>Converted</th>
                  <th>Channel</th>
                </tr>
              </thead>
              <tbody>
                {recent_nudges.map((nudge) => (
                  <tr key={nudge.id}>
                    <td>{nudge.nudge_type.replace('_', ' ')}</td>
                    <td>{nudge.sent_at ? new Date(nudge.sent_at).toLocaleString() : '-'}</td>
                    <td>{nudge.opened_at ? '✓' : '✗'}</td>
                    <td>{nudge.clicked_at ? '✓' : '✗'}</td>
                    <td>{nudge.session_booked ? '✓' : '✗'}</td>
                    <td>{nudge.delivery_channel || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, highlight = false }) {
  return (
    <div className={`metric-card ${highlight ? 'highlight' : ''}`}>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  )
}

function TypeMetricsCard({ type, metrics }) {
  return (
    <div className="type-metrics-card">
      <h4>{type}</h4>
      <div className="type-metrics">
        <div className="type-metric">
          <span className="type-metric-label">Sent:</span>
          <span className="type-metric-value">{metrics.total_sent}</span>
        </div>
        <div className="type-metric">
          <span className="type-metric-label">Opened:</span>
          <span className="type-metric-value">{metrics.total_opened} ({metrics.open_rate}%)</span>
        </div>
        <div className="type-metric">
          <span className="type-metric-label">Clicked:</span>
          <span className="type-metric-value">{metrics.total_clicked} ({metrics.click_rate}%)</span>
        </div>
        <div className="type-metric">
          <span className="type-metric-label">Converted:</span>
          <span className="type-metric-value">{metrics.total_converted} ({metrics.conversion_rate}%)</span>
        </div>
      </div>
    </div>
  )
}

export default NudgeAnalytics


