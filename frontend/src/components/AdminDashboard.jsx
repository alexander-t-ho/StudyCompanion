import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { adminApi } from '../services/adminApi'
import { authApi } from '../services/authApi'
import './AdminDashboard.css'

function AdminDashboard() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const userMenuRef = useRef(null)
  const navigate = useNavigate()
  
  useEffect(() => {
    setCurrentUser(authApi.getCurrentUser())
  }, [])
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      setLoading(true)
      const response = await adminApi.getStudents()
      setStudents(response.data.students || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const handleStudentClick = (studentId) => {
    navigate(`/admin/students/${studentId}`)
  }

  if (loading) {
    return (
      <div className="admin-dashboard-container">
        <div className="loading-text">Loading students...</div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard-container">
      <motion.div
        className="admin-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1>Nucleus</h1>
        <div className="welcome-user-wrapper-header" ref={userMenuRef}>
          <button 
            className="welcome-user-button-header"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            Welcome back {currentUser?.name || 'Admin'}
          </button>
          {showUserMenu && (
            <div className="user-menu-dropdown-header">
              <button className="user-menu-item-header" onClick={() => { setShowUserMenu(false); navigate('/profile'); }}>
                Profile
              </button>
              <button className="user-menu-item-header" onClick={() => { setShowUserMenu(false); navigate('/settings'); }}>
                Settings
              </button>
              <button 
                className="user-menu-item-header" 
                onClick={async (e) => { 
                  e.preventDefault()
                  e.stopPropagation()
                  setShowUserMenu(false)
                  localStorage.removeItem('auth_token')
                  localStorage.removeItem('current_user')
                  window.location.href = '/login'
                }}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {error && <div className="admin-error">{error}</div>}

      <div className="students-grid">
        {students.map((student, index) => (
          <motion.div
            key={student.id}
            className="student-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleStudentClick(student.id)}
          >
            <div className="student-card-header">
              <h3 className="student-name">{student.name || student.username}</h3>
              <div className="student-email">{student.email}</div>
            </div>

            <div className="student-stats">
              <div className="stat-item">
                <div className="stat-value">{student.stats?.total_subjects || 0}</div>
                <div className="stat-label">Subjects</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{student.stats?.total_sessions || 0}</div>
                <div className="stat-label">Total Sessions</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{student.stats?.sessions_this_week || 0}</div>
                <div className="stat-label">This Week</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{student.stats?.practice_problems_count || 0}</div>
                <div className="stat-label">Practice Problems</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {students.length === 0 && !loading && (
        <div className="empty-state">
          <p>No students found</p>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard

