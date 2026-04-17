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

export function checkPassword(password: string): boolean {
  const adminPassword = requireEnv('ADMIN_PASSWORD')
  const a = Buffer.from(adminPassword)
  const b = Buffer.from(password)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
