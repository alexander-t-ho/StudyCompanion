import api from './api'

export const retentionApi = {
  // Goal Suggestions
  getGoalSuggestions: (goalId) => 
    api.get(`/api/v1/retention/goal-suggestions/${goalId}`),
  
  acceptGoalSuggestion: (suggestionId) => 
    api.post(`/api/v1/retention/goal-suggestions/${suggestionId}/accept`),
  
  // Nudges
  checkNudgeEligibility: () => 
    api.get('/api/v1/retention/nudges/eligibility'),
  
  sendNudge: (data) => 
    api.post('/api/v1/retention/nudges/send', data),
  
  // Progress Dashboard
  getProgressDashboard: () => 
    api.get('/api/v1/retention/progress-dashboard'),
  
  getProgressInsights: () => 
    api.get('/api/v1/retention/progress-dashboard/insights')
}

export default retentionApi

