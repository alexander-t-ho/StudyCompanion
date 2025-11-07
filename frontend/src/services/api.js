import axios from 'axios'

const API_BASE_URL = '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  params: {}
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
  }
}

export const analysesAPI = {
  get: (id) => api.get(`/transcript_analyses/${id}`),
  update: (id, data) => api.put(`/transcript_analyses/${id}`, { transcript_analysis: data }),
  validate: (id, data) => api.post(`/transcript_analyses/${id}/validate`, data)
}

export default api

