import { useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/stores/auth'
import { apiService } from '@/lib/api'
import { useDashboardKpis, useStudentDistribution, useChargeDistribution, useDocumentDistribution,
  useAttendanceDistribution, useIncomeEvolution, useStudentEvolution, useDashboardAlerts, useUpcomingItems } from '@/hooks/useDashboard'
import { KpiCard } from './components/KpiCard'
import { DonutChart } from './components/DonutChart'
import { LineChartWidget } from './components/LineChart'
import { AlertModal } from './components/AlertModal'
import { UpcomingTable } from './components/UpcomingTable'
import { EstadoGeneralCard } from './components/EstadoGeneralCard'
import { DashboardSkeleton } from './components/DashboardSkeleton'

export function AdminDashboard() {
  const { activeCompanySlug, dashboardAlertsShown, dismissAlerts } = useAuth()
  const slug = activeCompanySlug ?? ''
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const now = useMemo(() => new Date(), [])
  const [filterYear, setFilterYear] = useState(now.getFullYear())
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1)

  const kpis = useDashboardKpis(slug)
  const studentsDist = useStudentDistribution(slug)
  const chargesDist = useChargeDistribution(slug)
  const docsDist = useDocumentDistribution(slug)
  const attendanceDist = useAttendanceDistribution(slug)
  const incomeEvo = useIncomeEvolution(slug)
  const studentsEvo = useStudentEvolution(slug)
  const alerts = useDashboardAlerts(slug)
  const upcoming = useUpcomingItems(slug)

  const loading = kpis.isLoading

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams()
    params.set('Year', String(filterYear))
    params.set('Month', String(filterMonth))
    return params.toString()
  }, [filterYear, filterMonth])

  const handleExport = useCallback(async (format: 'excel' | 'pdf') => {
    if (!slug) return
    setExporting(format)
    try {
      const qs = buildFilterParams()
      const endpoint = qs
        ? `/api/admin/${slug}/reports/collections/${format}?${qs}`
        : `/api/admin/${slug}/reports/collections/${format}`
      const blob = await apiService.getBlob(endpoint)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte.${format === 'excel' ? 'xlsx' : 'pdf'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      // silent
    }
    setExporting(null)
  }, [slug])

  if (loading) return <DashboardSkeleton />

  const k = kpis.data
  const prevStudents = k?.previousStudents
  const prevIncome = k?.previousIncome
  const studentVar = (prevStudents && k?.activeStudents)
    ? `${((k.activeStudents - prevStudents) / prevStudents * 100).toFixed(1)}%`
    : null
  const incomeVar = (prevIncome && k?.monthlyIncome)
    ? `${((k.monthlyIncome - prevIncome) / prevIncome * 100).toFixed(1)}%`
    : null

  // Count alerts by type for the score card
  const alertData = alerts.data ?? []
  const expiredDocs = alertData.find(a => a.type === 'document_expired')?.count ?? 0
  const expiringDocs = alertData.find(a => a.type === 'document_expiring')?.count ?? 0
  const overdueCharges = alertData.find(a => a.type === 'charge_overdue')?.count ?? 0
  const pendingReviews = alertData.find(a => a.type === 'payment_pending_review')?.count ?? 0
  const newInquiries = alertData.find(a => a.type === 'inquiry_new')?.count ?? 0

  const hasChargeData = (k?.pendingMonthlyCharges ?? 0) + (k?.overdueMonthlyCharges ?? 0) + (k?.approvedPaymentsThisMonth ?? 0) > 0
  const hasAttendanceData = k?.averageAttendance !== null && k?.averageAttendance !== undefined
  const hasDocumentData = k?.documentCompliance !== null && k?.documentCompliance !== undefined

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6 sm:space-y-5">
      {/* Alert Modal */}
      <AlertModal
        open={!dashboardAlertsShown && alertData.length > 0}
        alerts={alertData}
        onClose={dismissAlerts}
      />

      {/* Estado General */}
      <EstadoGeneralCard
        collectionRate={k?.collectionRate ?? 0}
        documentCompliance={k?.documentCompliance ?? 0}
        averageAttendance={k?.averageAttendance ?? 0}
        activeStudents={k?.activeStudents ?? 0}
        expiredDocs={expiredDocs}
        expiringDocs={expiringDocs}
        overdueCharges={overdueCharges}
        pendingReviews={pendingReviews}
        newInquiries={newInquiries}
        hasChargeData={hasChargeData}
        hasAttendanceData={hasAttendanceData}
        hasDocumentData={hasDocumentData}
      />

      {/* Fila 1: KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
        <KpiCard
          icon={<svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>}
          label="Alumnos activos"
          value={k?.activeStudents ?? 0}
          variation={studentVar}
          variationLabel="vs mes anterior"
          color="indigo"
          navigateTo="/admin/students"
          tooltip="Total de alumnos activos en la institución"
        />
        <KpiCard
          icon={<svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          label="Ingresos del mes"
          value={`$${(k?.monthlyIncome ?? 0).toLocaleString('es-AR')}`}
          variation={incomeVar}
          variationLabel="vs mes anterior"
          color="emerald"
          navigateTo="/admin/payments"
          tooltip="Total cobrado en el mes actual"
        />
        <KpiCard
          icon={<svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>}
          label="Deuda pendiente"
          value={`$${(k?.totalDebt ?? 0).toLocaleString('es-AR')}`}
          color="rose"
          navigateTo="/admin/payments"
          tooltip="Suma de cuotas pendientes y vencidas"
        />
        <KpiCard
          icon={<svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          label="Cobranza"
          value={`${k?.collectionRate ?? 0}%`}
          color="blue"
          navigateTo="/admin/payments"
          tooltip="Porcentaje de cuotas pagadas sobre el total"
        />
        <KpiCard
          icon={<svg className="h-5 w-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          label="Asistencia"
          value={`${k?.averageAttendance ?? 0}%`}
          color="violet"
          navigateTo="/admin/classes"
          tooltip="Porcentaje de asistencia promedio"
        />
        <KpiCard
          icon={<svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          label="Documentación"
          value={`${k?.documentCompliance ?? 0}%`}
          color="amber"
          navigateTo="/admin/records"
          tooltip="Porcentaje de alumnos con toda la documentación obligatoria aprobada"
        />
      </div>

      {/* Filters + Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('es-AR', { month: 'long' })}</option>
            ))}
          </select>
          <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('excel')} disabled={exporting !== null}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {exporting === 'excel' ? 'Exportando...' : 'Exportar Excel'}
          </button>
          <button onClick={() => handleExport('pdf')} disabled={exporting !== null}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {exporting === 'pdf' ? 'Exportando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Fila 2: Donuts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DonutChart data={studentsDist.data ?? []} title="Alumnos" centerLabel="alumnos" centerValue={k?.activeStudents} loading={studentsDist.isLoading} />
        <DonutChart data={chargesDist.data ?? []} title="Cuotas" centerLabel="cuotas" loading={chargesDist.isLoading} />
        <DonutChart data={docsDist.data ?? []} title="Documentación" centerLabel="documentos" loading={docsDist.isLoading} />
        <DonutChart data={attendanceDist.data ?? []} title="Asistencia" centerLabel="registros" loading={attendanceDist.isLoading} />
      </div>

      {/* Fila 3: Líneas de evolución */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LineChartWidget data={incomeEvo.data ?? []} title="Ingresos últimos 12 meses" color="#10b981" format="currency" loading={incomeEvo.isLoading} />
        <LineChartWidget data={studentsEvo.data ?? []} title="Altas de alumnos últimos 12 meses" color="#6366f1" format="number" loading={studentsEvo.isLoading} />
      </div>

      {/* Fila 5: Próximos vencimientos */}
      <UpcomingTable items={upcoming.data ?? []} loading={upcoming.isLoading} />
    </div>
  )
}
