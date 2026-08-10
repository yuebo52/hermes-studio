import crypto from 'node:crypto'

const secret = process.env.EXTERNAL_JWT_SECRET || process.argv[2] || 'my-super-secret-jwt-key-2026'
const username = process.argv[3] || 'admin'
const role = process.argv[4] || 'admin'
const expiresInSeconds = process.argv[5] ? Number(process.argv[5]) : 5 * 60

const now = Math.floor(Date.now() / 1000)
const exp = now + expiresInSeconds

const header = { alg: 'HS256', typ: 'JWT' }
const payload = {
  username,
  role,
  iat: now,
  exp,
  iss: 'external-sso-gateway',
  aud: 'hermes-web-ui',
}

function base64Url(input) {
  return Buffer.from(typeof input === 'string' ? input : JSON.stringify(input))
    .toString('base64url')
}

const headerB64 = base64Url(header)
const payloadB64 = base64Url(payload)
const unsignedToken = `${headerB64}.${payloadB64}`

const signature = crypto
  .createHmac('sha256', secret)
  .update(unsignedToken)
  .digest('base64url')

const token = `${unsignedToken}.${signature}`

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
