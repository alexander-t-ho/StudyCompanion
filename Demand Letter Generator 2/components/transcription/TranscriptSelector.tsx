'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface Transcription {
  id: string
  filename: string
  transcript: string
  duration?: number
  wordCount: number
  createdAt: string
}

interface TranscriptSelectorProps {
  documentId: string
  open: boolean
  onClose: () => void
  selectedIds: string[]
  onUpdate: (selectedIds: string[]) => Promise<void>
}

export default function TranscriptSelector({
  documentId,
  open,
  onClose,
  selectedIds: initialSelectedIds,
  onUpdate,
}: TranscriptSelectorProps) {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds))
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(initialSelectedIds))
      loadTranscriptions()
    }
  }, [open, documentId, initialSelectedIds])

  const loadTranscriptions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/documents/${documentId}/transcriptions`)
      const data = await response.json()
      if (data.transcriptions) {
        setTranscriptions(data.transcriptions)
      }
    } catch (error) {
      console.error('Failed to load transcriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedIds.size === transcriptions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(transcriptions.map((t) => t.id)))
    }
  }

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      await onUpdate(Array.from(selectedIds))
      onClose()
    } catch (error) {
      console.error('Failed to update transcriptions:', error)
    } finally {
      setUpdating(false)
    }
  }

  const allSelected = transcriptions.length > 0 && selectedIds.size === transcriptions.length

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden z-50 flex flex-col">
          <div className="flex items-center justify-between p-6 border-b">
            <Dialog.Title className="text-xl font-semibold">
              Select Transcriptions
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <span className="text-2xl">×</span>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <p className="text-gray-500 text-center py-8">Loading transcriptions...</p>
            ) : transcriptions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No transcriptions available. Upload media files to create transcriptions.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-forest-500 border-gray-300 rounded focus:ring-forest-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Select All</span>
                </div>
                {transcriptions.map((transcription) => (
                  <div
                    key={transcription.id}
                    className="flex items-start space-x-3 p-3 border border-gray-200 rounded hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(transcription.id)}
                      onChange={() => handleToggle(transcription.id)}
                      className="mt-1 w-4 h-4 text-forest-500 border-gray-300 rounded focus:ring-forest-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {transcription.filename}
                        </span>
                        <span className="text-xs text-gray-500">
                          {transcription.wordCount} words
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {transcription.transcript.substring(0, 200)}...
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 p-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="px-4 py-2 bg-forest-500 text-white rounded-md hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'Updating...' : 'Update'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

