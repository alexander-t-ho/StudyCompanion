import api from './api'

export const studentDashboardApi = {
  // Get all subjects with mastery levels
  getDashboard: (studentId) => 
    api.get('/student/dashboard', {
      params: { student_id: studentId }
    }),

  // Get detailed subject view with mastery, sessions, goals, and learning concepts
  getSubjectDetail: (studentId, subject) => 
    api.get(`/student/dashboard/subjects/${encodeURIComponent(subject)}`, {
      params: { student_id: studentId }
    }),

  // Get sessions for a specific subject
  getSubjectSessions: (studentId, subject) => 
    api.get('/ai_companion/session-summaries', {
      params: { 
        student_id: studentId,
        subject: subject
      }
    }),

  // Get all sessions across all subjects (optimized - single API call)
  getAllSessions: (studentId) =>
    api.get('/student/dashboard/all-sessions', {
      params: { student_id: studentId }
    })
}

export default studentDashboardApi


