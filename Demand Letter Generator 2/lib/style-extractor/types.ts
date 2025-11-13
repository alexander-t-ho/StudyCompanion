export interface StyleMetadata {
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
    section?: {
      top?: number
      bottom?: number
    }
  }
}

