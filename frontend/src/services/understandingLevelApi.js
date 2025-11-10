import api from './api'

export const understandingLevelApi = {
  // Get all understanding levels for a student
  getAllLevels: (studentId, subject = null) => {
    const params = subject ? { subject } : {}
    return api.get(`/students/${studentId}/understanding-levels`, { params })
  },

  // Get summary statistics
  getSummary: (studentId) => {
    return api.get(`/students/${studentId}/understanding-levels/summary`)
  },

  // Get progression for a specific subject
  getProgression: (studentId, subject) => {
    return api.get(`/students/${studentId}/understanding-levels/${subject}/progression`)
  },

  // Get all subjects summary
  getAllSubjects: (studentId) => {
    return api.get(`/students/${studentId}/understanding-levels/all-subjects`)
  }
}


