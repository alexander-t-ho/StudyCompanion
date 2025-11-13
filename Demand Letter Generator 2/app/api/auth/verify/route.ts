import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/middleware'

// GET /api/auth/verify
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)

  if (!user) {
    return NextResponse.json({
      valid: false,
    })
  }

  return NextResponse.json({
    valid: true,
    user: {
      id: user.userId,
      email: user.email,
    },
  })
}

