import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/middleware'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

// POST /api/user/logo - Upload logo
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Upload to S3
    const fileExtension = file.name.split('.').pop()
    const s3Key = `logos/${user.userId}/${Date.now()}.${fileExtension}`
    const buffer = Buffer.from(await file.arrayBuffer())

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET || 'alexho-demand-letters',
        Key: s3Key,
        Body: buffer,
        ContentType: file.type,
        ACL: 'public-read',
      })
    )

    const logoUrl = `https://${process.env.AWS_S3_BUCKET || 'alexho-demand-letters'}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`

    // Update user with logo URL
    await prisma.user.update({
      where: { id: user.userId },
      data: { logoUrl },
    })

    return NextResponse.json({ success: true, logoUrl })
  } catch (error) {
    console.error('Logo upload error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload logo',
      },
      { status: 500 }
    )
  }
}

// GET /api/user/logo - Get current logo
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    const userRecord = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { logoUrl: true },
    })

    if (!userRecord) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, logoUrl: userRecord.logoUrl || null })
  } catch (error) {
    console.error('Get logo error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get logo',
      },
      { status: 500 }
    )
  }
}

// DELETE /api/user/logo - Remove logo
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    await prisma.user.update({
      where: { id: user.userId },
      data: { logoUrl: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete logo error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove logo',
      },
      { status: 500 }
    )
  }
}

