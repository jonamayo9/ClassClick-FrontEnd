import { create } from 'zustand'
import { storage } from '@/lib/storage'
import { apiService } from '@/lib/api'
import type { User, Company } from '@/types/auth'

interface AuthState {
  token: string | null
  user: User | null
  companies: Company[]
  activeCompanySlug: string | null
  activeRole: string | null
  isLoading: boolean
  dashboardAlertsShown: boolean

  hydrate: () => void
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: (idToken: string) => Promise<void>
  logout: () => Promise<void>
  switchCompany: (company: Company) => void
  fetchCompanies: () => Promise<void>
  invalidateLocalSession: () => void
  dismissAlerts: () => void
}

function normalizeLoginResponse(data: Record<string, unknown>) {
  const token = (data?.token ?? data?.jwt ?? data?.accessToken ?? data?.access_token) as string | undefined
  const refreshToken = (data?.refreshToken ?? data?.refresh_token) as string | undefined
  const accessTokenExpiresAtUtc = (data?.accessTokenExpiresAtUtc ?? data?.access_token_expires_at_utc) as string | undefined
  const user = (data?.user ?? data?.me ?? data) as User | undefined
  const companies = (user?.companies ?? data?.companies ?? []) as Company[]
  return { token, refreshToken, accessTokenExpiresAtUtc, user, companies }
}

function resolveDefaultAccess(companies: Company[]) {
  if (!Array.isArray(companies) || companies.length === 0) return null
  const admin = companies.find((c) => (c.role ?? '').toLowerCase() === 'admin')
  return admin ?? companies[0]
}

function resolveRole(access: Company | null) {
  if (!access) return null
  return access.activeRole ?? access.role ?? null
}

function resolveCompanySlug(company: Company | null) {
  if (!company) return null
  return company.slug ?? company.companySlug ?? null
}

