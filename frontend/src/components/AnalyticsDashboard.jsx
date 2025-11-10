import React, { useState, useEffect } from 'react'
import { analyticsApi } from '../services/analyticsApi'
import './AnalyticsDashboard.css'

function AnalyticsDashboard({ studentId }) {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadDashboard()
  }, [studentId, dateRange])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await analyticsApi.getDashboard(
        dateRange.startDate,
        dateRange.endDate,
        studentId
      )
      setDashboardData(response.data)
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message
      setError(`Failed to load analytics dashboard: ${errorMessage}`)
      console.error('Analytics dashboard error:', err)
      
      // If it's a table doesn't exist error, show helpful message
      if (errorMessage.includes('table') || errorMessage.includes('migration')) {
        setError('Analytics tables not found. Please run migrations: bundle exec rails db:migrate')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(value)
  }

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`
  }

  if (loading) {
    return <div className="analytics-dashboard loading">Loading analytics...</div>
  }

  if (error) {
    return (
      <div className="analytics-dashboard error">
        <div className="error-message">{error}</div>
        <button onClick={loadDashboard} className="retry-button">Retry</button>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="analytics-dashboard">
        <div>No analytics data available</div>
        <button onClick={loadDashboard} className="retry-button">Load Dashboard</button>
      </div>
    )
  }

  const { metrics, costs, recent_events } = dashboardData

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h2>Analytics Dashboard</h2>
        <div className="date-range-selector">
          <label>
            Start Date:
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            />
          </label>
          <label>
            End Date:
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'engagement' ? 'active' : ''}
          onClick={() => setActiveTab('engagement')}
        >
          Engagement
        </button>
        <button
          className={activeTab === 'learning' ? 'active' : ''}
          onClick={() => setActiveTab('learning')}
        >
          Learning
        </button>
        <button
          className={activeTab === 'retention' ? 'active' : ''}
          onClick={() => setActiveTab('retention')}
        >
          Retention
        </button>
        <button
          className={activeTab === 'costs' ? 'active' : ''}
          onClick={() => setActiveTab('costs')}
        >
          Costs
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="dashboard-content">
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>Daily Active Users</h3>
              <div className="metric-value">{metrics?.engagement?.dau || 0}</div>
            </div>
            <div className="metric-card">
              <h3>Weekly Active Users</h3>
              <div className="metric-value">{metrics?.engagement?.wau || 0}</div>
            </div>
            <div className="metric-card">
              <h3>Monthly Active Users</h3>
              <div className="metric-value">{metrics?.engagement?.mau || 0}</div>
            </div>
            <div className="metric-card">
              <h3>Practice Completion Rate</h3>
              <div className="metric-value">
                {formatPercentage(metrics?.learning?.practice_completion_rate || 0)}
              </div>
            </div>
            <div className="metric-card">
              <h3>Practice Accuracy Rate</h3>
              <div className="metric-value">
                {formatPercentage(metrics?.learning?.practice_accuracy_rate || 0)}
              </div>
            </div>
            <div className="metric-card">
              <h3>Total Cost</h3>
              <div className="metric-value">{formatCurrency(costs?.total || 0)}</div>
            </div>
          </div>

          <div className="recent-events-section">
            <h3>Recent Events</h3>
            <div className="events-list">
              {recent_events && recent_events.length > 0 ? (
                recent_events.map((event) => (
                  <div key={event.id} className="event-item">
                    <span className="event-type">{event.event_type}</span>
                    <span className="event-category">{event.event_category}</span>
                    <span className="event-time">
                      {new Date(event.occurred_at).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div>No recent events</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'engagement' && (
        <div className="dashboard-content">
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>Daily Active Users</h3>
              <div className="metric-value">{metrics?.engagement?.dau || 0}</div>
            </div>
            <div className="metric-card">
              <h3>Weekly Active Users</h3>
              <div className="metric-value">{metrics?.engagement?.wau || 0}</div>
            </div>
            <div className="metric-card">
              <h3>Monthly Active Users</h3>
              <div className="metric-value">{metrics?.engagement?.mau || 0}</div>
            </div>
            <div className="metric-card">
              <h3>Chat Frequency</h3>
              <div className="metric-value">
                {metrics?.engagement?.chat_frequency?.toFixed(2) || 0} messages/student/day
              </div>
            </div>
            <div className="metric-card">
              <h3>Practice Frequency</h3>
              <div className="metric-value">
                {metrics?.engagement?.practice_frequency?.toFixed(2) || 0} problems/student/day
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'learning' && (
        <div className="dashboard-content">
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>Practice Completion Rate</h3>
              <div className="metric-value">
                {formatPercentage(metrics?.learning?.practice_completion_rate || 0)}
              </div>
            </div>
            <div className="metric-card">
              <h3>Practice Accuracy Rate</h3>
              <div className="metric-value">
                {formatPercentage(metrics?.learning?.practice_accuracy_rate || 0)}
              </div>
            </div>
            <div className="metric-card">
              <h3>Average Difficulty Level</h3>
              <div className="metric-value">
                {metrics?.learning?.average_difficulty_level?.toFixed(1) || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'retention' && (
        <div className="dashboard-content">
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>Goal Suggestion Acceptance Rate</h3>
              <div className="metric-value">
                {formatPercentage(metrics?.retention?.goal_suggestion_acceptance_rate || 0)}
              </div>
            </div>
            <div className="metric-card">
              <h3>Nudge Conversion Rate</h3>
              <div className="metric-value">
                {formatPercentage(metrics?.retention?.nudge_conversion_rate || 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'costs' && (
        <div className="dashboard-content">
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>Total Cost</h3>
              <div className="metric-value">{formatCurrency(costs?.total || 0)}</div>
            </div>
            {costs?.average_cost_per_student && (
              <div className="metric-card">
                <h3>Average Cost per Student</h3>
                <div className="metric-value">
                  {formatCurrency(costs.average_cost_per_student)}
                </div>
              </div>
            )}
          </div>

          {costs?.breakdown && (
            <div className="cost-breakdown">
              <h3>Cost Breakdown</h3>
              <div className="breakdown-list">
                {Object.entries(costs.breakdown.breakdown || {}).map(([type, cost]) => (
                  <div key={type} className="breakdown-item">
                    <span className="cost-type">{type.replace('_', ' ')}</span>
                    <span className="cost-value">{formatCurrency(cost)}</span>
                    <span className="cost-percentage">
                      ({costs.breakdown.by_percentage[type]?.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AnalyticsDashboard

