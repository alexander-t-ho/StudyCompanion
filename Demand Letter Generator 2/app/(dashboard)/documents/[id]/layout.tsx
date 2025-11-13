'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import ExportButton from '@/components/export/ExportButton'

export default function DocumentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const id = params.id as string
  const pathname = usePathname()
  const [documentName, setDocumentName] = useState('Demand UIM')

  useEffect(() => {
    // Fetch document name
    fetch(`/api/documents/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.filename) {
          setDocumentName(data.filename)
        }
      })
      .catch(() => {})
  }, [id])

  const isOverview = pathname?.includes('/overview')
  const isDocument = pathname?.includes('/document') && !pathname?.includes('/overview')

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-400 rounded flex items-center justify-center">
                <span className="text-yellow-900 font-bold">V</span>
              </div>
              <h1 className="text-lg font-semibold text-white">{documentName.replace(/\.vine$/, '')}</h1>
            </div>
            <div className="flex items-center gap-4">
              <ExportButton documentId={id} filename={documentName} />
              <button className="p-2 hover:bg-gray-100 rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Left Sidebar */}
        <div className="w-64 bg-gray-900 border-r border-gray-800 min-h-[calc(100vh-4rem)]">
          <div className="p-4">
            <div className="bg-gray-800 text-gray-300 px-3 py-2 rounded text-sm font-medium">
              Setup
            </div>
            <button className="mt-2 p-2 hover:bg-gray-800 rounded">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-gray-900 border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex gap-1">
                <Link
                  href={`/documents/${id}/overview`}
                  className={`px-4 py-3 text-sm font-medium rounded-t transition-colors ${
                    isOverview
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Overview
                </Link>
                <Link
                  href={`/documents/${id}/document`}
                  className={`px-4 py-3 text-sm font-medium rounded-t transition-colors ${
                    isDocument
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Document
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-0 bg-black">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

