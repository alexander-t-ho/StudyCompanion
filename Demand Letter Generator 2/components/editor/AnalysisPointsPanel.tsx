'use client'

import { useState, useEffect, useRef } from 'react'
import { FileText, ChevronDown, ChevronUp, CheckCircle2, Circle, Search } from 'lucide-react'

interface AnalysisPoint {
  id: string
  text: string
  category?: string
  date?: string
  amount?: number
  type?: string
}

interface AnalysisData {
  legalPoints?: AnalysisPoint[]
  facts?: AnalysisPoint[]
  damages?: AnalysisPoint[]
}

interface PointUsage {
  pointId: string
  sectionId: string
  sectionType: string
}

interface AnalysisPointsPanelProps {
  documentId: string
  selectedSectionId?: string | null
  onSectionSelect?: (sectionId: string) => void
  sections?: Array<{id: string, sectionType: string}>
}

export default function AnalysisPointsPanel({
  documentId,
  selectedSectionId,
  onSectionSelect,
  sections = [],
}: AnalysisPointsPanelProps) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [pointUsages, setPointUsages] = useState<PointUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [analysisStatus, setAnalysisStatus] = useState<'completed' | 'processing' | 'failed' | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    legalPoints: true,
    facts: true,
    damages: true,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [documentSections, setDocumentSections] = useState<Array<{id: string, sectionType: string}>>(sections)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadAnalysisData()
    loadDocumentSections()
    
    // Listen for file upload events to refresh analysis
    const handleFileUploaded = () => {
      console.log('File uploaded event received, refreshing analysis...')
      // Wait a moment for analysis to start, then refresh
      setTimeout(() => {
        loadAnalysisData()
      }, 2000)
    }
    
    // Listen for custom event when files are uploaded
    window.addEventListener('fileUploaded', handleFileUploaded)
    
    // Also poll periodically to check for new analyses (every 10 seconds)
    const periodicCheckInterval = setInterval(() => {
      loadAnalysisData()
    }, 10000)
    
    // Cleanup function - clear any polling intervals
    return () => {
      window.removeEventListener('fileUploaded', handleFileUploaded)
      clearInterval(periodicCheckInterval)
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current)
        pollTimeoutRef.current = null
      }
    }
  }, [documentId])

  const loadDocumentSections = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.sections && Array.isArray(data.sections)) {
          setDocumentSections(data.sections.map((s: any) => ({
            id: s.id,
            sectionType: s.sectionType,
          })))
        }
      }
    } catch (error) {
      console.error('Failed to load document sections:', error)
    }
  }

  const loadAnalysisData = async () => {
    try {
      setLoading(true)
      
      // Query analyses directly for this document
      const response = await fetch(`/api/documents/${documentId}/analyses`)
      if (!response.ok) {
        console.error('Failed to fetch analyses:', response.statusText)
        return
      }

      const data = await response.json()
      if (data.success && data.analysis) {
        // Set the analysis data
        setAnalysisStatus(data.analysis.status as 'completed' | 'processing' | 'failed')
        
        if (data.analysis.status === 'completed' && data.analysis.analysisData) {
          setAnalysis(data.analysis.analysisData)
          
          // Get point usages for the analysis
          const analysisId = data.analysis.id
          const usagesResponse = await fetch(`/api/analyze/${analysisId}/usages`)
          if (usagesResponse.ok) {
            const usagesData = await usagesResponse.json()
            if (usagesData.success) {
              setPointUsages(usagesData.usages || [])
            }
          }
        } else if (data.analysis.status === 'processing') {
          // Analysis is still processing, poll for updates
          setAnalysisStatus('processing')
          
          // Clear any existing polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
          }
          if (pollTimeoutRef.current) {
            clearTimeout(pollTimeoutRef.current)
          }
          
          // Poll every 3 seconds until completed
          pollIntervalRef.current = setInterval(async () => {
            const pollResponse = await fetch(`/api/documents/${documentId}/analyses`)
            if (pollResponse.ok) {
              const pollData = await pollResponse.json()
              if (pollData.success && pollData.analysis && pollData.analysis.status === 'completed') {
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current)
                  pollIntervalRef.current = null
                }
                if (pollTimeoutRef.current) {
                  clearTimeout(pollTimeoutRef.current)
                  pollTimeoutRef.current = null
                }
                setAnalysisStatus('completed')
                setAnalysis(pollData.analysis.analysisData)
                
                // Get point usages
                const analysisId = pollData.analysis.id
                const usagesResponse = await fetch(`/api/analyze/${analysisId}/usages`)
                if (usagesResponse.ok) {
                  const usagesData = await usagesResponse.json()
                  if (usagesData.success) {
                    setPointUsages(usagesData.usages || [])
                  }
                }
              } else if (pollData.success && pollData.analysis && pollData.analysis.status === 'failed') {
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current)
                  pollIntervalRef.current = null
                }
                if (pollTimeoutRef.current) {
                  clearTimeout(pollTimeoutRef.current)
                  pollTimeoutRef.current = null
                }
                setAnalysisStatus('failed')
              }
            }
          }, 3000)
          
          // Clear interval after 5 minutes to avoid infinite polling
          pollTimeoutRef.current = setTimeout(() => {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
          }, 5 * 60 * 1000)
        } else if (data.analysis.status === 'failed') {
          setAnalysisStatus('failed')
        }
      } else if (data.success && data.allAnalyses && data.allAnalyses.length > 0) {
        // There are analyses but they're still processing
        const processingAnalyses = data.allAnalyses.filter((a: any) => a.status === 'processing')
        if (processingAnalyses.length > 0) {
          setAnalysisStatus('processing')
        } else {
          const failedAnalyses = data.allAnalyses.filter((a: any) => a.status === 'failed')
          if (failedAnalyses.length > 0) {
            setAnalysisStatus('failed')
          }
        }
      }
    } catch (error) {
      console.error('Failed to load analysis data:', error)
    } finally {
      setLoading(false)
    }
  }

  const isPointUsed = (pointId: string): boolean => {
    return pointUsages.some(usage => usage.pointId === pointId)
  }

  const getPointSections = (pointId: string): string[] => {
    return pointUsages
      .filter(usage => usage.pointId === pointId)
      .map(usage => usage.sectionType)
  }

  const filterPoints = (points: AnalysisPoint[] | undefined): AnalysisPoint[] => {
    if (!points) return []
    if (!searchQuery.trim()) return points
    
    const query = searchQuery.toLowerCase()
    return points.filter(point =>
      point.text.toLowerCase().includes(query) ||
      point.category?.toLowerCase().includes(query) ||
      point.type?.toLowerCase().includes(query)
    )
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  if (loading) {
    return (
      <div className="h-full p-4 text-gray-400 text-sm">
        Loading analysis points...
      </div>
    )
  }

  if (analysisStatus === 'processing') {
    return (
      <div className="h-full p-4 text-gray-400 text-sm">
        <div className="space-y-2">
          <p>Analysis is being processed...</p>
          <p className="text-xs text-gray-500">
            Please wait while we analyze your document. This may take a few moments.
          </p>
        </div>
      </div>
    )
  }

  if (analysisStatus === 'failed') {
    return (
      <div className="h-full p-4 text-gray-400 text-sm">
        <div className="space-y-2">
          <p className="text-red-400">Analysis failed.</p>
          <p className="text-xs text-gray-500">
            The document analysis could not be completed. Please try uploading the document again.
          </p>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="h-full p-4 text-gray-400 text-sm">
        <div className="space-y-2">
          <p>No analysis available for this document.</p>
          <p className="text-xs text-gray-500">
            Upload a PDF or DOCX file to automatically generate an analysis with legal points, facts, and damages.
          </p>
        </div>
      </div>
    )
  }

  const filteredLegalPoints = filterPoints(analysis.legalPoints)
  const filteredFacts = filterPoints(analysis.facts)
  const filteredDamages = filterPoints(analysis.damages)

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Analysis Points</h3>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search points..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Legal Points */}
        {filteredLegalPoints.length > 0 && (
          <div className="border border-gray-200 rounded-lg bg-white">
            <button
              onClick={() => toggleSection('legalPoints')}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-gray-900">
                  Legal Points ({filteredLegalPoints.length})
                </span>
              </div>
              {expandedSections.legalPoints ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {expandedSections.legalPoints && (
              <div className="p-3 pt-0 space-y-2 border-t border-gray-200">
                {filteredLegalPoints.map((point, idx) => {
                  const used = isPointUsed(point.id)
                  const sections = getPointSections(point.id)
                  
                  return (
                    <div
                      key={point.id || idx}
                      className={`p-2 rounded-md border ${
                        used
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {used ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          {point.category && (
                            <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded mb-1">
                              {point.category}
                            </span>
                          )}
                          <p className="text-xs text-gray-700 mt-1">{point.text}</p>
                          {used && sections.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {sections.map((sectionType) => {
                                const section = documentSections.find(s => s.sectionType === sectionType)
                                return (
                                  <button
                                    key={sectionType}
                                    onClick={() => {
                                      if (onSectionSelect && section) {
                                        onSectionSelect(section.id)
                                      }
                                    }}
                                    className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200"
                                  >
                                    {sectionType.replace(/_/g, ' ')}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Facts */}
        {filteredFacts.length > 0 && (
          <div className="border border-gray-200 rounded-lg bg-white">
            <button
              onClick={() => toggleSection('facts')}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold text-gray-900">
                  Facts ({filteredFacts.length})
                </span>
              </div>
              {expandedSections.facts ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {expandedSections.facts && (
              <div className="p-3 pt-0 space-y-2 border-t border-gray-200">
                {filteredFacts.map((point, idx) => {
                  const used = isPointUsed(point.id)
                  const sections = getPointSections(point.id)
                  
                  return (
                    <div
                      key={point.id || idx}
                      className={`p-2 rounded-md border ${
                        used
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {used ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          {point.date && (
                            <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded mb-1">
                              {point.date}
                            </span>
                          )}
                          <p className="text-xs text-gray-700 mt-1">{point.text}</p>
                          {used && sections.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {sections.map((sectionType) => {
                                const section = documentSections.find(s => s.sectionType === sectionType)
                                return (
                                  <button
                                    key={sectionType}
                                    onClick={() => {
                                      if (onSectionSelect && section) {
                                        onSectionSelect(section.id)
                                      }
                                    }}
                                    className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200"
                                  >
                                    {sectionType.replace(/_/g, ' ')}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Damages */}
        {filteredDamages.length > 0 && (
          <div className="border border-gray-200 rounded-lg bg-white">
            <button
              onClick={() => toggleSection('damages')}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-semibold text-gray-900">
                  Damages ({filteredDamages.length})
                </span>
              </div>
              {expandedSections.damages ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {expandedSections.damages && (
              <div className="p-3 pt-0 space-y-2 border-t border-gray-200">
                {filteredDamages.map((point, idx) => {
                  const used = isPointUsed(point.id)
                  const sections = getPointSections(point.id)
                  
                  return (
                    <div
                      key={point.id || idx}
                      className={`p-2 rounded-md border ${
                        used
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {used ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {point.type && (
                              <span className="inline-block px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                                {point.type}
                              </span>
                            )}
                            {point.amount && (
                              <span className="text-xs font-semibold text-yellow-600">
                                ${point.amount.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-700">{point.text}</p>
                          {used && sections.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {sections.map((sectionType) => {
                                const section = documentSections.find(s => s.sectionType === sectionType)
                                return (
                                  <button
                                    key={sectionType}
                                    onClick={() => {
                                      if (onSectionSelect && section) {
                                        onSectionSelect(section.id)
                                      }
                                    }}
                                    className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200"
                                  >
                                    {sectionType.replace(/_/g, ' ')}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

