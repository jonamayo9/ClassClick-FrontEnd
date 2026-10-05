import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, CircleDollarSign, Receipt, BadgePercent, BarChart3, FileText, Calendar, CalendarDays, FileSpreadsheet, FileDown } from 'lucide-react'
import { useAuth } from '@/stores/auth'
import { resolveHomePath } from '@/lib/auth-route'
import { apiService } from '@/lib/api'
import { useDashboardKpis, useStudentDistribution, useChargeDistribution, useDocumentDistribution,
  useAttendanceDistribution, useIncomeEvolution, useStudentEvolution, useDashboardAlerts, useUpcomingItems,
  useChargeTypeOptions } from '@/hooks/useDashboard'
import { DateRangePicker } from '@/components/ui/date-picker'
import { KpiCard } from './components/KpiCard'
import { DonutChart } from './components/DonutChart'
import { LineChartWidget } from './components/LineChart'
import { AlertModal } from './components/AlertModal'
import { OverdueInvoiceModal, type OverdueInvoice } from './components/OverdueInvoiceModal'
import { NovedadesModal, type AdminNews } from './components/NovedadesModal'
import { UpcomingTable } from './components/UpcomingTable'
import { EstadoGeneralCard } from './components/EstadoGeneralCard'
import { DashboardSkeleton } from './components/DashboardSkeleton'
import { cn } from '@/lib/utils'
import { ReviewBanners } from '@/components/reviews/review-banners'
import { ClothingOrdersDashboardCard } from '@/components/dashboard/clothing-orders-card'
import { ClothingFinancialDashboardCard } from '@/components/dashboard/clothing-financial-card'
import { DashboardDetailModal, type DashboardDetailSpec, type DetailColumn, type DetailFilter } from '@/components/dashboard/dashboard-detail-modal'
import { paymentMethodLabel } from '@/lib/payment-labels'
import type { EvolutionPoint } from '@/types/dashboard'

