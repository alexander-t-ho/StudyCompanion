'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TemplateSelector from './TemplateSelector'
import { Upload, Settings, ChevronDown, ChevronUp, FileText, X } from 'lucide-react'

interface Template {
  id: string
  name: string
  isDefault: boolean
}

interface CreateDocumentFormProps {
  templates: Template[]
}

export default function CreateDocumentForm({ templates }: CreateDocumentFormProps) {
  const router = useRouter()
  const [filename, setFilename] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [supportingFiles, setSupportingFiles] = useState<File[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [generateAllSections, setGenerateAllSections] = useState(false)
  const [dateOfLetter, setDateOfLetter] = useState(new Date().toISOString().split('T')[0])
  const [target, setTarget] = useState('')

  const maxLength = 250
  const remainingChars = maxLength - filename.length

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setSupportingFiles([...supportingFiles, ...selectedFiles])
  }

  const handleRemoveFile = (index: number) => {
    setSupportingFiles(supportingFiles.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!filename.trim()) {
      setError('Filename is required')
      return
    }

    setCreating(true)
    try {
      // Upload supporting files first (if any)
      const uploadedFileIds: string[] = []
      if (supportingFiles.length > 0) {
        for (const file of supportingFiles) {
          const formData = new FormData()
          formData.append('file', file)
          // We'll need to upload after document creation, so we'll store file info in metadata for now
        }
      }

      // Create document with metadata
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: filename.trim() + '.vine',
          templateId: selectedTemplateId || undefined,
          metadata: {
            customPrompt: customPrompt || undefined,
            caseInfo: {
              dateOfLetter: dateOfLetter || new Date().toISOString().split('T')[0],
              target: target || undefined,
            },
            supportingFiles: supportingFiles.map(f => ({
              name: f.name,
              size: f.size,
              type: f.type,
            })),
            generateAllSections: generateAllSections,
          },
        }),
      })

      const data = await response.json()

      if (data.success && data.document) {
        const documentId = data.document.id

        // Upload supporting files after document creation
        // Analysis will be triggered automatically for each uploaded file
        if (supportingFiles.length > 0) {
          const uploadPromises = supportingFiles.map(async (file) => {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('documentId', documentId)

            try {
              const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
              })
              
              if (uploadResponse.ok) {
                const uploadData = await uploadResponse.json()
                if (uploadData.analysisId) {
                  console.log(`Analysis started for ${file.name}:`, uploadData.analysisId)
                }
              }
            } catch (uploadError) {
              console.error('Failed to upload file:', uploadError)
              // Continue even if file upload fails
            }
          })

          // Wait for all uploads to complete (analysis runs in background)
          await Promise.all(uploadPromises)
        }

        // Generate all sections if requested
        if (generateAllSections) {
          try {
            // Fetch the document to get template info and determine sections
            const docResponse = await fetch(`/api/documents/${documentId}`)
            let sectionTypes = [
              'introduction',
              'statement_of_facts',
              'liability',
              'damages',
              'medical_chronology',
              'economic_damages',
              'treatment_reasonableness',
              'conclusion',
            ]

            let docData: any = null
            if (docResponse.ok) {
              docData = await docResponse.json()
              // If document has sections already (from template initialization), use those
              // Otherwise use defaults
              if (docData.sections && docData.sections.length > 0) {
                sectionTypes = docData.sections.map((s: any) => s.sectionType)
              }
            }

            // Generate all sections sequentially
            for (let i = 0; i < sectionTypes.length; i++) {
              const sectionType = sectionTypes[i]
              
              try {
                const generateResponse = await fetch('/api/generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    documentId,
                    sectionType,
                    context: {
                      caseInfo: {
                        dateOfLetter: dateOfLetter || new Date().toISOString().split('T')[0],
                        target: target || undefined,
                      },
                      customPrompt: customPrompt || undefined,
                    },
                  }),
                })

                if (generateResponse.ok) {
                  const result = await generateResponse.json()
                  if (result.success && result.content) {
                    // Check if section already exists
                    const existingSection = docData?.sections?.find((s: any) => s.sectionType === sectionType)

                    if (existingSection) {
                      // Update existing section
                      await fetch(`/api/documents/${documentId}/sections/${existingSection.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          content: result.content,
                          isGenerated: true,
                        }),
                      })
                    } else {
                      // Create new section
                      await fetch(`/api/documents/${documentId}/sections`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          sectionType,
                          content: result.content,
                          order: i,
                          isGenerated: true,
                        }),
                      })
                    }
                  }
                }
              } catch (sectionError) {
                console.error(`Failed to generate section ${sectionType}:`, sectionError)
                // Continue with next section
              }
            }
          } catch (generateError) {
            console.error('Failed to generate all sections:', generateError)
            // Continue to redirect even if generation fails
          }
        }

        // Redirect to document editor
        router.push(`/documents/${documentId}/document`)
      } else {
        setError(data.error || 'Failed to create document')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <h2 className="text-xl font-semibold mb-4 text-white">DemandsAI Generation</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="filename" className="block text-sm font-medium text-gray-300 mb-1">
            Filename
          </label>
          <div className="flex items-center gap-2">
            <input
              id="filename"
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Demand letter name"
              maxLength={maxLength}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 placeholder-gray-500"
            />
            <span className="text-sm text-gray-400 whitespace-nowrap">.vine</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            {error && <span className="text-sm text-red-400">{error}</span>}
            <span className={`text-sm ml-auto ${remainingChars < 20 ? 'text-red-400' : 'text-gray-400'}`}>
              {remainingChars}/{maxLength}
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="template" className="block text-sm font-medium text-gray-300 mb-1">
            Template (Optional)
          </label>
          <TemplateSelector
            templates={templates}
            value={selectedTemplateId || ''}
            onChange={(val) => setSelectedTemplateId(val || undefined)}
          />
        </div>

        {/* Custom Instructions */}
        <div>
          <label htmlFor="customPrompt" className="block text-sm font-medium text-gray-300 mb-1">
            Custom Instructions
          </label>
          <textarea
            id="customPrompt"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="I want to focus on this part..."
            className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm min-h-[100px] resize-y"
          />
          <p className="text-xs text-gray-400 mt-1">
            Add specific instructions for AI generation (e.g., "Focus on the medical treatment timeline")
          </p>
        </div>

        {/* Supporting Documents */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Supporting Documents
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-md cursor-pointer hover:bg-gray-700 transition-colors">
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300">Upload Documents (PDF, DOCX)</span>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.doc"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            {supportingFiles.length > 0 && (
              <div className="space-y-1 mt-2">
                {supportingFiles.map((file, idx) => (
                  <div key={idx} className="text-xs text-gray-400 flex items-center justify-between px-2 py-1 bg-gray-800 rounded">
                    <span>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-4 py-3 flex items-center justify-between text-white hover:bg-gray-700 transition-colors rounded-lg"
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
            <div className="p-4 space-y-4 border-t border-gray-700">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Target/Recipient
                </label>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="Insurance Company Name"
                  className="w-full px-3 py-2 bg-gray-900 text-white border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  The recipient of the demand letter
                </p>
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Date of Letter
                </label>
                <input
                  type="date"
                  value={dateOfLetter}
                  onChange={(e) => setDateOfLetter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 text-white border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Defaults to current date
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Generate All Sections Option */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="generateAll"
            checked={generateAllSections}
            onChange={(e) => setGenerateAllSections(e.target.checked)}
            className="w-4 h-4 text-forest-500 bg-gray-800 border-gray-700 rounded focus:ring-forest-500"
          />
          <label htmlFor="generateAll" className="text-sm text-gray-300">
            Generate all sections automatically after creation
          </label>
        </div>

        <button
          type="submit"
          disabled={creating || !filename.trim()}
          className="w-full px-4 py-2 bg-forest-500 text-white rounded-md hover:bg-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {creating ? (generateAllSections ? 'Creating and Generating...' : 'Creating...') : 'Generate'}
        </button>
      </form>
    </div>
  )
}

