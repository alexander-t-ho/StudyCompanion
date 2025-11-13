'use client'

interface CircularProgressProps {
  percentage: number
  currentSection?: string
  size?: number
  strokeWidth?: number
}

export default function CircularProgress({
  percentage,
  currentSection,
  size = 60,
  strokeWidth = 6,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="text-forest-500 transition-all duration-300 ease-in-out"
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-forest-600">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      {/* Current section name */}
      {currentSection && (
        <div className="text-xs text-gray-600 text-center max-w-[200px]">
          {currentSection}
        </div>
      )}
    </div>
  )
}

