import { TOTP, ScureBase32Plugin, NobleCryptoPlugin } from 'otplib'
import { readStore, writeStore } from './store'

/**
 * MFA (TOTP) helpers built on otplib v13.
 *
 * Stored under the dedicated `auth_config` store key — never returned
 * by the public GET /api/settings.
 *
 * Standard SHA-1 / 6 digits / 30-second TOTP, compatible with
 * Google Authenticator, 1Password, Authy etc. epochTolerance: 30
 * tolerates ~one period of clock drift in either direction.
 */

const STORE_KEY = 'auth_config'

interface AuthConfig {
  mfaSecret?: string
  enabledAt?: string
}

const totp = new TOTP({
  base32:    new ScureBase32Plugin(),
  crypto:    new NobleCryptoPlugin(),
  period:    30,
  digits:    6,
  algorithm: 'sha1',
})

export async function getAuthConfig(): Promise<AuthConfig> {
  return readStore<AuthConfig>(STORE_KEY, {})
}

export async function isMfaEnabled(): Promise<boolean> {
  const cfg = await getAuthConfig()
  return Boolean(cfg.mfaSecret && cfg.mfaSecret.length > 0)
}

export async function enableMfa(secret: string): Promise<void> {
  await writeStore<AuthConfig>(STORE_KEY, {
    mfaSecret: secret,
    enabledAt: new Date().toISOString(),
  })
}

export async function disableMfa(): Promise<void> {
  await writeStore<AuthConfig>(STORE_KEY, {})
}

export function generateSecret(): string {
  return totp.generateSecret()
}

export function buildOtpAuthUrl(secret: string, label = 'admin', issuer = 'MAZE Studio'): string {
  // otpauth://totp/<issuer>:<label>?secret=...&issuer=...
  const labelEncoded  = encodeURIComponent(`${issuer}:${label}`)
  const issuerEncoded = encodeURIComponent(issuer)
  return `otpauth://totp/${labelEncoded}?secret=${secret}&issuer=${issuerEncoded}&algorithm=SHA1&digits=6&period=30`
}

export async function verifyTotp(token: string, secret: string): Promise<boolean> {
  if (!token || !secret) return false
  const cleanToken = token.replace(/\s/g, '')
  if (!/^\d{6}$/.test(cleanToken)) return false
  try {
    const result = await totp.verify(cleanToken, { secret, epochTolerance: 30 })
    return result.valid === true
  } catch {
    return false
  }
}
