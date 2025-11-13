import React from 'react'
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer'

interface Section {
  sectionType: string
  content: string
  order: number
}

interface CaseInfo {
  claimNumber?: string
  insured?: string
  dateOfLoss?: string
  client?: string
  adjuster?: string
  dateOfLetter?: string
  target?: string
}

interface StyleMetadata {
  fonts?: {
    heading?: string
    body?: string
  }
  spacing?: {
    paragraph?: number
    section?: number
  }
  headers?: {
    style?: 'bold' | 'underline' | 'both'
    size?: number
  }
  margins?: {
    top?: number
    bottom?: number
    left?: number
    right?: number
  }
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

// Create styles
const createStyles = (styleMetadata?: StyleMetadata | null) => {
  // Normalize font names - map Times New Roman to Helvetica (built-in fonts)
  const normalizeFont = (fontName?: string, defaultFont: string = 'Helvetica'): string => {
    if (!fontName) return defaultFont
    const normalized = fontName.toLowerCase()
    if (normalized.includes('times')) {
      return defaultFont // Use Helvetica instead of Times
    }
    // Map common font names to react-pdf built-in fonts
    if (normalized.includes('helvetica')) return 'Helvetica'
    if (normalized.includes('courier')) return 'Courier'
    // Default to Helvetica for unknown fonts
    return defaultFont
  }
  
  const bodyFont = normalizeFont(styleMetadata?.fonts?.body, 'Helvetica')
  const headingFont = normalizeFont(styleMetadata?.fonts?.heading, 'Helvetica-Bold')
  const headingSize = styleMetadata?.headers?.size || 14

  return StyleSheet.create({
    page: {
      paddingTop: styleMetadata?.margins?.top || 72,
      paddingBottom: styleMetadata?.margins?.bottom || 72,
      paddingLeft: styleMetadata?.margins?.left || 72,
      paddingRight: styleMetadata?.margins?.right || 72,
      fontFamily: bodyFont,
      fontSize: 12,
      lineHeight: 1.5,
    },
    title: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'left',
    },
    caseInfo: {
      marginBottom: 20,
      fontSize: 11,
    },
    caseInfoLine: {
      marginBottom: 4,
    },
    salutation: {
      marginTop: 20,
      marginBottom: 20,
    },
    sectionHeading: {
      fontSize: headingSize,
      fontWeight: 'bold',
      textAlign: 'center',
      marginTop: styleMetadata?.spacing?.section ? styleMetadata.spacing.section * 12 : 24,
      marginBottom: 12,
      textDecoration: styleMetadata?.headers?.style === 'underline' || styleMetadata?.headers?.style === 'both' ? 'underline' : 'none',
      color: '#000000', // Black color for section labels
    },
    paragraph: {
      marginBottom: styleMetadata?.spacing?.paragraph ? styleMetadata.spacing.paragraph * 12 : 12,
      textAlign: 'justify',
    },
    bold: {
      fontWeight: 'bold',
    },
    italic: {
      fontStyle: 'italic',
    },
  })
}

export function generatePDFDocument(
  sections: Section[],
  caseInfo: CaseInfo,
  styleMetadata?: StyleMetadata | null,
  includeMetadata: boolean = true,
  logoUrl?: string | null
) {
  const styles = createStyles(styleMetadata)
  
  // Filter out empty sections and sections with placeholder text
  const validSections = sections.filter((section) => {
    const content = section.content.trim()
    if (!content) return false
    
    // Filter out placeholder text
    const placeholderTexts = [
      'No content yet',
      'Click "Generate"',
      'Click \'Generate\'',
      'to create this section',
    ]
    const lowerContent = content.toLowerCase()
    if (placeholderTexts.some(placeholder => lowerContent.includes(placeholder.toLowerCase()))) {
      return false
    }
    
    return true
  })
  
  const sortedSections = validSections.sort((a, b) => a.order - b.order)

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Document header */}
        {includeMetadata && (
          <View>
            {/* Logo at the top */}
            {logoUrl && (
              <View style={{ marginBottom: 20, alignItems: 'flex-start' }}>
                <Image
                  src={logoUrl}
                  style={{ width: 200, height: 60 }}
                  cache={false}
                />
              </View>
            )}

            <Text style={styles.title}>
              RE: {(caseInfo.client || 'CLIENT').toUpperCase()}'S DEMAND
            </Text>

            {(caseInfo.claimNumber || caseInfo.insured || caseInfo.dateOfLoss || caseInfo.client || caseInfo.target) && (
              <View style={styles.caseInfo}>
                {caseInfo.target && (
                  <Text style={styles.caseInfoLine}>To: {caseInfo.target}</Text>
                )}
                {caseInfo.claimNumber && (
                  <Text style={styles.caseInfoLine}>Claim No: {caseInfo.claimNumber}</Text>
                )}
                {caseInfo.insured && (
                  <Text style={styles.caseInfoLine}>Your Insured: {caseInfo.insured}</Text>
                )}
                {caseInfo.dateOfLoss && (
                  <Text style={styles.caseInfoLine}>
                    Date of Loss: {new Date(caseInfo.dateOfLoss).toLocaleDateString()}
                  </Text>
                )}
                {caseInfo.client && (
                  <Text style={styles.caseInfoLine}>Our Client: {caseInfo.client}</Text>
                )}
                {caseInfo.dateOfLetter && (
                  <Text style={styles.caseInfoLine}>
                    Date of Letter: {new Date(caseInfo.dateOfLetter).toLocaleDateString()}
                  </Text>
                ) || (
                  <Text style={styles.caseInfoLine}>
                    Date of Letter: {new Date().toLocaleDateString()}
                  </Text>
                )}
              </View>
            )}

            {(caseInfo.target || caseInfo.adjuster) && (
              <Text style={styles.salutation}>
                Dear {caseInfo.adjuster || caseInfo.target || 'Sir or Madam'},
              </Text>
            )}
          </View>
        )}

        {/* Sections */}
        {sortedSections.length > 0 ? sortedSections.map((section) => {
          const sectionLabel = sectionLabels[section.sectionType] || section.sectionType.toUpperCase().replace(/_/g, ' ')
          const paragraphs = section.content.split('\n\n').filter((p) => p.trim())

          return (
            <View key={section.sectionType}>
              <Text style={styles.sectionHeading}>{sectionLabel}</Text>
              {paragraphs.map((para, idx) => {
                // Simple formatting - can be enhanced
                const isBold = para.includes('**')
                const isItalic = para.includes('*') && !isBold

                return (
                  <Text key={idx} style={[styles.paragraph, isBold && styles.bold, isItalic && styles.italic]}>
                    {para.replace(/\*\*/g, '').replace(/\*/g, '')}
                  </Text>
                )
              })}
            </View>
          )
        }) : null}
      </Page>
    </Document>
  )
}

// Note: PDF generation is handled directly in the API route to avoid SSR issues

