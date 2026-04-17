import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { timingSafeEqual } from 'crypto'

// Fail hard at startup if secrets are missing — never silently use a fallback
function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`[auth] ${key} environment variable is required`)
  return value
}

function getSecret(): Uint8Array {
  return new TextEncoder().encode(requireEnv('JWT_SECRET'))
}

export const COOKIE_NAME = 'maze_admin_token'
const EXPIRES_IN         = '8h'     // Short-lived admin sessions

export async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret())
    return true
  } catch {
    return false
  }
}

export async function getAdminSession(): Promise<boolean> {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return false
  return verifyToken(token)
}

/**
 * Constant-time password comparison to prevent timing attacks.
 * Uses crypto.timingSafeEqual — always compares equal-length buffers.
 */
export function checkPassword(password: string): boolean {
  const adminPassword = requireEnv('ADMIN_PASSWORD')

  // Pad/truncate both to the same length before comparing
  // (timingSafeEqual requires same-length buffers)
  const expected = Buffer.from(adminPassword)
  const given    = Buffer.alloc(expected.length)
  Buffer.from(password).copy(given)

  return timingSafeEqual(expected, given) && password.length === adminPassword.length
}
