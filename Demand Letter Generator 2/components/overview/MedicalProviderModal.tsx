'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface MedicalProvider {
  id: string
  providerName: string
  amount: number | null
  chronology: string | null
  summary: string | null
  isSelected: boolean
}

interface MedicalProviderModalProps {
  open: boolean
  onClose: () => void
  providers: MedicalProvider[]
  onUpdate: (selectedIds: string[]) => Promise<void>
}

export default function MedicalProviderModal({
  open,
  onClose,
  providers,
  onUpdate,
}: MedicalProviderModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (open) {
      const selected = new Set(
        providers.filter((p) => p.isSelected).map((p) => p.id)
      )
      setSelectedIds(selected)
    }
  }, [open, providers])

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedIds.size === providers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(providers.map((p) => p.id)))
    }
  }

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      await onUpdate(Array.from(selectedIds))
      onClose()
    } catch (error) {
      console.error('Failed to update providers:', error)
    } finally {
      setUpdating(false)
    }
  }

  const allSelected = providers.length > 0 && selectedIds.size === providers.length

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden z-50 flex flex-col">
          <div className="flex items-center justify-between p-6 border-b">
            <Dialog.Title className="text-xl font-semibold">
              Select Medical data
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <span className="text-2xl">×</span>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {providers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No medical providers available. Upload medical records to extract provider data.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={handleSelectAll}
                          className="mr-2"
                        />
                        Medical Provider
                      </th>
                      <th className="text-left p-3">Amount</th>
                      <th className="text-left p-3">AI Chronology</th>
                      <th className="text-left p-3">AI Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((provider) => (
                      <tr key={provider.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(provider.id)}
                            onChange={() => handleToggle(provider.id)}
                            className="mr-2"
                          />
                          {provider.providerName}
                        </td>
                        <td className="p-3">
                          {provider.amount
                            ? `$${provider.amount.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : '-'}
                        </td>
                        <td className="p-3 max-w-md">
                          <div className="max-h-32 overflow-y-auto text-sm text-gray-600">
                            {provider.chronology || '-'}
                          </div>
                        </td>
                        <td className="p-3 max-w-md">
                          <div className="max-h-32 overflow-y-auto text-sm text-gray-600">
                            {provider.summary || '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 p-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'Updating...' : 'Update'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

