import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { DateRangePicker } from '@/components/ui/date-picker'
import { DashboardSkeleton } from '@/pages/admin/dashboard/components/DashboardSkeleton'
import {
  Users, FilePlus, CircleDollarSign, ReceiptText, TriangleAlert, Building2,
  GraduationCap, BookOpen, ClipboardCheck, UsersRound, CalendarDays, Clock, BadgeCheck,
  Download, ChevronDown, FileText, FileSpreadsheet, ArrowRight,
} from 'lucide-react'
import type { DonutSegment, EvolutionPoint, UpcomingItem } from '@/types/dashboard'
import {
  EducativaDashboard, EducativaAttendanceReportPage, EducativaFinancialPage, EducativaObligationRow,
  CertificateRequestStatus, certStatusLabel,
  obligationConceptOf, obligationStatusLabel, paymentMethodLabel, fmtDate,
} from '../types'
import {
  DashboardDetailModal,
  DashboardDetailSpec,
  DetailColumn,
  DetailFilter,
  GeneralStateData,
} from './components/DashboardDetailModal'
import { EduSection } from './components/EduSection'
import { EduKpiCard } from './components/EduKpiCard'
import { EstadoGeneralHero } from './components/EstadoGeneralHero'
import { CuotasEstadoCard } from './components/CuotasEstadoCard'
import { EvolucionIngresosCard } from './components/EvolucionIngresosCard'
import { ResumenFinancieroCard } from './components/ResumenFinancieroCard'
import { AsistenciaCard } from './components/AsistenciaCard'
import { OcupacionCard } from './components/OcupacionCard'
import { CertificacionesCard } from './components/CertificacionesCard'
import { EduUpcomingTable } from './components/EduUpcomingTable'
import { ReviewBanners } from '@/components/reviews/review-banners'
import { ClothingOrdersDashboardCard } from '@/components/dashboard/clothing-orders-card'
import { ClothingFinancialDashboardCard } from '@/components/dashboard/clothing-financial-card'
import { cn } from '@/lib/utils'

// ---- Período en hora Argentina (UTC-3) ----
// El día argentino comienza a las 03:00 UTC. Todas las fechas del Dashboard se interpretan
// como días ARG y se envían como instante de inicio del día ARG (T03:00:00Z). El backend
// trata `toUtc` como fecha inclusiva y suma 1 día → [from, to+1d) en hora Argentina.
const AR_OFFSET_MS = 3 * 60 * 60 * 1000

