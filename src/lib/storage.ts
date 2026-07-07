const KEYS = {
  token: 'classclick_token',
  refreshToken: 'classclick_refresh_token',
  accessTokenExpiresAtUtc: 'classclick_access_token_expires_at_utc',
  user: 'classclick_user',
  activeCompanySlug: 'classclick_active_company_slug',
  activeRole: 'classclick_active_role',
  activeCompany: 'classclick_active_company',
  companies: 'classclick_companies',
  me: 'classclick_me',
  profile: 'classclick_profile',
  activeContext: 'classclick_active_context',
  browserSessionId: 'classclick_browser_session_id',
} as const

const TAB_SESSION_KEY = 'classclick_tab_session_id'

function newSessionId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

function ensureSessionOwnership() {
  let browserSessionId = localStorage.getItem(KEYS.browserSessionId)
  const hasLegacySession = !!localStorage.getItem(KEYS.token)
  if (!browserSessionId && hasLegacySession) {
    browserSessionId = newSessionId()
    localStorage.setItem(KEYS.browserSessionId, browserSessionId)
  }
  if (!browserSessionId) return true

  const tabSessionId = sessionStorage.getItem(TAB_SESSION_KEY)
  if (!tabSessionId) {
    sessionStorage.setItem(TAB_SESSION_KEY, browserSessionId)
    return true
  }
  return tabSessionId === browserSessionId
}

export const storage = {
  getToken: () => ensureSessionOwnership() ? localStorage.getItem(KEYS.token) : null,
  setToken: (v: string) => localStorage.setItem(KEYS.token, v),
  removeToken: () => localStorage.removeItem(KEYS.token),

  getRefreshToken: () => ensureSessionOwnership() ? localStorage.getItem(KEYS.refreshToken) : null,
  setRefreshToken: (v: string) => localStorage.setItem(KEYS.refreshToken, v),
  removeRefreshToken: () => localStorage.removeItem(KEYS.refreshToken),

  getAccessTokenExpiresAtUtc: () => localStorage.getItem(KEYS.accessTokenExpiresAtUtc),
  setAccessTokenExpiresAtUtc: (v: string) => localStorage.setItem(KEYS.accessTokenExpiresAtUtc, v),

  getUser: <T = unknown>(): T | null => {
    if (!ensureSessionOwnership()) return null
    const raw = localStorage.getItem(KEYS.user)
    return raw ? JSON.parse(raw) : null
  },
  setUser: (v: unknown) => localStorage.setItem(KEYS.user, JSON.stringify(v)),
  removeUser: () => localStorage.removeItem(KEYS.user),

  getActiveCompanySlug: () => ensureSessionOwnership() ? localStorage.getItem(KEYS.activeCompanySlug) : null,
  setActiveCompanySlug: (v: string) => localStorage.setItem(KEYS.activeCompanySlug, v),

  getActiveRole: () => ensureSessionOwnership() ? localStorage.getItem(KEYS.activeRole) : null,
  setActiveRole: (v: string) => localStorage.setItem(KEYS.activeRole, v),

  getMe: <T = unknown>(): T | null => {
    if (!ensureSessionOwnership()) return null
    const raw = localStorage.getItem(KEYS.me)
    return raw ? JSON.parse(raw) : null
  },
  setMe: (v: unknown) => localStorage.setItem(KEYS.me, JSON.stringify(v)),

  getCompanies: <T = unknown>(): T[] => {
    if (!ensureSessionOwnership()) return []
    const raw = localStorage.getItem(KEYS.companies)
    return raw ? JSON.parse(raw) : []
  },
  setCompanies: (v: unknown) => localStorage.setItem(KEYS.companies, JSON.stringify(v)),

  getActiveContext: <T = unknown>(): T | null => {
    if (!ensureSessionOwnership()) return null
    const raw = localStorage.getItem(KEYS.activeContext)
    return raw ? JSON.parse(raw) : null
  },
  setActiveContext: (v: unknown) => localStorage.setItem(KEYS.activeContext, JSON.stringify(v)),

  startSession: () => {
    const sessionId = newSessionId()
    sessionStorage.setItem(TAB_SESSION_KEY, sessionId)
    localStorage.setItem(KEYS.browserSessionId, sessionId)
    return sessionId
  },

  isCurrentTabSession: () => ensureSessionOwnership(),

  isSessionReplaced: () => {
    const browserSessionId = localStorage.getItem(KEYS.browserSessionId)
    const tabSessionId = sessionStorage.getItem(TAB_SESSION_KEY)
    return !!browserSessionId && !!tabSessionId && browserSessionId !== tabSessionId
  },

  getBrowserSessionId: () => localStorage.getItem(KEYS.browserSessionId),

  clearSession: () => {
    const browserSessionId = localStorage.getItem(KEYS.browserSessionId)
    const tabSessionId = sessionStorage.getItem(TAB_SESSION_KEY)
    if (browserSessionId && tabSessionId && browserSessionId !== tabSessionId) {
      sessionStorage.removeItem(TAB_SESSION_KEY)
      return
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key?.startsWith('classclick_') && !key.startsWith('classclick_biometric_device:')) {
        localStorage.removeItem(key)
      }
    }
    sessionStorage.removeItem(TAB_SESSION_KEY)
  },
}
