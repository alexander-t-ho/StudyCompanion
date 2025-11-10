import React, { useState } from 'react'
import { motion } from 'framer-motion'
import './LongTermGoalCard.css'

function LongTermGoalCard({ goal, onExpand, onRecalculate }) {
  const [expanded, setExpanded] = useState(false)

  const handleExpand = () => {
    setExpanded(!expanded)
    if (onExpand) {
      onExpand(goal.id, !expanded)
    }
  }

  const progress = goal.progress_percentage || 0
  const childGoalsCount = goal.child_goals_count || 0

  return (
    <motion.div
      className="long-term-goal-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <div className="goal-card-header" onClick={handleExpand}>
        <div className="goal-card-title-section">
          <h3 className="goal-card-title">{goal.title}</h3>
          {goal.description && (
            <p className="goal-card-description">{goal.description}</p>
          )}
        </div>
        <div className="goal-card-meta">
          <div className="goal-progress-percentage">{progress}%</div>
          {childGoalsCount > 0 && (
            <div className="child-goals-badge">{childGoalsCount} short-term goals</div>
          )}
        </div>
      </div>

      <div className="goal-progress-section">
        <div className="goal-progress-bar">
          <motion.div
            className="goal-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              backgroundColor: progress >= 90 ? '#10b981' : progress >= 70 ? '#3b82f6' : progress >= 50 ? '#f59e0b' : '#ef4444'
            }}
          />
        </div>
        <div className="goal-progress-info">
          <span className="progress-label">Progress</span>
          {onRecalculate && (
            <button
              className="recalculate-button"
              onClick={(e) => {
                e.stopPropagation()
                onRecalculate(goal.id)
              }}
            >
              Recalculate
            </button>
          )}
        </div>
      </div>

      {goal.target_date && (
        <div className="goal-target-date">
          Target: {new Date(goal.target_date).toLocaleDateString()}
        </div>
      )}

      {expanded && childGoalsCount > 0 && (
        <div className="goal-card-expanded">
          <p className="expand-hint">Click to view short-term goals in subject detail</p>
        </div>
      )}
    </motion.div>
  )
}

export default LongTermGoalCard


