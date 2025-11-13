'use client'

import { useState, useEffect } from 'react'

interface StrategicPositioningProps {
  initialValue?: string
  onChange: (value: string) => void
  onSave: (value: string) => Promise<void>
}

export default function StrategicPositioning({
  initialValue,
  onChange,
  onSave,
}: StrategicPositioningProps) {
  const [value, setValue] = useState(initialValue || '')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  useEffect(() => {
    if (initialValue !== undefined) {
      setValue(initialValue)
    }
  }, [initialValue])

  const handleChange = (newValue: string) => {
    setValue(newValue)
    onChange(newValue)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(value)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Failed to save strategic positioning:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Strategic Positioning</h3>
        {lastSaved && (
          <span className="text-sm text-gray-500">
            Saved {lastSaved.toLocaleTimeString()}
          </span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        rows={4}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
        placeholder="Enter strategic notes and case positioning..."
      />
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-forest-500 text-white rounded-md hover:bg-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

