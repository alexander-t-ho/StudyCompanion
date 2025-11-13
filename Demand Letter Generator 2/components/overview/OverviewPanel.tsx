'use client'

import { useState, useEffect } from 'react'
import CaseInfoForm, { type CaseInfo } from './CaseInfoForm'
import DataSelector from './DataSelector'
import SubmissionDetails from './SubmissionDetails'
import StrategicPositioning from './StrategicPositioning'
import MedicalProviderModal from './MedicalProviderModal'
import TranscriptionSelector from './TranscriptionSelector'
import SupportingDocuments from './SupportingDocuments'
import AdvancedSettings from './AdvancedSettings'
import SectionInstructions from './SectionInstructions'
import LogoUpload from './LogoUpload'

interface OverviewPanelProps {
  documentId: string
}

interface AvailableData {
  providers: any[]
  transcriptions: any[]
  expertReports: any[]
}

export default function OverviewPanel({ documentId }: OverviewPanelProps) {
  const [loading, setLoading] = useState(true)
  const [availableData, setAvailableData] = useState<AvailableData>({
    providers: [],
    transcriptions: [],
    expertReports: [],
  })
  const [caseInfo, setCaseInfo] = useState<CaseInfo>({})
  const [submissionDetails, setSubmissionDetails] = useState('')
  const [strategicPositioning, setStrategicPositioning] = useState('')
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])
  const [selectedTranscriptions, setSelectedTranscriptions] = useState<string[]>([])
  const [supportingFiles, setSupportingFiles] = useState<File[]>([])
  const [documentSections, setDocumentSections] = useState<string[]>([])
  const [customInstructions, setCustomInstructions] = useState<Record<string, string>>({})

  const [medicalModalOpen, setMedicalModalOpen] = useState(false)
  const [transcriptionModalOpen, setTranscriptionModalOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [documentId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [docResponse, dataResponse] = await Promise.all([
        fetch(`/api/documents/${documentId}`),
        fetch(`/api/documents/${documentId}/available-data`),
      ])

      if (docResponse.ok) {
        const doc = await docResponse.json()
        const metadata = doc.metadata || {}
        setCaseInfo(metadata.caseInfo || {})
        setSubmissionDetails(metadata.submissionDetails || '')
        setStrategicPositioning(metadata.strategicPositioning || '')
        setSelectedProviders(metadata.selectedProviders || [])
        setSelectedTranscriptions(metadata.selectedTranscriptions || [])
        setCustomInstructions(metadata.customInstructions || {})
        
        // Get sections from template
        if (doc.template?.sections) {
          setDocumentSections(doc.template.sections)
        } else if (doc.sections && doc.sections.length > 0) {
          // Fallback to document sections if template sections not available
          setDocumentSections(doc.sections.map((s: any) => s.sectionType))
        }
      }

      if (dataResponse.ok) {
        const data = await dataResponse.json()
        setAvailableData(data)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateMetadata = async (updates: any) => {
    const response = await fetch(`/api/documents/${documentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadata: {
          caseInfo,
          submissionDetails,
          strategicPositioning,
          selectedProviders,
          selectedTranscriptions,
          customInstructions,
          ...updates,
        },
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to update metadata')
    }
  }

  const handleCaseInfoSave = async (data: CaseInfo) => {
    setCaseInfo(data)
    await updateMetadata({ caseInfo: data })
  }

  const handleSubmissionDetailsSave = async (value: string) => {
    setSubmissionDetails(value)
    await updateMetadata({ submissionDetails: value })
  }

  const handleStrategicPositioningSave = async (value: string) => {
    setStrategicPositioning(value)
    await updateMetadata({ strategicPositioning: value })
  }

  const handleProviderUpdate = async (selectedIds: string[]) => {
    // Update provider selections in database
    const allProviderIds = availableData.providers.map((p) => p.id)
    const response = await fetch(`/api/documents/${documentId}/providers/bulk-select`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerIds: allProviderIds,
        isSelected: false, // First deselect all
      }),
    })

    if (response.ok && selectedIds.length > 0) {
      // Then select the chosen ones
      await fetch(`/api/documents/${documentId}/providers/bulk-select`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerIds: selectedIds,
          isSelected: true,
        }),
      })
    }

    setSelectedProviders(selectedIds)
    await updateMetadata({ selectedProviders: selectedIds })
    await loadData() // Reload to update counts
  }

  const handleTranscriptionUpdate = async (selectedIds: string[]) => {
    setSelectedTranscriptions(selectedIds)
    await updateMetadata({ selectedTranscriptions: selectedIds })
    await loadData() // Reload to update counts
  }

  const handleAdvancedSettingsSave = async (settings: any) => {
    await updateMetadata({ ...settings })
  }

  const handleCustomInstructionsSave = async (instructions: Record<string, string>) => {
    setCustomInstructions(instructions)
    await updateMetadata({ customInstructions: instructions })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <CaseInfoForm
        initialData={caseInfo}
        onChange={setCaseInfo}
        onSave={handleCaseInfoSave}
      />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Data Selection</h3>

        <DataSelector
          label="Medical Providers"
          count={availableData.providers.length}
          selectedCount={selectedProviders.length}
          onSelect={() => setMedicalModalOpen(true)}
        />

        <DataSelector
          label="Deposition Materials"
          count={availableData.transcriptions.length}
          selectedCount={selectedTranscriptions.length}
          onSelect={() => setTranscriptionModalOpen(true)}
        />

        <DataSelector
          label="Expert Reports"
          count={availableData.expertReports.length}
          selectedCount={0}
          onSelect={() => {
            // TODO: Implement expert report selector
            alert('Expert report selection coming soon')
          }}
        />
      </div>

      <SupportingDocuments
        documentId={documentId}
        files={supportingFiles}
        onFilesChange={setSupportingFiles}
      />

      <LogoUpload />

      <AdvancedSettings
        documentId={documentId}
        metadata={{ dateOfLetter: caseInfo.dateOfLetter }}
        onSave={handleAdvancedSettingsSave}
      />

      <SectionInstructions
        documentId={documentId}
        sections={documentSections}
        customInstructions={customInstructions}
        onSave={handleCustomInstructionsSave}
      />

      <SubmissionDetails
        initialValue={submissionDetails}
        onChange={setSubmissionDetails}
        onSave={handleSubmissionDetailsSave}
      />

      <StrategicPositioning
        initialValue={strategicPositioning}
        onChange={setStrategicPositioning}
        onSave={handleStrategicPositioningSave}
      />

      <MedicalProviderModal
        open={medicalModalOpen}
        onClose={() => setMedicalModalOpen(false)}
        providers={availableData.providers}
        onUpdate={handleProviderUpdate}
      />

      <TranscriptionSelector
        open={transcriptionModalOpen}
        onClose={() => setTranscriptionModalOpen(false)}
        transcriptions={availableData.transcriptions}
        selectedIds={selectedTranscriptions}
        onUpdate={handleTranscriptionUpdate}
      />
    </div>
  )
}

