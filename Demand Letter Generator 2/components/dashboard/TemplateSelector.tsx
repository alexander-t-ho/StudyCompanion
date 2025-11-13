'use client'

import * as Select from '@radix-ui/react-select'
import { ChevronDown } from 'lucide-react'

interface Template {
  id: string
  name: string
  isDefault: boolean
}

interface TemplateSelectorProps {
  templates: Template[]
  value: string
  onChange: (value: string) => void
}

export default function TemplateSelector({ templates, value, onChange }: TemplateSelectorProps) {
  return (
    <Select.Root value={value || undefined} onValueChange={onChange}>
      <Select.Trigger className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 flex items-center justify-between bg-gray-800 text-white">
        <Select.Value placeholder="Select a template (optional)" className="text-gray-300" />
        <Select.Icon>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="bg-gray-800 rounded-md shadow-lg border border-gray-700 p-1 z-50 max-h-[300px] overflow-auto">
          <Select.Viewport>
            {templates.map((template) => (
              <Select.Item
                key={template.id}
                value={template.id}
                className="px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded cursor-pointer outline-none"
              >
                <Select.ItemText>{template.name}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