export const useAuth = create<AuthState>((set, _get) => ({
  token: storage.getToken(),
  user: storage.getUser<User>(),
  companies: storage.getCompanies<Company>(),
  activeCompanySlug: storage.getActiveCompanySlug(),
  activeRole: storage.getActiveRole(),
  isLoading: false,
  dashboardAlertsShown: false,

  hydrate: () => {
    const token = storage.getToken()
    const user = storage.getUser<User>()
    const companies = storage.getCompanies<Company>()
    const activeCompanySlug = storage.getActiveCompanySlug()
    const activeRole = storage.getActiveRole()
    const shown = sessionStorage.getItem('dashboardAlertsShown') === 'true'
    set({ token, user, companies, activeCompanySlug, activeRole, dashboardAlertsShown: shown })
  },

  dismissAlerts: () => {
    sessionStorage.setItem('dashboardAlertsShown', 'true')
    set({ dashboardAlertsShown: true })
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      storage.clearSession()
      sessionStorage.removeItem('dashboardAlertsShown')

      const raw = await apiService.post<Record<string, unknown>>('/api/auth/login', { email, password })
      const { token, refreshToken, accessTokenExpiresAtUtc, user, companies } = normalizeLoginResponse(raw)

      if (!token) throw new Error('El login no devolvió token.')
      if (!refreshToken) throw new Error('El login no devolvió refresh token.')

      storage.startSession()
      storage.setToken(token)
      storage.setRefreshToken(refreshToken)
      if (accessTokenExpiresAtUtc) storage.setAccessTokenExpiresAtUtc(accessTokenExpiresAtUtc)
      const userWithCompanies = { ...user, companies } as User
      storage.setUser(userWithCompanies)
      storage.setCompanies(companies)

      const defaultAccess = resolveDefaultAccess(companies)
      const companySlug = resolveCompanySlug(defaultAccess)
      const role = resolveRole(defaultAccess)

      const context: Record<string, string | null> = {}
      if (companySlug) {
        storage.setActiveCompanySlug(companySlug)
        context.companySlug = companySlug
      }
      if (role) {
        storage.setActiveRole(role)
        context.role = role
      }

      if (companySlug && role) {
        storage.setActiveContext({ companySlug, role })
      }

      set({
        token,
        user: userWithCompanies,
        companies,
        activeCompanySlug: companySlug,
        activeRole: role,
        isLoading: false,
        dashboardAlertsShown: false,
      })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  loginWithGoogle: async (idToken: string) => {
    set({ isLoading: true })
    try {
      storage.clearSession()
      sessionStorage.removeItem('dashboardAlertsShown')

      const raw = await apiService.post<Record<string, unknown>>('/api/auth/google', { idToken })
      const { token, refreshToken, accessTokenExpiresAtUtc, user, companies } = normalizeLoginResponse(raw)

      if (!token) throw new Error('El login no devolvió token.')
      if (!refreshToken) throw new Error('El login no devolvió refresh token.')

      storage.startSession()
      storage.setToken(token)
      storage.setRefreshToken(refreshToken)
      if (accessTokenExpiresAtUtc) storage.setAccessTokenExpiresAtUtc(accessTokenExpiresAtUtc)
      const userWithCompanies = { ...user, companies } as User
      storage.setUser(userWithCompanies)
      storage.setCompanies(companies)

      const defaultAccess = resolveDefaultAccess(companies)
      const companySlug = resolveCompanySlug(defaultAccess)
      const role = resolveRole(defaultAccess)

      if (companySlug) storage.setActiveCompanySlug(companySlug)
      if (role) storage.setActiveRole(role)
      if (companySlug && role) storage.setActiveContext({ companySlug, role })

      set({
        token,
        user: userWithCompanies,
        companies,
        activeCompanySlug: companySlug,
        activeRole: role,
        isLoading: false,
      })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  logout: async () => {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          const subscription = await registration.pushManager.getSubscription()
          if (subscription) {
            await apiService.post('/api/notifications/unsubscribe', { endpoint: subscription.endpoint })
            await subscription.unsubscribe()
          }
        }
      }
    } catch {
      // ignore
    }
    storage.clearSession()
    sessionStorage.removeItem('dashboardAlertsShown')
    set({ token: null, user: null, companies: [], activeCompanySlug: null, activeRole: null, dashboardAlertsShown: false })
  },

  switchCompany: (company: Company) => {
    const slug = resolveCompanySlug(company)
    const role = resolveRole(company)
    if (slug) storage.setActiveCompanySlug(slug)
    if (role) storage.setActiveRole(role)
    if (slug && role) storage.setActiveContext({ companySlug: slug, role })
    set({ activeCompanySlug: slug, activeRole: role })
  },

  fetchCompanies: async () => {
    try {
      const data = await apiService.get<unknown>('/api/admin/companies')
      const raw = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>)?.items)
          ? (data as Record<string, unknown>).items
          : Array.isArray((data as Record<string, unknown>)?.data)
            ? (data as Record<string, unknown>).data
            : []
      const list: Company[] = (raw as Record<string, unknown>[]).map((item) => ({
        slug: (item.slug ?? item.companySlug ?? '') as string,
        companySlug: (item.slug ?? item.companySlug ?? '') as string,
        name: (item.name ?? item.companyName ?? 'Empresa') as string,
        role: (item.role ?? '') as string,
        logoUrl: (item.logoUrl ?? '') as string,
        LogoUrl: (item.logoUrl ?? '') as string,
        modules: (item.modules ?? {}) as Record<string, boolean>,
        isActive: (item.isActive ?? true) as boolean,
      }))
      storage.setCompanies(list)
      set({ companies: list })
    } catch {
      // For non-admin users, try to get modules from student profile endpoint
      try {
        const slug = storage.getActiveCompanySlug()
        if (!slug) return
        const profile = await apiService.get<Record<string, unknown>>(`/api/student/${slug}/me`)
        const companyData = profile?.Company as Record<string, unknown> ?? {}
        const modules = companyData.Modules as Record<string, boolean> ?? {}
        const current = _get().companies
        const updated = current.map((c) => {
          if ((c.slug ?? c.companySlug) === slug) return { ...c, modules }
          return c
        })
        if (updated.length === 0) {
          // No companies in store yet - create one from profile data
          updated.push({
            slug, companySlug: slug,
            name: (companyData.Name ?? 'Empresa') as string,
            role: 'student',
            modules,
            isActive: true,
          })
        }
        storage.setCompanies(updated)
        set({ companies: updated })
      } catch { /* silent */ }
    }
  },
  invalidateLocalSession: () => {
    sessionStorage.removeItem('dashboardAlertsShown')
    set({ token: null, user: null, companies: [], activeCompanySlug: null, activeRole: null, isLoading: false, dashboardAlertsShown: false })
  },
}))
