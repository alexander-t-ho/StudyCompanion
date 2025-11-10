import api from './api'

export const analyticsApi = {
  // Dashboard
  getDashboard: (startDate, endDate, studentId) => 
    api.get('/analytics/dashboard', {
      params: {
        start_date: startDate,
        end_date: endDate,
        student_id: studentId
      }
    }),
  
  // Metrics
  getMetricsSummary: (startDate, endDate, studentId) => 
    api.get('/analytics/metrics/summary', {
      params: {
        start_date: startDate,
        end_date: endDate,
        student_id: studentId
      }
    }),
  
  getMetric: (metricName, startDate, endDate, studentId, period = 'daily') => 
    api.get(`/analytics/metrics/${metricName}`, {
      params: {
        start_date: startDate,
        end_date: endDate,
        student_id: studentId,
        period: period
      }
    }),
  
  calculateMetrics: (date) => 
    api.post('/analytics/metrics/calculate', {
      date: date
    }),
  
  // Events
  getEvents: (startDate, endDate, eventType, eventCategory, limit) => 
    api.get('/analytics/events', {
      params: {
        start_date: startDate,
        end_date: endDate,
        event_type: eventType,
        event_category: eventCategory,
        limit: limit
      }
    }),
  
  trackEvent: (eventType, properties, sessionId) => 
    api.post('/analytics/events', {
      event_type: eventType,
      properties: properties || {},
      session_id: sessionId
    }),
  
  // Costs
  getCostsSummary: (startDate, endDate, studentId) => 
    api.get('/analytics/costs/summary', {
      params: {
        start_date: startDate,
        end_date: endDate,
        student_id: studentId
      }
    }),
  
  getCostTrends: (startDate, endDate, studentId, costType) => 
    api.get('/analytics/costs/trends', {
      params: {
        start_date: startDate,
        end_date: endDate,
        student_id: studentId,
        cost_type: costType
      }
    }),
  
  getCostProjections: (currentStudents, targetStudents, month) => 
    api.get('/analytics/costs/projections', {
      params: {
        current_students: currentStudents,
        target_students: targetStudents,
        month: month
      }
    })
}

export default analyticsApi


