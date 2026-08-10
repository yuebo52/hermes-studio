import { createRouter, createWebHashHistory } from 'vue-router'
import { hasApiKey, isStoredSuperAdmin, setApiKey } from '@/api/client'
import { exchangeExternalJwtToken } from '@/api/auth'
import { hasDesktopBrowserBridge } from '@/utils/desktop-bridge'
import { resolveLoginRedirect } from '@/utils/login-redirect'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/desktop-pet',
      name: 'desktop.pet',
      component: () => import('@/views/hermes/DesktopPetView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/share/group-chat/:inviteCode?',
      name: 'share.groupChat',
      component: () => import('@/views/hermes/SharedGroupChatView.vue'),
      meta: { public: true, standaloneChat: true, inviteOnly: true },
    },
    {
      path: '/group-chat-link',
      name: 'groupChat.link',
      component: () => import('@/views/hermes/GroupChatLinkView.vue'),
      meta: { standaloneChat: true },
    },
    {
      path: '/hermes/chat',
      name: 'hermes.chat',
      component: () => import('@/views/hermes/ChatView.vue'),
    },
    {
      path: '/hermes/session/:sessionId',
      name: 'hermes.session',
      component: () => import('@/views/hermes/ChatView.vue'),
    },
    {
      path: '/desktop-chat/:sessionId',
      name: 'desktop.chat',
      component: () => import('@/views/hermes/ChatView.vue'),
      meta: { standaloneChat: true },
    },
    {
      path: '/hermes/history',
      name: 'hermes.history',
      component: () => import('@/views/hermes/HistoryView.vue'),
    },
    {
      path: '/hermes/history/session/:sessionId',
      name: 'hermes.historySession',
      component: () => import('@/views/hermes/HistoryView.vue'),
    },
    {
      path: '/hermes/global-agent',
      name: 'hermes.globalAgent',
      component: () => import('@/views/hermes/GlobalAgentView.vue'),
    },
    {
      path: '/hermes/global-agent/session/:sessionId',
      name: 'hermes.globalAgentSession',
      component: () => import('@/views/hermes/GlobalAgentView.vue'),
    },
    {
      path: '/hermes/jobs',
      name: 'hermes.jobs',
      component: () => import('@/views/hermes/JobsView.vue'),
    },
    {
      path: '/hermes/kanban',
      name: 'hermes.kanban',
      component: () => import('@/views/hermes/KanbanView.vue'),
    },
    {
      path: '/hermes/workflow',
      name: 'hermes.workflow',
      component: () => import('@/views/hermes/WorkflowView.vue'),
    },
    {
      path: '/hermes/models',
      name: 'hermes.models',
      component: () => import('@/views/hermes/ModelsView.vue'),
    },
    {
      path: '/hermes/profiles',
      name: 'hermes.profiles',
      component: () => import('@/views/hermes/ProfilesView.vue'),
      meta: { requiresSuperAdmin: true },
    },
    {
      path: '/hermes/logs',
      name: 'hermes.logs',
      component: () => import('@/views/hermes/LogsView.vue'),
    },
    {
      path: '/hermes/usage',
      name: 'hermes.usage',
      component: () => import('@/views/hermes/UsageView.vue'),
    },
    {
      path: '/hermes/performance',
      name: 'hermes.performance',
      component: () => import('@/views/hermes/PerformanceView.vue'),
      meta: { requiresSuperAdmin: true },
    },
    {
      path: '/hermes/journey',
      name: 'hermes.journey',
      component: () => import('@/views/hermes/JourneyView.vue'),
    },
    {
      path: '/hermes/skills-usage',
      name: 'hermes.skillsUsage',
      component: () => import('@/views/hermes/SkillsUsageView.vue'),
    },
    {
      path: '/hermes/skills',
      name: 'hermes.skills',
      component: () => import('@/views/hermes/SkillsView.vue'),
    },
    {
      path: '/hermes/plugins',
      name: 'hermes.plugins',
      component: () => import('@/views/hermes/PluginsView.vue'),
    },
    {
      path: '/hermes/petdex',
      name: 'hermes.petdex',
      component: () => import('@/views/hermes/PetdexView.vue'),
    },
    {
      path: '/hermes/memory',
      name: 'hermes.memory',
      component: () => import('@/views/hermes/MemoryView.vue'),
    },
    {
      path: '/hermes/settings',
      name: 'hermes.settings',
      component: () => import('@/views/hermes/SettingsView.vue'),
    },
    {
      path: '/hermes/theme',
      name: 'hermes.theme',
      component: () => import('@/views/hermes/ThemeView.vue'),
    },
    {
      path: '/hermes/channels',
      name: 'hermes.channels',
      component: () => import('@/views/hermes/ChannelsView.vue'),
    },
    {
      path: '/hermes/terminal',
      name: 'hermes.terminal',
      component: () => import('@/views/hermes/TerminalView.vue'),
      meta: { requiresSuperAdmin: true },
    },
    {
      path: '/hermes/devices',
      name: 'hermes.devices',
      component: () => import('@/views/hermes/DevicesView.vue'),
      meta: { requiresSuperAdmin: true },
    },
    {
      path: '/hermes/group-chat',
      name: 'hermes.groupChat',
      component: () => import('@/views/hermes/GroupChatView.vue'),
    },
    {
      path: '/hermes/group-chat/room/:roomId',
      name: 'hermes.groupChatRoom',
      component: () => import('@/views/hermes/GroupChatView.vue'),
    },
    {
      path: '/hermes/files',
      name: 'hermes.files',
      component: () => import('@/views/hermes/FilesView.vue'),
    },
    {
      path: '/hermes/coding-agents',
      name: 'hermes.codingAgents',
      component: () => import('@/views/hermes/CodingAgentsView.vue'),
    },
    {
      path: '/hermes/version-preview',
      name: 'hermes.versionPreview',
      component: () => import('@/views/hermes/VersionPreviewView.vue'),
      meta: { requiresSuperAdmin: true },
    },
    {
      path: '/hermes/mcp',
      name: 'hermes.mcp',
      component: () => import('@/views/hermes/McpManagerView.vue'),
    },
  ],
})

