import { useAuth } from '@/stores/auth'
import type { Company } from '@/types/auth'

function resolveModuleEnabled(company: Company | undefined, moduleCode: string): boolean {
  if (!company) return true

  const modules = company.modules as Record<string, boolean> | undefined
  if (modules && moduleCode in modules) return modules[moduleCode] === true

  // Compatibilidad legacy para módulos que aún no viajan en `modules`.
  const legacy: Record<string, string> = { matches: 'isMatchOrganizationEnabled', clothing: 'isClothingEnabled' }
  const key = legacy[moduleCode]
  if (key && (company as Record<string, unknown>)[key] === true) return true

  return false
}

/**
 * Lectura de snapshot del auth store (NO localStorage). Sirve para código fuera de hooks
 * (enabled de queries, guards utilitarios). Para render reactivo usar `useModule`.
 */
export function hasModule(moduleCode: string): boolean {
  try {
    const { activeCompanySlug, companies } = useAuth.getState()
    if (!activeCompanySlug) return true

    const company = companies.find((c) => (c.slug ?? c.companySlug) === activeCompanySlug)
    if (!company) return true

    return resolveModuleEnabled(company, moduleCode)
  } catch {
    return true
  }
}

/**
 * Hook reactivo: se suscribe al auth store. Re-renderiza al cambiar empresa activa,
 * companies o modules (cambio de empresa / refresh de companies / nuevo login).
 */
export function useModule(moduleCode?: string): boolean {
  const activeCompanySlug = useAuth((s) => s.activeCompanySlug)
  const companies = useAuth((s) => s.companies)

  if (!moduleCode) return true

  const company = companies.find((c) => (c.slug ?? c.companySlug) === activeCompanySlug)

  return resolveModuleEnabled(company, moduleCode)
}
