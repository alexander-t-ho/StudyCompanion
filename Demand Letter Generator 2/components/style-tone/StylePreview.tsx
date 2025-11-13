'use client'

interface StyleMetadata {
  fonts?: {
    heading?: string
    body?: string
    headingSize?: number
    bodySize?: number
  }
  spacing?: {
    paragraph?: string
    section?: string
    lineHeight?: number
  }
  headers?: {
    style?: 'bold' | 'underline' | 'both'
    sizeHierarchy?: number[]
  }
  lists?: {
    bulletStyle?: string
    numberingStyle?: string
    indentation?: number
  }
  alignment?: {
    default?: 'left' | 'center' | 'right' | 'justify'
  }
  margins?: {
    page?: {
      top?: number
      bottom?: number
      left?: number
      right?: number
    }
  }
}

interface StylePreviewProps {
  styleMetadata?: StyleMetadata | null
}

export default function StylePreview({ styleMetadata }: StylePreviewProps) {
  if (!styleMetadata) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-sm text-gray-500">No style metadata available</p>
      </div>
    )
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Style Preview</h4>
      
      <div className="space-y-2 text-sm">
        {styleMetadata.fonts && (
          <div>
            <span className="font-medium text-gray-700">Fonts: </span>
            <span className="text-gray-600">
              {styleMetadata.fonts.heading || 'N/A'} / {styleMetadata.fonts.body || 'N/A'}
            </span>
          </div>
        )}

        {styleMetadata.spacing && (
          <div>
            <span className="font-medium text-gray-700">Spacing: </span>
            <span className="text-gray-600">
              Paragraph: {styleMetadata.spacing.paragraph || 'N/A'}, 
              Line Height: {styleMetadata.spacing.lineHeight || 'N/A'}
            </span>
          </div>
        )}

        {styleMetadata.headers && (
          <div>
            <span className="font-medium text-gray-700">Headers: </span>
            <span className="text-gray-600">
              {styleMetadata.headers.style || 'N/A'}
            </span>
          </div>
        )}

        {styleMetadata.alignment && (
          <div>
            <span className="font-medium text-gray-700">Alignment: </span>
            <span className="text-gray-600">
              {styleMetadata.alignment.default || 'N/A'}
            </span>
          </div>
        )}

        {styleMetadata.margins?.page && (
          <div>
            <span className="font-medium text-gray-700">Margins: </span>
            <span className="text-gray-600">
              {styleMetadata.margins.page.top || 0}pt all around
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