// Desktop exposes a dedicated settings page. Actual browsing stays inside the
// chat tool panel so this route never creates or positions a WebContentsView.
if (hasDesktopBrowserBridge()) {
  router.addRoute({
    path: '/hermes/browser',
    name: 'hermes.browser',
    component: () => import('@/views/hermes/DesktopBrowserView.vue'),
  })
}

async function ensureDesktopAuth(): Promise<void> {
  if (hasApiKey()) return
  const bridge = (window as typeof window & {
    hermesDesktop?: { isDesktop?: boolean; ensureAuth?: () => Promise<boolean> }
  }).hermesDesktop
  if (bridge?.isDesktop === true && bridge.ensureAuth) {
    await bridge.ensureAuth().catch(() => false)
  }
}

function isDesktopShell(): boolean {
  return (window as typeof window & {
    hermesDesktop?: { isDesktop?: boolean }
  }).hermesDesktop?.isDesktop === true
}

function getExternalJwtFromUrl(query: Record<string, any>): string {
  const fromQuery = typeof query.external_jwt === 'string' ? query.external_jwt
    : typeof query.jwt === 'string' ? query.jwt
    : typeof query.token === 'string' ? query.token : ''
  if (fromQuery && fromQuery.trim()) return fromQuery.trim()

  if (typeof window === 'undefined') return ''

  try {
    const searchParams = new URLSearchParams(window.location.search)
    const fromSearch = searchParams.get('external_jwt') || searchParams.get('jwt') || searchParams.get('token')
    if (fromSearch && fromSearch.trim()) return fromSearch.trim()
  } catch {
    // Ignore URL parsing errors
  }

  try {
    const hash = window.location.hash || ''
    const qIndex = hash.indexOf('?')
    if (qIndex !== -1) {
      const hashParams = new URLSearchParams(hash.slice(qIndex))
      const fromHash = hashParams.get('external_jwt') || hashParams.get('jwt') || hashParams.get('token')
      if (fromHash && fromHash.trim()) return fromHash.trim()
    }
  } catch {
    // Ignore hash parsing errors
  }

  return ''
}

async function handleExternalJwtAutoLogin(query: Record<string, any>): Promise<boolean> {
  const externalJwt = getExternalJwtFromUrl(query)
  if (!externalJwt) return false

  try {
    const res = await exchangeExternalJwtToken(externalJwt)
    if (res?.token) {
      setApiKey(res.token)
      return true
    }
  } catch (err) {
    console.error('External JWT auto-login exchange failed:', err)
  }
  return false
}

function cleanSensitiveQueryParams() {
  if (typeof window === 'undefined' || !window.location) return
  try {
    let urlString = window.location.href
    let changed = false

    const url = new URL(urlString)
    for (const key of ['external_jwt', 'jwt', 'token']) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key)
        changed = true
      }
    }
    if (changed) {
      urlString = url.toString()
    }

    const hash = url.hash || ''
    const qIndex = hash.indexOf('?')
    if (qIndex !== -1) {
      const hashPath = hash.slice(0, qIndex)
      const hashQuery = new URLSearchParams(hash.slice(qIndex))
      let hashChanged = false
      for (const key of ['external_jwt', 'jwt', 'token']) {
        if (hashQuery.has(key)) {
          hashQuery.delete(key)
          hashChanged = true
        }
      }
      if (hashChanged) {
        const newHashQueryStr = hashQuery.toString()
        const newHash = newHashQueryStr ? `${hashPath}?${newHashQueryStr}` : hashPath
        const tempUrl = new URL(urlString)
        tempUrl.hash = newHash
        urlString = tempUrl.toString()
        changed = true
      }
    }

    if (changed) {
      window.history.replaceState({}, '', urlString)
    }
  } catch {
    // Ignore URL parsing errors
  }
}

router.beforeEach(async (to, _from, next) => {
  await ensureDesktopAuth()

  const candidateToken = getExternalJwtFromUrl(to.query)
  if (candidateToken) {
    const loggedIn = await handleExternalJwtAutoLogin(to.query)
    if (loggedIn) {
      cleanSensitiveQueryParams()
      if (to.name === 'login') {
        next(resolveLoginRedirect(to.query.redirect))
        return
      }
    }
  }

  // Public pages don't need auth
  if (to.meta.public) {
    // Already has key, skip login
    if (to.name === 'login' && hasApiKey() && !isDesktopShell()) {
      next(resolveLoginRedirect(to.query.redirect))
      return
    }
    next()
    return
  }

  // All other pages require token
  if (!hasApiKey()) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.requiresSuperAdmin && !isStoredSuperAdmin()) {
    next({ name: 'hermes.chat' })
    return
  }

  next()
})

export default router
