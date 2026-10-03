import { cn } from '@/lib/utils'
import { card, cardHover, muted } from './visual'
import { EduDonut, EduDonutSegment } from './EduDonut'

interface CuotasEstadoData {
  total: number
  paid: number
  pending: number
  overdue: number
}

interface CuotasEstadoCardProps {
  fin: CuotasEstadoData | undefined
  loading?: boolean
  onSegmentClick?: (segment: EduDonutSegment) => void
  onGeneralClick?: () => void
}

export function CuotasEstadoCard({ fin, loading, onSegmentClick, onGeneralClick }: CuotasEstadoCardProps) {
  if (loading && !fin) {
    return (
      <div className={cn(card, 'animate-pulse p-5')}>
        <div className="h-4 w-36 rounded bg-slate-200 dark:bg-white/[0.06]" />
        <div className="mt-4 flex items-center gap-4">
          <div className="h-[150px] w-[150px] shrink-0 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
          <div className="flex-1 space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-5 rounded bg-slate-200 dark:bg-white/[0.06]" />)}
          </div>
        </div>
      </div>
    )
  }

  const total = fin?.total ?? 0
  const segments: EduDonutSegment[] = fin && total > 0
    ? [
        { label: 'Pagadas', count: fin.paid, color: '#22c55e' },
        { label: 'Pendientes', count: fin.pending, color: '#f59e0b' },
        { label: 'Vencidas', count: fin.overdue, color: '#ef4444' },
      ]
    : []

  return (
    <div className={cn(card, cardHover, 'flex flex-col p-5')}>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cuotas por estado</h3>
      <div className="mt-4 flex flex-1 flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
        <EduDonut
          segments={segments}
          size={150}
          onClick={onGeneralClick}
          onClickSegment={onSegmentClick}
          centerValue={
            <span className="text-3xl font-black leading-none tracking-tight text-slate-900 tabular-nums dark:text-white">
              {total}
            </span>
          }
          centerSub={<span className={cn('mt-1 text-[11px] font-medium', muted)}>cuotas</span>}
        />
        <div className="w-full min-w-0 flex-1 space-y-2.5">
          {total > 0 ? (
            segments.map((seg) => {
              const pct = total > 0 ? (seg.count * 100) / total : 0
              return (
                <button
                  key={seg.label}
                  type="button"
                  onClick={() => onSegmentClick?.(seg)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-100/70 dark:hover:bg-white/[0.05]"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="flex-1 truncate text-xs text-slate-600 dark:text-slate-300">{seg.label}</span>
                  <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{seg.count}</span>
                  <span className={cn('w-11 text-right text-xs tabular-nums', muted)}>({pct.toFixed(0)}%)</span>
                </button>
              )
            })
          ) : (
            <p className={cn('text-xs', muted)}>Sin cuotas en el período.</p>
          )}
        </div>
      </div>
    </div>
  )
}