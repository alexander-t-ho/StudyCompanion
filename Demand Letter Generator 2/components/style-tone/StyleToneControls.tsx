'use client'

import { useState } from 'react'

interface StyleToneControlsProps {
  documentId: string
  sourceDocumentId?: string
  onStyleChange?: (enabled: boolean) => void
  onToneChange?: (enabled: boolean) => void
  initialCopyStyle?: boolean
  initialMatchTone?: boolean
}

export default function StyleToneControls({
  documentId,
  sourceDocumentId,
  onStyleChange,
  onToneChange,
  initialCopyStyle = false,
  initialMatchTone = false,
}: StyleToneControlsProps) {
  const [copyStyle, setCopyStyle] = useState(initialCopyStyle)
  const [matchTone, setMatchTone] = useState(initialMatchTone)
  const [analyzing, setAnalyzing] = useState(false)

  const handleCopyStyleChange = async (enabled: boolean) => {
    setCopyStyle(enabled)
    onStyleChange?.(enabled)

    // If enabling and source document provided, analyze style
    if (enabled && sourceDocumentId) {
      setAnalyzing(true)
      try {
        await fetch('/api/analyze/style', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceDocumentId,
            documentId,
          }),
        })
      } catch (error) {
        console.error('Failed to analyze style:', error)
      } finally {
        setAnalyzing(false)
      }
    }
  }

  const handleMatchToneChange = async (enabled: boolean) => {
    setMatchTone(enabled)
    onToneChange?.(enabled)

    // If enabling and source document provided, analyze tone
    if (enabled && sourceDocumentId) {
      setAnalyzing(true)
      try {
        await fetch('/api/analyze/tone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceDocumentId,
            documentId,
          }),
        })
      } catch (error) {
        console.error('Failed to analyze tone:', error)
      } finally {
        setAnalyzing(false)
      }
    }
  }

  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-white">
      <h3 className="text-lg font-semibold text-gray-900">Style & Tone</h3>
      
      <div className="space-y-3">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={copyStyle}
            onChange={(e) => handleCopyStyleChange(e.target.checked)}
            disabled={analyzing || !sourceDocumentId}
            className="w-4 h-4 text-forest-500 border-gray-300 rounded focus:ring-forest-500"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-900">Copy Style</span>
            <p className="text-xs text-gray-500">
              Apply formatting and style from source document
            </p>
          </div>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={matchTone}
            onChange={(e) => handleMatchToneChange(e.target.checked)}
            disabled={analyzing || !sourceDocumentId}
            className="w-4 h-4 text-forest-500 border-gray-300 rounded focus:ring-forest-500"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-900">Match Tone</span>
            <p className="text-xs text-gray-500">
              Match writing tone and voice from source document
            </p>
          </div>
        </label>
      </div>

      {analyzing && (
        <p className="text-xs text-gray-500 italic">Analyzing document...</p>
      )}

      {!sourceDocumentId && (
        <p className="text-xs text-gray-500 italic">
          Upload a source document to enable style and tone analysis
        </p>
      )}
    </div>
  )
}

