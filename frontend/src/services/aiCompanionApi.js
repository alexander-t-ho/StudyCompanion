import api from './api'

export const aiCompanionApi = {
  // Chat
  sendMessage: (message, context = {}) => 
    api.post('/api/v1/ai_companion/chat', { message, context }),
  
  getConversationHistory: () => 
    api.get('/api/v1/ai_companion/conversation-history'),
  
  // Practice
  generatePractice: (subject, topic) => 
    api.post('/api/v1/ai_companion/practice/generate', { subject, topic }),
  
  getPracticeList: () => 
    api.get('/api/v1/ai_companion/practice/list'),
  
  getPractice: (id) => 
    api.get(`/api/v1/ai_companion/practice/${id}`),
  
  submitPractice: (id, answer) => 
    api.post(`/api/v1/ai_companion/practice/${id}/submit`, { answer }),
  
  // Profile
  getProfile: () => 
    api.get('/api/v1/ai_companion/profile'),
  
  updateProfile: (profileData) => 
    api.patch('/api/v1/ai_companion/profile', { profile: profileData }),
  
  // Session Summaries
  getSessionSummaries: () => 
    api.get('/api/v1/ai_companion/session-summaries'),
  
  getSessionSummary: (id) => 
    api.get(`/api/v1/ai_companion/session-summaries/${id}`),
  
  // Routing
  checkRouting: (conversationId) => 
    api.post('/api/v1/ai_companion/routing/check', { conversation_id: conversationId }),
  
  requestRouting: (data) => 
    api.post('/api/v1/ai_companion/routing/request', data)
}

export default aiCompanionApi

