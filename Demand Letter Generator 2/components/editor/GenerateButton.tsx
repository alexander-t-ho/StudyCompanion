'use client'

import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import CircularProgress from '@/components/ui/CircularProgress'

interface GenerateButtonProps {
  sectionType: string
  hasContent: boolean
  onGenerate: () => Promise<void>
  generating?: boolean
  progress?: {
    percentage: number
    currentSection?: string
  } | null
}

export default function GenerateButton({
  sectionType,
  hasContent,
  onGenerate,
  generating = false,
  progress = null,
}: GenerateButtonProps) {
  const [hovered, setHovered] = useState(false)

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

  const label = sectionLabels[sectionType] || sectionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  if (generating || progress) {
    return (
      <div className="flex flex-col items-start gap-2 py-2">
        {progress ? (
          <CircularProgress
            percentage={progress.percentage}
            currentSection={progress.currentSection}
            size={50}
            strokeWidth={5}
          />
        ) : (
          <div className="flex items-center gap-2 text-blue-600">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Generating...</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={onGenerate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 underline decoration-blue-600 hover:decoration-blue-700 text-sm font-normal py-2 transition-colors"
    >
      <Plus className={`w-4 h-4 transition-transform ${hovered ? 'rotate-90' : ''}`} />
      {hasContent ? `Re-generate ${label}` : `Generate ${label}`}
    </button>
  )
}

