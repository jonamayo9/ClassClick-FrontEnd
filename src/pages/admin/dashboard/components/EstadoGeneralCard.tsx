import { TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/stores/theme'

interface EstadoGeneralCardProps {
  collectionRate: number
  documentCompliance: number
  averageAttendance: number
  activeStudents: number
  expiredDocs: number
  expiringDocs: number
  overdueCharges: number
  pendingReviews: number
  newInquiries: number
  hasChargeData: boolean
  hasAttendanceData: boolean
  hasDocumentData: boolean
  title?: string
  isSport?: boolean
}

function calcScore(
  collectionRate: number, docCompliance: number, attendance: number,
  hasCharge: boolean, hasDoc: boolean, hasAtt: boolean,
  expiredDocs: number, overdueCharges: number, pendingReviews: number, newInquiries: number
): { score: number; label: string; color: string; bg: string; textColor: string; summary: string[] } {
  const metrics: { value: number; weight: number; label: string }[] = []
  let totalWeight = 0

  if (hasCharge) { metrics.push({ value: collectionRate, weight: 40, label: 'Cobranza' }); totalWeight += 40 }
  if (hasDoc) { metrics.push({ value: docCompliance, weight: 35, label: 'Documentación' }); totalWeight += 35 }
  if (hasAtt) { metrics.push({ value: attendance, weight: 25, label: 'Asistencia' }); totalWeight += 25 }

  if (metrics.length < 2) return { score: 0, label: 'Datos insuficientes', color: '#94a3b8', bg: 'bg-slate-50 dark:bg-slate-800/50', textColor: 'text-slate-400', summary: ['No hay suficientes datos para calcular el estado general.'] }

  // Normalize: redistribute weights proportionally when some metrics are missing
  const normalizer = 100 / totalWeight
  let score = 0
  const summary: string[] = []

  metrics.forEach((m) => {
    const adjustedWeight = m.weight * normalizer
    const contribution = m.value * (adjustedWeight / 100)
    score += contribution
    if (m.value >= 80) summary.push(`✅ ${m.label}: ${m.value.toFixed(0)}%`)
    else if (m.value >= 50) summary.push(`⚠️ ${m.label}: ${m.value.toFixed(0)}%`)
    else summary.push(`🔴 ${m.label}: ${m.value.toFixed(0)}%`)
  })

  // Penalties: each category is distinct — overdue charges, expired docs, pending transfer payments, new inquiries
  let penalty = 0
  penalty += Math.min(expiredDocs * 5, 10)
  penalty += Math.min(overdueCharges * 3, 10)
  penalty += Math.min(pendingReviews * 2, 4)
  penalty += Math.min(newInquiries * 1, 2)
  penalty = Math.min(penalty, 15)
  score = Math.max(0, score - penalty)

  if (expiredDocs > 0) summary.push(`🔴 ${expiredDocs} documento(s) vencido(s)`)
  if (overdueCharges > 0) summary.push(`⚠️ ${overdueCharges} cuota(s) vencida(s)`)
  if (pendingReviews > 0) summary.push(`⚠️ ${pendingReviews} pago(s) pendiente(s) de revisión`)

  if (score >= 80) return { score: Math.round(score), label: 'Todo funcionando correctamente', color: '#22c55e', bg: 'bg-emerald-50 dark:bg-emerald-950/20', textColor: 'text-emerald-700 dark:text-emerald-300', summary }
  if (score >= 50) return { score: Math.round(score), label: 'Se detectaron situaciones que requieren atención', color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-950/20', textColor: 'text-amber-700 dark:text-amber-300', summary }
  return { score: Math.round(score), label: 'Se requieren acciones urgentes', color: '#ef4444', bg: 'bg-rose-50 dark:bg-rose-950/20', textColor: 'text-rose-700 dark:text-rose-300', summary }
}

function SportIndicator({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-center gap-1">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {icon ?? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />}
        <span className="truncate">{label}</span>
      </span>
      <span className="text-[20px] font-extrabold leading-tight text-slate-900 tabular-nums dark:text-white">{value}</span>
    </div>
  )
}

export function EstadoGeneralCard({ title = 'Estado General del Club', isSport = false, ...props }: EstadoGeneralCardProps) {
  const resolved = useTheme((s) => s.resolved)
  const isDark = resolved === 'dark'
  const ringBase = isDark ? '#1E293B' : '#E2E8F0'
  const { score, label, color, bg, textColor, summary } = calcScore(
    props.collectionRate, props.documentCompliance, props.averageAttendance,
    props.hasChargeData, props.hasDocumentData, props.hasAttendanceData,
    props.expiredDocs, props.overdueCharges, props.pendingReviews, props.newInquiries
  )

  const isInsufficient = summary.length === 1 && summary[0].includes('No hay suficientes datos')

  if (isSport) {
    const needsAction = !isInsufficient && label !== 'Todo funcionando correctamente'
    const scoreColor = isInsufficient ? undefined : color
    const scoreTone = isInsufficient
      ? (isDark ? '#e2e8f0' : '#0f172a')
      : color
    const indicators = [
      <SportIndicator key="cobranza" label="Cobranza" value={`${props.collectionRate}%`} />,
      <SportIndicator key="documentacion" label="Documentación" value={`${props.documentCompliance}%`} />,
      <SportIndicator key="asistencia" label="Asistencia" value={`${props.averageAttendance}%`} />,
      <SportIndicator key="vencidas" label="Cuotas vencidas" value={String(props.overdueCharges)}
        icon={<TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />} />,
    ]

    return (
      <div className="rounded-[14px] border border-violet-200 bg-gradient-to-br from-white to-violet-50/70 px-6 py-5 shadow-sm dark:border-[rgba(139,92,246,0.4)] dark:from-[#111C30] dark:via-[#16203A] dark:to-[#1B1736] dark:shadow-[0_2px_14px_rgba(2,8,23,0.5)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          {/* Score: círculo 80px con el índice 0-100 */}
          <div className="flex w-[80px] shrink-0 items-center justify-center">
            <div className="relative h-[80px] w-[80px]">
              <svg className="absolute inset-0 h-[80px] w-[80px] -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke={ringBase} strokeWidth="6" />
                {!isInsufficient && (
                  <circle cx="40" cy="40" r="34" fill="none" stroke={scoreColor} strokeWidth="6"
                    strokeDasharray={`${(score / 100) * (2 * Math.PI * 34)} ${2 * Math.PI * 34}`}
                    strokeLinecap="round" />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[26px] font-extrabold leading-none" style={{ color: scoreTone }}>{isInsufficient ? '—' : score}</span>
                {!isInsufficient && (
                  <span className="mt-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">/ 100</span>
                )}
              </div>
            </div>
          </div>

          {/* Información */}
          <div className="min-w-0 flex-1">
            <h2 className="text-[20px] font-extrabold leading-tight text-slate-900 sm:text-[22px] dark:text-white">{title}</h2>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Índice de salud · {isInsufficient ? '—' : `${score}/100`}
            </p>
            <p className={cn(
              'mt-1 text-[13px] font-semibold',
              isInsufficient ? 'text-slate-400 dark:text-slate-400' : needsAction ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
            )}>
              {label}
            </p>
          </div>

          {/* Indicadores */}
          <div className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:flex lg:items-stretch lg:gap-0">
            {indicators.map((ind, i) => (
              <div key={i} className={cn('flex', i > 0 && 'lg:ml-6 lg:border-l lg:border-slate-200 lg:pl-6 dark:lg:border-[rgba(148,163,184,0.15)]')}>
                {ind}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border border-slate-200 p-5 shadow-sm ${bg} dark:border-slate-700`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
            <svg className="absolute inset-0 h-20 w-20 -rotate-90" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="32" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-200 dark:text-slate-600" />
              {!isInsufficient && (
                <circle cx="36" cy="36" r="32" fill="none" stroke={color} strokeWidth="4"
                  strokeDasharray={`${(score / 100) * 201} 201`}
                  strokeLinecap="round" />
              )}
            </svg>
            <span className={`text-xl font-black ${textColor}`}>{isInsufficient ? '—' : score}</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h2>
            <p className={`mt-0.5 text-xs font-medium ${textColor}`}>{label}</p>
          </div>
        </div>
        {!isInsufficient && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {summary.map((s, i) => (
              <span key={i} className="text-slate-600 dark:text-slate-400">{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}