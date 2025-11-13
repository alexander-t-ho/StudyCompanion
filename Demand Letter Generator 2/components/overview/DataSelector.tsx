'use client'

interface DataSelectorProps {
  label: string
  count: number
  selectedCount: number
  onSelect: () => void
  disabled?: boolean
}

export default function DataSelector({
  label,
  count,
  selectedCount,
  onSelect,
  disabled = false,
}: DataSelectorProps) {
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
      <div>
        <h4 className="font-medium text-gray-900">{label}</h4>
        <p className="text-sm text-gray-500">
          {count} available
          {selectedCount > 0 && (
            <span className="ml-2 text-forest-400">
              • {selectedCount} selected
            </span>
          )}
        </p>
      </div>
      <button
        onClick={onSelect}
        disabled={disabled || count === 0}
        className="px-4 py-2 text-sm font-medium text-forest-400 bg-forest-950 border border-forest-700 rounded-md hover:bg-forest-900 focus:outline-none focus:ring-2 focus:ring-forest-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Select
      </button>
    </div>
  )
}