function argDateString(utcMs: number): string {
  const ar = new Date(utcMs - AR_OFFSET_MS)
  const y = ar.getUTCFullYear()
  const m = String(ar.getUTCMonth() + 1).padStart(2, '0')
  const d = String(ar.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
function todayArg(): string { return argDateString(Date.now()) }
function monthStartArg(): string {
  const ar = new Date(Date.now() - AR_OFFSET_MS)
  return `${ar.getUTCFullYear()}-${String(ar.getUTCMonth() + 1).padStart(2, '0')}-01`
}
function monthEndArg(): string {
  const ar = new Date(Date.now() - AR_OFFSET_MS)
  const last = new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth() + 1, 0)).getUTCDate()
  return `${ar.getUTCFullYear()}-${String(ar.getUTCMonth() + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}
function monthsAgoStartArg(n: number): string {
  const ar = new Date(Date.now() - AR_OFFSET_MS)
  const d = new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth() - n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
}
/** Instante UTC del inicio de un día ARG (00:00 ARG = 03:00 UTC). */
function argDayStartUtc(dateStr: string): string { return `${dateStr}T03:00:00Z` }

// "Próximos vencimientos" representa obligaciones que requieren acción económica:
// se excluyen Paid y Cancelled. Pendiente futura = "Pendiente"; pendiente vencida = "Vencida".
function isActionableObligation(o: EducativaObligationRow): boolean {
  return o.status === 'Pending' || o.status === 'Overdue'
}
function statusToUpcoming(o: EducativaObligationRow): string {
  return o.status === 'Overdue' ? 'Vencida' : 'Pendiente'
}

const CERT_STATUSES: CertificateRequestStatus[] = ['Solicitado', 'PendientePago', 'Pagado', 'EnGestion', 'Emitido', 'Rechazado', 'Cancelado', 'EnRevision']
const CERT_STATUS_COLOR: Record<string, string> = {
  Solicitado: '#94a3b8',
  PendientePago: '#f59e0b',
  Pagado: '#3b82f6',
  EnGestion: '#8b5cf6',
  Emitido: '#22c55e',
  Rechazado: '#ef4444',
  Cancelado: '#64748b',
  EnRevision: '#ec4899',
}

const money = (v?: number) => `$${(v ?? 0).toLocaleString('es-AR')}`

interface FilterOption { value: string; label: string }
interface CommissionFilterOption { value: string; trainingId: string; label: string }
interface FinancialFilters {
  formations: FilterOption[]
  commissions: CommissionFilterOption[]
  obligationTypes: FilterOption[]
  obligationStatuses: FilterOption[]
  paymentStatuses: FilterOption[]
  paymentMethods: FilterOption[]
  periods: FilterOption[]
}

interface CertificatesSummary {
  total: number
  byStatus: { status: CertificateRequestStatus; count: number }[]
}

interface DashboardCuotasSummary {
  total: number
  pending: number
  overdue: number
  paid: number
  cancelled: number
  pendingAmount: number
  overdueAmount: number
  paidAmount: number
  cancelledAmount: number
}

const CUOTA_SEGMENT_STATUS: Record<string, string> = {
  Pagadas: 'Paid',
  Pendientes: 'Pending',
  Vencidas: 'Overdue',
  Canceladas: 'Cancelled',
}

const ATT_SEGMENT_STATUS: Record<string, string> = {
  Presentes: 'Presente',
  Ausentes: 'Ausente',
  Tarde: 'Tarde',
  Justificados: 'Justificado',
}

// Grilla de "Actividad y certificaciones": si Asistencia no aplica (sin clases configuradas),
// desaparece y las cards restantes redistribuyen el espacio (clases literales para Tailwind JIT).
const ACTIVIDAD_GRID: Record<number, string> = {
  2: 'grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1704px]:grid-cols-2',
  3: 'grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1704px]:grid-cols-3',
}

export function EducativaDashboardPage() {
  const { companySlug } = useParams<{ companySlug: string }>()
  const slug = companySlug ?? ''
  const navigate = useNavigate()

  const [dateFrom, setDateFrom] = useState(monthStartArg())
  const [dateTo, setDateTo] = useState(monthEndArg())
  const [hasCustomPeriod, setHasCustomPeriod] = useState(false)
  const [dateRangeError, setDateRangeError] = useState('')
  const [upcomingPage, setUpcomingPage] = useState(1)
  const [detail, setDetail] = useState<DashboardDetailSpec | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)

  useEffect(() => { setUpcomingPage(1) }, [dateFrom, dateTo])

  const periodChip = hasCustomPeriod
    ? `Período: ${dateFrom} al ${dateTo}`
    : 'Período: mes en curso'

  // El gráfico de evolución siempre mira hacia atrás: últimos 12 meses (default) o el período
  // seleccionado (custom). Se mantiene como "flujo económico" (pagos aprobados reales).
  const evoFrom = hasCustomPeriod ? dateFrom : monthsAgoStartArg(11)
  const evoTo = hasCustomPeriod ? dateTo : todayArg()

  const dashQuery = useQuery({
    queryKey: ['educativa-dashboard', slug, dateFrom, dateTo],
    queryFn: () => apiService.get<EducativaDashboard>(`/api/educativa/${slug}/dashboard?fromUtc=${argDayStartUtc(dateFrom)}&toUtc=${argDayStartUtc(dateTo)}`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })
  const d = dashQuery.data

  const generalStateQuery = useQuery({
    queryKey: ['educativa-general-state', slug],
    queryFn: () => apiService.get<GeneralStateData>(`/api/educativa/${slug}/dashboard/general-state`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })
  const generalState = generalStateQuery.data

  const filtersQuery = useQuery({
    queryKey: ['educativa-financial-filters', slug],
    queryFn: () => apiService.get<FinancialFilters>(`/api/educativa/${slug}/financial/filters`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })
  const finFilters = filtersQuery.data

  const attQuery = useQuery({
    queryKey: ['educativa-attendance-report', slug, dateFrom, dateTo],
    queryFn: () => apiService.get<EducativaAttendanceReportPage>(`/api/educativa/${slug}/attendance/report?from=${dateFrom}&to=${dateTo}&page=1&pageSize=200`),
    enabled: !!slug,
    retry: false,
  })
  const attSummary = attQuery.data?.summary

  const finQuery = useQuery({
    queryKey: ['educativa-dashboard-cuotas-summary', slug, dateFrom, dateTo],
    queryFn: () => apiService.get<DashboardCuotasSummary>(`/api/educativa/${slug}/dashboard/detail/cuotas-summary?fromUtc=${argDayStartUtc(dateFrom)}&toUtc=${argDayStartUtc(dateTo)}`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })
  const fin = finQuery.data

  const evoQuery = useQuery({
    queryKey: ['educativa-revenue-evolution', slug, evoFrom, evoTo],
    queryFn: () => apiService.get<EvolutionPoint[]>(`/api/educativa/${slug}/dashboard/revenue-evolution?from=${argDayStartUtc(evoFrom)}&to=${argDayStartUtc(evoTo)}`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })

  const certSummaryQuery = useQuery({
    queryKey: ['educativa-cert-summary', slug, dateFrom, dateTo],
    queryFn: () => apiService.get<CertificatesSummary>(`/api/educativa/${slug}/dashboard/detail/certificates-summary?fromUtc=${argDayStartUtc(dateFrom)}&toUtc=${argDayStartUtc(dateTo)}`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })
  const certSummary = certSummaryQuery.data

  const upcomingQuery = useQuery({
    queryKey: ['educativa-upcoming', slug, dateFrom, dateTo, upcomingPage],
    queryFn: () => apiService.get<EducativaFinancialPage<EducativaObligationRow>>(`/api/educativa/${slug}/dashboard/detail/obligations?fromUtc=${argDayStartUtc(dateFrom)}&toUtc=${argDayStartUtc(dateTo)}&status=Unpaid&page=${upcomingPage}&pageSize=10`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })
  const upcoming = (upcomingQuery.data?.items ?? []).filter(isActionableObligation)
  const upcomingTotalPages = Math.max(1, Math.ceil((upcomingQuery.data?.total ?? 0) / (upcomingQuery.data?.pageSize ?? 10)))

  // Donut: Certificaciones (conteo server-side)
  const certPie: DonutSegment[] = useMemo(() => {
    const byStatus = certSummary?.byStatus ?? []
    const total = certSummary?.total ?? 0
    return total > 0
      ? byStatus
          .filter((s) => s.count > 0)
          .map((s) => ({ label: certStatusLabel[s.status], count: s.count, percentage: (s.count * 100) / total, color: CERT_STATUS_COLOR[s.status] ?? '#94a3b8' }))
      : []
  }, [certSummary])

  // Asistencia real del período: alimenta el indicador "Académico" del hero cuando el factor
  // "Asistencia" del Estado General (que usa el día de hoy) no tiene registros aún.
  const academicPeriod = useMemo(() => {
    const total = attSummary?.totalAlumnos ?? 0
    const registered = Math.max(0, total - (attSummary?.sinRegistrar ?? 0))
    if (registered > 0) {
      return { rate: ((attSummary?.presentes ?? 0) * 100) / registered, hasData: true }
    }
    return { rate: 0, hasData: false }
  }, [attSummary])

  const upcomingItems: UpcomingItem[] = upcoming.map((o) => ({
    id: o.id,
    concept: o.description,
    studentName: o.studentName,
    dueDate: o.dueDateUtc,
    status: statusToUpcoming(o),
    navigateTo: `/educativa/${slug}/pagos`,
    chargeTypeName: obligationConceptOf(o),
    amount: o.totalToPay,
  }))

  // ---- Opciones de filtros internos (derivadas de datos reales, mismo backend que Pagos) ----
  const formationOptions: FilterOption[] = finFilters?.formations ?? []
  const commissionOptions: FilterOption[] = (finFilters?.commissions ?? []).map((c) => ({ value: c.value, label: c.label }))
  const paymentMethodOptions: FilterOption[] = finFilters?.paymentMethods ?? []
  const obligationTypeOptions: FilterOption[] = finFilters?.obligationTypes ?? []
  const obligationStatusOptions: FilterOption[] = finFilters?.obligationStatuses ?? []

  const obligationColumns: DetailColumn[] = [
    { key: 'student', header: 'Alumno', render: (r: any) => (
      <div>
        <p className="font-semibold text-slate-800 dark:text-slate-200">{r.studentName}</p>
        <p className="text-xs text-slate-400">{r.trainingName}</p>
      </div>
    ) },
    { key: 'commission', header: 'Comisión', render: (r: any) => r.commissionName },
    { key: 'kind', header: 'Tipo', render: (r: any) => obligationConceptOf(r) },
    { key: 'concept', header: 'Concepto', render: (r: any) => <span className="text-xs">{r.description}</span> },
    { key: 'period', header: 'Período', render: (r: any) => r.periodLabel ?? '-' },
    { key: 'due', header: 'Vencimiento', render: (r: any) => fmtDate(r.dueDateUtc) },
    { key: 'amount', header: 'Capital', align: 'right', render: (r: any) => money(r.amount) },
    { key: 'mora', header: 'Mora', align: 'right', render: (r: any) => money(r.moraAmount ?? 0) },
    { key: 'total', header: 'Total', align: 'right', render: (r: any) => <span className="font-semibold">{money(r.totalToPay ?? r.amount)}</span> },
    { key: 'currency', header: 'Moneda', render: (r: any) => <span className="text-xs text-slate-400">{r.currency || 'ARS'}</span> },
    { key: 'balance', header: 'Saldo', align: 'right', render: (r: any) => (
      <span className={`font-semibold ${r.status === 'Paid' || r.status === 'Cancelled' ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
        {r.status === 'Paid' || r.status === 'Cancelled' ? money(0) : money(r.totalToPay ?? r.amount)}
      </span>
    ) },
    { key: 'status', header: 'Estado', render: (r: any) => {
      const label = obligationStatusLabel[r.status] ?? r.status
      const cls = r.status === 'Overdue'
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        : r.status === 'Paid'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
          : r.status === 'Cancelled'
            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
      return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${cls}`}>{label}</span>
    } },
  ]

  const paymentColumns: DetailColumn[] = [
    { key: 'student', header: 'Alumno', render: (r: any) => (
      <div>
        <p className="font-semibold text-slate-800 dark:text-slate-200">{r.studentName}</p>
        <p className="text-xs text-slate-400">{r.trainingName}</p>
      </div>
    ) },
    { key: 'commission', header: 'Comisión', render: (r: any) => r.commissionName },
    { key: 'concept', header: 'Concepto', render: (r: any) => <span className="text-xs">{r.obligationDescription}</span> },
    { key: 'method', header: 'Medio', render: (r: any) => paymentMethodLabel[r.paymentMethod] ?? r.paymentMethod },
    { key: 'date', header: 'Fecha', render: (r: any) => fmtDate(r.createdAtUtc) },
    { key: 'amount', header: 'Importe', align: 'right', render: (r: any) => <span className="font-semibold">{money(r.totalAmount)}</span> },
    { key: 'currency', header: 'Moneda', render: (r: any) => <span className="text-xs text-slate-400">{r.currency || 'ARS'}</span> },
    { key: 'status', header: 'Estado', render: (r: any) => {
      const label: Record<string, string> = {
        Pending: 'Pendiente',
        InReview: 'En revisión',
        Approved: 'Aprobado',
        Rejected: 'Rechazado',
        Cancelled: 'Cancelado',
        Refunded: 'Reembolsado',
      }
      const cls = r.status === 'Approved'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
        : r.status === 'Rejected' || r.status === 'Cancelled'
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          : r.status === 'InReview' || r.status === 'Pending'
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${cls}`}>{label[r.status] ?? r.status}</span>
    } },
    { key: 'proof', header: 'Comprobante', render: (r: any) => {
      if (r.hasReceipt) return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400"><ReceiptText className="h-3.5 w-3.5" /> Recibo</span>
      if (r.latestProofUrl) return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"><BadgeCheck className="h-3.5 w-3.5" /> Comprobante</span>
      return <span className="text-xs text-slate-400">—</span>
    } },
  ]

  const attendanceColumns: DetailColumn[] = [
    { key: 'training', header: 'Formación', render: (r: any) => r.trainingName },
    { key: 'commission', header: 'Comisión', render: (r: any) => r.commissionName },
    { key: 'schedule', header: 'Clase', render: (r: any) => `${r.dayLabel} ${r.timeLabel}` },
    { key: 'date', header: 'Fecha', render: (r: any) => r.date },
    { key: 'total', header: 'Alumnos', align: 'right', render: (r: any) => r.totalAlumnos },
    { key: 'presentes', header: 'Presentes', align: 'right', render: (r: any) => r.presentes },
    { key: 'ausentes', header: 'Ausentes', align: 'right', render: (r: any) => r.ausentes },
    { key: 'tardes', header: 'Tardes', align: 'right', render: (r: any) => r.tardes },
    { key: 'justificados', header: 'Justificados', align: 'right', render: (r: any) => r.justificados },
    { key: 'sin', header: 'Sin registrar', align: 'right', render: (r: any) => r.sinRegistrar },
  ]

  // ---- Builders de specs ----
  const paymentsBase = (from: string, to: string) => ({
    endpoint: `/api/educativa/${slug}/financial/payments?status=Approved&fromUtc=${argDayStartUtc(from)}&toUtc=${argDayStartUtc(to)}`,
    exportBase: `/api/educativa/${slug}/financial/export?type=payments&status=Approved&fromUtc=${argDayStartUtc(from)}&toUtc=${argDayStartUtc(to)}`,
  })

  const obligationSpec = (status: string, title: string, value: string | number, valueLabel: string): DashboardDetailSpec => ({
    title,
    value,
    valueLabel,
    periodLabel: periodChip,
    endpoint: `/api/educativa/${slug}/dashboard/detail/obligations?fromUtc=${argDayStartUtc(dateFrom)}&toUtc=${argDayStartUtc(dateTo)}&status=${status}`,
    filters: [
      { kind: 'search', param: 'search', label: 'Búsqueda' },
      { kind: 'select', param: 'trainingId', label: 'Formación', options: formationOptions },
      { kind: 'select', param: 'commissionId', label: 'Comisión', options: commissionOptions },
      { kind: 'select', param: 'obligationType', label: 'Tipo', options: obligationTypeOptions },
    ],
    columns: obligationColumns,
    emptyText: 'No hay obligaciones para los filtros seleccionados.',
  })

  function openDetail(spec: DashboardDetailSpec) {
    setDetail(spec)
    setDetailOpen(true)
  }

  function openStudents() {
    openDetail({
      title: 'Alumnos activos',
      value: d?.activeStudents ?? 0,
      valueLabel: 'inscripciones activas',
      periodLabel: periodChip,
      endpoint: `/api/educativa/${slug}/dashboard/detail/students?fromUtc=${argDayStartUtc(dateFrom)}&toUtc=${argDayStartUtc(dateTo)}`,
      filters: [
        { kind: 'search', param: 'search', label: 'Búsqueda' },
        { kind: 'select', param: 'trainingId', label: 'Formación', options: formationOptions },
        { kind: 'select', param: 'commissionId', label: 'Comisión', options: commissionOptions },
      ],
      columns: [
        { key: 'student', header: 'Alumno', render: (r: any) => (
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{r.studentName}</p>
            <p className="text-xs text-slate-400">{r.email}{r.dni ? ` · DNI ${r.dni}` : ''}</p>
          </div>
        ) },
        { key: 'training', header: 'Formación', render: (r: any) => r.trainingName },
        { key: 'commission', header: 'Comisión', render: (r: any) => r.commissionName },
        { key: 'enrolled', header: 'Inscripción', render: (r: any) => fmtDate(r.enrolledAtUtc) },
        { key: 'situation', header: 'Estado', render: (r: any) => r.academicSituation ?? 'Activa' },
      ],
      emptyText: 'No hay inscripciones activas en el período.',
    })
  }

  function openEnrollments() {
    openDetail({
      title: 'Inscripciones del período',
      value: d?.newEnrollments ?? 0,
      valueLabel: 'inscripciones',
      periodLabel: periodChip,
      endpoint: `/api/educativa/${slug}/dashboard/detail/enrollments?fromUtc=${argDayStartUtc(dateFrom)}&toUtc=${argDayStartUtc(dateTo)}`,
      filters: [
        { kind: 'search', param: 'search', label: 'Búsqueda' },
        { kind: 'select', param: 'trainingId', label: 'Formación', options: formationOptions },
        { kind: 'select', param: 'commissionId', label: 'Comisión', options: commissionOptions },
      ],
      columns: [
        { key: 'student', header: 'Alumno', render: (r: any) => (
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{r.studentName}</p>
            <p className="text-xs text-slate-400">{r.email}</p>
          </div>
        ) },
        { key: 'training', header: 'Formación', render: (r: any) => r.trainingName },
        { key: 'commission', header: 'Comisión', render: (r: any) => r.commissionName },
        { key: 'enrolled', header: 'Fecha de inscripción', render: (r: any) => fmtDate(r.enrolledAtUtc) },
        { key: 'status', header: 'Estado', render: (r: any) => r.status === 'Active' ? 'Activa' : r.status === 'Cancelled' ? 'Cancelada' : 'Completada' },
      ],
      emptyText: 'No hay inscripciones en el período.',
    })
  }

  function openRevenue(from?: string, to?: string, opts?: { title?: string; value?: string }) {
    const { endpoint, exportBase } = paymentsBase(from ?? dateFrom, to ?? dateTo)
    openDetail({
      title: opts?.title ?? 'Recaudación del período',
      value: opts?.value ?? money(d?.revenue ?? 0),
      valueLabel: 'pagos aprobados',
      periodLabel: periodChip,
      endpoint,
      exportBase,
      filters: [
        { kind: 'search', param: 'search', label: 'Búsqueda' },
        { kind: 'select', param: 'trainingId', label: 'Formación', options: formationOptions },
        { kind: 'select', param: 'commissionId', label: 'Comisión', options: commissionOptions },
        { kind: 'select', param: 'paymentMethod', label: 'Medio de pago', options: paymentMethodOptions },
      ],
      columns: paymentColumns,
      emptyText: 'No hay pagos aprobados en el período.',
    })
  }

  function openDebt() {
    openDetail(obligationSpec('Unpaid', 'Deuda pendiente', money(d?.debt ?? 0), 'capital de obligaciones pendientes'))
  }

  function openOverdue() {
    openDetail(obligationSpec('Overdue', 'Cuotas vencidas', d?.overdueInstallments ?? 0, 'obligaciones vencidas'))
  }

  function buildPaymentStatusSpec(status: string, title: string, value: string | number): DashboardDetailSpec {
    return {
      title,
      value,
      valueLabel: 'pagos',
      periodLabel: periodChip,
      endpoint: `/api/educativa/${slug}/financial/payments?status=${status}&fromUtc=${argDayStartUtc(dateFrom)}&toUtc=${argDayStartUtc(dateTo)}`,
      exportBase: `/api/educativa/${slug}/financial/export?type=payments&status=${status}&fromUtc=${argDayStartUtc(dateFrom)}&toUtc=${argDayStartUtc(dateTo)}`,
      filters: [
        { kind: 'search', param: 'search', label: 'Búsqueda' },
        { kind: 'select', param: 'trainingId', label: 'Formación', options: formationOptions },
        { kind: 'select', param: 'commissionId', label: 'Comisión', options: commissionOptions },
        { kind: 'select', param: 'paymentMethod', label: 'Medio de pago', options: paymentMethodOptions },
      ],
      columns: paymentColumns,
      emptyText: 'No hay pagos para los filtros seleccionados.',
    }
  }

  function openInReview() {
    openDetail(buildPaymentStatusSpec('InReview', 'Pagos en revisión', d?.pendingReviewPayments ?? 0))
  }

  function openGeneralState() {
    if (!generalState) return

    const attendanceAction: DashboardDetailSpec = {
      title: 'Asistencias del período',
      value: attSummary?.totalAlumnos ?? 0,
      valueLabel: 'registros',
      periodLabel: periodChip,
      endpoint: `/api/educativa/${slug}/attendance/report?from=${dateFrom}&to=${dateTo}`,
      exportBase: `/api/educativa/${slug}/attendance/report/export?from=${dateFrom}&to=${dateTo}`,
      filters: [
        { kind: 'select', param: 'trainingId', label: 'Formación', options: formationOptions },
        { kind: 'select', param: 'commissionId', label: 'Comisión', options: commissionOptions },
      ],
      columns: attendanceColumns,
      emptyText: 'Sin asistencias registradas en el período.',
    }

    const actions: { label: string; spec: DashboardDetailSpec }[] = [
      { label: 'Ver cuotas', spec: buildCuotasGeneralSpec() },
    ]
    if (generalState.penalties.some((p) => p.type === 'overdueCharges')) {
      actions.push({ label: 'Ver cuotas vencidas', spec: obligationSpec('Overdue', 'Cuotas vencidas', d?.overdueInstallments ?? 0, 'obligaciones vencidas') })
    }
    if (generalState.penalties.some((p) => p.type === 'pendingReviews')) {
      actions.push({ label: 'Ver pagos en revisión', spec: buildPaymentStatusSpec('InReview', 'Pagos en revisión', d?.pendingReviewPayments ?? 0) })
    }
    actions.push({ label: 'Ver asistencias del período', spec: attendanceAction })

    openDetail({
      kind: 'general-state',
      title: 'Estado General de la Institución',
      value: generalState.hasData ? generalState.score : '—',
      valueLabel: 'score',
      periodLabel: 'Cálculo a hoy · punto en el tiempo',
      endpoint: '',
      exportBase: `/api/educativa/${slug}/dashboard/export?fromUtc=${argDayStartUtc(dateFrom)}&toUtc=${argDayStartUtc(dateTo)}`,
      columns: [],
      generalState,
      actions,
      onOpenDetail: (inner) => setDetail(inner),
    })
  }

  function buildCuotasGeneralSpec(): DashboardDetailSpec {
    return {
      title: 'Cuotas',
      value: fin?.total ?? 0,
      valueLabel: 'obligaciones',
      periodLabel: periodChip,
      endpoint: `/api/educativa/${slug}/dashboard/detail/obligations?fromUtc=${argDayStartUtc(dateFrom)}&toUtc=${argDayStartUtc(dateTo)}`,
      filters: [
        { kind: 'search', param: 'search', label: 'Búsqueda' },
        { kind: 'select', param: 'trainingId', label: 'Formación', options: formationOptions },
        { kind: 'select', param: 'commissionId', label: 'Comisión', options: commissionOptions },
        { kind: 'select', param: 'status', label: 'Estado', options: obligationStatusOptions },
        { kind: 'select', param: 'obligationType', label: 'Tipo', options: obligationTypeOptions },
      ],
      columns: obligationColumns,
      emptyText: 'No hay obligaciones para los filtros seleccionados.',
    }
  }

  function openCuotas(segment?: { label: string; count: number }) {
    const status = segment ? CUOTA_SEGMENT_STATUS[segment.label] : undefined
    const filters: DetailFilter[] = [
      { kind: 'search', param: 'search', label: 'Búsqueda' },
      { kind: 'select', param: 'trainingId', label: 'Formación', options: formationOptions },
      { kind: 'select', param: 'commissionId', label: 'Comisión', options: commissionOptions },
    ]
    if (!status) filters.push({ kind: 'select', param: 'status', label: 'Estado', options: obligationStatusOptions })
    filters.push({ kind: 'select', param: 'obligationType', label: 'Tipo', options: obligationTypeOptions })
    openDetail({
      title: segment ? `Cuotas · ${segment.label}` : 'Cuotas',
      value: segment ? segment.count : fin?.total ?? 0,
      valueLabel: 'obligaciones',
      periodLabel: periodChip,
      endpoint: `/api/educativa/${slug}/dashboard/detail/obligations?fromUtc=${argDayStartUtc(dateFrom)}&toUtc=${argDayStartUtc(dateTo)}${status ? `&status=${status}` : ''}`,
      filters,
      columns: obligationColumns,
      emptyText: 'No hay obligaciones para los filtros seleccionados.',
    })
  }

  function openOccupancy() {
    openDetail({
      title: 'Ocupación por comisión',
      value: `${d?.occupancyPercent ?? 0}%`,
      valueLabel: `${d?.occupiedSlots ?? 0}/${d?.capacitySlots ?? 0} cupos`,
      periodLabel: periodChip,
      endpoint: `/api/educativa/${slug}/dashboard/detail/occupancy?fromUtc=${argDayStartUtc(dateFrom)}&toUtc=${argDayStartUtc(dateTo)}`,
      filters: [
        { kind: 'select', param: 'trainingId', label: 'Formación', options: formationOptions },
        { kind: 'select', param: 'commissionId', label: 'Comisión', options: commissionOptions },
      ],
      columns: [
        { key: 'training', header: 'Formación', render: (r: any) => r.trainingName },
        { key: 'commission', header: 'Comisión', render: (r: any) => r.commissionName },
        { key: 'capacity', header: 'Cupo', align: 'right', render: (r: any) => r.hasLimit ? r.capacity : 'Sin límite' },
        { key: 'occupied', header: 'Ocupados', align: 'right', render: (r: any) => <span className="font-semibold">{r.occupied}</span> },
        { key: 'available', header: 'Disponibles', align: 'right', render: (r: any) => r.hasLimit ? (r.available ?? 0) : 'Sin límite' },
        { key: 'percent', header: '%', align: 'right', render: (r: any) => r.hasLimit ? `${r.percentage ?? 0}%` : '—' },
        { key: 'situation', header: 'Situación', render: (r: any) => r.situation },
      ],
      emptyText: 'No hay comisiones para los filtros seleccionados.',
    })
  }

  function openAttendance(segment?: { label: string; count: number }) {
    const status = segment ? ATT_SEGMENT_STATUS[segment.label] : undefined
    const value = segment
      ? segment.count
      : attSummary?.totalAlumnos ?? 0
    const reportBase = status
      ? `/api/educativa/${slug}/attendance/report?from=${dateFrom}&to=${dateTo}&status=${status}`
      : `/api/educativa/${slug}/attendance/report?from=${dateFrom}&to=${dateTo}`
    const exportBase = status
      ? `/api/educativa/${slug}/attendance/report/export?from=${dateFrom}&to=${dateTo}&status=${status}`
      : `/api/educativa/${slug}/attendance/report/export?from=${dateFrom}&to=${dateTo}`
    openDetail({
      title: segment ? `Asistencias del período · ${segment.label}` : 'Asistencias del período',
      value,
      valueLabel: 'registros',
      periodLabel: periodChip,
      endpoint: reportBase,
      exportBase,
      filters: [
        { kind: 'select', param: 'trainingId', label: 'Formación', options: formationOptions },
        { kind: 'select', param: 'commissionId', label: 'Comisión', options: commissionOptions },
      ],
      columns: attendanceColumns,
      emptyText: 'Sin asistencias registradas en el período.',
    })
  }

  function openCertificates(segment?: { label: string; count: number }) {
    const statusValue = CERT_STATUSES.find((s) => certStatusLabel[s] === segment?.label)
    const value = segment ? segment.count : certSummary?.total ?? 0
    openDetail({
      title: segment ? `Certificaciones · ${segment.label}` : 'Certificaciones',
      value,
      valueLabel: 'solicitudes',
      periodLabel: periodChip,
      endpoint: (statusValue
        ? `/api/educativa/${slug}/certificates/requests?status=${statusValue}`
        : `/api/educativa/${slug}/certificates/requests`) + `&fromCreatedUtc=${argDayStartUtc(dateFrom)}&toCreatedUtc=${argDayStartUtc(dateTo)}`,
      exportBase: (statusValue
        ? `/api/educativa/${slug}/certificates/requests/export?status=${statusValue}`
        : `/api/educativa/${slug}/certificates/requests/export`) + `&fromCreatedUtc=${argDayStartUtc(dateFrom)}&toCreatedUtc=${argDayStartUtc(dateTo)}`,
      filters: [
        { kind: 'search', param: 'search', label: 'Búsqueda' },
        { kind: 'select', param: 'trainingId', label: 'Formación', options: formationOptions },
        { kind: 'select', param: 'commissionId', label: 'Comisión', options: commissionOptions },
        ...(!statusValue ? [{ kind: 'select' as const, param: 'status', label: 'Estado', options: CERT_STATUSES.map((s) => ({ value: s, label: certStatusLabel[s] })) }] : []),
      ],
      columns: [
        { key: 'student', header: 'Alumno', render: (r: any) => (
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{r.studentName}</p>
            <p className="text-xs text-slate-400">{r.studentEmail}</p>
          </div>
        ) },
        { key: 'training', header: 'Formación', render: (r: any) => r.trainingName },
        { key: 'commission', header: 'Comisión', render: (r: any) => r.commissionName },
        { key: 'cert', header: 'Certificado', render: (r: any) => r.certificateTypeName },
        { key: 'price', header: 'Importe', align: 'right', render: (r: any) => money(r.priceFrozen) },
        { key: 'status', header: 'Estado', render: (r: any) => (
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${certStatusBadgeClass(r.status)}`}>{certStatusLabel[r.status as CertificateRequestStatus]}</span>
        ) },
        { key: 'created', header: 'Creado', render: (r: any) => fmtDate(r.createdAtUtc) },
      ],
      emptyText: 'No hay solicitudes de certificados.',
    })
  }

  function openEvolutionPoint(point: EvolutionPoint) {
    const lastPeriod = evoQuery.data?.[evoQuery.data.length - 1]?.period
    const isLast = lastPeriod === point.period
    const [y, m] = point.period.split('-').map(Number)
    const first = new Date(Date.UTC(y, m - 1, 1))
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const from = first.toISOString().slice(0, 10)
    // Frontera exacta del punto en hora Argentina: [primer día ARG, último día ARG].
    // Para el último mes (parcial) se usa el fin del período seleccionado.
    const to = isLast ? dateTo : `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    openDetail({
      title: `Recaudación · ${point.period}`,
      value: money(point.value),
      valueLabel: 'pagos aprobados',
      periodLabel: periodChip,
      endpoint: `/api/educativa/${slug}/financial/payments?status=Approved&fromUtc=${argDayStartUtc(from)}&toUtc=${argDayStartUtc(to)}`,
      exportBase: `/api/educativa/${slug}/financial/export?type=payments&status=Approved&fromUtc=${argDayStartUtc(from)}&toUtc=${argDayStartUtc(to)}`,
      filters: [
        { kind: 'search', param: 'search', label: 'Búsqueda' },
        { kind: 'select', param: 'trainingId', label: 'Formación', options: formationOptions },
        { kind: 'select', param: 'commissionId', label: 'Comisión', options: commissionOptions },
        { kind: 'select', param: 'paymentMethod', label: 'Medio de pago', options: paymentMethodOptions },
      ],
      columns: paymentColumns,
      emptyText: 'No hay pagos aprobados en el período.',
    })
  }

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
    setDateFrom(monthStartArg())
    setDateTo(monthEndArg())
    setHasCustomPeriod(false)
    setDateRangeError('')
  }

  async function handleExportGeneral(format: 'excel' | 'pdf') {
    setExportOpen(false)
    setExporting(format)
    try {
      const fmt = format === 'pdf' ? 'pdf' : 'xlsx'
      const blob = await apiService.getBlob(
        `/api/educativa/${slug}/dashboard/export?format=${fmt}&fromUtc=${argDayStartUtc(dateFrom)}&toUtc=${argDayStartUtc(dateTo)}`,
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dashboard-educativa-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.${fmt}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      setExporting(null)
    }
  }

  if (dashQuery.isLoading && !dashQuery.data) {
    return (
      <div className="mx-auto w-full max-w-[1440px] p-4 sm:p-6">
        <DashboardSkeleton />
      </div>
    )
  }

  const periodToolbar = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="min-w-0 max-w-[260px]">
        <DateRangePicker from={dateFrom} to={dateTo}
          onChange={({ from: f, to: t }) => handleDateChange(f, t)} />
      </div>
      {dateRangeError && <p className="text-xs text-red-500">{dateRangeError}</p>}
      {hasCustomPeriod && (
        <button type="button" onClick={clearPeriod}
          className="inline-flex min-h-[2.6rem] items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-[#0D1A2E] dark:text-slate-300 dark:hover:bg-white/[0.06]">
          Volver al mes actual
        </button>
      )}
      <div className="relative">
        <button type="button" onClick={() => setExportOpen((v) => !v)}
          className="inline-flex min-h-[2.6rem] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-[#0D1A2E] dark:text-slate-300 dark:hover:bg-white/[0.06]">
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          {exporting ? (exporting === 'pdf' ? 'Generando PDF…' : 'Generando Excel…') : 'Exportar'}
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        </button>
        {exportOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} aria-hidden="true" />
            <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-[#0B1220]">
              <button type="button" disabled={exporting !== null} onClick={() => handleExportGeneral('pdf')}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-white/[0.06]">
                <FileText className="h-4 w-4" aria-hidden="true" /> PDF
              </button>
              <button type="button" disabled={exporting !== null} onClick={() => handleExportGeneral('excel')}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-white/[0.06]">
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Excel (XLSX)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-7 p-4 sm:p-6">
      {dashQuery.isError && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          No se pudo cargar el dashboard.
        </p>
      )}

      {/* 1. Estado General de la Institución (hero) */}
      <EstadoGeneralHero
        state={generalState}
        loading={generalStateQuery.isLoading}
        occupancyPercent={d?.occupancyPercent}
        hasOccupancyData={(d?.capacitySlots ?? 0) > 0}
        academicRate={academicPeriod.rate}
        hasAcademicRate={academicPeriod.hasData}
        hasAttendanceSetup={!!d?.hasAttendanceSetup}
        attention={fin ? { overdue: fin.overdue, pending: fin.pending, pendingAmount: fin.pendingAmount, overdueAmount: fin.overdueAmount } : null}
        onVerDetalle={openGeneralState}
      />

      {/* Avisos administrativos: Indumentaria y Cuotas */}
      <ReviewBanners slug={slug} vertical="educativa" />

      {/* 2. Resumen ejecutivo + selector de período */}
      <EduSection
        title="Resumen ejecutivo"
        subtitle="Información clave del período seleccionado."
        right={periodToolbar}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 min-[1704px]:grid-cols-6">
          <EduKpiCard
            icon={<Users className="h-5 w-5" strokeWidth={2} />}
            label="Alumnos activos"
            value={d?.activeStudents ?? 0}
            color="violet"
            onClick={openStudents}
            tooltip="Ver detalle de inscripciones activas"
          />
          <EduKpiCard
            icon={<FilePlus className="h-5 w-5" strokeWidth={2} />}
            label="Inscripciones"
            value={d?.newEnrollments ?? 0}
            color="emerald"
            onClick={openEnrollments}
            tooltip="Ver inscripciones del período seleccionado"
          />
          <EduKpiCard
            icon={<CircleDollarSign className="h-5 w-5" strokeWidth={2} />}
            label="Recaudación"
            value={money(d?.revenue ?? 0)}
            color="blue"
            onClick={() => openRevenue()}
            tooltip="Ver pagos aprobados del período"
          />
          <EduKpiCard
            icon={<ReceiptText className="h-5 w-5" strokeWidth={2} />}
            label="Deuda pendiente"
            value={money(d?.debt ?? 0)}
            color="rose"
            onClick={openDebt}
            tooltip="Ver obligaciones pendientes que componen la deuda"
          />
          <EduKpiCard
            icon={<TriangleAlert className="h-5 w-5" strokeWidth={2} />}
            label="Cuotas vencidas"
            value={d?.overdueInstallments ?? 0}
            color="amber"
            onClick={openOverdue}
            tooltip="Ver obligaciones vencidas"
          />
          <EduKpiCard
            icon={<Building2 className="h-5 w-5" strokeWidth={2} />}
            label="Ocupación"
            value={`${d?.occupancyPercent ?? 0}%`}
            color="violet"
            onClick={openOccupancy}
            tooltip="Ver detalle de cupos por comisión"
          />
        </div>
      </EduSection>

      {/* Indumentaria financiera: inmediatamente debajo del selector de período (hora Argentina) */}
      <ClothingFinancialDashboardCard
        slug={slug}
        from={dateFrom}
        to={dateTo}
        fromUtc={argDayStartUtc(dateFrom)}
        toUtc={argDayStartUtc(dateTo)}
      />

      {/* 3. Operación académica */}
      <EduSection title="Operación académica" subtitle="Formaciones, comisiones, docentes y cursada.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 min-[1704px]:grid-cols-6">
          <EduKpiCard
            variant="academic"
            icon={<BookOpen className="h-5 w-5" strokeWidth={2} />}
            label="Formaciones activas"
            value={d?.activeTrainings ?? 0}
            color="blue"
            linkLabel="Ver formaciones"
            onClick={() => navigate(`/educativa/${slug}/formaciones`)}
          />
          <EduKpiCard
            variant="academic"
            icon={<ClipboardCheck className="h-5 w-5" strokeWidth={2} />}
            label="Comisiones activas"
            value={d?.activeCommissions ?? 0}
            color="emerald"
            linkLabel="Ver comisiones"
            onClick={() => navigate(`/educativa/${slug}/commissions`)}
          />
          <EduKpiCard
            variant="academic"
            icon={<UsersRound className="h-5 w-5" strokeWidth={2} />}
            label="Docentes"
            value={d?.activeDocentes ?? 0}
            color="cyan"
            linkLabel="Ver docentes"
            onClick={() => navigate(`/educativa/${slug}/docentes`)}
          />
          <EduKpiCard
            variant="academic"
            icon={<CalendarDays className="h-5 w-5" strokeWidth={2} />}
            label="Clases del período"
            value={d?.classesInPeriod ?? 0}
            color="amber"
            linkLabel="Ver clases"
            onClick={() => navigate(`/educativa/${slug}/classes`)}
          />
          <EduKpiCard
            variant="academic"
            icon={<GraduationCap className="h-5 w-5" strokeWidth={2} />}
            label="Graduados"
            value={d?.graduates ?? 0}
            color="violet"
            linkLabel="Ver graduados"
            onClick={() => navigate(`/educativa/${slug}/graduados`)}
          />
          <EduKpiCard
            variant="academic"
            icon={<Clock className="h-5 w-5" strokeWidth={2} />}
            label="Pagos en revisión"
            value={d?.pendingReviewPayments ?? 0}
            color="rose"
            linkLabel="Ver pagos en revisión"
            onClick={() => navigate(`/educativa/${slug}/pagos`)}
          />
        </div>
      </EduSection>

      {/* 4. Situación financiera */}
      <EduSection title="Situación financiera" subtitle="Análisis de cuotas, ingresos y estado de cobranza.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1704px]:grid-cols-3">
          <CuotasEstadoCard
            fin={fin}
            loading={finQuery.isLoading}
            onSegmentClick={openCuotas}
            onGeneralClick={() => openCuotas()}
          />
          <EvolucionIngresosCard
            data={evoQuery.data ?? []}
            title={hasCustomPeriod ? 'Evolución de ingresos del período' : 'Evolución de ingresos últimos 12 meses'}
            loading={evoQuery.isLoading}
            onPointClick={openEvolutionPoint}
            onGeneralClick={() => openRevenue()}
          />
          <ResumenFinancieroCard
            fin={fin}
            revenue={d?.revenue}
            pendingReviewPayments={d?.pendingReviewPayments}
            loading={finQuery.isLoading}
            onOpenOverdue={openOverdue}
            onOpenPending={openDebt}
            onOpenRevenue={() => openRevenue()}
            onOpenInReview={openInReview}
            onVerPagos={() => navigate(`/educativa/${slug}/pagos`)}
          />
        </div>
      </EduSection>

      {/* 5. Actividad y certificaciones */}
      <EduSection title="Actividad y certificaciones" subtitle="Asistencias, ocupación y certificados del período.">
        <div className={ACTIVIDAD_GRID[2 + (d?.hasAttendanceSetup ? 1 : 0)]}>
          {d?.hasAttendanceSetup && (
            <AsistenciaCard
              summary={attSummary}
              loading={attQuery.isLoading}
              onSegmentClick={openAttendance}
              onGeneralClick={() => openAttendance()}
              onIrAsistencia={() => navigate(`/educativa/${slug}/asistencias`)}
            />
          )}
          <OcupacionCard
            dash={d}
            loading={dashQuery.isLoading}
            onSegmentClick={() => openOccupancy()}
            onGeneralClick={openOccupancy}
            onVerComisiones={() => navigate(`/educativa/${slug}/commissions`)}
          />
          <CertificacionesCard
            total={certSummary?.total ?? 0}
            segments={certPie}
            loading={certSummaryQuery.isLoading}
            onSegmentClick={openCertificates}
            onGeneralClick={() => openCertificates()}
            onVerCertificaciones={() => navigate(`/educativa/${slug}/certificaciones`)}
          />
        </div>
      </EduSection>

      {/* 6. Indumentaria (Pedidos inmediatamente antes de Próximos vencimientos) */}
      <ClothingOrdersDashboardCard slug={slug} vertical="educativa" />

      {/* 7. Próximos vencimientos */}
      <EduSection
        title="Próximos vencimientos"
        subtitle="Obligaciones que requieren acción económica."
        right={
          <button
            type="button"
            onClick={() => navigate(`/educativa/${slug}/pagos`)}
            className={cn('inline-flex items-center gap-1 rounded-lg px-1 py-1 text-xs font-bold text-blue-600 transition hover:text-blue-500 dark:text-blue-400')}
          >
            Ver todos
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        }
      >
        <EduUpcomingTable
          items={upcomingItems}
          loading={upcomingQuery.isLoading}
          page={upcomingQuery.data?.page ?? 1}
          totalPages={upcomingTotalPages}
          onPageChange={setUpcomingPage}
        />
      </EduSection>

      <DashboardDetailModal open={detailOpen} onClose={() => setDetailOpen(false)} spec={detail} />
    </div>
  )
}

function certStatusBadgeClass(status: CertificateRequestStatus): string {
  switch (status) {
    case 'Emitido': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    case 'PendientePago': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    case 'Pagado': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    case 'EnGestion': return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
    case 'Rechazado': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    case 'Cancelado': return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
    case 'EnRevision': return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
    default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  }
}