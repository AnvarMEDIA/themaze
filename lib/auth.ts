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
const EXPIRES_IN         = '8h'                 // Short-lived admin sessions
export const COOKIE_MAX_AGE = 60 * 60 * 8       // Match JWT expiry — 8 hours
const ISSUER             = 'maze.uz/admin'      // Pinned to this app
const AUDIENCE           = 'maze.uz/admin-ui'   // Pinned to the admin UI

export async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject('admin')
    .setExpirationTime(EXPIRES_IN)
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret(), {
      algorithms: ['HS256'],
      issuer:     ISSUER,
      audience:   AUDIENCE,
    })
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
  // Pad to equal length so timingSafeEqual always runs the full comparison.
  // The length check is done separately but both buffers are always compared.
  const len = Math.max(a.length, b.length)
  const pa  = Buffer.alloc(len)
  const pb  = Buffer.alloc(len)
  a.copy(pa)
  b.copy(pb)
  return a.length === b.length && timingSafeEqual(pa, pb)
}
