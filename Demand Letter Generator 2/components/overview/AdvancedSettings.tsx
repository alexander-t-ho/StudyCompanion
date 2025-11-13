'use client'

import { useState } from 'react'
import { Settings, ChevronDown, ChevronUp } from 'lucide-react'

interface AdvancedSettingsProps {
  documentId: string
  metadata: any
  onSave: (settings: any) => Promise<void>
}

export default function AdvancedSettings({
  documentId,
  metadata,
  onSave,
}: AdvancedSettingsProps) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    dateOfLetter: metadata?.dateOfLetter || new Date().toISOString().split('T')[0],
    // Add more advanced settings here
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(settings)
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-white hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">Advanced Settings</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      {expanded && (
        <div className="p-4 space-y-4 border-t border-gray-800">
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Date of Letter
            </label>
            <input
              type="date"
              value={settings.dateOfLetter}
              onChange={(e) => setSettings({ ...settings, dateOfLetter: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Defaults to current date
            </p>
          </div>
          {/* Add more advanced settings here */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-forest-500 text-white rounded-md hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

