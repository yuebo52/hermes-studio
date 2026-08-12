// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockHasApiKey = vi.hoisted(() => vi.fn())
const mockSetApiKey = vi.hoisted(() => vi.fn())
const mockIsStoredSuperAdmin = vi.hoisted(() => vi.fn())
const mockExchangeExternalJwtToken = vi.hoisted(() => vi.fn())
const mockActivateUserTheme = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  hasApiKey: mockHasApiKey,
  setApiKey: mockSetApiKey,
  isStoredSuperAdmin: mockIsStoredSuperAdmin,
}))

vi.mock('@/api/auth', () => ({
  exchangeExternalJwtToken: mockExchangeExternalJwtToken,
}))

vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({
    activateUserTheme: mockActivateUserTheme,
  }),
}))

async function loadRouter() {
  vi.resetModules()
  return (await import('@/router')).default
}

describe('router login redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHasApiKey.mockReturnValue(false)
    mockIsStoredSuperAdmin.mockReturnValue(true)
    if (!document.queryCommandSupported) {
      document.queryCommandSupported = vi.fn(() => false)
    }
    delete (window as any).hermesDesktop
    window.location.hash = ''
  })

  afterEach(() => {
    delete (window as any).hermesDesktop
  })

  it('keeps the web login redirect when a token exists', async () => {
    mockHasApiKey.mockReturnValue(true)
    const router = await loadRouter()

    await router.push('/')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('hermes.chat')
  }, 60_000)

  it('returns an authenticated Agent handoff login to the link page', async () => {
    mockHasApiKey.mockReturnValue(true)
    const router = await loadRouter()
    const redirect = '/group-chat-link?cloudOrigin=http%3A%2F%2F47.243.215.84%3A8088&requestId=handoff-id'

    await router.push({ name: 'login', query: { redirect } })
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('groupChat.link')
    expect(router.currentRoute.value.query).toEqual({
      cloudOrigin: 'http://47.243.215.84:8088',
      requestId: 'handoff-id',
    })
  })

  it('does not redirect desktop login when a stale token exists', async () => {
    mockHasApiKey.mockReturnValue(true)
    ;(window as any).hermesDesktop = { isDesktop: true }
    const router = await loadRouter()

    await router.push('/')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
  })

  it('handles external_jwt auto-login and activates user theme', async () => {
    const theme = { fontSize: 16, textColor: null, accentColor: null, background: null, updatedAt: 123 }
    mockExchangeExternalJwtToken.mockResolvedValue({ token: 'internal-jwt', userId: 42, theme })
    const router = await loadRouter()

    await router.push('/?external_jwt=mocked-ext-jwt')
    await router.isReady()

    expect(mockExchangeExternalJwtToken).toHaveBeenCalledWith('mocked-ext-jwt')
    expect(mockSetApiKey).toHaveBeenCalledWith('internal-jwt')
    expect(mockActivateUserTheme).toHaveBeenCalledWith(42, theme)
  })
})

