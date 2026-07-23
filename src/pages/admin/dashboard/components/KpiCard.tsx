import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  variation?: string | null
  variationLabel?: string
  color: 'emerald' | 'blue' | 'amber' | 'rose' | 'violet' | 'indigo'
  navigateTo?: string
  tooltip?: string
}

const colorMap: Record<string, { bar: string; bg: string; iconBg: string; positive: string; negative: string }> = {
  emerald: { bar: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', positive: 'text-emerald-600', negative: 'text-rose-600' },
  blue: { bar: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20', iconBg: 'bg-blue-100 dark:bg-blue-900/40', positive: 'text-emerald-600', negative: 'text-rose-600' },
  amber: { bar: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20', iconBg: 'bg-amber-100 dark:bg-amber-900/40', positive: 'text-emerald-600', negative: 'text-rose-600' },
  rose: { bar: 'bg-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/20', iconBg: 'bg-rose-100 dark:bg-rose-900/40', positive: 'text-emerald-600', negative: 'text-rose-600' },
  violet: { bar: 'bg-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/20', iconBg: 'bg-violet-100 dark:bg-violet-900/40', positive: 'text-emerald-600', negative: 'text-rose-600' },
  indigo: { bar: 'bg-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/20', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', positive: 'text-emerald-600', negative: 'text-rose-600' },
}

export function KpiCard({ icon, label, value, variation, variationLabel, color, navigateTo, tooltip }: KpiCardProps) {
  const navigate = useNavigate()
  const c = colorMap[color]
  const isPositive = variation !== null && variation !== undefined && (variation.startsWith('+') || !variation.startsWith('-'))

  return (
    <div
      onClick={() => navigateTo && navigate(navigateTo)}
      title={tooltip}
      className={cn(
        'relative flex items-start gap-3 overflow-hidden rounded-2xl border border-slate-200 p-4 shadow-sm transition hover:shadow-md dark:border-slate-700',
        c.bg,
        navigateTo && 'cursor-pointer',
      )}
    >
      <div className={cn('absolute left-0 top-0 h-full w-1 shrink-0', c.bar)} />
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', c.iconBg)}>
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-[11px] font-semibold leading-tight text-slate-500 dark:text-slate-400 line-clamp-2">
          {label}
        </p>
        <p className="text-xl font-black leading-tight text-slate-900 dark:text-white">
          {value}
        </p>
        {variation !== undefined && variation !== null && (
          <p className={cn('flex items-center gap-0.5 text-[11px] font-medium', isPositive ? c.positive : c.negative)}>
            <span>{isPositive ? '↑' : '↓'}</span>
            <span>{variation}</span>
            {variationLabel && <span className="text-slate-400 font-normal ml-0.5">{variationLabel}</span>}
          </p>
        )}
      </div>
    </div>
  )
}
