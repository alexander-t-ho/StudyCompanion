'use client'

import { useState, useEffect } from 'react'
import DocumentItem from './DocumentItem'

interface Document {
  id: string
  filename: string
  status: string
  templateId: string | null
  createdAt: string
  updatedAt: string
}

interface DocumentListProps {
  documents: Document[]
  total: number
  onDelete: (id: string) => Promise<void>
  onRefresh: () => void
}

export default function DocumentList({ documents, total, onDelete, onRefresh }: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await onDelete(id)
      onRefresh()
    } catch (error) {
      console.error('Failed to delete document:', error)
      alert('Failed to delete document. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800">
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Generated Documents ({total})
        </h2>
        {total > documents.length && documents.length > 0 && (
          <button className="text-sm text-forest-400 hover:text-forest-300 underline">
            show all
          </button>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-400 mb-4">No documents yet.</p>
          <p className="text-sm text-gray-500">Create your first demand letter above.</p>
        </div>
      ) : (
        <div className="px-6">
          <div className="flex items-center justify-between py-2 border-b border-gray-800 text-sm font-medium text-gray-400">
            <div className="flex-1">Document Name</div>
            <div className="min-w-[100px] text-right">Date Generated</div>
          </div>

          <div>
            {documents.map((document) => (
              <DocumentItem
                key={document.id}
                document={document}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

