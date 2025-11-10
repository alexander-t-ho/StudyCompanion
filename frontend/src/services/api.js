import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  params: {}
})

// Add interceptor to include auth token and student_id
api.interceptors.request.use((config) => {
  // Add auth token if available
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  
  // Skip adding student_id for auth endpoints (login/logout)
  const isAuthEndpoint = config.url && (
    config.url.includes('/auth/login') || 
    config.url.includes('/auth/logout')
  )
  
  if (isAuthEndpoint) {
    return config
  }
  
  // Get student_id from params, current_user, or headers
  let studentId = config.params?.student_id || 
                  (config.headers && config.headers['X-Student-Id'])
  
  // If not in params or headers, try to get from authenticated user
  if (!studentId) {
    const currentUserStr = localStorage.getItem('current_user')
    if (currentUserStr) {
      try {
        const currentUser = JSON.parse(currentUserStr)
        studentId = currentUser?.id
      } catch (e) {
        console.error('Failed to parse current_user from localStorage:', e)
      }
    }
  }
  
  // Only add student_id if we have one and it's not already in params
  if (studentId && !config.params?.student_id) {
    if (!config.params) {
      config.params = {}
    }
    config.params.student_id = studentId
  }
  
  // Add to headers for retention endpoints
  if (studentId && config.url && config.url.includes('/retention/')) {
    config.headers['X-Student-Id'] = studentId
  }
  
  return config
})

export const transcriptsAPI = {
  list: () => api.get('/transcripts'),
  get: (id) => api.get(`/transcripts/${id}`),
  create: (data, apiKey, useOpenRouter) => {
    const payload = {
      transcript: data,
      api_key: apiKey || undefined,
      use_openrouter: useOpenRouter || false
    }
    return api.post('/transcripts', payload)
  },
  validate: (id, data) => api.post(`/transcripts/${id}/validate`, data),
  analyze: (id, apiKey, useOpenRouter) => {
    const payload = {
      api_key: apiKey,
      use_openrouter: useOpenRouter
    }
    return api.post(`/transcripts/${id}/analyze`, payload)
  },
  generateRandomFields: (subject, topic, studentLevel, apiKey, useOpenRouter) => {
    const payload = {
      subject: subject,
      topic: topic,
      student_level: studentLevel,
      api_key: apiKey || undefined,
      use_openrouter: useOpenRouter || false
    }
    return api.post('/transcripts/generate_random_fields', payload)
  },
  generateRandomTopic: (subject, studentLevel, apiKey, useOpenRouter) => {
    const payload = {
      subject: subject,
      student_level: studentLevel,
      api_key: apiKey || undefined,
      use_openrouter: useOpenRouter || false
    }
    return api.post('/transcripts/generate_random_topic', payload)
  }
}

export const analysesAPI = {
  get: (id) => api.get(`/transcript_analyses/${id}`),
  update: (id, data) => api.put(`/transcript_analyses/${id}`, { transcript_analysis: data }),
  validate: (id, data) => api.post(`/transcript_analyses/${id}/validate`, data)
}

export default api