function formatPeriodTitle(from: string, to: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  const f = new Date(from + 'T12:00:00')
  const t = new Date(to + 'T12:00:00')
  const days = Math.round((t.getTime() - f.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const isRangeToToday = to === new Date().toISOString().slice(0, 10)
  if (days <= 31) {
    return `${f.getDate()} ${f.toLocaleString('es-AR', { month: 'short' })}` +
      (days > 1 ? ` al ${t.getDate()} ${t.toLocaleString('es-AR', { month: 'short' })}` : '') +
      (f.getFullYear() !== t.getFullYear() || from.slice(0, 4) !== to.slice(0, 4) ? ` ${t.getFullYear()}` : '')
  }
  if (isRangeToToday && days <= 365) {
    const m = Math.round(days / 30)
    return `últimos ${m} ${m === 1 ? 'mes' : 'meses'}`
  }
  return `${f.toLocaleDateString('es-AR', opts)} al ${t.toLocaleDateString('es-AR', opts)}`
}

const money = (n: number | undefined | null) => `$${(n ?? 0).toLocaleString('es-AR')}`

function fmtDateUtc(v?: string | null): string {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '-'
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${day}/${m}/${y}`
}

function chargeStatusBadge(status: string) {
  const map: Record<string, string> = {
    Paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    Overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    Cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  }
  const label: Record<string, string> = { Paid: 'Pagada', Overdue: 'Vencida', Pending: 'Pendiente', Cancelled: 'Cancelada' }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${map[status] ?? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
      {label[status] ?? status}
    </span>
  )
}

function paymentStatusBadge(status: string) {
  const map: Record<string, string> = {
    Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    InReview: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  }
  const label: Record<string, string> = { Approved: 'Aprobado', Rejected: 'Rechazado', InReview: 'En revisión', Pending: 'Pendiente' }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${map[status] ?? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
      {label[status] ?? status}
    </span>
  )
}

function docStatusBadge(status: string) {
  const map: Record<string, string> = {
    Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    Submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    Expired: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  }
  const label: Record<string, string> = {
    Approved: 'Aprobado', Rejected: 'Rechazado', Pending: 'Pendiente', Submitted: 'Enviado', Expired: 'Expirado',
  }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${map[status] ?? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
      {label[status] ?? status}
    </span>
  )
}

function attendanceBadge(situation: string) {
  const present = situation === 'Presente'
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${present ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
      {situation}
    </span>
  )
}

// Grillas dinámicas: cuando una KPI/card no aplica (configuración, permisos o condición
// funcional) desaparece y las restantes redistribuyen el espacio sin dejar columnas vacías.
// Las clases son literales para que Tailwind las genere (JIT no admite nombres dinámicos).
const KPI_GRID: Record<number, string> = {
  4: 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4',
  5: 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6',
}

const DONUT_GRID: Record<number, string> = {
  2: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2',
  3: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4',
}

export function AdminDashboard() {
  const { activeCompanySlug, dashboardAlertsShown, dismissAlerts, companies, user } = useAuth()
  const slug = activeCompanySlug ?? ''
  const activeCompany = companies?.find((c) => (c.slug ?? c.companySlug) === activeCompanySlug)
  const isSport = activeCompany?.vertical === 'Deportiva'
  // El Dashboard es exclusivo del vertical Deportivo Individual/Child. Si la empresa
  // activa es un Group o Educativa (p. ej. durante el cambio de empresa o un URL residual),
  // NO se consultan APIs de administración Deportiva: se usan slugs vacíos que deshabilitan
  // las queries y la ruta se redirige al área correcta.
  const isWrongDashboardContext = activeCompany?.structureType === 'Group' || activeCompany?.vertical === 'Educativa'
  const dataSlug = isWrongDashboardContext ? '' : slug
  const hour = new Date().getHours()
  const greetingPeriod = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'
  const userDisplayName = (user?.name ?? user?.firstName ?? '').trim()
  const greeting = userDisplayName ? `${greetingPeriod}, ${userDisplayName} 👋` : `${greetingPeriod} 👋`
  const currentMonth = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const currentMonthLabel = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const now = useMemo(() => new Date(), [])
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [dateRangeError, setDateRangeError] = useState('')
  const [hasCustomPeriod, setHasCustomPeriod] = useState(false)
  const [chargeTypeId, setChargeTypeId] = useState('')
  const [upcomingPage, setUpcomingPage] = useState(1)
  const [detailSpec, setDetailSpec] = useState<DashboardDetailSpec | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [overdueOpen, setOverdueOpen] = useState(false)
  const [overduePhaseDone, setOverduePhaseDone] = useState(false)
  const [newsOpen, setNewsOpen] = useState(false)
  const newsOpenedRef = useRef(false)

  // Al cambiar período o tipo de cuota, volver a la página 1 de próximos vencimientos.
  useEffect(() => { setUpcomingPage(1) }, [dateFrom, dateTo, chargeTypeId])

  // Evolution: only pass period when user explicitly applied a custom range → dynamic granularity
  const evoFrom = hasCustomPeriod ? dateFrom : undefined
  const evoTo = hasCustomPeriod ? dateTo : undefined

  const kpis = useDashboardKpis(dataSlug, dateFrom, dateTo, chargeTypeId || undefined)
  const studentsDist = useStudentDistribution(dataSlug, dateFrom, dateTo)
  const chargesDist = useChargeDistribution(dataSlug, dateFrom, dateTo, chargeTypeId || undefined)
  const docsDist = useDocumentDistribution(dataSlug, dateFrom, dateTo, !!kpis.data?.hasDocumentTypes)
  const attendanceDist = useAttendanceDistribution(dataSlug, dateFrom, dateTo, !!kpis.data?.hasAttendanceSetup)
  const incomeEvo = useIncomeEvolution(dataSlug, evoFrom, evoTo, chargeTypeId || undefined)
  const studentsEvo = useStudentEvolution(dataSlug, evoFrom, evoTo)
  const alerts = useDashboardAlerts(dataSlug, dateFrom, dateTo)
  const upcoming = useUpcomingItems(dataSlug, dateFrom, dateTo, chargeTypeId || undefined, upcomingPage)
  const upcomingData = upcoming.data ?? { items: [], page: 1, pageSize: 15, totalCount: 0, totalPages: 1 }
  const { data: chargeTypes = [] } = useChargeTypeOptions(dataSlug)

  // Modal de facturas vencidas hacia ClassClick: se muestra SOLO después de resolver
  // el modal de alertas actual (cerrado) o si no corresponde mostrarlo (sin alertas).
  // Nunca se superponen: overdueOpen se activa una única vez por sesión de login.
  const alertsResolved = !alerts.isLoading && ((alerts.data?.length ?? 0) === 0 || dashboardAlertsShown)
  const overdueQuery = useQuery({
    queryKey: ['admin-overdue-invoices', dataSlug],
    queryFn: () => apiService.get<OverdueInvoice[]>(`/api/admin/${dataSlug}/billing/overdue`),
    enabled: !!dataSlug && alertsResolved,
  })
  const overdueInvoices = overdueQuery.data ?? []

  useEffect(() => {
    if (!dataSlug || !alertsResolved) return
    if (overduePhaseDone) return
    if (sessionStorage.getItem('overdueInvoiceModalShown') === 'true') {
      setOverduePhaseDone(true)
      return
    }
    if (overdueQuery.data && overdueQuery.data.length > 0) {
      setOverdueOpen(true)
      return
    }
    // Datos cargados sin facturas vencidas (o cacheado vacío): la etapa queda resuelta.
    if (overdueQuery.data) {
      setOverduePhaseDone(true)
    }
  }, [dataSlug, alertsResolved, overduePhaseDone, overdueQuery.data])

  function closeOverdueModal() {
    sessionStorage.setItem('overdueInvoiceModalShown', 'true')
    setOverdueOpen(false)
    setOverduePhaseDone(true)
  }

  // Etapa 3: novedades de ClassClick para administradores.
  // Solo cuando la etapa de facturas vencidas quedó resuelta (cerrada o sin contenido).
  const newsQuery = useQuery({
    queryKey: ['admin-news', dataSlug],
    queryFn: () => apiService.get<{ items: AdminNews[]; count: number }>(`/api/admin/${dataSlug}/news`),
    enabled: !!dataSlug && alertsResolved && overduePhaseDone,
  })
  const newsItems = newsQuery.data?.items ?? []

  // Se abre SOLO cuando la query terminó (isSuccess) y hay al menos 1 novedad visible.
  // Mientras carga, newsItems es [] pero isSuccess es false: nunca abre con "0 novedades".
  // Si la API falla: no muestra modal vacío y marca la fase resuelta para no bloquear.
  useEffect(() => {
    if (!dataSlug || !alertsResolved || !overduePhaseDone) return
    if (newsOpenedRef.current) return
    if (sessionStorage.getItem('newsModalShown') === 'true') {
      newsOpenedRef.current = true
      return
    }
    if (newsQuery.isSuccess) {
      newsOpenedRef.current = true
      if (newsItems.length > 0) {
        setNewsOpen(true)
      }
    } else if (newsQuery.isError) {
      newsOpenedRef.current = true
    }
  }, [dataSlug, alertsResolved, overduePhaseDone, newsQuery.isSuccess, newsQuery.isError, newsItems.length])

  // Cierre automático si, con el modal abierto, la lista queda vacía
  // (p. ej. último dismissal + refetch) o la query deja de tener datos.
  useEffect(() => {
    if (!newsOpen) return
    if (newsQuery.isSuccess && newsItems.length === 0) {
      setNewsOpen(false)
    } else if (newsQuery.isError) {
      setNewsOpen(false)
    }
  }, [newsOpen, newsQuery.isSuccess, newsQuery.isError, newsItems.length])

  function closeNewsModal() {
    sessionStorage.setItem('newsModalShown', 'true')
    setNewsOpen(false)
  }

  const loading = kpis.isLoading

  function handleDateChange(from: string, to: string) {
    setDateFrom(from)
    setDateTo(to)
    setHasCustomPeriod(true)
    if (from && to && from > to) {
      setDateRangeError('La fecha "desde" no puede ser posterior a "hasta".')
    } else {
      setDateRangeError('')
    }
  }

  function clearPeriod() {
    const d = new Date(); d.setDate(1)
    setDateFrom(d.toISOString().slice(0, 10))
    setDateTo(new Date().toISOString().slice(0, 10))
    setHasCustomPeriod(false)
    setDateRangeError('')
  }

  const handleExport = useCallback(async (format: 'excel' | 'pdf') => {
    if (!slug) return
    setExporting(format)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('DateFromUtc', dateFrom)
      if (dateTo) params.set('DateToUtc', dateTo)
      if (chargeTypeId) params.set('ChargeTypeId', chargeTypeId)
      const qs = params.toString()
      const endpoint = `/api/admin/${slug}/reports/collections/${format}?${qs}`
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
  }, [slug, dateFrom, dateTo, chargeTypeId])

  // ── Modales de detalle: cada KPI/gráfico abre un modal con el detalle real ──
  const periodChip = `Período: ${dateFrom} al ${dateTo}`
  const chargeTypeOptions = (chargeTypes ?? []).map((ct: any) => ({ value: ct.id, label: ct.name }))
  const chargeTypeDefault: Record<string, string> = chargeTypeId ? { chargeTypeId } : {}
  const chargeStatusOptions = [
    { value: 'Pending', label: 'Pendiente' },
    { value: 'Overdue', label: 'Vencida' },
    { value: 'Paid', label: 'Pagada' },
    { value: 'Unpaid', label: 'Impagas (pendiente + vencida)' },
  ]
  const paymentMethodOptions = [
    { value: 'Transfer', label: 'Transferencia' },
    { value: 'Cash', label: 'Efectivo' },
    { value: 'MercadoPago', label: 'Mercado Pago' },
    { value: 'DebitCard', label: 'Tarjeta de débito' },
    { value: 'CreditCard', label: 'Tarjeta de crédito' },
  ]
  const docStatusOptions = [
    { value: 'Pending', label: 'Pendiente' },
    { value: 'Submitted', label: 'Enviado' },
    { value: 'Approved', label: 'Aprobado' },
    { value: 'Rejected', label: 'Rechazado' },
    { value: 'Expired', label: 'Expirado' },
  ]
  const attendanceStatusOptions = [
    { value: 'true', label: 'Presentes' },
    { value: 'false', label: 'Ausentes' },
  ]

  const studentColumns: DetailColumn[] = [
    { key: 'studentName', header: 'Alumno', render: (r: any) => (
      <div>
        <p className="font-semibold text-slate-800 dark:text-slate-200">{r.studentName}</p>
        <p className="text-xs text-slate-400">{r.email}</p>
      </div>
    ) },
    { key: 'dni', header: 'DNI', render: (r: any) => r.dni ?? '—' },
    { key: 'courseName', header: 'Curso', render: (r: any) => r.courseName ?? '—' },
    { key: 'createdAtUtc', header: 'Inscripción', render: (r: any) => fmtDateUtc(r.createdAtUtc) },
    { key: 'registrationCompleted', header: 'Registro', render: (r: any) => r.registrationCompleted ? 'Completo' : 'Pendiente' },
  ]

  const enrollmentColumns: DetailColumn[] = [
    { key: 'studentName', header: 'Alumno', render: (r: any) => (
      <div>
        <p className="font-semibold text-slate-800 dark:text-slate-200">{r.studentName}</p>
        <p className="text-xs text-slate-400">{r.email}</p>
      </div>
    ) },
    { key: 'dni', header: 'DNI', render: (r: any) => r.dni ?? '—' },
    { key: 'courseName', header: 'Curso', render: (r: any) => r.courseName ?? '—' },
    { key: 'createdAtUtc', header: 'Fecha de alta', render: (r: any) => fmtDateUtc(r.createdAtUtc) },
    { key: 'registrationCompleted', header: 'Registro', render: (r: any) => r.registrationCompleted ? 'Completo' : 'Pendiente' },
  ]

  const chargeColumns: DetailColumn[] = [
    { key: 'studentName', header: 'Alumno', render: (r: any) => <span className="font-semibold text-slate-800 dark:text-slate-200">{r.studentName}</span> },
    { key: 'period', header: 'Período', render: (r: any) => r.period },
    { key: 'chargeTypeName', header: 'Tipo', render: (r: any) => r.chargeTypeName },
    { key: 'dueDateUtc', header: 'Vencimiento', render: (r: any) => fmtDateUtc(r.dueDateUtc) },
    { key: 'status', header: 'Estado', render: (r: any) => chargeStatusBadge(r.status) },
    { key: 'amount', header: 'Importe', align: 'right', render: (r: any) => money(r.amount) },
    { key: 'currency', header: 'Moneda', render: () => <span className="text-xs text-slate-400">ARS</span> },
    { key: 'balance', header: 'Saldo', align: 'right', render: (r: any) => <span className="font-semibold text-slate-900 dark:text-white">{money(r.balance)}</span> },
  ]

  const paymentColumns: DetailColumn[] = [
    { key: 'studentName', header: 'Alumno / Origen', render: (r: any) => (
      <div>
        <p className="font-semibold text-slate-800 dark:text-slate-200">{r.studentName ?? r.payerName ?? '—'}</p>
        <p className="text-xs text-slate-400">{r.concept}</p>
      </div>
    ) },
    { key: 'period', header: 'Período', render: (r: any) => r.period || '—' },
    { key: 'paidAtUtc', header: 'Fecha', render: (r: any) => fmtDateUtc(r.paidAtUtc) },
    { key: 'paymentMethod', header: 'Medio de pago', render: (r: any) => paymentMethodLabel(r.paymentMethod) },
    { key: 'amount', header: 'Importe', align: 'right', render: (r: any) => money(r.amount) },
    { key: 'currency', header: 'Moneda', render: () => <span className="text-xs text-slate-400">ARS</span> },
    { key: 'status', header: 'Estado', render: (r: any) => paymentStatusBadge(r.status) },
  ]

  const attendanceColumns: DetailColumn[] = [
    { key: 'studentName', header: 'Alumno', render: (r: any) => <span className="font-semibold text-slate-800 dark:text-slate-200">{r.studentName}</span> },
    { key: 'courseName', header: 'Curso', render: (r: any) => r.courseName },
    { key: 'classLabel', header: 'Clase', render: (r: any) => r.classLabel },
    { key: 'date', header: 'Fecha', render: (r: any) => r.date },
    { key: 'situation', header: 'Situación', render: (r: any) => attendanceBadge(r.situation) },
  ]

  const docColumns: DetailColumn[] = [
    { key: 'studentName', header: 'Alumno', render: (r: any) => <span className="font-semibold text-slate-800 dark:text-slate-200">{r.studentName}</span> },
    { key: 'documentTypeName', header: 'Tipo de documento', render: (r: any) => r.documentTypeName },
    { key: 'status', header: 'Estado', render: (r: any) => docStatusBadge(r.status) },
    { key: 'expirationDateUtc', header: 'Vencimiento', render: (r: any) => fmtDateUtc(r.expirationDateUtc) },
    { key: 'assignedAtUtc', header: 'Asignado', render: (r: any) => fmtDateUtc(r.assignedAtUtc) },
  ]

  const detailQp = (extra?: Record<string, string>) => {
    const p = new URLSearchParams({ dateFrom, dateTo })
    if (extra) for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v)
    return p.toString()
  }

  function openDetail(spec: DashboardDetailSpec) {
    if (!dataSlug) return
    setDetailSpec(spec)
    setDetailOpen(true)
  }

  function openStudents() {
    openDetail({
      title: 'Alumnos activos',
      value: k?.activeStudents ?? 0,
      valueLabel: 'alumnos activos',
      periodLabel: periodChip,
      endpoint: `/api/admin/${dataSlug}/dashboard/detail/students?${detailQp()}`,
      filters: [{ kind: 'search', param: 'search', label: 'Búsqueda' }],
      columns: studentColumns,
      emptyText: 'No hay alumnos activos para los filtros seleccionados.',
    })
  }

  function openEnrollments(from?: string, to?: string, value?: string | number) {
    const f = from ?? dateFrom
    const t = to ?? dateTo
    openDetail({
      title: 'Altas de alumnos',
      value: value ?? (from ? '—' : (k?.newStudentsThisMonth ?? 0)),
      valueLabel: 'alumnos nuevos',
      periodLabel: `Período: ${f} al ${t}`,
      endpoint: `/api/admin/${dataSlug}/dashboard/detail/enrollments?dateFrom=${f}&dateTo=${t}`,
      filters: [{ kind: 'search', param: 'search', label: 'Búsqueda' }],
      columns: enrollmentColumns,
      emptyText: 'No hay altas de alumnos en el período.',
    })
  }

  function openRevenue(from?: string, to?: string, value?: string | number) {
    const f = from ?? dateFrom
    const t = to ?? dateTo
    openDetail({
      title: 'Recaudación del período',
      value: value ?? (from ? '—' : money(k?.monthlyIncome ?? 0)),
      valueLabel: 'pagos aprobados',
      periodLabel: `Período: ${f} al ${t}`,
      endpoint: `/api/admin/${dataSlug}/dashboard/detail/payments?${new URLSearchParams({ dateFrom: f, dateTo: t, ...(chargeTypeId ? { chargeTypeId } : {}) }).toString()}`,
      defaultParams: chargeTypeDefault,
      filters: [
        { kind: 'search', param: 'search', label: 'Búsqueda' },
        { kind: 'select', param: 'paymentMethod', label: 'Medio de pago', options: paymentMethodOptions },
        { kind: 'select', param: 'chargeTypeId', label: 'Tipo de cuota', options: chargeTypeOptions },
      ],
      columns: paymentColumns,
      emptyText: 'No hay pagos aprobados en el período.',
    })
  }

  function openCharges(opts?: { title?: string; value?: string | number; valueLabel?: string; status?: string; scope?: 'debt' | 'period' }) {
    const defaults: Record<string, string> = { ...chargeTypeDefault }
    if (opts?.status) defaults.status = opts.status
    if (opts?.scope) defaults.scope = opts.scope
    const filters: DetailFilter[] = [{ kind: 'search', param: 'search', label: 'Búsqueda' }]
    if (!opts?.status) filters.push({ kind: 'select', param: 'status', label: 'Estado', options: chargeStatusOptions })
    filters.push({ kind: 'select', param: 'chargeTypeId', label: 'Tipo de cuota', options: chargeTypeOptions })
    openDetail({
      title: opts?.title ?? 'Cuotas',
      value: opts?.value ?? (chargesDist.data?.segments ?? []).reduce((s, d) => s + d.count, 0),
      valueLabel: opts?.valueLabel ?? 'cuotas del período',
      periodLabel: periodChip,
      endpoint: `/api/admin/${dataSlug}/dashboard/detail/charges?${detailQp()}`,
      defaultParams: defaults,
      filters,
      columns: chargeColumns,
      emptyText: 'No hay cuotas para los filtros seleccionados.',
    })
  }

  function openAttendance(opts?: { present?: boolean; title?: string }) {
    const base = `/api/admin/${dataSlug}/dashboard/detail/attendance?${detailQp(opts?.present !== undefined ? { present: String(opts.present) } : undefined)}`
    openDetail({
      title: opts?.title ?? 'Asistencia del período',
      value: (attendanceDist.data?.segments ?? []).reduce((s, d) => s + d.count, 0),
      valueLabel: 'registros',
      periodLabel: periodChip,
      endpoint: base,
      defaultParams: opts?.present !== undefined ? { present: String(opts.present) } : undefined,
      filters: [
        { kind: 'search', param: 'search', label: 'Búsqueda' },
        { kind: 'select', param: 'present', label: 'Situación', options: attendanceStatusOptions },
      ],
      columns: attendanceColumns,
      emptyText: 'No hay asistencias registradas en el período.',
    })
  }

  function openDocuments() {
    openDetail({
      title: 'Documentación',
      value: `${k?.documentCompliance ?? 0}%`,
      valueLabel: 'cumplimiento',
      periodLabel: periodChip,
      endpoint: `/api/admin/${dataSlug}/dashboard/detail/documents`,
      filters: [
        { kind: 'search', param: 'search', label: 'Búsqueda' },
        { kind: 'select', param: 'status', label: 'Estado', options: docStatusOptions },
      ],
      columns: docColumns,
      emptyText: 'No hay asignaciones documentales para los filtros seleccionados.',
    })
  }

  function pointRange(period: string): { from: string; to: string } {
    const isDaily = period.length === 10
    if (isDaily) return { from: period, to: period }
    const [y, m] = period.split('-').map(Number)
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
    return {
      from: `${y}-${String(m).padStart(2, '0')}-01`,
      to: `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`,
    }
  }

  function openRevenuePoint(point: EvolutionPoint) {
    const isCurrentMonth = point.period.startsWith(new Date().toISOString().slice(0, 7))
    const { from, to } = pointRange(point.period)
    openRevenue(isCurrentMonth ? dateFrom : from, isCurrentMonth ? dateTo : to, money(point.value))
  }

  function openEnrollmentsPoint(point: EvolutionPoint) {
    const isCurrentMonth = point.period.startsWith(new Date().toISOString().slice(0, 7))
    const { from, to } = pointRange(point.period)
    openEnrollments(isCurrentMonth ? dateFrom : from, isCurrentMonth ? dateTo : to, point.value)
  }

  const CUOTA_SEGMENT_STATUS: Record<string, string> = {
    Pagadas: 'Paid',
    Pendientes: 'Pending',
    Vencidas: 'Overdue',
  }

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
  // Visibilidad por configuración (no por ausencia de registros): si la empresa no
  // configura tipos documentales o no tiene cursos/clases, la funcionalidad no aplica.
  const hasAttendanceData = !!k?.hasAttendanceSetup
  const hasDocumentData = !!k?.hasDocumentTypes

  // Contexto Group/Educativa nunca debe renderizar el Dashboard Deportivo.
  if (isWrongDashboardContext) return <Navigate to={resolveHomePath()} replace />

  return (
    <div className={cn(
      'mx-auto w-full p-4 sm:p-6',
      isSport ? 'max-w-[1320px] space-y-3.5' : 'max-w-7xl space-y-4 sm:space-y-5',
    )}>
      {isSport && (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">{greeting}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Esto es lo que está pasando en ClassClick hoy.</p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="flex flex-col">
              <span className="text-base font-bold leading-tight text-slate-900 dark:text-white">{currentMonthLabel}</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Resumen de tu club</span>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        open={!dashboardAlertsShown && alertData.length > 0}
        alerts={alertData}
        onClose={dismissAlerts}
      />

      {/* Modal facturas vencidas hacia ClassClick (independiente del de alertas) */}
      <OverdueInvoiceModal
        open={overdueOpen}
        invoices={overdueInvoices}
        onClose={closeOverdueModal}
        isSport={isSport}
      />

      {/* Modal novedades de ClassClick para administradores (3º en la secuencia) */}
      <NovedadesModal
        open={newsOpen}
        slug={slug}
        news={newsItems}
        onClose={closeNewsModal}
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
        isSport={isSport}
        onIndicatorClick={(key) => {
          if (key === 'collection') openCharges({ title: 'Cobranza', value: `${k?.collectionRate ?? 0}%`, valueLabel: 'cuotas pagadas sobre generadas' })
          else if (key === 'documents') openDocuments()
          else if (key === 'attendance') openAttendance()
          else openCharges({ title: 'Cuotas vencidas', value: overdueCharges, valueLabel: 'cuotas vencidas', status: 'Overdue', scope: 'debt' })
        }}
      />

      {/* Avisos administrativos: Indumentaria y Cuotas */}
      <ReviewBanners slug={dataSlug} vertical="deportivo" />

      {/* Fila 1: KPIs (grilla dinámica: las cards no aplicables desaparecen y las restantes redistribuyen) */}
      <div className={KPI_GRID[4 + (hasAttendanceData ? 1 : 0) + (hasDocumentData ? 1 : 0)]}>
        <KpiCard
          icon={isSport ? <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> : <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>}
          label="Alumnos activos"
          value={k?.activeStudents ?? 0}
          variation={studentVar}
          variationLabel="vs mes anterior"
          color="indigo"
          onClick={openStudents}
          tooltip="Total de alumnos activos en la institución"
          isSport={isSport}
        />
        <KpiCard
          icon={isSport ? <CircleDollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> : <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          label="Ingresos del mes"
          value={`$${(k?.monthlyIncome ?? 0).toLocaleString('es-AR')}`}
          variation={incomeVar}
          variationLabel="vs mes anterior"
          color="emerald"
          onClick={() => openRevenue()}
          tooltip="Total cobrado en el mes actual"
          isSport={isSport}
        />
        <KpiCard
          icon={isSport ? <Receipt className="h-5 w-5 text-rose-600 dark:text-rose-400" /> : <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>}
          label="Deuda pendiente"
          value={`$${(k?.totalDebt ?? 0).toLocaleString('es-AR')}`}
          color="rose"
          onClick={() => openCharges({ title: 'Deuda pendiente', value: money(k?.totalDebt ?? 0), valueLabel: 'cuotas impagas', status: 'Unpaid', scope: 'debt' })}
          tooltip="Suma de cuotas pendientes y vencidas"
          isSport={isSport}
        />
        <KpiCard
          icon={isSport ? <BadgePercent className="h-5 w-5 text-blue-600 dark:text-blue-400" /> : <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          label="Cobranza"
          value={`${k?.collectionRate ?? 0}%`}
          color="blue"
          onClick={() => openCharges({ title: 'Cobranza', value: `${k?.collectionRate ?? 0}%`, valueLabel: 'cuotas pagadas sobre generadas' })}
          tooltip="Porcentaje de cuotas pagadas sobre el total"
          isSport={isSport}
        />
        {hasAttendanceData && (
          <KpiCard
            icon={isSport ? <BarChart3 className="h-5 w-5 text-violet-600 dark:text-violet-400" /> : <svg className="h-5 w-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            label="Asistencia"
            value={`${k?.averageAttendance ?? 0}%`}
            color="violet"
            onClick={() => openAttendance()}
            tooltip="Porcentaje de asistencia promedio"
            isSport={isSport}
          />
        )}
        {hasDocumentData && (
          <KpiCard
            icon={isSport ? <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" /> : <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            label="Documentación"
            value={`${k?.documentCompliance ?? 0}%`}
            color="amber"
            onClick={openDocuments}
            tooltip="Porcentaje de alumnos con toda la documentación obligatoria aprobada"
            isSport={isSport}
          />
        )}
      </div>

      {/* Filters + Export */}
      <div className={cn(
        isSport
          ? 'flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between dark:border-[rgba(120,150,200,0.25)] dark:bg-[#111C30] dark:shadow-[0_1px_6px_rgba(2,8,23,0.45)]'
          : 'space-y-3 sm:flex sm:items-end sm:justify-between sm:gap-3 sm:space-y-0'
      )}>
        <div className="flex min-w-0 flex-wrap items-end gap-4">
          <div className="min-w-0 sm:max-w-xs">
            <label className={cn('mb-1 block text-xs font-semibold', isSport ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400')}>Período</label>
            <DateRangePicker from={dateFrom} to={dateTo}
              onChange={({ from: f, to: t }) => handleDateChange(f, t)} />
            {dateRangeError && <p className="mt-0.5 text-xs text-red-500">{dateRangeError}</p>}
          </div>
          <div className="min-w-[11rem]">
            <label className={cn('mb-1 block text-xs font-semibold', isSport ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400')}>Tipo de cuota</label>
            <select
              value={chargeTypeId}
              onChange={(e) => setChargeTypeId(e.target.value)}
              className={cn(
                'min-h-[2.5rem] w-full rounded-xl border px-3 text-xs font-medium',
                isSport
                  ? 'border-slate-200 bg-white text-slate-700 dark:border-[rgba(120,150,200,0.25)] dark:bg-[#0B1220] dark:text-slate-200 dark:focus:border-[rgba(150,180,235,0.45)]'
                  : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
              )}
            >
              <option value="">Todos</option>
              {chargeTypes.map((ct: any) => (
                <option key={ct.id} value={ct.id}>{ct.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={() => handleExport('excel')} disabled={exporting !== null}
            className={cn(
              'inline-flex min-h-[2.5rem] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs transition disabled:opacity-50',
              isSport
                ? 'border-slate-200 bg-white font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-[rgba(120,150,200,0.25)] dark:bg-[#0B1220] dark:text-slate-200 dark:hover:border-[rgba(150,180,235,0.45)]'
                : 'border-slate-200 bg-white font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
            )}>
            {isSport && <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
            <span>{exporting === 'excel' ? 'Exportando...' : 'Exportar Excel'}</span>
          </button>
          <button type="button" onClick={() => handleExport('pdf')} disabled={exporting !== null}
            className={cn(
              'inline-flex min-h-[2.5rem] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs transition disabled:opacity-50',
              isSport
                ? 'border-slate-200 bg-white font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-[rgba(120,150,200,0.25)] dark:bg-[#0B1220] dark:text-slate-200 dark:hover:border-[rgba(150,180,235,0.45)]'
                : 'border-slate-200 bg-white font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
            )}>
            {isSport && <FileDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />}
            <span>{exporting === 'pdf' ? 'Exportando...' : 'Exportar PDF'}</span>
          </button>
        </div>
      </div>

      {/* Indumentaria financiera: inmediatamente debajo de la barra de filtros de período */}
      <ClothingFinancialDashboardCard slug={dataSlug} from={dateFrom} to={dateTo} />

      {/* Fila 2: Donuts (grilla dinámica, mismo criterio) */}
      <div className={DONUT_GRID[2 + (hasDocumentData ? 1 : 0) + (hasAttendanceData ? 1 : 0)]}>
        <DonutChart data={studentsDist.data?.segments ?? []} title="Alumnos" centerLabel="activos" centerValue={k?.activeStudents} loading={studentsDist.isLoading} error={studentsDist.isError}
          rows={studentsDist.data?.byStatus ?? []}
          onGeneralClick={openStudents}
          onSegmentClick={() => openStudents()}
          onRowClick={() => openStudents()}
          onSeeAll={openStudents}
          isSport={isSport} icon={isSport ? <Users className="h-[18px] w-[18px] text-emerald-600 dark:text-emerald-400" /> : undefined}
          sportColors={['#22c55e', '#f59e0b']} />
        <DonutChart data={chargesDist.data?.segments ?? []} title="Cuotas" centerLabel="cuotas" loading={chargesDist.isLoading} error={chargesDist.isError}
          breakdown={chargesDist.data?.byType ?? []}
          onGeneralClick={() => openCharges()}
          onSegmentClick={(seg) => openCharges({ title: `Cuotas · ${seg.label}`, value: seg.count, status: CUOTA_SEGMENT_STATUS[seg.label] })}
          isSport={isSport} icon={isSport ? <CircleDollarSign className="h-[18px] w-[18px] text-amber-600 dark:text-amber-400" /> : undefined}
          sportColors={['#f59e0b', '#3b82f6']} />
        {hasDocumentData && (
          <DonutChart data={docsDist.data?.segments ?? []} title="Requisitos documentales" centerLabel="requisitos" loading={docsDist.isLoading} error={docsDist.isError}
            rows={docsDist.data?.byDocumentType ?? []}
            onGeneralClick={openDocuments}
            onSegmentClick={() => openDocuments()}
            onRowClick={() => openDocuments()}
            onSeeAll={openDocuments}
            isSport={isSport} icon={isSport ? <FileText className="h-[18px] w-[18px] text-blue-600 dark:text-blue-400" /> : undefined}
            sportColors={['#3b82f6', '#64748b']} />
        )}
        {hasAttendanceData && (
          <DonutChart data={attendanceDist.data?.segments ?? []} title="Asistencia" centerLabel="registros" loading={attendanceDist.isLoading} error={attendanceDist.isError}
            rows={attendanceDist.data?.byCourse ?? []}
            onGeneralClick={() => openAttendance()}
            onSegmentClick={(seg) => openAttendance({ present: seg.label === 'Presentes', title: `Asistencia · ${seg.label}` })}
            onRowClick={() => openAttendance()}
            onSeeAll={() => openAttendance()}
            isSport={isSport} icon={isSport ? <CalendarDays className="h-[18px] w-[18px] text-violet-600 dark:text-violet-400" /> : undefined}
            sportColors={['#6366f1', '#94a3b8']}
            emptyActionTo={isSport ? '/admin/attendance' : undefined} />
        )}
      </div>

      {/* Fila 3: Líneas de evolución */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LineChartWidget data={incomeEvo.data ?? []} title={hasCustomPeriod ? `Ingresos del ${formatPeriodTitle(dateFrom, dateTo)}` : 'Ingresos últimos 12 meses'} color="#10b981" format="currency" loading={incomeEvo.isLoading} error={incomeEvo.isError} isSport={isSport}
          onGeneralClick={() => openRevenue()} onPointClick={openRevenuePoint} />
        <LineChartWidget data={studentsEvo.data ?? []} title={hasCustomPeriod ? `Altas de alumnos del ${formatPeriodTitle(dateFrom, dateTo)}` : 'Altas de alumnos últimos 12 meses'} color="#6366f1" format="number" loading={studentsEvo.isLoading} error={studentsEvo.isError} isSport={isSport}
          onGeneralClick={() => openEnrollments()} onPointClick={openEnrollmentsPoint} />
      </div>

      {/* Fila 4: Indumentaria (Pedidos inmediatamente antes de Próximos vencimientos) */}
      <ClothingOrdersDashboardCard slug={dataSlug} vertical="deportivo" />

      {/* Fila 5: Próximos vencimientos */}
      <UpcomingTable
        items={upcomingData.items}
        loading={upcoming.isLoading}
        page={upcomingData.page}
        totalPages={upcomingData.totalPages}
        onPageChange={setUpcomingPage}
        isSport={isSport}
      />

      <DashboardDetailModal open={detailOpen} onClose={() => setDetailOpen(false)} spec={detailSpec} />
    </div>
  )
}
