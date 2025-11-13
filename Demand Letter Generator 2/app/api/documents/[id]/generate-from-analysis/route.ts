import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'
import { generateSection } from '@/lib/ai/generator'
import { documentService } from '@/lib/documents/service'
import { z } from 'zod'

const generateFromAnalysisSchema = z.object({
  analysisId: z.string(),
  templateId: z.string().optional(),
  generateAllSections: z.boolean().default(true),
})

// POST /api/documents/:id/generate-from-analysis
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const body = await request.json()
    const validated = generateFromAnalysisSchema.parse(body)

    // Verify document ownership
    const document = await documentService.getById(params.id, user.userId)
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get analysis
    const analysis = await prisma.documentAnalysis.findFirst({
      where: {
        id: validated.analysisId,
        userId: user.userId,
      },
    })

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analysis not found' },
        { status: 404 }
      )
    }

    if (analysis.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Analysis is not completed yet' },
        { status: 400 }
      )
    }

    const analysisData = analysis.analysisData as any

    // Extract case info from analysis using pattern matching
    const extractedCaseInfo: any = {
      dateOfLetter: new Date().toISOString().split('T')[0], // Default to current date
    }

    // Combine all text from analysis for pattern matching
    const allText = [
      analysisData.summary || '',
      ...(analysisData.facts || []).map((f: any) => f.text || '').join(' '),
      ...(analysisData.legalPoints || []).map((lp: any) => lp.text || '').join(' '),
    ].join(' ').toLowerCase()

    // Extract claim number (common patterns: "claim #", "claim number", "case #", etc.)
    const claimNumberMatch = allText.match(/(?:claim|case)[\s#:]*([a-z0-9\-]+)/i)
    if (claimNumberMatch) {
      extractedCaseInfo.claimNumber = claimNumberMatch[1].toUpperCase()
    }

    // Extract adjuster name (look for "adjuster:", "claims adjuster", etc.)
    const adjusterMatch = allText.match(/(?:adjuster|claims\s+adjuster)[\s:]+([a-z\s]+?)(?:\.|,|$|\n)/i)
    if (adjusterMatch) {
      extractedCaseInfo.adjuster = adjusterMatch[1].trim().split(/\s+/).map((w: string) => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ')
    }

    // Extract client name (look for "client:", "plaintiff:", "claimant:", etc.)
    const clientMatch = allText.match(/(?:client|plaintiff|claimant|injured\s+party)[\s:]+([a-z\s]+?)(?:\.|,|$|\n)/i)
    if (clientMatch) {
      extractedCaseInfo.client = clientMatch[1].trim().split(/\s+/).map((w: string) => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ')
    }

    // Extract insured name (look for "insured:", "defendant:", etc.)
    const insuredMatch = allText.match(/(?:insured|defendant|policyholder)[\s:]+([a-z\s]+?)(?:\.|,|$|\n)/i)
    if (insuredMatch) {
      extractedCaseInfo.insured = insuredMatch[1].trim().split(/\s+/).map((w: string) => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ')
    }

    // Extract insurance company/target (look for insurance company names)
    const insuranceCompanyMatch = allText.match(/(?:insurance\s+company|insurer|carrier)[\s:]+([a-z\s&]+?)(?:\.|,|$|\n)/i)
    if (insuranceCompanyMatch) {
      extractedCaseInfo.target = insuranceCompanyMatch[1].trim().split(/\s+/).map((w: string) => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ')
    }

    // Extract dates from facts
    if (analysisData.facts && Array.isArray(analysisData.facts)) {
      const dates = analysisData.facts
        .map((f: any) => f.date)
        .filter((d: any) => d)
        .sort()
      if (dates.length > 0) {
        extractedCaseInfo.dateOfLoss = dates[0] // Use earliest date as date of loss
      }
      
      // Also try to extract date from fact text if no explicit date field
      if (!extractedCaseInfo.dateOfLoss) {
        for (const fact of analysisData.facts) {
          const dateMatch = (fact.text || '').match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/)
          if (dateMatch) {
            extractedCaseInfo.dateOfLoss = dateMatch[1]
            break
          }
        }
      }
    }

    // Extract amounts from damages
    if (analysisData.damages && Array.isArray(analysisData.damages)) {
      const totalAmount = analysisData.damages
        .filter((d: any) => d.amount)
        .reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
      if (totalAmount > 0) {
        extractedCaseInfo.totalDamages = totalAmount
      }
    }

    // Update document metadata with extracted case info
    // Note: analysisId is stored in metadata, not as a direct field on Document
    const currentMetadata = (document.metadata as any) || {}
    await prisma.document.update({
      where: { id: params.id },
      data: {
        metadata: {
          ...currentMetadata,
          caseInfo: {
            ...(currentMetadata.caseInfo || {}),
            ...extractedCaseInfo,
          },
          // Store analysisId in metadata for reference (not as a direct field)
          analysisId: validated.analysisId,
        },
      },
    })

    // Link source document and update analysis documentId to this document
    if (analysis.sourceDocumentId) {
      try {
        await prisma.sourceDocument.update({
          where: { id: analysis.sourceDocumentId },
          data: { documentId: params.id },
        })
      } catch (linkError) {
        console.error('Failed to link source document:', linkError)
        // Continue even if linking fails
      }
    }

    // Update analysis documentId to point to this document
    if (analysis.documentId !== params.id) {
      try {
        await prisma.documentAnalysis.update({
          where: { id: validated.analysisId },
          data: { documentId: params.id },
        })
      } catch (updateError) {
        console.error('Failed to update analysis documentId:', updateError)
        // Continue even if update fails
      }
    }

    // Get template sections or use default
    let sectionTypes: string[] = []
    if (validated.templateId) {
      const template = await prisma.template.findUnique({
        where: { id: validated.templateId },
      })
      if (template && (template as any).sections) {
        sectionTypes = (template as any).sections
      }
    }

    if (sectionTypes.length === 0) {
      // Default sections
      sectionTypes = [
        'introduction',
        'statement_of_facts',
        'liability',
        'damages',
        'conclusion',
      ]
    }

    // Generate all sections if requested
    const generatedSections: Array<{sectionType: string, content: string}> = []

    if (validated.generateAllSections) {
      for (let i = 0; i < sectionTypes.length; i++) {
        const sectionType = sectionTypes[i]

        try {
          const result = await generateSection({
            documentId: params.id,
            sectionType,
            context: {
              caseInfo: extractedCaseInfo,
              analysisPoints: {
                legalPoints: analysisData.legalPoints || [],
                facts: analysisData.facts || [],
                damages: analysisData.damages || [],
              },
              analysisId: validated.analysisId,
            },
          })

          if (result.success && result.content) {
            // Check if section already exists
            const existingSection = await prisma.documentSection.findFirst({
              where: {
                documentId: params.id,
                sectionType,
              },
            })

            if (existingSection) {
              // Update existing section
              await prisma.documentSection.update({
                where: { id: existingSection.id },
                data: {
                  content: result.content,
                  isGenerated: true,
                },
              })
            } else {
              // Create new section
              await prisma.documentSection.create({
                data: {
                  documentId: params.id,
                  sectionType,
                  content: result.content,
                  order: i,
                  isGenerated: true,
                },
              })
            }

            generatedSections.push({
              sectionType,
              content: result.content,
            })
          }
        } catch (sectionError) {
          console.error(`Failed to generate section ${sectionType}:`, sectionError)
          // Continue with next section
        }
      }
    }

    return NextResponse.json({
      success: true,
      documentId: params.id,
      sections: generatedSections,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      )
    }

    console.error('Generate from analysis error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate from analysis',
      },
      { status: 500 }
    )
  }
}

