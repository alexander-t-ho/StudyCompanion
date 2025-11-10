import React from 'react'
import { motion } from 'framer-motion'
import './ShortTermGoalCard.css'

function ShortTermGoalCard({ goal, onComplete, onEdit, onDelete }) {
  const getStatusIcon = () => {
    switch (goal.status) {
      case 'completed':
        return '✅'
      case 'active':
        return '🔄'
      case 'paused':
        return '⏸️'
      default:
        return '⏳'
    }
  }

  const getStatusColor = () => {
    switch (goal.status) {
      case 'completed':
        return '#10b981'
      case 'active':
        return '#3b82f6'
      case 'paused':
        return '#f59e0b'
      default:
        return '#6b7280'
    }
  }

  return (
    <motion.div
      className="short-term-goal-card"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.3 }}
    >
      <div className="short-term-goal-header">
        <div className="short-term-goal-status">
          <span className="status-icon">{getStatusIcon()}</span>
          <span 
            className="status-badge"
            style={{ color: getStatusColor() }}
          >
            {goal.status}
          </span>
        </div>
        {goal.parent_goal && (
          <div className="parent-goal-link">
            Part of: <strong>{goal.parent_goal.title}</strong>
          </div>
        )}
      </div>

      <h4 className="short-term-goal-title">{goal.title}</h4>
      
      {goal.description && (
        <p className="short-term-goal-description">{goal.description}</p>
      )}

      {goal.progress_percentage > 0 && (
        <div className="short-term-goal-progress">
          <div className="short-term-progress-bar">
            <motion.div
              className="short-term-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${goal.progress_percentage}%` }}
              transition={{ duration: 0.5 }}
              style={{ backgroundColor: getStatusColor() }}
            />
          </div>
          <span className="short-term-progress-text">{goal.progress_percentage}%</span>
        </div>
      )}

      <div className="short-term-goal-actions">
        {goal.status !== 'completed' && onComplete && (
          <button
            className="action-button complete-button"
            onClick={() => onComplete(goal.id)}
          >
            Mark Complete
          </button>
        )}
        {onEdit && (
          <button
            className="action-button edit-button"
            onClick={() => onEdit(goal)}
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            className="action-button delete-button"
            onClick={() => onDelete(goal.id)}
          >
            Delete
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default ShortTermGoalCard


