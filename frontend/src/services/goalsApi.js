import api from './api'

export const goalsApi = {
  // Get all goals with optional filtering
  getGoals: (studentId, filters = {}) => {
    const params = { student_id: studentId, ...filters }
    return api.get('/goals', { params })
  },

  // Get long-term goals grouped by subject
  getLongTermGoals: (studentId) => 
    api.get('/goals', {
      params: { 
        student_id: studentId,
        goal_type: 'long_term',
        group_by: 'subject'
      }
    }),

  // Get short-term goals for a subject (optionally filtered by parent goal)
  getShortTermGoals: (studentId, subject, parentGoalId = null) => {
    const params = { 
      student_id: studentId,
      goal_type: 'short_term',
      subject: subject
    }
    if (parentGoalId) {
      params.parent_goal_id = parentGoalId
    }
    return api.get('/goals', { params })
  },

  // Get goal suggestions
  getGoalSuggestions: (studentId, subject = null) => {
    const params = { student_id: studentId }
    if (subject) {
      params.subject = subject
    }
    return api.get('/goals/suggestions', { params })
  },

  // Get a single goal
  getGoal: (studentId, goalId) =>
    api.get(`/goals/${goalId}`, {
      params: { student_id: studentId }
    }),

  // Create a new goal
  createGoal: (studentId, goalData) =>
    api.post('/goals', {
      goal: goalData
    }, {
      params: { student_id: studentId }
    }),

  // Update a goal
  updateGoal: (studentId, goalId, goalData) =>
    api.put(`/goals/${goalId}`, {
      goal: goalData
    }, {
      params: { student_id: studentId }
    }),

  // Delete a goal
  deleteGoal: (studentId, goalId) =>
    api.delete(`/goals/${goalId}`, {
      params: { student_id: studentId }
    }),

  // Recalculate progress for a long-term goal
  recalculateProgress: (studentId, goalId) =>
    api.post(`/goals/${goalId}/recalculate_progress`, {}, {
      params: { student_id: studentId }
    }),

  // Get long-term goals from student dashboard endpoint
  getLongTermGoalsFromDashboard: (studentId) =>
    api.get('/student/dashboard/long-term-goals', {
      params: { student_id: studentId }
    })
}

export default goalsApi


