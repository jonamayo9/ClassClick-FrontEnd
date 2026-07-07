export interface Company {
  slug?: string
  companySlug?: string
  role?: string
  activeRole?: string
  name?: string
  logoUrl?: string
  LogoUrl?: string
  modules?: Record<string, boolean>
  isActive?: boolean
}

export interface User {
  id: string
  email: string
  name?: string
  firstName?: string
  lastName?: string
  systemRole?: string
  isSuperAdmin?: boolean
  companies?: Company[]
}

export interface LoginResponse {
  token: string
  refreshToken: string
  accessTokenExpiresAtUtc?: string
  user: User
  companies: Company[]
}

export interface Session {
  token: string | null
  refreshToken: string | null
  user: User | null
  activeCompanySlug: string | null
  activeRole: string | null
}

export type ThemeMode = 'system' | 'light' | 'dark'

export type Role = 'superadmin' | 'admin' | 'student' | 'teacher'
