'use client'

import { useState, useEffect } from 'react'

interface Transcription {
  id: string
  filename: string
  transcript: string
  duration?: number
  wordCount: number
  status: 'processing' | 'completed' | 'failed'
  createdAt: string
}

interface TranscriptionViewProps {
  transcriptionId: string
}

export default function TranscriptionView({ transcriptionId }: TranscriptionViewProps) {
  const [transcription, setTranscription] = useState<Transcription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/transcribe/${transcriptionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          setTranscription(data)
        } else {
          setError(data.error || 'Failed to load transcription')
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load transcription')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [transcriptionId])

  if (loading) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-500">Loading transcription...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  if (!transcription) {
    return null
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{transcription.filename}</h4>
          <p className="text-xs text-gray-500">
            {transcription.wordCount} words
            {transcription.duration && ` • ${Math.round(transcription.duration / 60)} min`}
          </p>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${
            transcription.status === 'completed'
              ? 'bg-green-100 text-green-800'
              : transcription.status === 'processing'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {transcription.status}
        </span>
      </div>

      {transcription.status === 'processing' && (
        <p className="text-sm text-gray-500 italic">
          Transcription is being processed. Please check back later.
        </p>
      )}

      {transcription.status === 'failed' && (
        <p className="text-sm text-red-600">
          Transcription failed. Please try uploading again.
        </p>
      )}

      {transcription.status === 'completed' && (
        <div className="mt-3">
          <div className="max-h-64 overflow-y-auto p-3 bg-gray-50 rounded border border-gray-200">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {transcription.transcript}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

