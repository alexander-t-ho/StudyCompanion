'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreVertical, Edit, Plus, ArrowUp, ArrowDown, Trash2, FileText } from 'lucide-react'

interface SectionContextMenuProps {
  onEdit: () => void
  onAddBefore: () => void
  onAddAfter: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}

export default function SectionContextMenu({
  onEdit,
  onAddBefore,
  onAddAfter,
  onMoveUp,
  onMoveDown,
  onDelete,
  canMoveUp,
  canMoveDown,
}: SectionContextMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="p-1 hover:bg-gray-100 rounded transition-colors">
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[200px] bg-white rounded-md shadow-lg border border-gray-200 p-1 z-50"
          align="end"
        >
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none"
            onSelect={onEdit}
          >
            <Edit className="w-4 h-4" />
            Edit section
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />

          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none"
            onSelect={onAddBefore}
          >
            <Plus className="w-4 h-4" />
            Add section before
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none"
            onSelect={onAddAfter}
          >
            <Plus className="w-4 h-4" />
            Add section after
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />

          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            onSelect={onMoveUp}
            disabled={!canMoveUp}
          >
            <ArrowUp className="w-4 h-4" />
            Move section up
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            onSelect={onMoveDown}
            disabled={!canMoveDown}
          >
            <ArrowDown className="w-4 h-4" />
            Move section down
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />

          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded cursor-pointer outline-none"
            onSelect={onDelete}
          >
            <Trash2 className="w-4 h-4" />
            Delete section
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

