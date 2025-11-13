'use client'

import { useState } from 'react'

interface MediaUploaderProps {
  documentId: string
  onUploadComplete?: (transcriptionId: string) => void
}

export default function MediaUploader({
  documentId,
  onUploadComplete,
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const filename = file.name.toLowerCase()
    const supportedTypes = ['mp4', 'mov', 'avi', 'webm', 'mp3', 'wav', 'm4a', 'ogg']
    const fileExtension = filename.split('.').pop()
    
    if (!fileExtension || !supportedTypes.includes(fileExtension)) {
      setError(`Unsupported file type. Supported: ${supportedTypes.join(', ')}`)
      return
    }

    // Validate file size (100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError('File too large. Maximum size is 100MB')
      return
    }

    setError(null)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentId', documentId)

      const response = await fetch('/api/transcribe/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      if (data.success && data.transcription) {
        onUploadComplete?.(data.transcription.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      // Reset input
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Upload Media File
      </label>
      <div className="flex items-center space-x-4">
        <label className="flex-1 cursor-pointer">
          <input
            type="file"
            accept=".mp4,.mov,.avi,.webm,.mp3,.wav,.m4a,.ogg"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
          <div className="px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-gray-700 text-center">
            {uploading ? 'Uploading...' : 'Choose File'}
          </div>
        </label>
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      <p className="text-xs text-gray-500">
        Supported formats: MP4, MOV, AVI, WebM, MP3, WAV, M4A, OGG (max 100MB)
      </p>
    </div>
  )
}

