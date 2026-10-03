import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { usePermission } from '@/hooks/usePermission'

interface PermissionGuardProps {
  code: string
  children: ReactNode
}

/** Bloquea el acceso a una ruta si el usuario no tiene el permiso funcional (área Educativa). */
export function PermissionGuard({ code, children }: PermissionGuardProps) {
  const enabled = usePermission(code)

  if (enabled) return <>{children}</>

  return (
    <div className="mx-auto w-full max-w-[720px] p-4 sm:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-[#0D1A2E]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
          <ShieldAlert className="h-7 w-7 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">Sin acceso a este módulo</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          No tenés permiso para ingresar a esta sección. Pedí al administrador de la institución que lo habilite.
        </p>
      </div>
    </div>
  )
}