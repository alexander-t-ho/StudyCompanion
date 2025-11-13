import api from './api'

export const authApi = {
  login: async (username, password) => {
    try {
      const response = await api.post('/auth/login', {
        username,
        password
      })
      
      if (response.data && response.data.token) {
        localStorage.setItem('auth_token', response.data.token)
        localStorage.setItem('current_user', JSON.stringify(response.data.student))
        return response.data
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      // Log the full error for debugging
      console.error('Login error:', error)
      console.error('Error response:', error.response)
      
      // Re-throw with a more user-friendly message
      if (error.response) {
        // Server responded with error
        throw error
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('Unable to connect to server. Please check your connection.')
      } else {
        // Something else happened
        throw new Error('An unexpected error occurred. Please try again.')
      }
    }
  },

  logout: async () => {
    // Always clear localStorage, even if API call fails
    localStorage.removeItem('auth_token')
    localStorage.removeItem('current_user')
    
    // Try to call backend logout (but don't wait for it)
    try {
      await api.post('/auth/logout')
    } catch (err) {
      // Ignore errors - we've already cleared localStorage
    }
  },

  getCurrentUser: () => {
    try {
      const userStr = localStorage.getItem('current_user')
      if (!userStr) return null
      return JSON.parse(userStr)
    } catch (e) {
      // If JSON is corrupted, clear it and return null
      console.error('Failed to parse current_user from localStorage:', e)
      localStorage.removeItem('current_user')
      localStorage.removeItem('auth_token') // Also clear token since user data is invalid
      return null
    }
  },

  getToken: () => {
    return localStorage.getItem('auth_token')
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token')
  },

  isAdmin: () => {
    const user = authApi.getCurrentUser()
    return user && user.is_admin === true
  }
}

export default authApi

