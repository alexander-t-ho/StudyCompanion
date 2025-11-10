import api from './api'

export const aiCompanionApi = {
  // Chat
  sendMessage: (message, context = {}, images = [], apiKey = null, useOpenRouter = false) => {
    const payload = { 
      message, 
      context,
      practice_problem_id: context.practice_problem_id,
      subject: context.subject,
      session_id: context.session_id,
      session_context: context.session_context,
      is_homework_help: context.is_homework_help || false
    }
    
    // Add images if provided
    if (images && images.length > 0) {
      payload.images = images
    }
    
    // Add API keys if provided
    if (apiKey) {
      payload.api_key = apiKey
    }
    if (useOpenRouter !== undefined && useOpenRouter !== null) {
      payload.use_openrouter = useOpenRouter
    }
    
    return api.post('/ai_companion/chat', payload)
  },
  
  getConversationHistory: (practiceProblemId = null, subject = null, sessionId = null) => {
    const params = {}
    if (practiceProblemId) {
      params.practice_problem_id = practiceProblemId
    }
    if (subject) {
      params.subject = subject
    }
    if (sessionId) {
      params.session_id = sessionId
    }
    return api.get('/ai_companion/conversation-history', { params })
  },
  
  // Practice
  generatePractice: (subject, topic, difficulty, goalId, apiKey, useOpenRouter, sessionId = null) => 
    api.post('/ai_companion/practice/generate', { 
      subject, 
      topic, 
      difficulty,
      goal_id: goalId,
      session_id: sessionId,
      api_key: apiKey,
      use_openrouter: useOpenRouter
    }),
  
  getPracticeList: (studentId, params = {}) => {
    const queryParams = { 
      student_id: studentId || localStorage.getItem('student_id') || '1',
      ...params
    }
    return api.get('/ai_companion/practice/list', { params: queryParams })
  },
  
  getAvailableSubjects: () => 
    api.get('/ai_companion/practice/available-subjects'),
  
  getPractice: (id) => 
    api.get(`/ai_companion/practice/${id}`),
  
  submitPractice: (id, answer, apiKey, useOpenRouter) => 
    api.post(`/ai_companion/practice/${id}/submit`, { 
      answer,
      api_key: apiKey,
      use_openrouter: useOpenRouter
    }),
  
  // Profile
  getProfile: () => 
    api.get('/ai_companion/profile'),
  
  updateProfile: (profileData) => 
    api.patch('/ai_companion/profile', { profile: profileData }),
  
  // Session Summaries
  getSessionSummaries: () => 
    api.get('/ai_companion/session-summaries'),
  
  getSessionSummary: (id) => 
    api.get(`/ai_companion/session-summaries/${id}`),
  
  // Routing
  checkRouting: (conversationId, apiKey, useOpenRouter) => 
    api.post('/ai_companion/routing/check', { 
      conversation_id: conversationId,
      api_key: apiKey,
      use_openrouter: useOpenRouter
    }),
  
  requestRouting: (data, apiKey, useOpenRouter) => 
    api.post('/ai_companion/routing/request', {
      ...data,
      api_key: apiKey,
      use_openrouter: useOpenRouter
    })
}

export default aiCompanionApi

