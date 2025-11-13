'use client'

import { useState, useEffect } from 'react'
import GenerateButton from './GenerateButton'
import SectionContextMenu from './SectionContextMenu'

interface Section {
  id: string
  sectionType: string
  content: string
  order: number
  isGenerated: boolean
}

interface SectionEditorProps {
  section: Section
  isFirst: boolean
  isLast: boolean
  onGenerate: (sectionId: string, sectionType: string) => Promise<void>
  onUpdate: (sectionId: string, content: string) => Promise<void>
  onDelete: (sectionId: string) => Promise<void>
  onMoveUp: (sectionId: string) => void
  onMoveDown: (sectionId: string) => void
  onAddBefore: (sectionType: string) => void
  onAddAfter: (sectionType: string) => void
  generating?: boolean
  isPlaceholder?: boolean
  onSelect?: () => void
  isSelected?: boolean
  progress?: {
    percentage: number
    currentSection?: string
  } | null
}

const sectionLabels: Record<string, string> = {
  introduction: 'INTRODUCTION',
  statement_of_facts: 'STATEMENT OF FACTS',
  liability: 'LIABILITY',
  damages: 'DAMAGES',
  medical_chronology: 'MEDICAL/INJURY CHRONOLOGY',
  economic_damages: 'ECONOMIC DAMAGES',
  treatment_reasonableness: 'REASONABLENESS AND NECESSITY OF TREATMENT',
  conclusion: 'CONCLUSION',
  coverage_analysis: 'COVERAGE ANALYSIS',
  policy_limits: 'POLICY LIMITS',
  negligence_analysis: 'NEGLIGENCE ANALYSIS',
  comparative_fault: 'COMPARATIVE FAULT',
}

export default function SectionEditor({
  section,
  isFirst,
  isLast,
  onGenerate,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddBefore,
  onAddAfter,
  generating = false,
  isPlaceholder = false,
  onSelect,
  isSelected = false,
  progress = null,
}: SectionEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(section.content)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEditContent(section.content)
  }, [section.content])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdate(section.id, editContent)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save section:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditContent(section.content)
      setIsEditing(false)
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }

  const sectionLabel = sectionLabels[section.sectionType] || section.sectionType.toUpperCase().replace(/_/g, ' ')
  const hasContent = section.content.trim().length > 0

  return (
    <div className={`mb-8 group ${isSelected ? 'ring-2 ring-forest-500 rounded-lg p-2' : ''}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 
          className="text-center font-bold underline text-lg w-full cursor-pointer hover:text-forest-600 transition-colors"
          onClick={onSelect}
        >
          {sectionLabel}
        </h2>
        {!isPlaceholder && (
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <SectionContextMenu
              onEdit={() => setIsEditing(true)}
              onAddBefore={() => onAddBefore(section.sectionType)}
              onAddAfter={() => onAddAfter(section.sectionType)}
              onMoveUp={() => onMoveUp(section.id)}
              onMoveDown={() => onMoveDown(section.id)}
              onDelete={() => {
                if (confirm('Are you sure you want to delete this section?')) {
                  onDelete(section.id)
                }
              }}
              canMoveUp={!isFirst}
              canMoveDown={!isLast}
            />
          </div>
        )}
      </div>

      {/* Section Content */}
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="w-full min-h-[200px] px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 font-serif text-sm leading-relaxed text-black bg-white"
            autoFocus
          />
          <div className="flex justify-end gap-2 text-xs text-gray-500">
            <span>Press Ctrl+S to save, Esc to cancel</span>
            {saving && <span className="text-forest-500">Saving...</span>}
          </div>
        </div>
      ) : (
        <div>
          {hasContent ? (
            <div
              onClick={() => setIsEditing(true)}
              className="px-4 py-3 border border-transparent hover:border-gray-200 rounded-md cursor-text font-serif text-sm leading-relaxed whitespace-pre-wrap text-black"
            >
              {section.content}
            </div>
          ) : (
            <div className="px-4 py-3 text-gray-400 italic">
              No content yet. Click "Generate" to create this section.
            </div>
          )}
        </div>
      )}

      {/* Generate/Re-generate Button */}
      <div className="mt-2">
        <GenerateButton
          sectionType={section.sectionType}
          hasContent={hasContent}
          onGenerate={() => onGenerate(section.id, section.sectionType)}
          generating={generating}
          progress={progress}
        />
      </div>
    </div>
  )
}

