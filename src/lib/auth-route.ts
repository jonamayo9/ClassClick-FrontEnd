import { useAuth } from '@/stores/auth'
import { hasPermission } from '@/hooks/usePermission'

/**
 * Resolución ÚNICA de la ruta de inicio según el contexto autenticado.
 * Regla de routing:
 *   - StructureType == Group  → /group-admin/{slug}
 *   - Child/Individual Deportiva → /admin
 *   - Child/Individual Educativa → /educativa/{slug}/commissions
 *   - superadmin → /superadmin
 *   - resto de roles → su home.
 * Evita que cualquier flujo (login, restore, landing, notificaciones) caiga
 * en /admin con un Group o una empresa Educativa activos.
 */
export function resolveHomePath(): string {
  const s = useAuth.getState()
  const role = (s.activeRole?.toLowerCase() ?? s.user?.systemRole?.toLowerCase() ?? '')

  if (!s.token || !s.user) return '/login'

  const company = (s.companies ?? []).find((c) => (c.slug ?? c.companySlug) === s.activeCompanySlug)

  if (s.mode === 'group' || company?.structureType === 'Group') {
    return s.activeCompanySlug ? `/group-admin/${s.activeCompanySlug}` : '/login'
  }

  if (role === 'superadmin') return '/superadmin'

  if (role === 'admin') {
    if (company?.vertical === 'Educativa') {
      if (!s.activeCompanySlug) return '/admin'
      // Envía al primer módulo permitido según una prioridad clara; nunca a una ruta prohibida.
      const base = `/educativa/${s.activeCompanySlug}`
      const priorities: { code: string; path: string }[] = [
        { code: 'dashboard', path: base },
        { code: 'students', path: `${base}/alumnos` },
        { code: 'records', path: `${base}/records` },
        { code: 'trainings', path: `${base}/formaciones` },
        { code: 'commissions', path: `${base}/commissions` },
        { code: 'teachers', path: `${base}/docentes` },
        { code: 'attendance', path: `${base}/asistencias` },
        { code: 'certifications', path: `${base}/certificaciones` },
        { code: 'graduates', path: `${base}/graduados` },
        { code: 'promotions', path: `${base}/promociones` },
        { code: 'cuotas', path: `${base}/pagos` },
        { code: 'institution-settings', path: `${base}/config-pagos` },
        { code: 'admin-management', path: `${base}/permissions` },
        { code: 'billing', path: `${base}/billing` },
      ]
      const first = priorities.find((p) => hasPermission(p.code))
      return first ? first.path : `${base}/profile`
    }
    return '/admin'
  }

  if (role === 'teacher') return '/teacher'
  if (role === 'docente') return '/docente'
  if (role === 'delegate') return '/delegate'
  if (role === 'eventoperator') return '/event-operator'

  if (role === 'student') {
    return company?.vertical === 'Educativa' ? '/estudiante' : '/student'
  }

  return '/login'
}