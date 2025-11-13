/**
 * Password validation for POC
 * Hardcoded password: 123456 for all users
 */
export const HARDCODED_PASSWORD = '123456'

/**
 * Validate password (hardcoded for POC)
 */
export function validatePassword(password: string): boolean {
  return password === HARDCODED_PASSWORD
}

