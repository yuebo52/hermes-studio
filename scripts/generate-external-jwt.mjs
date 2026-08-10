import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

function base64Url(input) {
  return Buffer.from(typeof input === 'string' ? input : JSON.stringify(input))
    .toString('base64url')
}

/**
 * Generates an external JWT token.
 *
 * @param {Object} [options]
 * @param {string} [options.secret] - JWT secret key
 * @param {string} [options.username] - Username payload claim
 * @param {string} [options.role] - Role payload claim
 * @param {number} [options.expiresInSeconds] - Token expiration duration in seconds
 * @param {string} [options.iss] - Issuer claim
 * @param {string} [options.aud] - Audience claim
 * @returns {{ token: string, payload: Object, secret: string }}
 */
export function generateExternalJwt(options = {}) {
  const secret = options.secret || process.env.EXTERNAL_JWT_SECRET || 'my-super-secret-jwt-key-2026'
  const username = options.username || 'admin'
  const role = options.role || 'admin'
  const expiresInSeconds = options.expiresInSeconds !== undefined && options.expiresInSeconds !== ''
    ? Number(options.expiresInSeconds)
    : 5 * 60
  const iss = options.iss || 'external-sso-gateway'
  const aud = options.aud || 'hermes-web-ui'

  const now = Math.floor(Date.now() / 1000)
  const exp = now + expiresInSeconds

  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    username,
    role,
    iat: now,
    exp,
    iss,
    aud,
  }

  const headerB64 = base64Url(header)
  const payloadB64 = base64Url(payload)
  const unsignedToken = `${headerB64}.${payloadB64}`

  const signature = crypto
    .createHmac('sha256', secret)
    .update(unsignedToken)
    .digest('base64url')

  const token = `${unsignedToken}.${signature}`

  return { token, payload, secret }
}

const isDirectRun = Boolean(
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
)

if (isDirectRun) {
  const cliSecret = process.argv[2] || process.env.EXTERNAL_JWT_SECRET
  const cliUsername = process.argv[3]
  const cliRole = process.argv[4]
  const cliExpiresIn = process.argv[5]

  const { token, payload, secret } = generateExternalJwt({
    secret: cliSecret,
    username: cliUsername,
    role: cliRole,
    expiresInSeconds: cliExpiresIn,
  })

  console.log('====================================================')
  console.log('🔑 External JWT Config & Token Generator')
  console.log('====================================================\n')

  console.log('📋 Environment Variables to Set (环境变量配置):')
  console.log('----------------------------------------------------')
  console.log('export EXTERNAL_JWT_ENABLED=true')
  console.log(`export EXTERNAL_JWT_SECRET="${secret}"`)
  console.log('export EXTERNAL_JWT_USERNAME_CLAIM="username"')
  console.log('export EXTERNAL_JWT_ROLE_CLAIM="role"')
  console.log('----------------------------------------------------\n')

  console.log('👤 Token Claims Payload (JWT 荷载信息):')
  console.log(JSON.stringify(payload, null, 2))
  console.log('\n🎫 Generated External JWT Token (生成的外部 JWT):')
  console.log('----------------------------------------------------')
  console.log(token)
  console.log('----------------------------------------------------\n')

  console.log('🚀 Quick Test URLs (测试快捷访问链接):')
  console.log(`- Dev Client:  http://localhost:8649/?external_jwt=${token}`)
  console.log(`- Prod/Local:  http://localhost:8648/?external_jwt=${token}\n`)
}

