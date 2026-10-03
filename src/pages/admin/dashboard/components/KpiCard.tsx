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
  onClick?: () => void
  tooltip?: string
  isSport?: boolean
}

const colorMap: Record<string, { bar: string; bg: string; iconBg: string; positive: string; negative: string }> = {
  emerald: { bar: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', positive: 'text-emerald-600', negative: 'text-rose-600' },
  blue: { bar: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20', iconBg: 'bg-blue-100 dark:bg-blue-900/40', positive: 'text-emerald-600', negative: 'text-rose-600' },
  amber: { bar: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20', iconBg: 'bg-amber-100 dark:bg-amber-900/40', positive: 'text-emerald-600', negative: 'text-rose-600' },
  rose: { bar: 'bg-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/20', iconBg: 'bg-rose-100 dark:bg-rose-900/40', positive: 'text-emerald-600', negative: 'text-rose-600' },
  violet: { bar: 'bg-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/20', iconBg: 'bg-violet-100 dark:bg-violet-900/40', positive: 'text-emerald-600', negative: 'text-rose-600' },
  indigo: { bar: 'bg-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/20', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', positive: 'text-emerald-600', negative: 'text-rose-600' },
}

const sportColorMap: Record<string, { iconBg: string; positive: string; negative: string }> = {
  emerald: { iconBg: 'bg-emerald-100 dark:bg-emerald-500/15', positive: 'text-emerald-600 dark:text-emerald-400', negative: 'text-rose-600 dark:text-rose-400' },
  blue: { iconBg: 'bg-blue-100 dark:bg-blue-500/15', positive: 'text-emerald-600 dark:text-emerald-400', negative: 'text-rose-600 dark:text-rose-400' },
  amber: { iconBg: 'bg-amber-100 dark:bg-amber-500/15', positive: 'text-emerald-600 dark:text-emerald-400', negative: 'text-rose-600 dark:text-rose-400' },
  rose: { iconBg: 'bg-rose-100 dark:bg-rose-500/15', positive: 'text-emerald-600 dark:text-emerald-400', negative: 'text-rose-600 dark:text-rose-400' },
  violet: { iconBg: 'bg-violet-100 dark:bg-violet-500/15', positive: 'text-emerald-600 dark:text-emerald-400', negative: 'text-rose-600 dark:text-rose-400' },
  indigo: { iconBg: 'bg-indigo-100 dark:bg-indigo-500/15', positive: 'text-emerald-600 dark:text-emerald-400', negative: 'text-rose-600 dark:text-rose-400' },
}

export function KpiCard({ icon, label, value, variation, variationLabel, color, navigateTo, onClick, tooltip, isSport = false }: KpiCardProps) {
  const navigate = useNavigate()
  const c = colorMap[color]
  const s = sportColorMap[color]
  const isPositive = variation !== null && variation !== undefined && (variation.startsWith('+') || !variation.startsWith('-'))
  const clickable = !!(navigateTo || onClick)

  function handleClick() {
    if (onClick) onClick()
    else if (navigateTo) navigate(navigateTo)
  }

  if (isSport) {
    return (
      <div
        onClick={handleClick}
        title={tooltip}
        className={cn(
          'relative flex items-center gap-3.5 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-[rgba(120,150,200,0.25)] dark:bg-[#111C30] dark:shadow-[0_1px_6px_rgba(2,8,23,0.45)] dark:hover:shadow-[0_4px_16px_rgba(2,8,23,0.55)]',
          clickable && 'cursor-pointer hover:border-slate-300 dark:hover:border-[rgba(150,180,235,0.45)]',
        )}
      >
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]', s.iconBg)}>
          {icon}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-xs font-semibold leading-tight text-slate-500 line-clamp-2 dark:text-slate-400">
            {label}
          </p>
          <p className="text-[22px] font-extrabold leading-tight tracking-tight text-slate-900 tabular-nums dark:text-white">
            {value}
          </p>
          {variation !== undefined && variation !== null && (
            <p className={cn('flex items-center gap-0.5 text-[11px] font-medium', isPositive ? s.positive : s.negative)}>
              <span>{isPositive ? '↑' : '↓'}</span>
              <span>{variation}</span>
              {variationLabel && <span className="text-slate-400 font-normal ml-0.5 dark:text-slate-500">{variationLabel}</span>}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      title={tooltip}
      className={cn(
        'relative flex items-start gap-3 overflow-hidden rounded-2xl border border-slate-200 p-4 shadow-sm transition hover:shadow-md dark:border-slate-700',
        c.bg,
        clickable && 'cursor-pointer hover:ring-1 hover:ring-slate-300 dark:hover:ring-slate-600',
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
