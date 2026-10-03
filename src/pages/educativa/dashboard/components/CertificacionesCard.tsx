import { Medal, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { card, cardHover, muted } from './visual'
import { EduDonut, EduDonutSegment } from './EduDonut'

interface CertificacionesCardProps {
  total: number
  segments: EduDonutSegment[]
  loading?: boolean
  onSegmentClick?: (segment: EduDonutSegment) => void
  onGeneralClick?: () => void
  onVerCertificaciones?: () => void
}

export function CertificacionesCard({
  total,
  segments,
  loading,
  onSegmentClick,
  onGeneralClick,
  onVerCertificaciones,
}: CertificacionesCardProps) {
  if (loading && total === 0 && segments.length === 0) {
    return (
      <div className={cn(card, 'animate-pulse p-5')}>
        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-white/[0.06]" />
        <div className="mx-auto mt-4 h-40 w-40 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className={cn(card, cardHover, 'flex min-h-[300px] flex-col items-center justify-center p-5 text-center')}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 dark:bg-blue-500/15">
          <Medal className="h-8 w-8 text-blue-600 dark:text-blue-400" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <p className="mt-4 text-sm font-bold text-slate-900 dark:text-white">Sin datos en este período</p>
        <p className={cn('mt-1 max-w-[240px] text-xs leading-snug', muted)}>
          Aún no se registraron solicitudes o certificados emitidos.
        </p>
        <button
          type="button"
          onClick={onVerCertificaciones}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-blue-600/40 bg-transparent px-4 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
        >
          Ver certificaciones
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    )
  }

  return (
    <div className={cn(card, cardHover, 'flex flex-col p-5')}>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Certificaciones</h3>
      <div className="flex flex-1 flex-col items-center">
        <EduDonut
          segments={segments}
          size={160}
          onClick={onGeneralClick}
          onClickSegment={onSegmentClick}
          centerValue={
            <span className="text-3xl font-black leading-none tracking-tight text-slate-900 tabular-nums dark:text-white">
              {total}
            </span>
          }
          centerSub={<span className={cn('mt-1 text-[11px] font-medium', muted)}>solicitudes</span>}
        />
        <div className="mt-2 w-full space-y-1">
          {segments.map((seg) => {
            const pct = total > 0 ? (seg.count * 100) / total : 0
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
                <span className={cn('w-11 text-right text-xs tabular-nums', muted)}>({pct.toFixed(0)}%)</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}