import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  Table,
  TableRow,
  TableCell,
  ExternalHyperlink,
  Media,
} from 'docx'

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

export async function exportToWord(
  sections: Section[],
  caseInfo: CaseInfo,
  styleMetadata?: StyleMetadata | null,
  includeMetadata: boolean = true,
  logoUrl?: string | null
): Promise<Buffer> {
  const children: Paragraph[] = []
  let logoImage: { width: number; height: number; data: Buffer } | null = null

  // Document header with case information
  if (includeMetadata) {
    // Logo at the top (if provided)
    if (logoUrl) {
      try {
        // Fetch logo image
        const logoResponse = await fetch(logoUrl)
        if (logoResponse.ok) {
          const logoBuffer = Buffer.from(await logoResponse.arrayBuffer())
          // Store logo data for later use with Media.addImage
          logoImage = {
            width: 200, // pixels
            height: 60, // pixels (adjust based on aspect ratio)
            data: logoBuffer,
          }
        }
      } catch (error) {
        console.error('Failed to load logo:', error)
        // Continue without logo if it fails to load
      }
    }

    // Title
    children.push(
      new Paragraph({
        text: `RE: ${(caseInfo.client || 'CLIENT').toUpperCase()}'S DEMAND`,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.LEFT,
        spacing: { after: 400 },
      })
    )

    // Case details
    if (caseInfo.claimNumber || caseInfo.insured || caseInfo.dateOfLoss || caseInfo.client || caseInfo.target) {
      const details: string[] = []
      if (caseInfo.target) details.push(`To: ${caseInfo.target}`)
      if (caseInfo.claimNumber) details.push(`Claim No: ${caseInfo.claimNumber}`)
      if (caseInfo.insured) details.push(`Your Insured: ${caseInfo.insured}`)
      if (caseInfo.dateOfLoss) {
        const date = new Date(caseInfo.dateOfLoss)
        details.push(`Date of Loss: ${date.toLocaleDateString()}`)
      }
      if (caseInfo.client) details.push(`Our Client: ${caseInfo.client}`)
      if (caseInfo.dateOfLetter) {
        const date = new Date(caseInfo.dateOfLetter)
        details.push(`Date of Letter: ${date.toLocaleDateString()}`)
      } else {
        const today = new Date()
        details.push(`Date of Letter: ${today.toLocaleDateString()}`)
      }

      details.forEach((detail) => {
        children.push(
          new Paragraph({
            text: detail,
            spacing: { after: 100 },
          })
        )
      })
    }

    // Salutation
    if (caseInfo.target || caseInfo.adjuster) {
      const salutation = caseInfo.adjuster 
        ? `Dear ${caseInfo.adjuster},`
        : caseInfo.target
        ? `Dear ${caseInfo.target},`
        : 'Dear Sir or Madam,'
      children.push(
        new Paragraph({
          text: salutation,
          spacing: { before: 200, after: 400 },
        })
      )
    }
  }

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

  sortedSections.forEach((section, index) => {

    // Section heading
    const sectionLabel = sectionLabels[section.sectionType] || section.sectionType.toUpperCase().replace(/_/g, ' ')
    
    const headingStyle = styleMetadata?.headers?.style || 'both'
    const headingRuns: TextRun[] = [
      new TextRun({
        text: sectionLabel,
        bold: headingStyle === 'bold' || headingStyle === 'both',
        underline: headingStyle === 'underline' || headingStyle === 'both' ? {} : undefined,
        size: (styleMetadata?.headers?.size || 14) * 2, // docx uses half-points
      }),
    ]

    children.push(
      new Paragraph({
        children: headingRuns,
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: {
          before: styleMetadata?.spacing?.section ? styleMetadata.spacing.section * 240 : 480,
          after: 240,
        },
      })
    )

    // Section content
    const content = section.content
    const paragraphs = content.split('\n\n').filter((p) => p.trim())

    paragraphs.forEach((para) => {
      const lines = para.split('\n')
      lines.forEach((line, lineIndex) => {
        if (line.trim()) {
          // Basic formatting detection (simple - can be enhanced)
          const runs: TextRun[] = []
          let currentText = line
          let bold = false
          let italic = false

          // Simple markdown-like formatting detection
          if (currentText.includes('**')) {
            // Bold text
            const parts = currentText.split('**')
            parts.forEach((part, i) => {
              if (i % 2 === 1) {
                runs.push(new TextRun({ text: part, bold: true }))
              } else if (part) {
                runs.push(new TextRun({ text: part }))
              }
            })
          } else {
            runs.push(new TextRun({ text: currentText }))
          }

          children.push(
            new Paragraph({
              children: runs.length > 0 ? runs : [new TextRun({ text: line })],
              spacing: {
                after: styleMetadata?.spacing?.paragraph ? styleMetadata.spacing.paragraph * 240 : 240,
              },
            })
          )
        }
      })
    })
  })

  // Prepare children with logo placeholder if available
  // Note: Full image support requires restructuring to use Media.addImage properly
  // For now, we'll add a placeholder that can be manually replaced
  const documentChildren = logoImage
    ? [
        new Paragraph({
          text: '[Company Logo - Image will be inserted here]',
          alignment: AlignmentType.LEFT,
          spacing: { after: 200 },
          style: 'Caption',
        }),
        ...children,
      ]
    : children

  // Create Word document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: styleMetadata?.margins?.top ? styleMetadata.margins.top * 20 : 1440, // 1 inch default
              bottom: styleMetadata?.margins?.bottom ? styleMetadata.margins.bottom * 20 : 1440,
              left: styleMetadata?.margins?.left ? styleMetadata.margins.left * 20 : 1440,
              right: styleMetadata?.margins?.right ? styleMetadata.margins.right * 20 : 1440,
            },
          },
        },
        children: documentChildren,
      },
    ],
    styles: {
      default: {
        document: {
          run: {
            font: styleMetadata?.fonts?.body || 'Times New Roman',
            size: 24, // 12pt in half-points
          },
        },
      },
    },
  })

  // Generate buffer
  const buffer = await Packer.toBuffer(doc)
  return buffer
}

