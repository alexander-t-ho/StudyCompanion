import api from './api'

export const sessionsApi = {
  // Get all sessions for a student
  getSessions: (studentId) => {
    return api.get('/sessions', {
      params: { student_id: studentId }
    })
  },

  // Get a specific session
  getSession: (sessionId, studentId) => {
    return api.get(`/sessions/${sessionId}`, {
      params: { student_id: studentId }
    })
  },

  // Create a new session
  createSession: (studentId, sessionData) => {
    return api.post('/sessions', {
      student_id: studentId,
      ...sessionData
    })
  },

  // Update a session
  updateSession: (sessionId, studentId, sessionData) => {
    return api.patch(`/sessions/${sessionId}`, {
      student_id: studentId,
      ...sessionData
    })
  },

  // Cancel a session
  cancelSession: (sessionId, studentId) => {
    return api.delete(`/sessions/${sessionId}`, {
      params: { student_id: studentId }
    })
  }
}

