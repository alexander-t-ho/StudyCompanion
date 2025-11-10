import api from './api'

export const retentionApi = {
  // Goal Suggestions
  getGoalSuggestions: (goalId) => 
    api.get(`/retention/goal-suggestions/${goalId}`),
  
  acceptGoalSuggestion: (suggestionId) => 
    api.post(`/retention/goal-suggestions/${suggestionId}/accept`),
  
  // Nudges
  getNudges: () => 
    api.get('/retention/nudges'),
  
  checkNudgeEligibility: () => 
    api.get('/retention/nudges/eligibility'),
  
  sendNudge: (data) => 
    api.post('/retention/nudges/send', data),
  
  markNudgeOpened: (nudgeId) => 
    api.post(`/retention/nudges/${nudgeId}/mark-opened`),
  
  markNudgeClicked: (nudgeId) => 
    api.post(`/retention/nudges/${nudgeId}/mark-clicked`),
  
  // Progress Dashboard
  getProgressDashboard: () => 
    api.get('/retention/progress-dashboard'),
  
  getProgressInsights: () => 
    api.get('/retention/progress-dashboard/insights'),
  
  // Nudge Analytics
  getNudgeAnalytics: () => 
    api.get('/retention/nudge-analytics'),
  
  // Progress History
  getProgressHistory: (goalId = null) => 
    goalId 
      ? api.get(`/retention/progress-history/${goalId}`)
      : api.get('/retention/progress-history')
}

export default retentionApi

