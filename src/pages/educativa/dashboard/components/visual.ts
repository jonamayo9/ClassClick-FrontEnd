// Paleta y estilos compartidos del Dashboard Educativa (SaaS premium dark navy).
// Solo estética: no toca datos, lógica ni contratos.

export type SemColor = 'violet' | 'emerald' | 'blue' | 'rose' | 'amber' | 'cyan'

export interface SemStyle {
  hex: string
  text: string
  iconBg: string
  bar: string
  link: string
  softBg: string
}

export const SEM: Record<SemColor, SemStyle> = {
  violet: {
    hex: '#8b5cf6',
    text: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-500/10 dark:bg-violet-500/15',
    bar: 'bg-violet-500',
    link: 'text-violet-600 dark:text-violet-400',
    softBg: 'bg-violet-500/[0.06] dark:bg-violet-500/10',
  },
  emerald: {
    hex: '#10b981',
    text: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    bar: 'bg-emerald-500',
    link: 'text-emerald-600 dark:text-emerald-400',
    softBg: 'bg-emerald-500/[0.06] dark:bg-emerald-500/10',
  },
  blue: {
    hex: '#2563eb',
    text: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/15',
    bar: 'bg-blue-500',
    link: 'text-blue-600 dark:text-blue-400',
    softBg: 'bg-blue-500/[0.06] dark:bg-blue-500/10',
  },
  rose: {
    hex: '#e11d48',
    text: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-500/10 dark:bg-rose-500/15',
    bar: 'bg-rose-500',
    link: 'text-rose-600 dark:text-rose-400',
    softBg: 'bg-rose-500/[0.06] dark:bg-rose-500/10',
  },
  amber: {
    hex: '#f59e0b',
    text: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/15',
    bar: 'bg-amber-500',
    link: 'text-amber-600 dark:text-amber-400',
    softBg: 'bg-amber-500/[0.06] dark:bg-amber-500/10',
  },
  cyan: {
    hex: '#0ea5e9',
    text: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    bar: 'bg-cyan-500',
    link: 'text-cyan-600 dark:text-cyan-400',
    softBg: 'bg-cyan-500/[0.06] dark:bg-cyan-500/10',
  },
}

export const SEM_HEX: Record<SemColor, string> = {
  violet: '#8b5cf6',
  emerald: '#10b981',
  blue: '#2563eb',
  rose: '#e11d48',
  amber: '#f59e0b',
  cyan: '#0ea5e9',
}

/** Card base del dashboard: fondo navy en dark, blanco en light, borde sutil, radio 16px. */
export const card =
  'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[rgba(148,163,184,0.14)] dark:bg-[#0D1A2E]'

export const cardHover =
  'transition hover:shadow-md dark:hover:border-[rgba(148,163,184,0.22)] dark:hover:shadow-[0_8px_24px_rgba(2,8,23,0.35)]'

/** Texto secundario desaturado (labels). */
export const muted = 'text-slate-500 dark:text-slate-400'

/** Valor numérico KPI: grande, bold, blanco en dark. */
export const valueBig = 'text-2xl font-black tracking-tight text-slate-900 tabular-nums dark:text-white'