import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from './jwt'
import { cookies } from 'next/headers'

export interface AuthUser {
  userId: string
  email: string
}

/**
 * Get authenticated user from request
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  // Try to get token from Authorization header
  const authHeader = request.headers.get('authorization')
  let token = extractTokenFromHeader(authHeader)

  // If no header, try to get from cookie
  if (!token) {
    const cookieStore = await cookies()
    token = cookieStore.get('auth-token')?.value || null
  }

  if (!token) {
    return null
  }

  const payload = verifyToken(token)
  if (!payload) {
    return null
  }

  return {
    userId: payload.userId,
    email: payload.email,
  }
}

/**
 * Require authentication middleware for API routes
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: AuthUser } | NextResponse> {
  const user = await getAuthUser(request)

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return { user }
}

/**
 * Set auth cookie
 */
export function setAuthCookie(token: string): void {
  // Note: In Next.js App Router, we need to use cookies() in Server Actions or Route Handlers
  // This is a helper function that should be called from route handlers
}

