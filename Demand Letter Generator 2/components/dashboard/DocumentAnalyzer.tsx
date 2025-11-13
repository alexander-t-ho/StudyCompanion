'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, ChevronDown, ChevronUp, CheckCircle2, Circle, Loader2, AlertCircle, Download, X } from 'lucide-react'

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
  summary?: string
}

export default function DocumentAnalyzer() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [selectedSourceDoc, setSelectedSourceDoc] = useState<string>('')
  const [availableSourceDocs, setAvailableSourceDocs] = useState<Array<{id: string, filename: string}>>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [error, setError] = useState('')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    legalPoints: false,
    facts: false,
    damages: false,
  })
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<'analyze' | 'documents'>('analyze')
  const [allSourceDocuments, setAllSourceDocuments] = useState<Array<{
    id: string
    filename: string
    fileType: string
    documentId: string
    documentName: string
    createdAt: string
    wordCount?: number
    pageCount?: number
  }>>([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)

  useEffect(() => {
    loadAvailableSourceDocs()
    if (activeTab === 'documents') {
      loadAllSourceDocuments()
    }
  }, [activeTab])

  const loadAvailableSourceDocs = async () => {
    try {
      const response = await fetch('/api/documents?limit=100')
      if (response.ok) {
        const data = await response.json()
        // Get source documents from all documents
        const allSourceDocs: Array<{id: string, filename: string}> = []
        for (const doc of data.documents) {
          const docResponse = await fetch(`/api/documents/${doc.id}`)
          if (docResponse.ok) {
            const docData = await docResponse.json()
            if (docData.sourceDocs && Array.isArray(docData.sourceDocs) && docData.sourceDocs.length > 0) {
              docData.sourceDocs.forEach((sd: any) => {
                allSourceDocs.push({ id: sd.id, filename: sd.filename })
              })
            }
          }
        }
        setAvailableSourceDocs(allSourceDocs)
      }
    } catch (err) {
      console.error('Failed to load source documents:', err)
    }
  }

  const loadAllSourceDocuments = async () => {
    setLoadingDocuments(true)
    try {
      const response = await fetch('/api/documents?limit=100')
      if (response.ok) {
        const data = await response.json()
        const allDocs: Array<{
          id: string
          filename: string
          fileType: string
          documentId: string
          documentName: string
          createdAt: string
          wordCount?: number
          pageCount?: number
        }> = []
        
        for (const doc of data.documents) {
          const docResponse = await fetch(`/api/documents/${doc.id}`)
          if (docResponse.ok) {
            const docData = await docResponse.json()
            if (docData.sourceDocs && Array.isArray(docData.sourceDocs)) {
              docData.sourceDocs.forEach((sd: any) => {
                allDocs.push({
                  id: sd.id,
                  filename: sd.filename,
                  fileType: sd.fileType || 'unknown',
                  documentId: doc.id,
                  documentName: doc.filename.replace(/\.vine$/, ''),
                  createdAt: sd.createdAt,
                })
              })
            }
          }
        }
        
        // Sort by creation date, newest first
        allDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setAllSourceDocuments(allDocs)
      }
    } catch (err) {
      console.error('Failed to load all source documents:', err)
    } finally {
      setLoadingDocuments(false)
    }
  }

  const handleDownloadDocument = async (documentId: string, sourceId: string, filename: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/sources/${sourceId}/download`)
      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          window.open(data.url, '_blank')
        }
      }
    } catch (err) {
      console.error('Failed to download document:', err)
      alert('Failed to download document')
    }
  }

  const handleAnalyzeFromDocument = async (sourceId: string) => {
    setSelectedSourceDoc(sourceId)
    setFile(null)
    setActiveTab('analyze')
    setError('')
    setAnalysis(null)
    setAnalysisId(null)
    
    // Wait for state to update, then trigger analysis
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Now trigger the analysis
    setAnalyzing(true)
    try {
      const formData = new FormData()
      formData.append('sourceDocumentId', sourceId)

      const response = await fetch('/api/analyze/document', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success && data.analysisId) {
        setAnalysisId(data.analysisId)
        if (data.analysis) {
          setAnalysis(data.analysis)
        } else {
          // Poll for analysis completion
          pollAnalysisStatus(data.analysisId)
        }
      } else {
        const errorMsg = data.error || 'Analysis failed'
        console.error('Analysis failed:', errorMsg, data)
        setError(errorMsg)
      }
    } catch (err) {
      setError('Failed to analyze document. Please try again.')
      console.error('Analysis error:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setSelectedSourceDoc('')
      setAnalysis(null)
      setAnalysisId(null)
      setError('')
    }
  }

  const handleAnalyze = async () => {
    if (!file && !selectedSourceDoc) {
      setError('Please upload a file or select an existing source document')
      return
    }

    setAnalyzing(true)
    setError('')
    setAnalysis(null)

    try {
      const formData = new FormData()
      if (file) {
        formData.append('file', file)
      }
      if (selectedSourceDoc) {
        formData.append('sourceDocumentId', selectedSourceDoc)
      }

      const response = await fetch('/api/analyze/document', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success && data.analysisId) {
        setAnalysisId(data.analysisId)
        if (data.analysis) {
          setAnalysis(data.analysis)
        } else {
          // Poll for analysis completion
          pollAnalysisStatus(data.analysisId)
        }
      } else {
        const errorMsg = data.error || 'Analysis failed'
        console.error('Analysis failed:', errorMsg, data)
        setError(errorMsg)
      }
    } catch (err) {
      setError('Failed to analyze document. Please try again.')
      console.error('Analysis error:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  const pollAnalysisStatus = async (id: string) => {
    const maxAttempts = 30
    let attempts = 0

    const poll = async () => {
      try {
        const response = await fetch(`/api/analyze/${id}`)
        const data = await response.json()

        if (data.success && data.analysis) {
          if (data.analysis.status === 'completed') {
            setAnalysis(data.analysis.analysisData)
            return
          } else if (data.analysis.status === 'failed') {
            setError('Analysis failed. Please check the document and try again.')
            return
          }
        } else if (data.success === false) {
          setError(data.error || 'Analysis failed')
          return
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000) // Poll every 2 seconds
        } else {
          setError('Analysis timed out. The document may be too large or the analysis is taking longer than expected.')
        }
      } catch (err) {
        console.error('Poll error:', err)
        setError('Failed to check analysis status')
      }
    }

    poll()
  }

  const handleGenerateDemandLetter = async () => {
    if (!analysisId) {
      setError('No analysis available')
      return
    }

    setGenerating(true)
    setError('')

    try {
      // Get default template (Personal Injury Demand)
      const templatesResponse = await fetch('/api/templates')
      const templatesData = await templatesResponse.json()
      const defaultTemplate = templatesData.templates?.find((t: any) => 
        t.name === 'Personal Injury Demand' || t.isDefault
      ) || templatesData.templates?.[0]

      // Get source document ID from analysis
      let sourceDocumentId: string | null = null
      if (selectedSourceDoc) {
        sourceDocumentId = selectedSourceDoc
      } else {
        // Try to find source document from analysis
        const analysisResponse = await fetch(`/api/analyze/${analysisId}`)
        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json()
          if (analysisData.analysis?.sourceDocumentId) {
            sourceDocumentId = analysisData.analysis.sourceDocumentId
          }
        }
      }

      // Create a new document first
      const filename = file?.name.replace(/\.[^/.]+$/, '') || `Demand Letter ${new Date().toISOString().split('T')[0]}`
      const createResponse = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: filename + '.vine',
          templateId: defaultTemplate?.id,
          metadata: {
            caseInfo: {
              dateOfLetter: new Date().toISOString().split('T')[0],
            },
          },
        }),
      })

      const createData = await createResponse.json()

      if (!createData.success || !createData.document) {
        throw new Error('Failed to create document')
      }

      const documentId = createData.document.id

      // Generate demand letter from analysis (source document will be linked automatically)
      const generateResponse = await fetch(`/api/documents/${documentId}/generate-from-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId,
          templateId: defaultTemplate?.id,
          generateAllSections: true,
        }),
      })

      const generateData = await generateResponse.json()

      if (generateData.success) {
        // Redirect to document editor
        router.push(`/documents/${documentId}/document`)
      } else {
        setError(generateData.error || 'Failed to generate demand letter')
      }
    } catch (err) {
      setError('Failed to generate demand letter. Please try again.')
      console.error('Generation error:', err)
    } finally {
      setGenerating(false)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <h2 className="text-xl font-semibold mb-4 text-white">Document Analysis</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('analyze')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'analyze'
              ? 'text-forest-400 border-b-2 border-forest-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Analyze
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'documents'
              ? 'text-forest-400 border-b-2 border-forest-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Uploaded Documents ({allSourceDocuments.length})
        </button>
      </div>

      {/* Analyze Tab */}
      {activeTab === 'analyze' && (
        <div>
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md flex items-center gap-2 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* File Upload / Source Document Selection */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Upload New Document
              </label>
              <label className="flex items-center gap-2 px-4 py-3 bg-gray-800 border border-gray-700 rounded-md cursor-pointer hover:bg-gray-700 transition-colors">
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">
                  {file ? file.name : 'Choose File (PDF, DOCX)'}
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={analyzing}
                />
              </label>
            </div>

            {availableSourceDocs.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Or Select Existing Source Document
                </label>
                <select
                  value={selectedSourceDoc}
                  onChange={(e) => {
                    setSelectedSourceDoc(e.target.value)
                    setFile(null)
                    setAnalysis(null)
                    setAnalysisId(null)
                    setError('')
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm"
                  disabled={analyzing}
                >
                  <option value="">-- Select a source document --</option>
                  {availableSourceDocs.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.filename}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={analyzing || (!file && !selectedSourceDoc)}
              className="w-full px-4 py-2 bg-forest-500 text-white rounded-md hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing Document...</span>
                </>
              ) : (
                <span>Analyze Document</span>
              )}
            </button>
          </div>

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-4">
              {/* Summary */}
              {analysis.summary && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg">
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Summary</h3>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{analysis.summary}</p>
                  </div>
                </div>
              )}

              {/* Legal Points */}
              {analysis.legalPoints && analysis.legalPoints.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg">
                  <button
                    onClick={() => toggleSection('legalPoints')}
                    className="w-full p-4 flex items-center justify-between text-white hover:bg-gray-700 transition-colors rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <span className="font-semibold">Legal Points ({analysis.legalPoints.length})</span>
                    </div>
                    {expandedSections.legalPoints ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {expandedSections.legalPoints && (
                    <div className="p-4 pt-0 space-y-3 border-t border-gray-700">
                      {analysis.legalPoints.map((point, idx) => (
                        <div
                          key={point.id || idx}
                          className="p-3 bg-gray-900 border border-gray-700 rounded-md"
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-blue-400">{idx + 1}</span>
                            </div>
                            <div className="flex-1">
                              {point.category && (
                                <span className="inline-block px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded mb-2">
                                  {point.category}
                                </span>
                              )}
                              <p className="text-sm text-gray-300 mt-1">{point.text}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Facts */}
              {analysis.facts && analysis.facts.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg">
                  <button
                    onClick={() => toggleSection('facts')}
                    className="w-full p-4 flex items-center justify-between text-white hover:bg-gray-700 transition-colors rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-green-400" />
                      <span className="font-semibold">Facts ({analysis.facts.length})</span>
                    </div>
                    {expandedSections.facts ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {expandedSections.facts && (
                    <div className="p-4 pt-0 space-y-3 border-t border-gray-700">
                      {analysis.facts.map((fact, idx) => (
                        <div
                          key={fact.id || idx}
                          className="p-3 bg-gray-900 border border-gray-700 rounded-md"
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-green-400">{idx + 1}</span>
                            </div>
                            <div className="flex-1">
                              {fact.date && (
                                <span className="inline-block px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded mb-2">
                                  {fact.date}
                                </span>
                              )}
                              <p className="text-sm text-gray-300 mt-1">{fact.text}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Damages */}
              {analysis.damages && analysis.damages.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg">
                  <button
                    onClick={() => toggleSection('damages')}
                    className="w-full p-4 flex items-center justify-between text-white hover:bg-gray-700 transition-colors rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-yellow-400" />
                      <span className="font-semibold">Damages ({analysis.damages.length})</span>
                    </div>
                    {expandedSections.damages ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {expandedSections.damages && (
                    <div className="p-4 pt-0 space-y-3 border-t border-gray-700">
                      {analysis.damages.map((damage, idx) => (
                        <div
                          key={damage.id || idx}
                          className="p-3 bg-gray-900 border border-gray-700 rounded-md"
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-yellow-400">{idx + 1}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {damage.type && (
                                  <span className="inline-block px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-xs rounded">
                                    {damage.type}
                                  </span>
                                )}
                                {damage.amount && (
                                  <span className="text-sm font-semibold text-yellow-400">
                                    ${damage.amount.toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-300">{damage.text}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Generate Demand Letter Button */}
              <button
                onClick={handleGenerateDemandLetter}
                disabled={generating || !analysisId}
                className="w-full px-4 py-3 bg-forest-500 text-white rounded-md hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating Demand Letter...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Generate Demand Letter Now</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {loadingDocuments ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-400">Loading documents...</span>
            </div>
          ) : allSourceDocuments.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No documents uploaded yet.</p>
              <p className="text-sm mt-2">Upload documents in the Analyze tab to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allSourceDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className={`w-5 h-5 flex-shrink-0 ${
                          doc.fileType === 'pdf' ? 'text-red-400' : 'text-blue-400'
                        }`} />
                        <h3 className="text-sm font-semibold text-white truncate">{doc.filename}</h3>
                        <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded uppercase">
                          {doc.fileType}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">
                        From: {doc.documentName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleAnalyzeFromDocument(doc.id)}
                        className="px-3 py-1.5 bg-forest-500 text-white text-xs rounded hover:bg-forest-600 transition-colors"
                        title="Analyze this document"
                      >
                        Analyze
                      </button>
                      <button
                        onClick={() => handleDownloadDocument(doc.documentId, doc.id, doc.filename)}
                        className="p-1.5 text-gray-400 hover:text-white transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

