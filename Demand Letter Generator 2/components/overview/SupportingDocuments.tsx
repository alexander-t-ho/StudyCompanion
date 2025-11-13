'use client'

import { useState } from 'react'
import { Upload, X, File } from 'lucide-react'

interface SupportingDocumentsProps {
  documentId: string
  files: File[]
  onFilesChange: (files: File[]) => void
}

export default function SupportingDocuments({
  documentId,
  files,
  onFilesChange,
}: SupportingDocumentsProps) {
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    onFilesChange([...files, ...selectedFiles])
  }

  const handleRemove = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('documentId', documentId)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }

        const data = await response.json()
        if (data.analysisId) {
          console.log(`Analysis started automatically for ${file.name}:`, data.analysisId)
          // Dispatch event to notify AnalysisPointsPanel to refresh
          window.dispatchEvent(new CustomEvent('fileUploaded', { detail: { analysisId: data.analysisId } }))
        }
      })

      await Promise.all(uploadPromises)
      alert('Files uploaded successfully! Analysis will be performed automatically in the background.')
      onFilesChange([])
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload files. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Supporting Documents</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Upload Documents (PDF, DOCX)
          </label>
          <div className="flex items-center gap-2">
            <label className="flex-1 cursor-pointer">
              <input
                type="file"
                multiple
                accept=".pdf,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-gray-300">
                <Upload className="w-4 h-4" />
                <span>Choose Files</span>
              </div>
            </label>
            {files.length > 0 && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-2 bg-forest-500 text-white rounded-md hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            )}
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-800 rounded border border-gray-700"
              >
                <div className="flex items-center gap-2 text-gray-300">
                  <File className="w-4 h-4" />
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  onClick={() => handleRemove(index)}
                  className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

