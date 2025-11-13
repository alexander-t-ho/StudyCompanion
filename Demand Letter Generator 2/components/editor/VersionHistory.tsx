'use client'

import { useState, useEffect } from 'react'
import { History, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'

interface Version {
  id: string
  versionNumber: number
  userId: string
  userEmail: string
  changeType: string
  changeSummary: string | null
  createdAt: string
}

interface VersionHistoryProps {
  documentId: string
  currentVersion: number
  onRestore?: () => void
}

export default function VersionHistory({
  documentId,
  currentVersion,
  onRestore,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)

  useEffect(() => {
    loadVersions()
  }, [documentId])

  const loadVersions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/documents/${documentId}/versions?limit=50`)
      if (response.ok) {
        const data = await response.json()
        setVersions(data.versions)
      }
    } catch (error) {
      console.error('Failed to load versions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (versionNumber: number) => {
    if (!confirm(`Restore to version ${versionNumber}? This will replace the current document.`)) {
      return
    }

    setRestoring(versionNumber.toString())
    try {
      const response = await fetch(
        `/api/documents/${documentId}/versions/${versionNumber}`,
        {
          method: 'POST',
        }
      )

      if (response.ok) {
        await loadVersions()
        if (onRestore) onRestore()
        // Reload document
        window.location.reload()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to restore version')
      }
    } catch (error) {
      console.error('Restore error:', error)
      alert('Failed to restore version. Please try again.')
    } finally {
      setRestoring(null)
    }
  }

  const getChangeTypeColor = (changeType: string) => {
    const colors: Record<string, string> = {
      create: 'text-green-400',
      update: 'text-blue-400',
      delete: 'text-red-400',
      restore: 'text-purple-400',
      generate: 'text-yellow-400',
    }
    return colors[changeType] || 'text-gray-400'
  }

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="text-white text-sm">Loading version history...</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <History className="w-4 h-4 text-gray-400" />
        <h3 className="text-white text-sm font-medium">Version History</h3>
        <span className="text-xs text-gray-500 ml-auto">
          Current: v{currentVersion}
        </span>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {versions.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">
            No version history yet
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`p-3 hover:bg-gray-800 transition-colors ${
                  version.versionNumber === currentVersion ? 'bg-gray-800/50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium text-sm">
                        Version {version.versionNumber}
                      </span>
                      {version.versionNumber === currentVersion && (
                        <span className="text-xs bg-forest-500 text-white px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                      <span
                        className={`text-xs ${getChangeTypeColor(version.changeType)}`}
                      >
                        {version.changeType}
                      </span>
                    </div>
                    {version.changeSummary && (
                      <p className="text-gray-300 text-xs mb-1">
                        {version.changeSummary}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{version.userEmail}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(version.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  </div>
                  {version.versionNumber !== currentVersion && (
                    <button
                      onClick={() => handleRestore(version.versionNumber)}
                      disabled={restoring === version.versionNumber.toString()}
                      className="p-1.5 text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
                      title="Restore this version"
                    >
                      {restoring === version.versionNumber.toString() ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

