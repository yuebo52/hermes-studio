import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'crypto'
import { config } from '../../packages/server/src/config'
import {
  extractExternalUsername,
  processExternalJwtLogin,
  verifyExternalJwtToken,
  type ExternalJwtPayload,
} from '../../packages/server/src/services/external-jwt'
import * as usersStore from '../../packages/server/src/db/hermes/users-store'

function createHmacJwt(payload: Record<string, unknown>, secret: string, alg = 'HS256'): string {
  const header = { alg, typ: 'JWT' }
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url')
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const unsigned = `${headerB64}.${payloadB64}`
  const sig = createHmac('sha256', secret).update(unsigned).digest('base64url')
  return `${unsigned}.${sig}`
}

describe('External JWT Service', () => {
  const originalConfig = { ...config.externalJwt }

  beforeEach(() => {
    config.externalJwt.enabled = true
    config.externalJwt.secret = 'test-secret-123'
    config.externalJwt.publicKey = ''
    config.externalJwt.jwksUri = ''
    config.externalJwt.issuer = ''
    config.externalJwt.audience = ''
    config.externalJwt.usernameClaim = 'username'
    config.externalJwt.roleClaim = 'role'
    config.externalJwt.autoProvision = true
    config.externalJwt.defaultRole = 'user'
  })

  afterEach(() => {
    Object.assign(config.externalJwt, originalConfig)
    vi.restoreAllMocks()
  })

  describe('verifyExternalJwtToken', () => {
    it('returns null when external JWT is disabled', async () => {
      config.externalJwt.enabled = false
      const token = createHmacJwt({ username: 'alice' }, 'test-secret-123')
      const result = await verifyExternalJwtToken(token)
      expect(result).toBeNull()
    })

    it('verifies valid HS256 token successfully', async () => {
      const now = Math.floor(Date.now() / 1000)
      const token = createHmacJwt({ username: 'alice', exp: now + 3600 }, 'test-secret-123')
      const result = await verifyExternalJwtToken(token)
      expect(result).not.toBeNull()
      expect(result?.username).toBe('alice')
    })

    it('rejects expired token', async () => {
      const now = Math.floor(Date.now() / 1000)
      const token = createHmacJwt({ username: 'alice', exp: now - 10 }, 'test-secret-123')
      const result = await verifyExternalJwtToken(token)
      expect(result).toBeNull()
    })

    it('rejects token signed with wrong secret', async () => {
      const token = createHmacJwt({ username: 'alice' }, 'wrong-secret')
      const result = await verifyExternalJwtToken(token)
      expect(result).toBeNull()
    })

    it('validates issuer if configured', async () => {
      config.externalJwt.issuer = 'https://sso.example.com'
      const validToken = createHmacJwt({ username: 'alice', iss: 'https://sso.example.com' }, 'test-secret-123')
      const invalidToken = createHmacJwt({ username: 'alice', iss: 'https://other.com' }, 'test-secret-123')

      expect(await verifyExternalJwtToken(validToken)).not.toBeNull()
      expect(await verifyExternalJwtToken(invalidToken)).toBeNull()
    })

    it('validates audience if configured', async () => {
      config.externalJwt.audience = 'hermes-studio'
      const validToken = createHmacJwt({ username: 'alice', aud: 'hermes-studio' }, 'test-secret-123')
      const invalidToken = createHmacJwt({ username: 'alice', aud: 'other-app' }, 'test-secret-123')

      expect(await verifyExternalJwtToken(validToken)).not.toBeNull()
      expect(await verifyExternalJwtToken(invalidToken)).toBeNull()
    })
  })

  describe('extractExternalUsername', () => {
    it('extracts username from custom configured claim', () => {
      config.externalJwt.usernameClaim = 'custom_user'
      const payload: ExternalJwtPayload = { custom_user: 'bob', sub: '123' }
      expect(extractExternalUsername(payload)).toBe('bob')
    })

    it('falls back to sub or email if custom claim missing', () => {
      config.externalJwt.usernameClaim = 'non_existent'
      const payload: ExternalJwtPayload = { sub: 'user_456' }
      expect(extractExternalUsername(payload)).toBe('user_456')
    })
  })

  describe('processExternalJwtLogin', () => {
    it('auto-provisions user if enabled and user does not exist', async () => {
      const now = Math.floor(Date.now() / 1000)
      const token = createHmacJwt({ username: 'new_external_user', exp: now + 3600 }, 'test-secret-123')

      vi.spyOn(usersStore, 'findUserByUsername').mockReturnValue(null)
      vi.spyOn(usersStore, 'countUsers').mockReturnValue(1)
      const mockCreatedUser: usersStore.UserRecord = {
        id: 99,
        username: 'new_external_user',
        password_hash: 'hashed',
        role: 'admin',
        status: 'active',
        created_at: Date.now(),
        updated_at: Date.now(),
        last_login_at: null,
        avatar: '',
      }
      const createUserSpy = vi.spyOn(usersStore, 'createUser').mockReturnValue(mockCreatedUser)
      vi.spyOn(usersStore, 'touchUserLogin').mockImplementation(() => {})

      const result = await processExternalJwtLogin(token)
      expect('token' in result).toBe(true)
      if ('token' in result) {
        expect(result.user.username).toBe('new_external_user')
        expect(result.user.id).toBe(99)
      }
      expect(createUserSpy).toHaveBeenCalledWith(expect.objectContaining({
        username: 'new_external_user',
        role: 'admin',
        profiles: ['default'],
      }))
    })

    it('auto-provisions first user as super_admin when system has 0 users', async () => {
      const now = Math.floor(Date.now() / 1000)
      const token = createHmacJwt({ username: 'first_super_admin', exp: now + 3600 }, 'test-secret-123')

      vi.spyOn(usersStore, 'findUserByUsername').mockReturnValue(null)
      vi.spyOn(usersStore, 'countUsers').mockReturnValue(0)
      const mockCreatedUser: usersStore.UserRecord = {
        id: 1,
        username: 'first_super_admin',
        password_hash: 'hashed',
        role: 'super_admin',
        status: 'active',
        created_at: Date.now(),
        updated_at: Date.now(),
        last_login_at: null,
        avatar: '',
      }
      const createUserSpy = vi.spyOn(usersStore, 'createUser').mockReturnValue(mockCreatedUser)
      vi.spyOn(usersStore, 'touchUserLogin').mockImplementation(() => {})

      const result = await processExternalJwtLogin(token)
      expect('token' in result).toBe(true)
      expect(createUserSpy).toHaveBeenCalledWith(expect.objectContaining({
        username: 'first_super_admin',
        role: 'super_admin',
      }))
    })

    it('rejects login if autoProvision is false and user does not exist', async () => {
      config.externalJwt.autoProvision = false
      const token = createHmacJwt({ username: 'unknown_user' }, 'test-secret-123')

      vi.spyOn(usersStore, 'findUserByUsername').mockReturnValue(null)

      const result = await processExternalJwtLogin(token)
      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.status).toBe(403)
      }
    })
  })
})
