import { NextRequest, NextResponse } from 'next/server'
import { generateSection } from '@/lib/ai/generator'
import { z } from 'zod'

const generateRequestSchema = z.object({
  documentId: z.string(),
  sectionType: z.string(),
  context: z.object({
    caseInfo: z.any().optional(),
    selectedProviders: z.array(z.string()).optional(),
    sourceDocuments: z.array(z.string()).optional(),
    styleMetadata: z.any().optional(),
    toneMetadata: z.any().optional(),
    copyStyle: z.boolean().optional(),
    matchTone: z.boolean().optional(),
    customPrompt: z.string().optional(),
  }),
  customPrompt: z.string().optional(),
  prompt: z.string().optional(),
  model: z.string().optional(),
})

// POST /api/generate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = generateRequestSchema.parse(body)

    const result = await generateSection(validated)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      )
    }

    console.error('Error in generate endpoint:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

