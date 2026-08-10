import { createHmac, createPublicKey, createVerify, timingSafeEqual, type KeyObject } from 'crypto'
import { config } from '../config'
import { createUser, findUserByUsername, touchUserLogin, type UserRecord, type UserRole } from '../db/hermes/users-store'
import { issueUserJwt } from '../middleware/user-auth'

export interface ExternalJwtPayload {
  [key: string]: unknown
  sub?: string
  username?: string
  preferred_username?: string
  email?: string
  name?: string
  role?: string
  iss?: string
  aud?: string | string[]
  exp?: number
  nbf?: number
  iat?: number
}

interface ExternalJwtHeader {
  alg?: string
  typ?: string
  kid?: string
}

interface JwksCache {
  keys: Array<{ kid?: string; kty: string; [key: string]: unknown }>
  expiresAt: number
}

let jwksCache: JwksCache | null = null

function safeEqual(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a)
    const right = Buffer.from(b)
    return left.length === right.length && timingSafeEqual(left, right)
  } catch {
    return false
  }
}

async function fetchJwksKey(jwksUri: string, kid?: string): Promise<KeyObject | null> {
  const now = Date.now()
  if (!jwksCache || jwksCache.expiresAt < now) {
    try {
      const res = await fetch(jwksUri)
      if (!res.ok) return null
      const data = (await res.json()) as { keys?: Array<{ kid?: string; kty: string; [key: string]: unknown }> }
      if (!Array.isArray(data.keys)) return null
      jwksCache = {
        keys: data.keys,
        expiresAt: now + 5 * 60 * 1000,
      }
    } catch {
      return null
    }
  }

  const target = jwksCache.keys.find(k => (kid ? k.kid === kid : true))
  if (!target) return null

  try {
    return createPublicKey({ key: target as any, format: 'jwk' })
  } catch {
    return null
  }
}

function verifyHmacSignature(algorithm: string, unsignedInput: string, signature: string, secret: string): boolean {
  const hashAlg = algorithm === 'HS384' ? 'sha384' : algorithm === 'HS512' ? 'sha512' : 'sha256'
  const expected = createHmac(hashAlg, secret).update(unsignedInput).digest('base64url')
  return safeEqual(signature, expected)
}

function verifyAsymmetricSignature(algorithm: string, unsignedInput: string, signatureBase64Url: string, key: string | KeyObject): boolean {
  try {
    const hashAlg = algorithm.endsWith('384') ? 'SHA384' : algorithm.endsWith('512') ? 'SHA512' : 'SHA256'
    const verifier = createVerify(hashAlg)
    verifier.update(unsignedInput)
    const sigBuffer = Buffer.from(signatureBase64Url, 'base64url')
    return verifier.verify(key, sigBuffer)
  } catch {
    return false
  }
}

export async function verifyExternalJwtToken(token: string): Promise<ExternalJwtPayload | null> {
  const cfg = config.externalJwt
  if (!cfg.enabled) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [headerB64, payloadB64, signatureB64] = parts

  let header: ExternalJwtHeader
  let payload: ExternalJwtPayload
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf-8'))
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'))
  } catch {
    return null
  }

  const nowSec = Math.floor(Date.now() / 1000)

  if (typeof payload.exp === 'number' && nowSec >= payload.exp) {
    return null
  }

  if (typeof payload.nbf === 'number' && nowSec < payload.nbf) {
    return null
  }

  if (cfg.issuer) {
    if (payload.iss !== cfg.issuer) return null
  }

  if (cfg.audience) {
    if (Array.isArray(payload.aud)) {
      if (!payload.aud.includes(cfg.audience)) return null
    } else if (payload.aud !== cfg.audience) {
      return null
    }
  }

  const alg = (header.alg || 'HS256').toUpperCase()
  const unsigned = `${headerB64}.${payloadB64}`

  if (alg.startsWith('HS')) {
    const secret = cfg.secret
    if (!secret) return null
    if (!verifyHmacSignature(alg, unsigned, signatureB64, secret)) return null
  } else if (alg.startsWith('RS') || alg.startsWith('ES')) {
    if (cfg.jwksUri) {
      const pubKey = await fetchJwksKey(cfg.jwksUri, header.kid)
      if (!pubKey || !verifyAsymmetricSignature(alg, unsigned, signatureB64, pubKey)) return null
    } else if (cfg.publicKey) {
      if (!verifyAsymmetricSignature(alg, unsigned, signatureB64, cfg.publicKey)) return null
    } else {
      return null
    }
  } else {
    return null
  }

  return payload
}

export function extractExternalUsername(payload: ExternalJwtPayload): string | null {
  const cfg = config.externalJwt
  const specifiedClaim = cfg.usernameClaim
  if (specifiedClaim && typeof payload[specifiedClaim] === 'string' && (payload[specifiedClaim] as string).trim()) {
    return (payload[specifiedClaim] as string).trim()
  }

  const candidates = [payload.username, payload.preferred_username, payload.sub, payload.email, payload.name]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  return null
}

export async function processExternalJwtLogin(externalJwt: string): Promise<{ token: string; user: UserRecord } | { error: string; status: number }> {
  const cfg = config.externalJwt
  if (!cfg.enabled) {
    return { error: 'External JWT authentication is disabled', status: 400 }
  }

  const payload = await verifyExternalJwtToken(externalJwt)
  if (!payload) {
    return { error: 'Invalid or expired external JWT token', status: 401 }
  }

  const username = extractExternalUsername(payload)
  if (!username) {
    return { error: 'Unable to extract username from external JWT', status: 400 }
  }

  let user = findUserByUsername(username)

  if (!user) {
    if (!cfg.autoProvision) {
      return { error: `User "${username}" is not registered in Hermes Studio`, status: 403 }
    }

    let role: UserRole = cfg.defaultRole as UserRole
    if (cfg.roleClaim && typeof payload[cfg.roleClaim] === 'string') {
      const claimRole = (payload[cfg.roleClaim] as string).toLowerCase()
      if (claimRole === 'admin' || claimRole === 'super_admin') {
        role = claimRole
      }
    }

    const randomPassword = Buffer.from(Math.random().toString()).toString('base64')
    user = createUser({
      username,
      password: randomPassword,
      role,
      status: 'active',
    })

    if (!user) {
      return { error: 'Failed to auto-provision user', status: 500 }
    }
  }

  if (user.status !== 'active') {
    return { error: 'User account is disabled', status: 403 }
  }

  touchUserLogin(user.id)
  const token = await issueUserJwt(user)

  return { token, user }
}
