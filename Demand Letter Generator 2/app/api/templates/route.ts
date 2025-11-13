import { NextRequest, NextResponse } from 'next/server'
import { templateService } from '@/lib/templates/service'
import { z } from 'zod'

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  content: z.string().optional().nullable(),
  styleMetadata: z.any().optional().nullable(),
  toneMetadata: z.any().optional().nullable(),
  sections: z.array(z.string()).optional(),
})

// GET /api/templates
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const includeDefaults = searchParams.get('includeDefault') !== 'false'

    const templates = await templateService.getAll(includeDefaults)

    return NextResponse.json({
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        isDefault: t.isDefault,
        createdAt: t.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

// POST /api/templates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = createTemplateSchema.parse(body)

    const template = await templateService.create(validated)

    return NextResponse.json({
      success: true,
      template,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    )
  }
}

