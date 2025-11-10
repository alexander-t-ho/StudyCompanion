import React from 'react'
import './CircularProgress.css'

function CircularProgress({ percentage, size = 120, strokeWidth = 8, showLabel = true }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="circular-progress-container" style={{ width: size, height: size }}>
      <svg className="circular-progress" width={size} height={size}>
        {/* Background circle */}
        <circle
          className="circular-progress-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          className="circular-progress-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {showLabel && (
        <div className="circular-progress-label">
          <span className="circular-progress-percentage">{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  )
}

export default CircularProgress


