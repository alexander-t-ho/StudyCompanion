import api from './api'

export const adminApi = {
  getStudents: () => api.get('/admin/students'),
  
  getStudent: (studentId) => api.get(`/admin/students/${studentId}`),
  
  getStudyNotes: (studentId = null) => {
    const params = studentId ? { student_id: studentId } : {}
    return api.get('/admin/study_notes', { params })
  },
  
  updateStudyNote: (noteId, data) => {
    return api.patch(`/admin/study_notes/${noteId}`, { study_note: data })
  }
}

export default adminApi

