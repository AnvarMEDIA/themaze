/**
 * Finance section auth — a SECOND gate on top of the admin session.
 *
 * To reach the finance area a user must (1) already hold a valid admin
 * session, and (2) unlock with a SEPARATE finance password. The finance
 * password is set from the UI (never an env var) and only its scrypt hash +
 * salt are persisted, under the `finance_auth` store key. Unlocking mints a
 * short-lived JWT with a distinct audience (`maze.uz/finance`) so an admin
 * token can never be replayed as a finance token, and vice-versa.
 *
 * Server-only (Node crypto + store). The middleware verifies the finance JWT
 * inline via `jose` (edge-safe) and does NOT import this module.
 */
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'
import { readStore, writeStore } from '../store'

const STORE_KEY = 'finance_auth'

export const FINANCE_COOKIE = 'maze_finance_token'
const EXPIRES_IN = '4h'
export const FINANCE_COOKIE_MAX_AGE = 60 * 60 * 4 // 4 hours, matches JWT
const ISSUER = 'maze.uz/admin'
export const FINANCE_AUDIENCE = 'maze.uz/finance'

const KEYLEN = 64

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('[finance-auth] JWT_SECRET environment variable is required')
  return new TextEncoder().encode(s)
}

interface FinanceAuthConfig {
  passwordHash?: string // hex
  salt?: string         // hex
  createdAt?: string
  updatedAt?: string
}

async function getConfig(): Promise<FinanceAuthConfig> {
  return readStore<FinanceAuthConfig>(STORE_KEY, {})
}

export async function isFinancePasswordSet(): Promise<boolean> {
  const cfg = await getConfig()
  return Boolean(cfg.passwordHash && cfg.salt)
}

function hashPassword(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEYLEN)
}

/** Set (or replace) the finance password. Caller must be an authed admin. */
export async function setFinancePassword(password: string): Promise<void> {
  const salt = randomBytes(16)
  const hash = hashPassword(password, salt)
  const existing = await getConfig()
  await writeStore<FinanceAuthConfig>(STORE_KEY, {
    passwordHash: hash.toString('hex'),
    salt:         salt.toString('hex'),
    createdAt:    existing.createdAt ?? new Date().toISOString(),
    updatedAt:    new Date().toISOString(),
  })
}

export async function verifyFinancePassword(password: string): Promise<boolean> {
  const cfg = await getConfig()
  if (!cfg.passwordHash || !cfg.salt) return false
  const salt     = Buffer.from(cfg.salt, 'hex')
  const expected = Buffer.from(cfg.passwordHash, 'hex')
  const actual   = hashPassword(password, salt)
  // Constant-time compare; length guard first (timingSafeEqual throws on
  // mismatched lengths).
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

export async function signFinanceToken(): Promise<string> {
  return new SignJWT({ scope: 'finance' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(FINANCE_AUDIENCE)
    .setSubject('finance')
    .setExpirationTime(EXPIRES_IN)
    .sign(getSecret())
}

export async function verifyFinanceToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret(), {
      algorithms: ['HS256'],
      issuer:     ISSUER,
      audience:   FINANCE_AUDIENCE,
    })
    return true
  } catch {
    return false
  }
}

/** True when the current request carries a valid finance token. */
export async function getFinanceSession(): Promise<boolean> {
  const token = cookies().get(FINANCE_COOKIE)?.value
  if (!token) return false
  return verifyFinanceToken(token)
}
