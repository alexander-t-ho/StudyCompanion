'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'

interface Document {
  id: string
  filename: string
  status: string
  templateId: string | null
  createdAt: string
  updatedAt: string
}

interface DocumentItemProps {
  document: Document
  onDelete: (id: string) => void
}

export default function DocumentItem({ document, onDelete }: DocumentItemProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm(`Are you sure you want to delete "${document.filename}"?`)) {
      onDelete(document.id)
    }
  }

  const displayName = document.filename.replace(/\.vine$/, '')
  const dateGenerated = format(new Date(document.createdAt), 'MMM d, yyyy')

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-800 hover:bg-gray-800 transition-colors">
      <div className="flex items-center gap-4 flex-1">
        <Link
          href={`/documents/${document.id}/document`}
          className="text-forest-400 hover:text-forest-300 underline flex-1"
        >
          {displayName}.vine
        </Link>
        <Link
          href={`/documents/${document.id}/overview`}
          className="px-3 py-1 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 transition-colors"
        >
          Setup
        </Link>
        <span className="text-sm text-gray-400 min-w-[100px] text-right">
          {dateGenerated}
        </span>
        <button
          onClick={handleDelete}
          className="p-1 text-gray-500 hover:text-red-400 transition-colors"
          title="Delete document"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

