'use client'

import { useState, useEffect } from 'react'
import { Undo2, Redo2 } from 'lucide-react'

interface UndoRedoButtonsProps {
  documentId: string
  onUndo?: () => void
  onRedo?: () => void
}

export default function UndoRedoButtons({
  documentId,
  onUndo,
  onRedo,
}: UndoRedoButtonsProps) {
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [currentVersion, setCurrentVersion] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadStatus()
    // Poll for status updates every 2 seconds
    const interval = setInterval(loadStatus, 2000)
    return () => clearInterval(interval)
  }, [documentId])

  const loadStatus = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}/versions/status`)
      if (response.ok) {
        const data = await response.json()
        setCanUndo(data.canUndo)
        setCanRedo(data.canRedo)
        setCurrentVersion(data.currentVersion)
      }
    } catch (error) {
      console.error('Failed to load version status:', error)
    }
  }

  const handleUndo = async () => {
    if (!canUndo || loading) return

    setLoading(true)
    try {
      const response = await fetch(`/api/documents/${documentId}/undo`, {
        method: 'POST',
      })

      if (response.ok) {
        await loadStatus()
        if (onUndo) onUndo()
        // Reload document
        window.location.reload()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to undo')
      }
    } catch (error) {
      console.error('Undo error:', error)
      alert('Failed to undo. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRedo = async () => {
    if (!canRedo || loading) return

    setLoading(true)
    try {
      const response = await fetch(`/api/documents/${documentId}/redo`, {
        method: 'POST',
      })

      if (response.ok) {
        await loadStatus()
        if (onRedo) onRedo()
        // Reload document
        window.location.reload()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to redo')
      }
    } catch (error) {
      console.error('Redo error:', error)
      alert('Failed to redo. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canUndo, canRedo, loading])

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleUndo}
        disabled={!canUndo || loading}
        className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title={`Undo (Ctrl+Z) - Version ${currentVersion}`}
      >
        <Undo2 className="w-5 h-5" />
      </button>
      <button
        onClick={handleRedo}
        disabled={!canRedo || loading}
        className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title={`Redo (Ctrl+Y) - Version ${currentVersion}`}
      >
        <Redo2 className="w-5 h-5" />
      </button>
    </div>
  )
}

