'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CreateDocumentForm from '@/components/dashboard/CreateDocumentForm'
import DocumentAnalyzer from '@/components/dashboard/DocumentAnalyzer'
import DocumentList from '@/components/dashboard/DocumentList'
import { BackgroundPaths } from '@/components/ui/background-paths'

interface Document {
  id: string
  filename: string
  status: string
  templateId: string | null
  createdAt: string
  updatedAt: string
}

interface Template {
  id: string
  name: string
  isDefault: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    // Verify authentication first
    fetch('/api/auth/verify')
      .then((res) => res.json())
      .then((data) => {
        if (!data.valid) {
          router.push('/login')
        } else {
          loadData()
        }
      })
      .catch(() => {
        router.push('/login')
      })
  }, [router])

  const loadData = async () => {
    try {
      setLoading(true)
      const [docsResponse, templatesResponse] = await Promise.all([
        fetch('/api/documents?limit=10'),
        fetch('/api/templates'),
      ])

      if (docsResponse.ok) {
        const docsData = await docsResponse.json()
        setDocuments(docsData.documents)
        setTotal(docsData.total)
      }

      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json()
        setTemplates(templatesData.templates)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to delete document')
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background Animation */}
      <BackgroundPaths />
      
      {/* Header */}
      <nav className="bg-gray-900 border-b border-gray-800 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-forest-500">DemandsAI</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="space-y-8">
          {/* Document Generation Section */}
          <CreateDocumentForm templates={templates} />

          {/* Document Analyzer Section */}
          <DocumentAnalyzer />

          {/* Generated Documents Section */}
          <DocumentList
            documents={documents}
            total={total}
            onDelete={handleDelete}
            onRefresh={loadData}
          />
        </div>
      </main>
    </div>
  )
}

