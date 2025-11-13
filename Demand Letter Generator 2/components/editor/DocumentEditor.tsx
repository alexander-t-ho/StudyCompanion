'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SectionEditor from './SectionEditor'
import GenerateButton from './GenerateButton'
import UndoRedoButtons from './UndoRedoButtons'
import VersionHistory from './VersionHistory'
import AnalysisPointsPanel from './AnalysisPointsPanel'
import { Save, FileText, Settings, ChevronDown, ChevronUp, Upload, History, ArrowLeft } from 'lucide-react'
import CircularProgress from '@/components/ui/CircularProgress'

interface Document {
  id: string
  filename: string
  status: string
  templateId: string | null
  template?: {
    id: string
    name: string
    sections?: string[]
  } | null
  metadata: any
  sections: Array<{
    id: string
    sectionType: string
    content: string
    order: number
    isGenerated: boolean
  }>
}

interface DocumentEditorProps {
  documentId: string
}

export default function DocumentEditor({ documentId }: DocumentEditorProps) {
  const router = useRouter()
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingSection, setGeneratingSection] = useState<string | null>(null)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [saving, setSaving] = useState(false)
  const [caseInfo, setCaseInfo] = useState<any>({})
  const [customPrompt, setCustomPrompt] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [supportingDocs, setSupportingDocs] = useState<File[]>([])
  const [currentVersion, setCurrentVersion] = useState(0)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState<{
    percentage: number
    currentSection?: string
  } | null>(null)

  useEffect(() => {
    loadDocument()
  }, [documentId])

  // Set current date on load
  useEffect(() => {
    if (document && !caseInfo.dateOfLetter) {
      const today = new Date().toISOString().split('T')[0]
      setCaseInfo((prev: any) => ({ ...prev, dateOfLetter: today }))
    }
  }, [document])

  const loadDocument = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/documents/${documentId}`)
      if (response.ok) {
        const data = await response.json()
        setDocument(data)
        const metadata = data.metadata || {}
        setCaseInfo(metadata.caseInfo || {})
        setCustomPrompt(metadata.customPrompt || '')
        
        // Get current version from document
        const versionResponse = await fetch(`/api/documents/${documentId}/versions/status`)
        if (versionResponse.ok) {
          const versionData = await versionResponse.json()
          setCurrentVersion(versionData.currentVersion || 0)
        }
      }
    } catch (error) {
      console.error('Failed to load document:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save all sections that might have been edited
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...document?.metadata,
            caseInfo: {
              ...caseInfo,
              dateOfLetter: new Date().toISOString().split('T')[0], // Always use current date
            },
            customPrompt,
          },
        }),
      })

      if (response.ok) {
        // Create version snapshot after save
        try {
          await fetch(`/api/documents/${documentId}/versions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              changeType: 'update',
              changeSummary: 'Document saved',
            }),
          })
        } catch (versionError) {
          console.error('Failed to create version:', versionError)
          // Don't fail the save if version creation fails
        }

        await loadDocument()
        alert('Document saved successfully!')
      }
    } catch (error) {
      console.error('Failed to save document:', error)
      alert('Failed to save document. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [document, caseInfo, customPrompt])

  const sectionLabels: Record<string, string> = {
    introduction: 'Introduction',
    statement_of_facts: 'Statement of Facts',
    liability: 'Liability',
    damages: 'Damages',
    medical_chronology: 'Medical/Injury Chronology',
    economic_damages: 'Economic Damages',
    treatment_reasonableness: 'Reasonableness and Necessity of Treatment',
    conclusion: 'Conclusion',
    coverage_analysis: 'Coverage Analysis',
    policy_limits: 'Policy Limits',
    negligence_analysis: 'Negligence Analysis',
    comparative_fault: 'Comparative Fault',
  }

  // Detect which section is mentioned in custom instructions
  const detectSectionFromInstructions = (instructions: string): string | null => {
    const sectionKeywords: Record<string, string[]> = {
      introduction: ['introduction', 'intro', 'opening', 'opening paragraph'],
      statement_of_facts: ['statement of facts', 'facts', 'factual', 'incident', 'what happened'],
      liability: ['liability', 'negligence', 'fault', 'responsible', 'responsibility', 'at fault'],
      damages: ['damages', 'damage', 'injuries', 'losses', 'harm'],
      medical_chronology: ['medical', 'treatment', 'chronology', 'medical history', 'medical treatment', 'injury chronology'],
      economic_damages: ['economic', 'financial', 'wages', 'income', 'lost wages', 'economic loss'],
      treatment_reasonableness: ['treatment', 'reasonable', 'necessity', 'medical necessity', 'reasonableness'],
      conclusion: ['conclusion', 'closing', 'summary', 'final', 'closing paragraph'],
      coverage_analysis: ['coverage', 'insurance coverage', 'policy coverage'],
      policy_limits: ['policy limits', 'limits', 'policy limit'],
      negligence_analysis: ['negligence', 'negligent', 'negligence analysis'],
      comparative_fault: ['comparative fault', 'comparative', 'fault'],
    }

    const lowerInstructions = instructions.toLowerCase()
    
    // Check for exact section type matches first (e.g., "introduction", "liability")
    for (const sectionType of Object.keys(sectionKeywords)) {
      if (lowerInstructions.includes(sectionType.replace(/_/g, ' '))) {
        return sectionType
      }
    }
    
    // Then check for keywords
    for (const [sectionType, keywords] of Object.entries(sectionKeywords)) {
      if (keywords.some(keyword => lowerInstructions.includes(keyword))) {
        return sectionType
      }
    }
    
    return null
  }

  const handleGenerate = async (sectionId: string, sectionType: string) => {
    // Create version snapshot BEFORE generation (for undo)
    const section = document?.sections.find((s) => s.id === sectionId)
    if (section && section.content.trim().length > 0) {
      try {
        await fetch(`/api/documents/${documentId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            changeType: 'update',
            changeSummary: `Regenerating ${sectionType} section`,
            sectionId: section.id,
          }),
        })
      } catch (versionError) {
        console.error('Failed to create version:', versionError)
        // Continue anyway - version creation failure shouldn't block generation
      }
    }

    setGeneratingSection(sectionId)
    const sectionName = sectionLabels[sectionType] || sectionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    
    // Simulate progress for single section generation
    setGenerationProgress({ percentage: 0, currentSection: `Generating ${sectionName}...` })
    
    const progressInterval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (!prev) return prev
        const newPercentage = Math.min(prev.percentage + 10, 90)
        return { ...prev, percentage: newPercentage }
      })
    }, 500)
    
    try {
      const context = buildGenerationContext()
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          sectionType,
          context: {
            ...context,
            customPrompt: customPrompt || undefined,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Generation failed')
      }

      const result = await response.json()
      if (result.success && result.content) {
        setGenerationProgress({ percentage: 95, currentSection: `Saving ${sectionName}...` })
        
        const isPlaceholder = sectionId.startsWith('placeholder-')
        const existingSection = document?.sections.find((s) => s.sectionType === sectionType)
        
        if (existingSection && !isPlaceholder) {
          await fetch(`/api/documents/${documentId}/sections/${existingSection.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: result.content,
              isGenerated: true,
            }),
          })
        } else {
          const defaultSectionTypes = [
            'introduction',
            'statement_of_facts',
            'liability',
            'damages',
            'medical_chronology',
            'economic_damages',
            'treatment_reasonableness',
            'conclusion',
          ]
          const templateSectionTypes: string[] = document?.template?.sections || defaultSectionTypes
          const order = templateSectionTypes.indexOf(sectionType)
          const finalOrder = order >= 0 ? order : (document?.sections.length || 0)
          
          await fetch(`/api/documents/${documentId}/sections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sectionType,
              content: result.content,
              order: finalOrder,
              isGenerated: true,
            }),
          })
        }

        setGenerationProgress({ percentage: 100, currentSection: `${sectionName} completed!` })
        await loadDocument()
        
        // Clear progress after a short delay
        setTimeout(() => {
          setGenerationProgress(null)
        }, 500)
      }
    } catch (error) {
      console.error('Failed to generate section:', error)
      alert('Failed to generate section. Please try again.')
      setGenerationProgress(null)
    } finally {
      clearInterval(progressInterval)
      setGeneratingSection(null)
    }
  }

  const handleGenerateAll = async () => {
    if (!document) return
    
    setGeneratingAll(true)
    try {
      const defaultSectionTypes = [
        'introduction',
        'statement_of_facts',
        'liability',
        'damages',
        'medical_chronology',
        'economic_damages',
        'treatment_reasonableness',
        'conclusion',
      ]
      const templateSectionTypes: string[] = document.template?.sections || defaultSectionTypes
      const context = buildGenerationContext()

      // Filter sections that need generation
      const sectionsToGenerate = templateSectionTypes.filter((sectionType) => {
        const existingSection = document.sections.find((s) => s.sectionType === sectionType)
        return !existingSection || !existingSection.content.trim()
      })

      const totalSections = sectionsToGenerate.length
      if (totalSections === 0) {
        alert('All sections already have content!')
        return
      }

      // Generate all sections sequentially with progress tracking
      for (let i = 0; i < sectionsToGenerate.length; i++) {
        const sectionType = sectionsToGenerate[i]
        const sectionName = sectionLabels[sectionType] || sectionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        const percentage = Math.round((i / totalSections) * 100)
        
        setGenerationProgress({
          percentage,
          currentSection: `Generating ${sectionName}...`,
        })

        const existingSection = document.sections.find((s) => s.sectionType === sectionType)
        
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId,
            sectionType,
            context: {
              ...context,
              customPrompt: customPrompt || undefined,
            },
          }),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.content) {
            setGenerationProgress({
              percentage: Math.round(((i + 0.5) / totalSections) * 100),
              currentSection: `Saving ${sectionName}...`,
            })

            if (existingSection) {
              await fetch(`/api/documents/${documentId}/sections/${existingSection.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  content: result.content,
                  isGenerated: true,
                }),
              })
            } else {
              const order = templateSectionTypes.indexOf(sectionType)
              await fetch(`/api/documents/${documentId}/sections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sectionType,
                  content: result.content,
                  order: order >= 0 ? order : i,
                  isGenerated: true,
                }),
              })
            }
          }
        }
      }

      setGenerationProgress({
        percentage: 100,
        currentSection: 'All sections completed!',
      })

      await loadDocument()
      
      // Clear progress after a short delay
      setTimeout(() => {
        setGenerationProgress(null)
        alert('All sections generated successfully!')
      }, 1000)
    } catch (error) {
      console.error('Failed to generate all sections:', error)
      alert('Failed to generate all sections. Please try again.')
      setGenerationProgress(null)
    } finally {
      setGeneratingAll(false)
    }
  }

  const buildGenerationContext = () => {
    return {
      caseInfo: {
        ...caseInfo,
        dateOfLetter: new Date().toISOString().split('T')[0], // Always use current date
      },
      selectedProviders: document?.metadata?.selectedProviders || [],
      selectedTranscriptions: document?.metadata?.selectedTranscriptions || [],
      copyStyle: document?.metadata?.styleSettings?.copyStyle || false,
      matchTone: document?.metadata?.styleSettings?.matchTone || false,
      styleMetadata: document?.metadata?.styleMetadata,
      toneMetadata: document?.metadata?.toneMetadata,
      customPrompt: customPrompt || undefined,
    }
  }

  const handleSendCustomInstructions = async () => {
    if (!customPrompt.trim()) {
      alert('Please enter custom instructions')
      return
    }

    const detectedSection = detectSectionFromInstructions(customPrompt)
    
    if (!detectedSection) {
      alert('Could not detect which section to regenerate. Please mention the section name (e.g., "introduction", "liability", "damages", "statement of facts")')
      return
    }

    // Find the section
    const section = document?.sections.find(s => s.sectionType === detectedSection)
    if (!section) {
      alert(`Section "${sectionLabels[detectedSection] || detectedSection}" not found in this document`)
      return
    }

    // Generate the section with custom instructions (version will be created in handleGenerate)
    await handleGenerate(section.id, detectedSection)
  }

  const handleUpdate = async (sectionId: string, content: string) => {
    try {
      const section = document?.sections.find((s) => s.id === sectionId)
      const previousContent = section?.content || ''

      const response = await fetch(`/api/documents/${documentId}/sections/${sectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (response.ok) {
        // Create version snapshot after section update (debounced - only on blur/save)
        // This will be called when user finishes editing, not on every keystroke
        try {
          await fetch(`/api/documents/${documentId}/versions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              changeType: 'update',
              changeSummary: `Updated ${section?.sectionType || 'section'}`,
              sectionId,
            }),
          })
        } catch (versionError) {
          console.error('Failed to create version:', versionError)
        }

        await loadDocument()
      }
    } catch (error) {
      console.error('Failed to update section:', error)
      throw error
    }
  }

  const handleDelete = async (sectionId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/sections/${sectionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadDocument()
      }
    } catch (error) {
      console.error('Failed to delete section:', error)
    }
  }

  const handleMoveUp = async (sectionId: string) => {
    if (!document) return
    
    const currentIndex = document.sections.findIndex((s) => s.id === sectionId)
    if (currentIndex <= 0) return

    const newSections = [...document.sections]
    ;[newSections[currentIndex - 1], newSections[currentIndex]] = [
      newSections[currentIndex],
      newSections[currentIndex - 1],
    ]

    await reorderSections(newSections.map((s) => s.id))
  }

  const handleMoveDown = async (sectionId: string) => {
    if (!document) return
    
    const currentIndex = document.sections.findIndex((s) => s.id === sectionId)
    if (currentIndex >= document.sections.length - 1) return

    const newSections = [...document.sections]
    ;[newSections[currentIndex], newSections[currentIndex + 1]] = [
      newSections[currentIndex + 1],
      newSections[currentIndex],
    ]

    await reorderSections(newSections.map((s) => s.id))
  }

  const reorderSections = async (sectionIds: string[]) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/sections/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionIds }),
      })

      if (response.ok) {
        await loadDocument()
      }
    } catch (error) {
      console.error('Failed to reorder sections:', error)
    }
  }

  const handleAddBefore = (sectionType: string) => {
    alert('Add section before - coming soon')
  }

  const handleAddAfter = (sectionType: string) => {
    alert('Add section after - coming soon')
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    setSupportingDocs((prev) => [...prev, ...fileArray])

    // Upload files to S3 (analysis will be triggered automatically)
    const uploadPromises = fileArray.map(async (file) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentId', documentId)

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const data = await response.json()
          // File uploaded successfully, analysis started automatically
          if (data.analysisId) {
            console.log(`Analysis started automatically for ${file.name}:`, data.analysisId)
            // Dispatch event to notify AnalysisPointsPanel to refresh
            window.dispatchEvent(new CustomEvent('fileUploaded', { detail: { analysisId: data.analysisId } }))
          }
        }
      } catch (error) {
        console.error('Failed to upload file:', error)
      }
    })

    await Promise.all(uploadPromises)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading document...</div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500">Document not found</div>
      </div>
    )
  }

  const existingSections = document.sections.sort((a, b) => a.order - b.order)
  
  const defaultSectionTypes = [
    'introduction',
    'statement_of_facts',
    'liability',
    'damages',
    'medical_chronology',
    'economic_damages',
    'treatment_reasonableness',
    'conclusion',
  ]
  
  const templateSectionTypes: string[] = document.template?.sections || defaultSectionTypes
  const sectionsByType = new Map(existingSections.map(s => [s.sectionType, s]))
  
  const allSections = templateSectionTypes.length > 0
    ? templateSectionTypes.map((sectionType, index) => {
        const existing = sectionsByType.get(sectionType)
        if (existing) {
          return existing
        }
        return {
          id: `placeholder-${sectionType}`,
          sectionType,
          content: '',
          order: index,
          isGenerated: false,
        }
      })
    : existingSections

  return (
    <div className="min-h-screen bg-black">
      {/* Toolbar */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-20 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerateAll}
                disabled={generatingAll}
                className="px-4 py-2 bg-forest-500 text-white rounded-md hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {generatingAll ? 'Generating All...' : 'Generate All Sections'}
              </button>
              {generationProgress && (
                <CircularProgress
                  percentage={generationProgress.percentage}
                  currentSection={generationProgress.currentSection}
                />
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <UndoRedoButtons
              documentId={documentId}
              onUndo={loadDocument}
              onRedo={loadDocument}
            />
            <button
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Version History"
            >
              <History className="w-5 h-5" />
            </button>
          </div>
          <div className="text-xs text-gray-400">
            Press Ctrl+S to save • Ctrl+Z to undo • Ctrl+Y to redo
          </div>
        </div>
      </div>

      <div className="flex gap-4 max-w-7xl mx-auto py-8 px-4">
        {/* Left Sidebar - Analysis Points */}
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-20 h-[calc(100vh-6rem)] border border-gray-800 rounded-lg overflow-hidden bg-white">
            <AnalysisPointsPanel
              documentId={documentId}
              selectedSectionId={selectedSectionId}
              onSectionSelect={setSelectedSectionId}
              sections={document?.sections.map(s => ({ id: s.id, sectionType: s.sectionType })) || []}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Document Container - White page on black background */}
          <div className="bg-white shadow-2xl min-h-[800px] p-12">
          {/* Document Header */}
          <div className="mb-8 border-b pb-6">
            <h1 className="text-2xl font-bold underline mb-4 text-black">
              RE: {caseInfo.client?.toUpperCase() || 'CLIENT'}'S DEMAND
            </h1>
            
            <div className="space-y-1 text-sm font-serif text-black">
              {caseInfo.claimNumber && (
                <div><strong>Claim No:</strong> {caseInfo.claimNumber}</div>
              )}
              {caseInfo.insured && (
                <div><strong>Your Insured:</strong> {caseInfo.insured}</div>
              )}
              {caseInfo.dateOfLoss && (
                <div><strong>Date of Loss:</strong> {new Date(caseInfo.dateOfLoss).toLocaleDateString()}</div>
              )}
              {caseInfo.client && (
                <div><strong>Our Client:</strong> {caseInfo.client}</div>
              )}
            </div>

            {caseInfo.adjuster && (
              <div className="mt-4 text-sm font-serif text-black">
                Dear {caseInfo.adjuster},
              </div>
            )}
          </div>

          {/* Document Sections */}
          <div className="space-y-6">
            {allSections.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="mb-6">No sections yet. Start by generating an introduction.</p>
                <div className="flex justify-center">
                  <GenerateButton
                    sectionType="introduction"
                    hasContent={false}
                    onGenerate={() => handleGenerate('new-intro', 'introduction')}
                    generating={generatingSection === 'new-intro'}
                  />
                </div>
              </div>
            ) : (
              allSections.map((section, index) => {
                const isPlaceholder = section.id.startsWith('placeholder-')
                return (
                  <SectionEditor
                    key={section.id}
                    section={section}
                    isFirst={index === 0}
                    isLast={index === allSections.length - 1}
                    onGenerate={handleGenerate}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    onAddBefore={handleAddBefore}
                    onAddAfter={handleAddAfter}
                    generating={generatingSection === section.id}
                    isPlaceholder={isPlaceholder}
                    onSelect={() => setSelectedSectionId(section.id)}
                    isSelected={selectedSectionId === section.id}
                    progress={generatingSection === section.id ? generationProgress : null}
                  />
                )
              })
            )}
          </div>
          </div>
        </div>

        {/* Right Sidebar - Custom Prompts, Supporting Docs, Advanced Settings */}
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-20 space-y-4">
          {/* Custom Prompts */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <label className="block text-white text-sm font-medium mb-2">
              Custom Instructions
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., 'In the introduction, I want to focus on the severity of injuries...'"
              className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm min-h-[100px]"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault()
                  handleSendCustomInstructions()
                }
              }}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-400 flex-1">
                Mention a section name (e.g., "introduction", "liability") to regenerate that section
              </p>
              <button
                onClick={handleSendCustomInstructions}
                disabled={!customPrompt.trim() || generatingSection !== null || generatingAll}
                className="px-4 py-1.5 bg-forest-500 text-white text-sm rounded-md hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 ml-2 flex-shrink-0"
              >
                <span>Send</span>
                <span className="text-xs opacity-75">(Ctrl+Enter)</span>
              </button>
            </div>
          </div>

          {/* Supporting Documents */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <label className="block text-white text-sm font-medium mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Supporting Documents
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-md cursor-pointer hover:bg-gray-700 transition-colors">
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">Upload Documents</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
              </label>
              {supportingDocs.length > 0 && (
                <div className="space-y-1 mt-2">
                  {supportingDocs.map((file, idx) => (
                    <div key={idx} className="text-xs text-gray-400 flex items-center justify-between px-2 py-1 bg-gray-800 rounded">
                      <span>{file.name}</span>
                      <button
                        onClick={() => setSupportingDocs((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-4 py-3 flex items-center justify-between text-white hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">Advanced Settings</span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {showAdvanced && (
              <div className="p-4 space-y-4 border-t border-gray-800">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Date of Letter
                  </label>
                  <input
                    type="date"
                    value={caseInfo.dateOfLetter || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCaseInfo((prev: any) => ({ ...prev, dateOfLetter: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Defaults to current date
                  </p>
                </div>
                {/* Add more advanced settings here */}
              </div>
            )}
          </div>

          {/* Version History */}
          {showVersionHistory && (
            <VersionHistory
              documentId={documentId}
              currentVersion={currentVersion}
              onRestore={loadDocument}
            />
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
