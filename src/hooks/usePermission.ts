import { useAuth } from '@/stores/auth'
import type { Company } from '@/types/auth'

/** Permisos funcionales del área Educativa (Marca Blanca). Mismo set que el backend. */
export const EDUCATIVE_PERMISSIONS: { code: string; label: string; description: string }[] = [
  { code: 'dashboard', label: 'Dashboard', description: 'Permite visualizar el dashboard con el estado general de la institución.' },
  { code: 'students', label: 'Gestión de Alumnos', description: 'Permite gestionar alumnos: listado, alta, edición, legajo e inscripciones.' },
  { code: 'records', label: 'Legajos', description: 'Permite consultar y gestionar los legajos y documentación de los alumnos.' },
  { code: 'attendance', label: 'Gestión de Asistencias', description: 'Permite ver, registrar y corregir asistencias.' },
  { code: 'cuotas', label: 'Gestión de Cuotas', description: 'Permite gestionar cuotas, visualizar deudas y subir comprobantes de pago.' },
  { code: 'news', label: 'Novedades', description: 'Permite crear, editar y publicar novedades.' },
  { code: 'promotions', label: 'Promociones', description: 'Permite crear, editar y consultar promociones.' },
  { code: 'trainings', label: 'Formaciones', description: 'Permite crear, editar y configurar formaciones.' },
  { code: 'commissions', label: 'Comisiones', description: 'Permite gestionar comisiones e incluye automáticamente el acceso a Clases.' },
  { code: 'teachers', label: 'Docentes', description: 'Permite administrar docentes: listado, alta, edición y restablecer contraseña.' },
  { code: 'certifications', label: 'Certificaciones', description: 'Permite gestionar certificaciones y sus acciones normales.' },
  { code: 'graduates', label: 'Graduados', description: 'Permite consultar y gestionar graduados.' },
  { code: 'institution-settings', label: 'Configuración de la institución', description: 'Permite administrar los datos, configuración económica y página pública de la institución.' },
  { code: 'admin-management', label: 'Gestión de administradores', description: 'Permite administrar usuarios y permisos de la institución.' },
  { code: 'billing', label: 'Plan y facturación', description: 'Permite consultar el plan y la facturación de la institución.' },
]

export const EDUCATIVE_PERMISSION_LABELS: Record<string, string> = Object.fromEntries(
  EDUCATIVE_PERMISSIONS.map((p) => [p.code, p.label]),
)

function resolvePermissionEnabled(company: Company | undefined, code: string): boolean {
  if (!company) return true

  const permissions = company.permissions as Record<string, boolean> | undefined
  // Compatibilidad: si el backend aún no envía `permissions`, conserva el acceso previo.
  if (!permissions) return true

  return permissions[code] === true
}

/** Lectura de snapshot del auth store (para código fuera de hooks). */
export function hasPermission(code: string): boolean {
  try {
    const { activeCompanySlug, companies } = useAuth.getState()
    if (!activeCompanySlug) return true

    const company = companies.find((c) => (c.slug ?? c.companySlug) === activeCompanySlug)
    if (!company) return true

    return resolvePermissionEnabled(company, code)
  } catch {
    return true
  }
}

/** Hook reactivo: re-renderiza al cambiar empresa / companies / permisos. */
export function usePermission(code?: string): boolean {
  const activeCompanySlug = useAuth((s) => s.activeCompanySlug)
  const companies = useAuth((s) => s.companies)

  if (!code) return true

  const company = companies.find((c) => (c.slug ?? c.companySlug) === activeCompanySlug)

  return resolvePermissionEnabled(company, code)
}