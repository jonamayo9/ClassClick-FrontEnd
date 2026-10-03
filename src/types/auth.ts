export type CompanyStructureType = 'Individual' | 'Group' | 'Child'

export type CompanyVertical = 'Deportiva' | 'Educativa'

export interface Company {
  id?: string
  slug?: string
  companySlug?: string
  companyId?: string
  role?: string
  activeRole?: string
  name?: string
  companyName?: string
  logoUrl?: string
  LogoUrl?: string
  modules?: Record<string, boolean>
  /** Permisos funcionales del usuario autenticado sobre esta empresa (área Educativa). Códigos: dashboard, students, attendance, cuotas, news, promotions, trainings, commissions. */
  permissions?: Record<string, boolean>
  isActive?: boolean
  structureType?: CompanyStructureType
  vertical?: CompanyVertical | null
  parentCompanyId?: string
  parentCompanyName?: string
  children?: Company[]
}

export type CompanyContextMode = 'direct' | 'group'

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
  mode: CompanyContextMode | null
}

export type ThemeMode = 'system' | 'light' | 'dark'

export type Role = 'superadmin' | 'admin' | 'student' | 'teacher' | 'delegate'
