'use client'

import { useState } from 'react'
import { Download, FileText, File } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

interface ExportButtonProps {
  documentId: string
  filename: string
}

export default function ExportButton({ documentId, filename }: ExportButtonProps) {
  const [exporting, setExporting] = useState<'word' | 'pdf' | null>(null)

  const handleExport = async (format: 'word' | 'pdf') => {
    setExporting(format)
    try {
      const response = await fetch(`/api/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          includeMetadata: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }))
        throw new Error(errorData.error || errorData.details || 'Export failed')
      }

      // Get blob and trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename.replace(/\.vine$/, '')}.${format === 'word' ? 'docx' : 'pdf'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert(`Failed to export to ${format.toUpperCase()}. Please try again.`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          disabled={exporting !== null}
        >
          {exporting ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          ) : (
            <Download className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[180px] bg-white rounded-md shadow-lg border border-gray-200 p-1 z-50"
          align="end"
        >
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none"
            onSelect={() => handleExport('word')}
            disabled={exporting === 'word'}
          >
            <FileText className="w-4 h-4" />
            {exporting === 'word' ? 'Exporting...' : 'Export to Word'}
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none"
            onSelect={() => handleExport('pdf')}
            disabled={exporting === 'pdf'}
          >
            <File className="w-4 h-4" />
            {exporting === 'pdf' ? 'Exporting...' : 'Export to PDF'}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

