'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Edit2 } from 'lucide-react'

interface SectionInstructionsProps {
  documentId: string
  sections: string[]
  customInstructions: Record<string, string>
  onSave: (instructions: Record<string, string>) => Promise<void>
}

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
  business_context: 'Business Context',
  business_impact: 'Business Impact',
  legal_basis: 'Legal Basis',
  circumstances: 'Circumstances',
  best_interests: 'Best Interests',
  estate_context: 'Estate Context',
  violations: 'Violations',
  remedies: 'Remedies',
}

export default function SectionInstructions({
  documentId,
  sections,
  customInstructions,
  onSave,
}: SectionInstructionsProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [instructions, setInstructions] = useState<Record<string, string>>(customInstructions || {})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    setInstructions(customInstructions || {})
  }, [customInstructions])

  const handleSectionClick = (sectionType: string) => {
    if (expandedSection === sectionType) {
      setExpandedSection(null)
    } else {
      setExpandedSection(sectionType)
    }
  }

  const handleInstructionChange = (sectionType: string, value: string) => {
    setInstructions({
      ...instructions,
      [sectionType]: value,
    })
  }

  const handleSave = async (sectionType: string) => {
    setSaving(sectionType)
    try {
      await onSave(instructions)
      setExpandedSection(null)
    } catch (error) {
      console.error('Failed to save instructions:', error)
      alert('Failed to save instructions. Please try again.')
    } finally {
      setSaving(null)
    }
  }

  if (sections.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-2">Custom Instructions</h3>
        <p className="text-gray-400 text-sm">No sections available. Sections will appear after selecting a template.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white">Custom Instructions</h3>
        <p className="text-sm text-gray-400 mt-1">
          Click on a section to add custom instructions for AI generation
        </p>
      </div>

      <div className="divide-y divide-gray-800">
        {sections.map((sectionType) => {
          const isExpanded = expandedSection === sectionType
          const sectionLabel = sectionLabels[sectionType] || sectionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          const hasInstructions = instructions[sectionType]?.trim().length > 0

          return (
            <div key={sectionType}>
              <button
                onClick={() => handleSectionClick(sectionType)}
                className="w-full px-4 py-3 flex items-center justify-between text-white hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">{sectionLabel}</span>
                  {hasInstructions && (
                    <span className="text-xs bg-forest-500 text-white px-2 py-0.5 rounded">
                      Has instructions
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="p-4 bg-gray-800 space-y-3">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Instructions for {sectionLabel}
                    </label>
                    <textarea
                      value={instructions[sectionType] || ''}
                      onChange={(e) => handleInstructionChange(sectionType, e.target.value)}
                      placeholder="Enter custom instructions for this section. For example: 'Focus on the medical treatment timeline' or 'Emphasize the economic impact'"
                      className="w-full px-3 py-2 bg-gray-900 text-white border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm min-h-[100px] resize-y"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      These instructions will be used when generating this section
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSave(sectionType)}
                      disabled={saving === sectionType}
                      className="px-4 py-2 bg-forest-500 text-white rounded-md hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {saving === sectionType ? 'Saving...' : 'Save Instructions'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

