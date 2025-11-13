import { NextRequest } from 'next/server'
import { generateSectionStream } from '@/lib/ai/generator'
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
  }),
  prompt: z.string().optional(),
  model: z.string().optional(),
})

// POST /api/generate/stream
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = generateRequestSchema.parse(body)

    // Create a readable stream for Server-Sent Events
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of generateSectionStream(validated)) {
            const data = JSON.stringify(chunk) + '\n'
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            
            if (chunk.done || chunk.error) {
              controller.close()
              return
            }
          }
        } catch (error) {
          const errorData = JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: error.errors }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    console.error('Error in generate stream endpoint:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

