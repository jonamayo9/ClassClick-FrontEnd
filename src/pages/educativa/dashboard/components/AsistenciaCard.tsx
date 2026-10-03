import { TriangleAlert, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { card, cardHover, muted } from './visual'
import { EduDonut, EduDonutSegment } from './EduDonut'

interface AsistenciaSummary {
  totalAlumnos: number
  presentes: number
  ausentes: number
  tardes: number
  justificados: number
  sinRegistrar: number
}

interface AsistenciaCardProps {
  summary: AsistenciaSummary | undefined
  loading?: boolean
  onSegmentClick?: (segment: EduDonutSegment) => void
  onGeneralClick?: () => void
  onIrAsistencia?: () => void
}

export function AsistenciaCard({ summary, loading, onSegmentClick, onGeneralClick, onIrAsistencia }: AsistenciaCardProps) {
  if (loading && !summary) {
    return (
      <div className={cn(card, 'animate-pulse p-5')}>
        <div className="h-4 w-36 rounded bg-slate-200 dark:bg-white/[0.06]" />
        <div className="mx-auto mt-4 h-40 w-40 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
      </div>
    )
  }

  const total = summary?.totalAlumnos ?? 0
  const segments: EduDonutSegment[] = summary && total > 0
    ? [
        { label: 'Presentes', count: summary.presentes, color: '#22c55e' },
        { label: 'Ausentes', count: summary.ausentes, color: '#ef4444' },
        { label: 'Tarde', count: summary.tardes, color: '#f59e0b' },
        { label: 'Justificados', count: summary.justificados, color: '#3b82f6' },
        { label: 'Sin registrar', count: summary.sinRegistrar, color: '#94a3b8' },
      ].filter((s) => s.count > 0)
    : []
  const sinRegistrar = summary?.sinRegistrar ?? 0

  return (
    <div className={cn(card, cardHover, 'flex flex-col p-5')}>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Asistencias del período</h3>
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
          centerSub={<span className={cn('mt-1 text-[11px] font-medium', muted)}>registros</span>}
        />
        <div className="mt-2 w-full space-y-1">
          {total > 0 ? (
            segments.map((seg) => {
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
            })
          ) : (
            <p className="py-2 text-center text-xs text-slate-400 dark:text-slate-500">Sin asistencias registradas</p>
          )}
        </div>
      </div>

      {sinRegistrar > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200/70 bg-amber-500/[0.07] p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <TriangleAlert className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                {sinRegistrar} asistencia{sinRegistrar === 1 ? '' : 's'} pendiente{sinRegistrar === 1 ? '' : 's'} de registrar
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-amber-700/90 dark:text-amber-400/90">
                Todavía no se cargó asistencia para estas clases.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onIrAsistencia}
            className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 transition hover:bg-amber-500/25 dark:text-amber-300"
          >
            Ir a asistencia
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}