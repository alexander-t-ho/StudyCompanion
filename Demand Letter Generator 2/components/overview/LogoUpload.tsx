'use client'

import { useState, useEffect } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

export default function LogoUpload() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadLogo()
  }, [])

  const loadLogo = async () => {
    try {
      const response = await fetch('/api/user/logo')
      const data = await response.json()
      if (data.success && data.logoUrl) {
        setLogoUrl(data.logoUrl)
      }
    } catch (err) {
      console.error('Failed to load logo:', err)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only images (PNG, JPG, GIF, SVG) are allowed.')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 5MB.')
      return
    }

    setError('')
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/user/logo', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success && data.logoUrl) {
        setLogoUrl(data.logoUrl)
        alert('Logo uploaded successfully!')
      } else {
        setError(data.error || 'Failed to upload logo')
      }
    } catch (err) {
      setError('Failed to upload logo. Please try again.')
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove the logo?')) return

    try {
      // Update user to remove logo URL
      const response = await fetch('/api/user/logo', {
        method: 'DELETE',
      })

      const data = await response.json()
      if (data.success) {
        setLogoUrl(null)
        alert('Logo removed successfully!')
      } else {
        setError(data.error || 'Failed to remove logo')
      }
    } catch (err) {
      setError('Failed to remove logo. Please try again.')
      console.error('Remove error:', err)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Company Logo</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md text-red-300 text-sm">
          {error}
        </div>
      )}

      {logoUrl ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center p-4 bg-gray-800 rounded-md border border-gray-700">
            <img
              src={logoUrl}
              alt="Company Logo"
              className="max-h-32 max-w-full object-contain"
            />
          </div>
          <div className="flex gap-2">
            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-md cursor-pointer hover:bg-gray-700 transition-colors text-sm text-gray-300">
              <Upload className="w-4 h-4" />
              <span>Change Logo</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
            </label>
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center p-8 bg-gray-800 rounded-md border border-gray-700 border-dashed">
            <div className="text-center">
              <ImageIcon className="w-12 h-12 text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No logo uploaded</p>
            </div>
          </div>
          <label className="flex items-center justify-center gap-2 px-4 py-2 bg-forest-500 text-white rounded-md cursor-pointer hover:bg-forest-600 transition-colors text-sm">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Uploading...' : 'Upload Logo'}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        Your logo will appear at the top of exported demand letters. Recommended: PNG or SVG, max 5MB.
      </p>
    </div>
  )
}

