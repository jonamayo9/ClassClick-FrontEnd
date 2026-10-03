import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { card, cardHover, muted, SemColor, SEM } from './visual'

interface EduKpiCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  color: SemColor
  variation?: string | null
  variationLabel?: string
  onClick?: () => void
  navigateTo?: string
  tooltip?: string
  /** `academic` = card compacta de "Operación académica" con link inferior. */
  variant?: 'default' | 'academic'
  linkLabel?: string
}

export function EduKpiCard({
  icon,
  label,
  value,
  color,
  variation,
  variationLabel,
  onClick,
  navigateTo,
  tooltip,
  variant = 'default',
  linkLabel,
}: EduKpiCardProps) {
  const navigate = useNavigate()
  const c = SEM[color]
  const clickable = !!(onClick || navigateTo)

  function handleClick() {
    if (onClick) onClick()
    else if (navigateTo) navigate(navigateTo)
  }

  const isPositive = variation !== null && variation !== undefined && (variation.startsWith('+') || !variation.startsWith('-'))

  if (variant === 'academic') {
    return (
      <div
        onClick={handleClick}
        title={tooltip}
        className={cn(
          card,
          cardHover,
          'relative flex min-h-[96px] flex-col justify-between gap-2 overflow-hidden p-3.5',
          clickable && 'cursor-pointer',
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]', c.iconBg, c.text)}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn('text-[11px] font-semibold leading-tight', muted)}>{label}</p>
            <p className="mt-0.5 text-xl font-black leading-tight tracking-tight text-slate-900 tabular-nums dark:text-white">
              {value}
            </p>
          </div>
        </div>
        {linkLabel && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClick() }}
            className={cn('flex items-center gap-1 text-[11px] font-bold transition hover:opacity-80', c.link)}
          >
            {linkLabel}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      title={tooltip}
      className={cn(
        card,
        cardHover,
        'relative flex min-h-[105px] items-start gap-3 overflow-hidden p-4',
        clickable && 'cursor-pointer',
      )}
    >
      <div className={cn('absolute left-0 top-0 h-full w-[3px] rounded-r-sm', c.bar)} />
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]', c.iconBg, c.text)}>
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className={cn('text-[11px] font-semibold leading-tight', muted)}>{label}</p>
        <p className="mt-1 text-[26px] font-black leading-none tracking-tight text-slate-900 tabular-nums dark:text-white">
          {value}
        </p>
        {variation !== null && variation !== undefined && (
          <p className={cn('mt-1.5 flex items-center gap-1 text-[11px] font-semibold', isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
            <span className="tabular-nums">{isPositive ? '↑' : '↓'} {variation}</span>
            {variationLabel && <span className={cn('font-normal', muted)}>{variationLabel}</span>}
          </p>
        )}
      </div>
    </div>
  )
}