import api from './api'

export const profileApi = {
  getProfile: () => api.get('/profile'),
  
  updateProfile: (profileData) => {
    return api.patch('/profile', { profile: profileData })
  },
  
  changePassword: (currentPassword, newPassword) => {
    return api.patch('/profile/change_password', {
      current_password: currentPassword,
      new_password: newPassword
    })
  }
}

export default profileApi

