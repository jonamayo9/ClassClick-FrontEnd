import type { ReactNode } from 'react'

interface EduSectionProps {
  title: string
  subtitle?: string
  right?: ReactNode
  children: ReactNode
}

/** Cabecera de sección del Dashboard Educativa: título visible + subtítulo + acciones a la derecha. */
export function EduSection({ title, subtitle, right, children }: EduSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <h2 className="min-w-0 text-base font-extrabold leading-snug tracking-tight text-slate-900 dark:text-white">{title}</h2>
          {subtitle && <span className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</span>}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}