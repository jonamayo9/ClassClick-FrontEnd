import { Info, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { card, cardHover, muted } from './visual'
import { EduDonut, EduDonutSegment } from './EduDonut'

interface OcupacionData {
  occupiedSlots: number
  capacitySlots: number
  occupancyPercent: number
}

interface OcupacionCardProps {
  dash: OcupacionData | undefined
  loading?: boolean
  onSegmentClick?: (segment: EduDonutSegment) => void
  onGeneralClick?: () => void
  onVerComisiones?: () => void
}

export function OcupacionCard({ dash, loading, onSegmentClick, onGeneralClick, onVerComisiones }: OcupacionCardProps) {
  if (loading && !dash) {
    return (
      <div className={cn(card, 'animate-pulse p-5')}>
        <div className="h-4 w-24 rounded bg-slate-200 dark:bg-white/[0.06]" />
        <div className="mx-auto mt-4 h-40 w-40 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
      </div>
    )
  }

  const capacity = dash?.capacitySlots ?? 0
  const occupied = dash?.occupiedSlots ?? 0
  const available = Math.max(0, capacity - occupied)
  const pct = dash?.occupancyPercent ?? (capacity > 0 ? (occupied * 100) / capacity : 0)
  const hasData = capacity > 0

  const segments: EduDonutSegment[] = hasData
    ? [
        { label: 'Ocupados', count: occupied, color: '#3b82f6' },
        { label: 'Disponibles', count: available, color: '#cbd5e1' },
      ].filter((s) => s.count > 0)
    : []

  return (
    <div className={cn(card, cardHover, 'flex flex-col p-5')}>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ocupación</h3>
      <div className="flex flex-1 flex-col items-center">
        <EduDonut
          segments={segments}
          size={160}
          onClick={onGeneralClick}
          onClickSegment={onSegmentClick}
          centerValue={
            <span className="text-3xl font-black leading-none tracking-tight text-slate-900 tabular-nums dark:text-white">
              {hasData ? `${Math.round(pct)}%` : '—'}
            </span>
          }
          centerSub={
            <span className={cn('mt-1 text-[11px] font-medium tabular-nums', muted)}>
              {hasData ? `${occupied} / ${capacity}` : 'sin cupos'}
            </span>
          }
        />
        <div className="mt-2 w-full space-y-1">
          {hasData ? (
            segments.map((seg) => {
              const p = capacity > 0 ? (seg.count * 100) / capacity : 0
              return (
                <button
                  key={seg.label}
                  type="button"
                  onClick={() => onSegmentClick?.(seg)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition hover:bg-slate-100/70 dark:hover:bg-white/[0.05]"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="flex-1 truncate text-xs text-slate-600 dark:text-slate-300">{seg.label}</span>
                  <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{seg.count}</span>
                  <span className={cn('w-11 text-right text-xs tabular-nums', muted)}>({p.toFixed(0)}%)</span>
                </button>
              )
            })
          ) : (
            <p className="py-2 text-center text-xs text-slate-400 dark:text-slate-500">Sin comisiones con cupos definidos</p>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-blue-200/70 bg-blue-500/[0.07] p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Info className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-blue-800 dark:text-blue-300">
              La ocupación actual es del {hasData ? Math.round(pct) : 0}%
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-blue-700/90 dark:text-blue-400/90">
              Hay {available} cupo{available === 1 ? '' : 's'} disponible{available === 1 ? '' : 's'} en comisiones activas.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onVerComisiones}
          className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-blue-500/15 px-2.5 py-1.5 text-[11px] font-bold text-blue-800 transition hover:bg-blue-500/25 dark:text-blue-300"
        >
          Ver comisiones
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}