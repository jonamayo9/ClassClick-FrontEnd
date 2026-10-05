import { GraduationCap, CircleDollarSign, Settings, TrendingUp, TriangleAlert, CircleAlert, Info, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { card, cardHover, muted } from './visual'
import type { GeneralStateData } from './DashboardDetailModal'

export interface EstadoGeneralAttention {
  overdue: number
  pending: number
  pendingAmount: number
  overdueAmount: number
}

interface EstadoGeneralHeroProps {
  state: GeneralStateData | undefined
  loading: boolean
  occupancyPercent?: number
  hasOccupancyData?: boolean
  /** Asistencia real del período (fallback cuando el factor "Asistencia" de hoy no tiene datos). */
  academicRate?: number
  hasAcademicRate?: boolean
  /** La empresa tiene clases configuradas (funcionalidad Asistencia aplicable). Si es false,
   *  el factor Académico (asistencia) se EXCLUYE del Estado General. */
  hasAttendanceSetup?: boolean
  attention?: EstadoGeneralAttention | null
  onVerDetalle: () => void
}

const SEVERITY_STYLE: Record<string, { color: string; label: string; box: string; iconBox: string; icon: React.ElementType; message: string }> = {
  ok: {
    color: '#10b981',
    label: 'Buen estado',
    box: 'bg-emerald-500/[0.07] dark:bg-emerald-500/10 border-emerald-200/70 dark:border-emerald-500/20',
    iconBox: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    icon: TrendingUp,
    message: 'La institución se encuentra en un buen estado general.',
  },
  warning: {
    color: '#f59e0b',
    label: 'Requiere atención',
    box: 'bg-amber-500/[0.07] dark:bg-amber-500/10 border-amber-200/70 dark:border-amber-500/20',
    iconBox: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    icon: TriangleAlert,
    message: 'La institución presenta situaciones que requieren atención.',
  },
  danger: {
    color: '#ef4444',
    label: 'Crítico',
    box: 'bg-rose-500/[0.07] dark:bg-rose-500/10 border-rose-200/70 dark:border-rose-500/20',
    iconBox: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    icon: CircleAlert,
    message: 'Se requieren acciones urgentes en la institución.',
  },
  insufficient: {
    color: '#94a3b8',
    label: 'Sin datos',
    box: 'bg-slate-500/[0.07] dark:bg-slate-500/10 border-slate-200/70 dark:border-slate-500/20',
    iconBox: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
    icon: Info,
    message: 'Faltan datos para calcular el estado general de la institución.',
  },
}

const money = (v?: number) => `$${(v ?? 0).toLocaleString('es-AR')}`

function ScoreRing({ state }: { state: GeneralStateData | undefined }) {
  if (!state) return null
  const s = SEVERITY_STYLE[state.severity] ?? SEVERITY_STYLE.insufficient
  const size = 148
  const stroke = 12
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const hasData = state.hasData && state.severity !== 'insufficient'

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* halo muy sutil del color semántico en cards destacadas */}
        <div
          className="absolute inset-0 rounded-full blur-2xl"
          style={{ background: `radial-gradient(circle, ${s.color}22 0%, transparent 70%)` }}
        />
        <svg className="relative -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="text-slate-200 dark:text-white/[0.07]"
            stroke="currentColor"
          />
          {hasData && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${(state.score / 100) * circ} ${circ}`}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {hasData ? (
            <>
              <span className="text-[34px] font-black leading-none tracking-tight text-slate-900 tabular-nums dark:text-white">
                {state.score}
                <span className="text-lg font-bold text-slate-400 dark:text-slate-500">%</span>
              </span>
              <span className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{s.label}</span>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <span className={cn('flex h-11 w-11 items-center justify-center rounded-full', s.iconBox)}>
                <s.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="mt-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Sin datos</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Indicator({
  icon,
  label,
  value,
  color,
  hasData,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  hasData: boolean
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          {icon}
        </span>
        <span className={cn('min-w-0 flex-1 truncate text-xs font-semibold', muted)}>{label}</span>
        <span className="shrink-0 text-sm font-black tabular-nums text-slate-900 dark:text-white">
          {hasData
            ? `${Math.round(value)}%`
            : <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Sin datos</span>}
        </span>
      </div>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/[0.08]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: hasData ? `${Math.min(100, Math.max(0, value))}%` : '0%', backgroundColor: color }}
        />
      </div>
    </div>
  )
}

const INDICATOR_GRID: Record<number, string> = {
  2: 'grid grid-cols-1 gap-3 sm:grid-cols-2',
  3: 'grid grid-cols-1 gap-3 sm:grid-cols-3',
}

export function EstadoGeneralHero({
  state,
  loading,
  occupancyPercent,
  hasOccupancyData,
  academicRate,
  hasAcademicRate,
  hasAttendanceSetup,
  attention,
  onVerDetalle,
}: EstadoGeneralHeroProps) {
  if (loading && !state) {
    return (
      <div className={cn(card, 'p-5 sm:p-6')}>
        <div className="flex animate-pulse flex-col gap-5 lg:flex-row">
          <div className="h-[148px] w-[148px] shrink-0 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-64 rounded bg-slate-200 dark:bg-white/[0.06]" />
            <div className="h-3 w-96 max-w-full rounded bg-slate-200 dark:bg-white/[0.06]" />
            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[68px] rounded-xl bg-slate-200 dark:bg-white/[0.06]" />
              ))}
            </div>
          </div>
          <div className="h-full w-full shrink-0 rounded-xl bg-slate-200 dark:bg-white/[0.06] lg:w-[280px]" />
        </div>
      </div>
    )
  }

  if (!state) return null

  const s = SEVERITY_STYLE[state.severity] ?? SEVERITY_STYLE.insufficient
  const hasData = state.hasData && state.severity !== 'insufficient'

  const academicFactor = state.factors.find((f) => f.name === 'Asistencia')
  const financialFactor = state.factors.find((f) => f.name === 'Cobranza')
  const missing = state.factors
    .filter((f) => !f.hasData)
    // Sin clases configuradas, Asistencia queda EXCLUIDA del Estado General (no se reporta
    // como factor faltante ni como "sin datos"): la funcionalidad no aplica.
    .filter((f) => !(f.name === 'Asistencia' && !hasAttendanceSetup))
    .map((f) => f.name)
  const missingLabel = missing.length > 0 ? `Falta: ${missing.join(', ')}.` : null

  // Académico: usa el factor real de asistencia (hoy). Si no hay asistencia registrada hoy
  // pero el período sí tiene asistencias reales, muestra esas (dato real, no inventado).
  const academicHasData = academicFactor?.hasData ?? false
  const academicValue = academicHasData ? academicFactor!.value : (academicRate ?? 0)
  const academicData = academicHasData || (hasAcademicRate ?? false)

  let attentionLine: string | null = null
  if (attention && attention.overdue > 0) {
    attentionLine = `${attention.overdue} cuota${attention.overdue === 1 ? '' : 's'} vencida${attention.overdue === 1 ? '' : 's'} · ${money(attention.pendingAmount)} pendientes`
  } else if (attention && attention.pending > 0) {
    attentionLine = `${attention.pending} cuota${attention.pending === 1 ? '' : 's'} pendiente${attention.pending === 1 ? '' : 's'} · ${money(attention.pendingAmount)}`
  } else {
    attentionLine = 'Sin obligaciones pendientes.'
  }

  const StatusIcon = s.icon

  const indicators = (
    <div className={INDICATOR_GRID[(hasAttendanceSetup ? 1 : 0) + 2]}>
      {hasAttendanceSetup && (
        <Indicator
          icon={<GraduationCap className="h-4 w-4" aria-hidden="true" />}
          label="Académico"
          value={academicValue}
          color="#22c55e"
          hasData={academicData}
        />
      )}
      <Indicator
        icon={<CircleDollarSign className="h-4 w-4" aria-hidden="true" />}
        label="Financiero"
        value={financialFactor?.hasData ? financialFactor.value : 0}
        color="#f59e0b"
        hasData={!!financialFactor?.hasData}
      />
      <Indicator
        icon={<Settings className="h-4 w-4" aria-hidden="true" />}
        label="Operativo"
        value={occupancyPercent ?? 0}
        color="#3b82f6"
        hasData={hasOccupancyData ?? false}
      />
    </div>
  )

  const scoreZone = <ScoreRing state={state} />

  const titleZone = (
    <div className="min-w-0">
      <h2 className="text-lg font-extrabold leading-snug tracking-tight text-slate-900 dark:text-white">
        Estado General de la Institución
      </h2>
      <p className={cn('mt-0.5 text-xs', muted)}>
        Visión global del rendimiento académico, financiero y operativo.
      </p>
      {hasData && (
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Score de salud institucional (0-100)</p>
      )}
    </div>
  )

  const rightZone = (
    <div className={cn('rounded-2xl border p-4', s.box)}>
      <div className="flex items-start gap-3">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', s.iconBox)}>
          <StatusIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-bold leading-snug text-slate-800 dark:text-slate-100">{s.message}</p>
          <p className={cn('mt-2 text-[10px] font-bold uppercase tracking-wider', muted)}>Principal atención</p>
          <p className="mt-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">{attentionLine}</p>
          {!hasData && missingLabel && (
            <p className="mt-1.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{missingLabel}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onVerDetalle}
        className="mt-3.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-50 dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
      >
        Ver detalle
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  )

  return (
    <div className={cn(card, cardHover, 'relative overflow-hidden p-5 sm:p-6')}>
      {/* gradiente de fondo muy sutil hacia el color semántico */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: `radial-gradient(1200px 300px at 15% -10%, ${s.color}0d 0%, transparent 60%)` }}
      />

      {/* Layout tablet/mobile y desktop medio: score+título arriba; indicadores + diagnóstico abajo */}
      <div className="relative flex flex-col gap-6 min-[1704px]:hidden">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div className="shrink-0">{scoreZone}</div>
          <div className="min-w-0 flex-1 text-center sm:text-left">{titleZone}</div>
        </div>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch">
          <div className="min-w-0 flex-1">{indicators}</div>
          <div className="w-full shrink-0 xl:w-[300px]">{rightZone}</div>
        </div>
      </div>

      {/* Layout desktop grande (>= ~1400px de contenido): 3 zonas horizontales */}
      <div className="relative hidden min-[1704px]:flex min-[1704px]:flex-row min-[1704px]:items-stretch min-[1704px]:gap-6">
        <div className="flex shrink-0 justify-center min-[1704px]:w-[190px]">{scoreZone}</div>
        <div className="min-w-0 flex-1">
          {titleZone}
          <div className="mt-4">{indicators}</div>
        </div>
        <div className="w-[300px] shrink-0">{rightZone}</div>
      </div>
    </div>
  )
}