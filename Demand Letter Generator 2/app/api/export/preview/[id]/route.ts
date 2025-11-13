import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { documentService } from '@/lib/documents/service'

// GET /api/export/preview/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    // Get document with sections
    const document = await documentService.getById(params.id, user.userId)
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get case info
    const caseInfo = document.metadata?.caseInfo || {}
    const sections = document.sections.sort((a, b) => a.order - b.order)

    // Generate HTML preview
    const html = generateHTMLPreview(sections, caseInfo)

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}

function generateHTMLPreview(sections: any[], caseInfo: any): string {
  const sectionLabels: Record<string, string> = {
    introduction: 'INTRODUCTION',
    statement_of_facts: 'STATEMENT OF FACTS',
    liability: 'LIABILITY',
    damages: 'DAMAGES',
    medical_chronology: 'MEDICAL/INJURY CHRONOLOGY',
    economic_damages: 'ECONOMIC DAMAGES',
    treatment_reasonableness: 'REASONABLENESS AND NECESSITY OF TREATMENT',
    conclusion: 'CONCLUSION',
  }

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Document Preview</title>
      <style>
        body {
          font-family: 'Times New Roman', serif;
          max-width: 8.5in;
          margin: 0 auto;
          padding: 1in;
          line-height: 1.5;
        }
        .title {
          font-size: 16pt;
          font-weight: bold;
          text-decoration: underline;
          margin-bottom: 20px;
        }
        .case-info {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        .salutation {
          margin: 20px 0;
        }
        .section-heading {
          font-size: 14pt;
          font-weight: bold;
          text-decoration: underline;
          text-align: center;
          margin: 24px 0 12px 0;
        }
        .paragraph {
          margin-bottom: 12px;
          text-align: justify;
        }
      </style>
    </head>
    <body>
  `

  // Title
  html += `<div class="title">RE: ${(caseInfo.client || 'CLIENT').toUpperCase()}'S DEMAND</div>`

  // Case info
  if (caseInfo.claimNumber || caseInfo.insured || caseInfo.dateOfLoss || caseInfo.client) {
    html += '<div class="case-info">'
    if (caseInfo.claimNumber) html += `<div>Claim No: ${caseInfo.claimNumber}</div>`
    if (caseInfo.insured) html += `<div>Your Insured: ${caseInfo.insured}</div>`
    if (caseInfo.dateOfLoss) {
      html += `<div>Date of Loss: ${new Date(caseInfo.dateOfLoss).toLocaleDateString()}</div>`
    }
    if (caseInfo.client) html += `<div>Our Client: ${caseInfo.client}</div>`
    html += '</div>'
  }

  // Salutation
  if (caseInfo.adjuster) {
    html += `<div class="salutation">Dear ${caseInfo.adjuster},</div>`
  }

  // Sections
  sections.forEach((section) => {
    if (!section.content.trim()) return

    const label = sectionLabels[section.sectionType] || section.sectionType.toUpperCase().replace(/_/g, ' ')
    html += `<div class="section-heading">${label}</div>`

    const paragraphs = section.content.split('\n\n').filter((p) => p.trim())
    paragraphs.forEach((para) => {
      const escaped = para
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
      html += `<div class="paragraph">${escaped}</div>`
    })
  })

  html += `
    </body>
    </html>
  `

  return html
}

