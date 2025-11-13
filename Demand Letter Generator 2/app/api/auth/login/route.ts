import { NextRequest, NextResponse } from 'next/server'
import { validatePassword } from '@/lib/auth/password'
import { generateToken } from '@/lib/auth/jwt'
import { getUserByEmail, createUser } from '@/lib/db/queries'
import { cookies } from 'next/headers'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = loginSchema.parse(body)

    // Validate password (hardcoded: 123456)
    if (!validatePassword(validated.password)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Get or create user
    let user = await getUserByEmail(validated.email)
    if (!user) {
      // Create user on first login (no password hash needed for POC)
      user = await createUser(validated.email, 'no-hash-needed')
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    })

    // Set HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      )
    }

    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    )
  }
}

