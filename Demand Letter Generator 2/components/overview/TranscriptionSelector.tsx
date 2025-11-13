'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface Transcription {
  id: string
  filename: string
  transcript: string
  duration: number | null
  wordCount: number
  status: string
  createdAt: string
}

interface TranscriptionSelectorProps {
  open: boolean
  onClose: () => void
  transcriptions: Transcription[]
  selectedIds: string[]
  onUpdate: (selectedIds: string[]) => Promise<void>
}

export default function TranscriptionSelector({
  open,
  onClose,
  transcriptions,
  selectedIds: initialSelectedIds,
  onUpdate,
}: TranscriptionSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(initialSelectedIds))
    }
  }, [open, initialSelectedIds])

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
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

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden z-50 flex flex-col">
          <div className="flex items-center justify-between p-6 border-b">
            <Dialog.Title className="text-xl font-semibold">
              Select Deposition Materials
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <span className="text-2xl">×</span>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {transcriptions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No transcriptions available. Upload video or audio files to create transcriptions.
              </p>
            ) : (
              <div className="space-y-3">
                {transcriptions.map((transcription) => (
                  <div
                    key={transcription.id}
                    className="flex items-start p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(transcription.id)}
                      onChange={() => handleToggle(transcription.id)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{transcription.filename}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {transcription.wordCount} words
                        {transcription.duration && ` • ${transcription.duration}s`}
                        {' • '}
                        {new Date(transcription.createdAt).toLocaleDateString()}
                      </div>
                      {transcription.transcript && (
                        <div className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {transcription.transcript.substring(0, 200)}...
                        </div>
                      )}
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
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'Updating...' : 'Update'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

