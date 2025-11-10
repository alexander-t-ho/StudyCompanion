import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { profileApi } from '../services/profileApi'
import './Profile.css'

function Profile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '' })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const response = await profileApi.getProfile()
      setProfile(response.data.student)
      setStats(response.data.statistics)
      setFormData({
        name: response.data.student.name || '',
        email: response.data.student.email || ''
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const response = await profileApi.updateProfile(formData)
      setProfile(response.data.student)
      setEditMode(false)
    } catch (err) {
      setError(err.response?.data?.errors?.join(', ') || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    try {
      await profileApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      setPasswordSuccess('Password changed successfully')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Failed to change password')
    }
  }

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-text">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <button className="profile-back-button" onClick={() => navigate('/main')}>
            ← Back to Dashboard
          </button>
          <h1 className="profile-title">Profile</h1>
        </div>

        {error && <div className="profile-error">{error}</div>}

        <div className="profile-section">
          <div className="section-header">
            <h2>Personal Information</h2>
            {!editMode && (
              <button className="edit-button" onClick={() => setEditMode(true)}>
                Edit
              </button>
            )}
          </div>

          {editMode ? (
            <form onSubmit={handleUpdateProfile} className="profile-form">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="save-button" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setEditMode(false)
                    setFormData({
                      name: profile.name || '',
                      email: profile.email || ''
                    })
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-info">
              <div className="info-item">
                <span className="info-label">Name:</span>
                <span className="info-value">{profile?.name || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{profile?.email || 'N/A'}</span>
              </div>
            </div>
          )}
        </div>

        <div className="profile-section">
          <h2>Change Password</h2>
          <form onSubmit={handleChangePassword} className="profile-form">
            {passwordError && <div className="profile-error">{passwordError}</div>}
            {passwordSuccess && <div className="profile-success">{passwordSuccess}</div>}

            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="save-button">
              Change Password
            </button>
          </form>
        </div>

        {stats && (
          <div className="profile-section">
            <h2>Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats.total_subjects}</div>
                <div className="stat-label">Total Subjects</div>
              </div>

              <div className="stat-card">
                <div className="stat-value">{stats.sessions_this_week}</div>
                <div className="stat-label">Sessions This Week</div>
              </div>
            </div>

            {stats.sessions_per_subject && Object.keys(stats.sessions_per_subject).length > 0 && (
              <div className="sessions-per-subject">
                <h3>Sessions per Subject</h3>
                <div className="sessions-list">
                  {Object.entries(stats.sessions_per_subject).map(([subject, count]) => (
                    <div key={subject} className="session-item">
                      <span className="session-subject">{subject}</span>
                      <span className="session-count">{count} session{count !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile

