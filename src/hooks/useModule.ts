import { storage } from '@/lib/storage'

export function hasModule(moduleCode: string): boolean {
  try {
    const slug = storage.getActiveCompanySlug()
    if (!slug) return true

    const companies = storage.getCompanies<{ slug?: string; companySlug?: string; modules?: Record<string, boolean>; isMatchOrganizationEnabled?: boolean; isClothingEnabled?: boolean }>()
    const company = companies.find((c) => (c.slug ?? c.companySlug) === slug)
    if (!company) return true

    if (company.modules && moduleCode in company.modules) return company.modules[moduleCode] === true

    const legacy: Record<string, string> = { matches: 'isMatchOrganizationEnabled', clothing: 'isClothingEnabled' }
    const key = legacy[moduleCode]
    if (key && (company as Record<string, unknown>)[key] === true) return true
    return false
  } catch { return true }
}

export function useModule(moduleCode?: string): boolean {
  if (!moduleCode) return true
  return hasModule(moduleCode)
}
