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

export function EstadoGeneralCard(props: EstadoGeneralCardProps) {
  const { score, label, color, bg, textColor, summary } = calcScore(
    props.collectionRate, props.documentCompliance, props.averageAttendance,
    props.hasChargeData, props.hasDocumentData, props.hasAttendanceData,
    props.expiredDocs, props.overdueCharges, props.pendingReviews, props.newInquiries
  )

  const isInsufficient = summary.length === 1 && summary[0].includes('No hay suficientes datos')

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
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Estado General del Club</h2>
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
