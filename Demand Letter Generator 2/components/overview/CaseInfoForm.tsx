'use client'

import { useState, useEffect } from 'react'

export interface CaseInfo {
  claimNumber?: string
  insured?: string
  dateOfLoss?: string
  client?: string
  adjuster?: string
  dateOfLetter?: string
  target?: string
}

interface CaseInfoFormProps {
  initialData?: CaseInfo
  onChange: (data: CaseInfo) => void
  onSave: (data: CaseInfo) => Promise<void>
}

export default function CaseInfoForm({ initialData, onChange, onSave }: CaseInfoFormProps) {
  const [formData, setFormData] = useState<CaseInfo>(initialData || {})
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData])

  const handleChange = (field: keyof CaseInfo, value: string) => {
    const updated = { ...formData, [field]: value }
    setFormData(updated)
    onChange(updated)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(formData)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Failed to save case info:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Case Information</h3>
        {lastSaved && (
          <span className="text-sm text-gray-500">
            Saved {lastSaved.toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="claimNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Claim Number *
          </label>
          <input
            id="claimNumber"
            type="text"
            value={formData.claimNumber || ''}
            onChange={(e) => handleChange('claimNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
            placeholder="KWT-2024-001334589777000"
          />
        </div>

        <div>
          <label htmlFor="insured" className="block text-sm font-medium text-gray-700 mb-1">
            Your Insured *
          </label>
          <input
            id="insured"
            type="text"
            value={formData.insured || ''}
            onChange={(e) => handleChange('insured', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
            placeholder="Betty Roy"
          />
        </div>

        <div>
          <label htmlFor="dateOfLoss" className="block text-sm font-medium text-gray-700 mb-1">
            Date of Loss *
          </label>
          <input
            id="dateOfLoss"
            type="date"
            value={formData.dateOfLoss || ''}
            onChange={(e) => handleChange('dateOfLoss', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
          />
        </div>

        <div>
          <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">
            Our Client *
          </label>
          <input
            id="client"
            type="text"
            value={formData.client || ''}
            onChange={(e) => handleChange('client', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
            placeholder="Ricarda Deckard-Dos"
          />
        </div>

        <div>
          <label htmlFor="adjuster" className="block text-sm font-medium text-gray-700 mb-1">
            Adjuster Name
          </label>
          <input
            id="adjuster"
            type="text"
            value={formData.adjuster || ''}
            onChange={(e) => handleChange('adjuster', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
            placeholder="Edward Gaff"
          />
        </div>

        <div>
          <label htmlFor="target" className="block text-sm font-medium text-gray-700 mb-1">
            Target/Recipient *
          </label>
          <input
            id="target"
            type="text"
            value={formData.target || ''}
            onChange={(e) => handleChange('target', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
            placeholder="Insurance Company Name"
          />
        </div>

        <div>
          <label htmlFor="dateOfLetter" className="block text-sm font-medium text-gray-700 mb-1">
            Date of Letter
          </label>
          <input
            id="dateOfLetter"
            type="date"
            value={formData.dateOfLetter || new Date().toISOString().split('T')[0]}
            onChange={(e) => handleChange('dateOfLetter', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-forest-500 text-white rounded-md hover:bg-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Case Information'}
        </button>
      </div>
    </div>
  )
}

