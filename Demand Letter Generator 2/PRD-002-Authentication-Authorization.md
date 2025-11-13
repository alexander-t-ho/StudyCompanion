# PRD-002: Authentication & Authorization

## Overview
Implement simple email/password authentication system with JWT-based session management for the Demand Letter Generator POC.

## Goals
- Provide secure user authentication
- Manage user sessions with JWT tokens
- Protect API routes and pages
- Simple password-based auth (hardcoded password: `123456` for all users)

## Authentication Flow
1. User submits email and password on login page
2. System validates password (hardcoded check: `123456`)
3. System generates JWT token
4. Token stored in HTTP-only cookie
5. Token validated on protected routes

## API Endpoints

### POST /api/auth/login
**Request:**
```typescript
{
  email: string
  password: string
}
```

**Response:**
```typescript
{
  success: boolean
  token?: string
  user?: {
    id: string
    email: string
  }
  error?: string
}
```

### GET /api/auth/verify
**Headers:** `Authorization: Bearer <token>`

**Response:**
```typescript
{
  valid: boolean
  user?: {
    id: string
    email: string
  }
}
```

### POST /api/auth/logout
**Response:**
```typescript
{
  success: boolean
}
```

## Implementation Details

### Password Validation
- For POC: Hardcoded password check (`password === "123456"`)
- All users can login with any email + password `123456`
- No password hashing required for POC
- User record created on first login if doesn't exist

### JWT Token
- **Secret**: Environment variable `JWT_SECRET`
- **Expiration**: 7 days
- **Payload**: `{ userId: string, email: string }`

### Session Management
- Token stored in HTTP-only cookie: `auth-token`
- Cookie settings:
  - `httpOnly: true`
  - `secure: true` (production)
  - `sameSite: 'lax'`
  - `maxAge: 7 days`

### Protected Routes
- Middleware to check JWT token
- Redirect to `/login` if unauthorized
- API routes return 401 if unauthorized

## File Structure
```
lib/
  auth/
    jwt.ts          # JWT token generation/verification
    middleware.ts   # Auth middleware
    password.ts     # Password validation (hardcoded)
app/
  api/
    auth/
      login/
        route.ts
      verify/
        route.ts
      logout/
        route.ts
  (auth)/
    login/
      page.tsx      # Login page UI
```

## Dependencies
- **PRD-001**: Database & Data Models (User model)

## Environment Variables
```
JWT_SECRET=<random-secret-string>
NEXTAUTH_URL=http://localhost:3000
```

## Deliverables
1. JWT utility functions
2. Authentication middleware
3. Login API endpoint
4. Verify API endpoint
5. Logout API endpoint
6. Login page UI component
7. Protected route wrapper

## Success Criteria
- Users can login with any email + password `123456`
- JWT tokens generated and validated correctly
- Protected routes require authentication
- Sessions persist across page refreshes
- Logout clears session

## Testing Requirements
- Unit tests for JWT functions
- Integration tests for login flow
- E2E tests for protected routes

