import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { apiService, getApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { SelectField } from '@/components/ui/select-field'
import { DateRangePicker } from '@/components/ui/date-picker'
import { SearchableCombobox } from '@/components/ui/combobox'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Pagination } from '@/components/ui/pagination'
import { CollectPaymentModal } from '../components/CollectPaymentModal'
import { Download, ChevronDown, FileText, FileSpreadsheet, SlidersHorizontal, ReceiptText, Clock, AlertTriangle, CircleCheckBig } from 'lucide-react'
import {
  fmtDate, fmtMoney,
  EducativaFinancialSummary, EducativaFinancialPage, EducativaObligationRow, EducativaPaymentRow,
  EducativaPaymentProof, EducativaPaymentProofView,
  obligationTypeOf, obligationConceptOf, obligationTypeBadge, obligationStatusLabel, obligationStatusBadge,
  enrollmentPaymentStatusLabel, enrollmentPaymentStatusBadge,
  isObligationOverdue, paymentMethodLabel,
} from '../types'

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

// Período contractual actual en Argentina (UTC-3). Formato "yyyy-MM" (Value del backend).
function currentPeriod(): string {
  const d = new Date(Date.now() - 3 * 3600 * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

const ars = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value ?? 0)

const kpiColors = {
  blue: { bar: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20', iconBg: 'bg-blue-100 dark:bg-blue-900/40' },
  amber: { bar: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20', iconBg: 'bg-amber-100 dark:bg-amber-900/40' },
  rose: { bar: 'bg-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/20', iconBg: 'bg-rose-100 dark:bg-rose-900/40' },
  emerald: { bar: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40' },
} as const

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: keyof typeof kpiColors }) {
  const c = kpiColors[color]
  return (
    <div className={`relative flex items-start gap-3 overflow-hidden rounded-2xl border border-slate-200 p-4 shadow-sm dark:border-slate-700 ${c.bg}`}>
      <div className={`absolute left-0 top-0 h-full w-1 shrink-0 ${c.bar}`} />
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${c.iconBg}`}>
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-[11px] font-semibold leading-tight text-slate-500 dark:text-slate-400 line-clamp-2">{label}</p>
        <p className="text-xl font-black leading-tight text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  )
}

function PagosInner() {
  const { companySlug } = useParams<{ companySlug: string }>()
  const slug = companySlug ?? ''
  const toast = useToast()
  const qc = useQueryClient()

  const [tab, setTab] = useState<'cuotas' | 'pagos'>('cuotas')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Filtros avanzados
  const [status, setStatus] = useState('')
  const [trainingId, setTrainingId] = useState('')
  const [commissionId, setCommissionId] = useState('')
  const [obligationType, setObligationType] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [dueFrom, setDueFrom] = useState('')
  const [dueTo, setDueTo] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Período contractual (PeriodMonth): por default el período actual; '' = todos los períodos.
  const [period, setPeriod] = useState(currentPeriod())

  // Modales
  const [selectedPayment, setSelectedPayment] = useState<EducativaPaymentRow | null>(null)
  const [selectedObligation, setSelectedObligation] = useState<EducativaObligationRow | null>(null)
  const [payTarget, setPayTarget] = useState<EducativaObligationRow | null>(null)
  const [reviewTarget, setReviewTarget] = useState<EducativaPaymentRow | null>(null)
  const [note, setNote] = useState('')
  const [reviewing, setReviewing] = useState(false)

  // Metadata viva para filtros: el backend decide qué opciones existen.
  const filtersQuery = useQuery({
    queryKey: ['educativa-financial-filters', slug],
    queryFn: () => apiService.get<FinancialFilters>(`/api/educativa/${slug}/financial/filters`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })
  const filters = filtersQuery.data
  const filteredCommissions = (filters?.commissions ?? []).filter((c) => !trainingId || c.trainingId === trainingId)
  const statusOptions = (tab === 'cuotas' ? filters?.obligationStatuses : filters?.paymentStatuses) ?? []

  const summaryQuery = useQuery({
    queryKey: ['educativa-financial-summary', slug, period],
    queryFn: () => apiService.get<EducativaFinancialSummary>(`/api/educativa/${slug}/financial/summary${period ? `?period=${period}` : ''}`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })
  const s = summaryQuery.data

  const params = new URLSearchParams({ page: String(page), pageSize: '20' })
  if (search) params.set('search', search)
  if (status) params.set('status', status)
  if (trainingId) params.set('trainingId', trainingId)
  if (commissionId) params.set('commissionId', commissionId)
  if (period) params.set('period', period)
  if (tab === 'cuotas') {
    if (obligationType) params.set('obligationType', obligationType)
    if (dueFrom) params.set('dueFromUtc', dueFrom)
    if (dueTo) params.set('dueToUtc', dueTo)
  } else {
    if (paymentMethod) params.set('paymentMethod', paymentMethod)
    if (fromDate) params.set('fromUtc', fromDate)
    if (toDate) params.set('toUtc', toDate)
  }

  const obligationsQuery = useQuery({
    queryKey: ['educativa-obligations', slug, search, status, trainingId, commissionId, obligationType, period, dueFrom, dueTo, page],
    queryFn: () => apiService.get<EducativaFinancialPage<EducativaObligationRow>>(`/api/educativa/${slug}/financial/obligations?${params}`),
    enabled: !!slug && tab === 'cuotas',
    retry: false,
    placeholderData: (prev) => prev,
  })

  const paymentsQuery = useQuery({
    queryKey: ['educativa-payments', slug, search, status, trainingId, commissionId, paymentMethod, period, fromDate, toDate, page],
    queryFn: () => apiService.get<EducativaFinancialPage<EducativaPaymentRow>>(`/api/educativa/${slug}/financial/payments?${params}`),
    enabled: !!slug && tab === 'pagos',
    retry: false,
    placeholderData: (prev) => prev,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['educativa-financial-summary', slug] })
    qc.invalidateQueries({ queryKey: ['educativa-obligations', slug] })
    qc.invalidateQueries({ queryKey: ['educativa-payments', slug] })
  }

  const resetFilters = () => {
    setStatus(''); setTrainingId(''); setCommissionId(''); setObligationType('')
    setPaymentMethod(''); setDueFrom(''); setDueTo(''); setFromDate(''); setToDate('')
    setSearch(''); setPage(1)
  }

  const activeFilterCount = [search, status, trainingId, commissionId, tab === 'cuotas' ? obligationType : paymentMethod, tab === 'cuotas' ? dueFrom : fromDate, tab === 'cuotas' ? dueTo : toDate].filter(Boolean).length

  async function handleExport(format: 'pdf' | 'xlsx') {
    setExportOpen(false)
    setExporting(true)
    try {
      const exportParams = new URLSearchParams({ type: tab, format })
      if (search) exportParams.set('search', search)
      if (status) exportParams.set('status', status)
      if (trainingId) exportParams.set('trainingId', trainingId)
      if (commissionId) exportParams.set('commissionId', commissionId)
      if (period) exportParams.set('period', period)
      if (tab === 'cuotas') {
        if (obligationType) exportParams.set('obligationType', obligationType)
        if (dueFrom) exportParams.set('dueFromUtc', dueFrom)
        if (dueTo) exportParams.set('dueToUtc', dueTo)
      } else {
        if (paymentMethod) exportParams.set('paymentMethod', paymentMethod)
        if (fromDate) exportParams.set('fromUtc', fromDate)
        if (toDate) exportParams.set('toUtc', toDate)
      }
      const blob = await apiService.getBlob(`/api/educativa/${slug}/financial/export?${exportParams}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tab === 'cuotas' ? 'Cuotas' : 'Pagos'}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast('Exportación generada.')
    } catch (err) {
      toast(getApiError(err) || 'No se pudo exportar.', 'error')
    } finally {
      setExporting(false)
    }
  }

  async function review(action: 'approve' | 'reject') {
    if (!reviewTarget) return
    setReviewing(true)
    try {
      await apiService.post(`/api/educativa/${slug}/financial/payments/${reviewTarget.id}/${action}`, { reviewNote: note || undefined })
      toast(action === 'approve' ? 'Pago aprobado.' : 'Pago rechazado.')
      setReviewTarget(null)
      setNote('')
      invalidate()
    } catch (err) {
      toast(getApiError(err) || 'Error.', 'error')
    } finally {
      setReviewing(false)
    }
  }

  async function openReceipt(p: EducativaPaymentRow) {
    try {
      const res = await apiService.get<{ receiptUrl: string }>(`/api/educativa/${slug}/financial/payments/${p.id}/receipt`)
      window.open(res.receiptUrl, '_blank')
    } catch {
      toast('No hay recibo disponible.', 'error')
    }
  }

  async function openObligationReceipt(o: EducativaObligationRow) {
    if (!o.paymentId) return
    try {
      const res = await apiService.get<{ receiptUrl: string }>(`/api/educativa/${slug}/financial/payments/${o.paymentId}/receipt`)
      window.open(res.receiptUrl, '_blank')
    } catch {
      toast('No hay recibo disponible.', 'error')
    }
  }

  function applyDateRange(range: { from: string; to: string }) {
    if (tab === 'cuotas') { setDueFrom(range.from); setDueTo(range.to) }
    else { setFromDate(range.from); setToDate(range.to) }
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white sm:p-6">
        <div>
          <h1 className="text-xl font-black sm:text-2xl">Pagos y Cuotas</h1>
          <p className="mt-1 text-sm text-blue-200">Matrículas y cuotas de inscripciones Educativa</p>
        </div>
      </div>

      {s && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard icon={<ReceiptText className="h-4 w-4" />} label="Obligaciones" value={String(s.totalObligations)} color="blue" />
          <KpiCard icon={<Clock className="h-4 w-4" />} label="Pendientes" value={ars(s.pendingAmount)} color="amber" />
          <KpiCard icon={<AlertTriangle className="h-4 w-4" />} label="Vencidas" value={ars(s.overdueAmount)} color="rose" />
          <KpiCard icon={<CircleCheckBig className="h-4 w-4" />} label="Cobrado" value={ars(s.paidAmount)} color="emerald" />
        </div>
      )}

      <SegmentedControl
        value={tab}
        onChange={(v) => { setTab(v as 'cuotas' | 'pagos'); setPage(1) }}
        options={[{ value: 'cuotas', label: 'Cuotas' }, { value: 'pagos', label: 'Pagos' }]}
        className="max-w-sm"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Buscar alumno..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full sm:max-w-[280px] sm:flex-1" />
        <SelectField
          value={period}
          onValueChange={(v) => { setPeriod(v); setPage(1) }}
          placeholder="Todos los períodos"
          className="sm:w-44"
          aria-label="Período"
          options={[
            { value: '', label: 'Todos los períodos' },
            ...(filters?.periods ?? []).map((p) => ({ value: p.value, label: p.label })),
          ]}
        />
        <Button variant="outline" size="sm" className="inline-flex items-center gap-1.5" onClick={() => setFiltersOpen((v) => !v)}>
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </Button>
        <div className="relative">
          <Button variant="outline" size="sm" loading={exporting}
            className="inline-flex items-center gap-1.5" onClick={() => setExportOpen(!exportOpen)}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Exportar
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </Button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <button type="button" onClick={() => handleExport('pdf')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                  <FileText className="h-4 w-4" aria-hidden="true" /> PDF
                </button>
                <button type="button" onClick={() => handleExport('xlsx')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                  <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Excel (XLSX)
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SearchableCombobox
              value={trainingId}
              onValueChange={(v) => { setTrainingId(v); setCommissionId(''); setPage(1) }}
              options={[{ value: '', label: 'Todas las formaciones' }, ...(filters?.formations ?? []).map((f) => ({ value: f.value, label: f.label }))]}
              placeholder="Todas las formaciones"
              searchPlaceholder="Buscar formación..."
            />
            <SearchableCombobox
              value={commissionId}
              onValueChange={(v) => { setCommissionId(v); setPage(1) }}
              options={[{ value: '', label: 'Todas las comisiones' }, ...filteredCommissions.map((c) => ({ value: c.value, label: c.label }))]}
              placeholder="Todas las comisiones"
              searchPlaceholder="Buscar comisión..."
            />
            {tab === 'cuotas' ? (
              <SelectField value={obligationType} onValueChange={(v) => { setObligationType(v); setPage(1) }} placeholder="Todos los tipos"
                options={[{ value: '', label: 'Todos los tipos' }, ...(filters?.obligationTypes ?? []).map((o) => ({ value: o.value, label: o.label }))]}
                aria-label="Tipo de obligación" />
            ) : (
              <SelectField value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); setPage(1) }} placeholder="Todos los métodos"
                options={[{ value: '', label: 'Todos los métodos' }, ...(filters?.paymentMethods ?? []).map((m) => ({ value: m.value, label: m.label }))]}
                aria-label="Método de pago" />
            )}
            <SelectField value={status} onValueChange={(v) => { setStatus(v); setPage(1) }} placeholder="Todos los estados"
              options={[{ value: '', label: 'Todos los estados' }, ...statusOptions.map((o) => ({ value: o.value, label: o.label }))]}
              aria-label="Estado" />
            {tab === 'pagos' && (
              <DateRangePicker
                from={fromDate}
                to={toDate}
                onChange={applyDateRange}
                placeholder="Fecha de pago"
                className="lg:col-span-2"
              />
            )}
          </div>
          <div className="mt-2 flex justify-end">
            {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={resetFilters}>Limpiar filtros</Button>}
          </div>
        </div>
      )}

      {tab === 'cuotas' && (
        <ObligationsTable
          query={obligationsQuery}
          page={page}
          onPageChange={setPage}
          onPay={setPayTarget}
          onReceipt={openObligationReceipt}
          onViewDetail={setSelectedObligation}
        />
      )}

      {tab === 'pagos' && (
        <PaymentsTable
          query={paymentsQuery}
          page={page}
          onPageChange={setPage}
          onReview={setReviewTarget}
          onReceipt={openReceipt}
          onViewDetail={setSelectedPayment}
        />
      )}

      {payTarget && (
        <CollectPaymentModal
          open
          onClose={() => setPayTarget(null)}
          slug={slug}
          enrollmentId={payTarget.commissionEnrollmentId}
          initialObligation={payTarget}
          onDone={invalidate}
        />
      )}
      {reviewTarget && (
        <Modal open onClose={() => setReviewTarget(null)} title={`Revisar pago · ${reviewTarget.studentName ?? ''}`} className="sm:max-w-md">
          <div className="space-y-4 px-5 py-4 sm:px-6">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Concepto</div><div className="mt-0.5 font-medium">{reviewTarget.obligationDescription}</div></div>
              <div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</div><div className="mt-0.5 font-bold">{fmtMoney(reviewTarget.totalAmount, reviewTarget.currency)}</div></div>
            </div>
            {reviewTarget.latestProofUrl && (
              <a href={reviewTarget.latestProofUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">Ver comprobante</a>
            )}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nota</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReviewTarget(null)}>Cancelar</Button>
              <Button variant="danger" loading={reviewing} onClick={() => review('reject')}>Rechazar</Button>
              <Button loading={reviewing} className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => review('approve')}>Aprobar</Button>
            </div>
          </div>
        </Modal>
      )}
      {selectedPayment && <PaymentDetailModal payment={selectedPayment} slug={slug} onClose={() => setSelectedPayment(null)} />}
      {selectedObligation && <ObligationDetailModal obligation={selectedObligation} onClose={() => setSelectedObligation(null)} />}
    </div>
  )
}

/* ── Tabla de obligaciones (Cuotas) ── */
function ObligationsTable({ query, page, onPageChange, onPay, onReceipt, onViewDetail }: {
  query: { data?: EducativaFinancialPage<EducativaObligationRow>; isLoading: boolean }
  page: number
  onPageChange: (page: number) => void
  onPay: (o: EducativaObligationRow) => void
  onReceipt: (o: EducativaObligationRow) => void
  onViewDetail: (o: EducativaObligationRow) => void
}) {
  const rows = query.data?.items ?? []
  const loading = query.isLoading
  const isOverdue = (o: EducativaObligationRow) => o.status === 'Overdue' || (o.status === 'Pending' && isObligationOverdue(o.dueDateUtc))

  return (
    <Card className="p-0">
      {loading && <div className="flex justify-center py-12 text-slate-400"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>}
      {!loading && rows.length === 0 && (
        <div className="py-10 text-center">
          <p className="text-3xl mb-1">💳</p>
          <p className="text-slate-500 font-medium text-sm">No hay cuotas para estos filtros</p>
          <p className="text-xs text-slate-400 mt-0.5">Ajustá los filtros para ver más resultados</p>
        </div>
      )}
      {!loading && rows.length > 0 && (
        <>
          <div className="hidden overflow-x-auto scrollbar-hide md:block">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  <th className="px-4 py-3">Alumno</th>
                  <th className="px-4 py-3">Formación</th>
                  <th className="px-4 py-3">Comisión</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3">Vence</th>
                  <th className="px-4 py-3 text-right">Importe</th>
                  <th className="px-4 py-3 text-right">Mora</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {rows.map((o) => (
                  <tr key={o.id} className={`${isOverdue(o) ? 'bg-red-50/40 dark:bg-red-950/10' : ''} hover:bg-blue-50 dark:hover:bg-slate-800/60 transition-colors`}>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{o.studentName}</td>
                    <td className="px-4 py-2.5 text-slate-500">{o.trainingName}</td>
                    <td className="px-4 py-2.5 text-slate-500">{o.commissionName}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${obligationTypeBadge[obligationTypeOf(o)]}`}>
                        {obligationConceptOf(o)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{o.periodLabel ?? '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{fmtDate(o.dueDateUtc)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{fmtMoney(o.amount, o.currency)}</td>
                    <td className="px-4 py-2.5 text-right text-red-500">{o.moraAmount > 0 ? fmtMoney(o.moraAmount, o.currency) : '—'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900 dark:text-white">{fmtMoney(o.totalToPay, o.currency)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isOverdue(o) ? obligationStatusBadge.Overdue : obligationStatusBadge[o.status]}`}>
                        {isOverdue(o) ? 'Vencida' : obligationStatusLabel[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        {o.status === 'Paid' && o.hasReceipt && o.paymentId && (
                          <Button variant="ghost" size="sm" onClick={() => onReceipt(o)}>Ver recibo</Button>
                        )}
                        {o.status === 'Pending' && (
                          <Button variant="primary" size="sm" onClick={() => onPay(o)}>Cobrar</Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => onViewDetail(o)}>Detalle</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 md:hidden">
            {rows.map((o) => (
              <Card key={o.id} className={`p-3.5 ${isOverdue(o) ? 'ring-1 ring-red-300 dark:ring-red-700' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate text-slate-900 dark:text-white">{o.studentName}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{o.trainingName} · {o.commissionName}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${obligationTypeBadge[obligationTypeOf(o)]}`}>
                        {obligationConceptOf(o)}
                      </span>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${isOverdue(o) ? obligationStatusBadge.Overdue : obligationStatusBadge[o.status]}`}>
                    {isOverdue(o) ? 'Vencida' : obligationStatusLabel[o.status] ?? o.status}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{fmtMoney(o.totalToPay, o.currency)}</div>
                  <div className="text-xs text-slate-400">Período {o.periodLabel ?? '—'} · Vto: {fmtDate(o.dueDateUtc)}</div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {o.status === 'Paid' && o.hasReceipt && o.paymentId && (
                    <Button variant="ghost" size="sm" onClick={() => onReceipt(o)}>Ver recibo</Button>
                  )}
                  {o.status === 'Pending' && <Button variant="primary" size="sm" onClick={() => onPay(o)}>Cobrar</Button>}
                  <Button variant="ghost" size="sm" onClick={() => onViewDetail(o)}>Detalle</Button>
                </div>
              </Card>
            ))}
          </div>
          <div className="p-2"><Pagination page={page} pageSize={20} totalCount={query.data?.total ?? 0} onPageChange={onPageChange} /></div>
        </>
      )}
    </Card>
  )
}

/* ── Tabla de pagos ── */
function PaymentsTable({ query, page, onPageChange, onReview, onReceipt, onViewDetail }: {
  query: { data?: EducativaFinancialPage<EducativaPaymentRow>; isLoading: boolean }
  page: number
  onPageChange: (page: number) => void
  onReview: (p: EducativaPaymentRow) => void
  onReceipt: (p: EducativaPaymentRow) => void
  onViewDetail: (p: EducativaPaymentRow) => void
}) {
  const rows = query.data?.items ?? []
  const loading = query.isLoading

  return (
    <Card className="p-0">
      {loading && <div className="flex justify-center py-12 text-slate-400"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>}
      {!loading && rows.length === 0 && (
        <div className="py-10 text-center">
          <p className="text-3xl mb-1">💳</p>
          <p className="text-slate-500 font-medium text-sm">No hay pagos para estos filtros</p>
          <p className="text-xs text-slate-400 mt-0.5">Ajustá los filtros para ver más resultados</p>
        </div>
      )}
      {!loading && rows.length > 0 && (
        <>
          <div className="hidden overflow-x-auto scrollbar-hide md:block">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  <th className="px-4 py-3">Alumno</th>
                  <th className="px-4 py-3">Formación / Comisión</th>
                  <th className="px-4 py-3">Concepto</th>
                  <th className="px-4 py-3">Método</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Capital</th>
                  <th className="px-4 py-3 text-right">Mora</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-blue-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{p.studentName}</td>
                    <td className="px-4 py-2.5 text-slate-500">{p.trainingName}<span className="block text-xs text-slate-400">{p.commissionName}</span></td>
                    <td className="px-4 py-2.5 text-slate-500">{p.obligationDescription}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{paymentMethodLabel[p.paymentMethod] ?? p.paymentMethod}</td>
                    <td className="px-4 py-2.5 text-slate-500">{fmtDate(p.createdAtUtc)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{fmtMoney(p.capitalAmount, p.currency)}</td>
                    <td className="px-4 py-2.5 text-right text-red-500">{p.moraAmount > 0 ? fmtMoney(p.moraAmount, p.currency) : '—'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900 dark:text-white">{fmtMoney(p.totalAmount, p.currency)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${enrollmentPaymentStatusBadge[p.status]}`}>{enrollmentPaymentStatusLabel[p.status] ?? p.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        {p.status === 'InReview' && <Button variant="outline" size="sm" onClick={() => onReview(p)}>Revisar</Button>}
                        {p.hasReceipt && <Button variant="ghost" size="sm" onClick={() => onReceipt(p)}>Ver recibo</Button>}
                        <Button variant="ghost" size="sm" onClick={() => onViewDetail(p)}>Detalle</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 md:hidden">
            {rows.map((p) => (
              <Card key={p.id} className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate text-slate-900 dark:text-white">{p.studentName}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{p.trainingName} · {p.commissionName}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${enrollmentPaymentStatusBadge[p.status]}`}>{enrollmentPaymentStatusLabel[p.status] ?? p.status}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{fmtMoney(p.totalAmount, p.currency)}</div>
                  <div className="text-xs text-slate-400">{paymentMethodLabel[p.paymentMethod] ?? p.paymentMethod}</div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {p.status === 'InReview' && <Button variant="outline" size="sm" onClick={() => onReview(p)}>Revisar</Button>}
                  {p.hasReceipt && <Button variant="ghost" size="sm" onClick={() => onReceipt(p)}>Ver recibo</Button>}
                  <Button variant="ghost" size="sm" onClick={() => onViewDetail(p)}>Detalle</Button>
                </div>
              </Card>
            ))}
          </div>
          <div className="p-2"><Pagination page={page} pageSize={20} totalCount={query.data?.total ?? 0} onPageChange={onPageChange} /></div>
        </>
      )}
    </Card>
  )
}

/* ── Detalle de pago ── */
function PaymentDetailModal({ payment, slug, onClose }: { payment: EducativaPaymentRow; slug: string; onClose: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [viewingProof, setViewingProof] = useState<EducativaPaymentProofView | null>(null)

  const proofsQuery = useQuery({
    queryKey: ['educativa-payment-proofs', slug, payment.id],
    queryFn: () => apiService.get<EducativaPaymentProof[]>(`/api/educativa/${slug}/financial/payments/${payment.id}/proofs`),
    enabled: !!slug,
    retry: false,
  })
  const proofs = proofsQuery.data ?? []

  async function openProof(proofId: string) {
    try {
      const view = await apiService.get<EducativaPaymentProofView>(`/api/educativa/${slug}/financial/payments/${payment.id}/proof/view?proofId=${proofId}`)
      setViewingProof(view)
    } catch {
      toast('No se pudo cargar el comprobante.', 'error')
    }
  }

  async function review(action: 'approve' | 'reject') {
    setReviewing(true)
    try {
      await apiService.post(`/api/educativa/${slug}/financial/payments/${payment.id}/${action}`, { reviewNote: note || undefined })
      toast(action === 'approve' ? 'Pago aprobado.' : 'Pago rechazado.')
      qc.invalidateQueries({ queryKey: ['educativa-financial-summary', slug] })
      qc.invalidateQueries({ queryKey: ['educativa-obligations', slug] })
      qc.invalidateQueries({ queryKey: ['educativa-payments', slug] })
      onClose()
    } catch (err) {
      toast(getApiError(err) || 'Error.', 'error')
    } finally {
      setReviewing(false)
    }
  }

  if (viewingProof) {
    return (
      <Modal open onClose={() => setViewingProof(null)} title={viewingProof.fileName} className="sm:max-w-2xl">
        <div className="p-4">
          {viewingProof.isImage ? (
            <img src={viewingProof.url} alt={viewingProof.fileName} className="w-full rounded-xl" />
          ) : viewingProof.isPdf ? (
            <iframe src={viewingProof.url} className="h-[70vh] w-full rounded-xl" title="PDF" />
          ) : (
            <a href={viewingProof.url} download={viewingProof.fileName}
              className="flex items-center justify-center rounded-xl bg-slate-100 p-8 text-center font-bold text-blue-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-blue-400">
              Descargar {viewingProof.fileName}
            </a>
          )}
        </div>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} title="Detalle del pago" className="sm:max-w-2xl">
      <div className="space-y-4 px-5 py-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <LabelValue label="Alumno" value={payment.studentName} />
            <LabelValue label="Formación" value={payment.trainingName} />
            <LabelValue label="Comisión" value={payment.commissionName} />
            <LabelValue label="Concepto" value={payment.obligationDescription} />
            <LabelValue label="Método" value={paymentMethodLabel[payment.paymentMethod] ?? payment.paymentMethod} />
            <LabelValue label="Fecha" value={fmtDate(payment.createdAtUtc)} />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</div>
              <span className={`inline-block mt-0.5 rounded-full px-3 py-1 text-xs font-bold ${enrollmentPaymentStatusBadge[payment.status]}`}>
                {enrollmentPaymentStatusLabel[payment.status] ?? payment.status}
              </span>
            </div>
            {payment.approvedAtUtc && <LabelValue label="Aprobado" value={fmtDate(payment.approvedAtUtc)} />}
            {payment.reviewNote && <LabelValue label="Nota de revisión" value={payment.reviewNote} />}
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Desglose</div>
              <div className="space-y-1 text-sm rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <div className="flex justify-between"><span>Capital</span><span>{fmtMoney(payment.capitalAmount, payment.currency)}</span></div>
                {payment.moraAmount > 0 && <div className="flex justify-between text-red-500"><span>Mora</span><span>{fmtMoney(payment.moraAmount, payment.currency)}</span></div>}
                <div className="flex justify-between font-bold border-t border-slate-200 pt-1 mt-1 dark:border-slate-600">
                  <span>Total</span><span>{fmtMoney(payment.totalAmount, payment.currency)}</span>
                </div>
              </div>
            </div>
            {payment.hasReceipt && (
              <Button variant="outline" size="sm" onClick={async () => {
                try {
                  const res = await apiService.get<{ receiptUrl: string }>(`/api/educativa/${slug}/financial/payments/${payment.id}/receipt`)
                  window.open(res.receiptUrl, '_blank')
                } catch {
                  toast('No hay recibo disponible.', 'error')
                }
              }}>Ver recibo</Button>
            )}
          </div>
        </div>

        {(payment.status === 'InReview' || payment.status === 'Pending') && (
          <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
            <h3 className="font-bold text-sm">Revisión de pago</h3>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Nota de revisión (opcional)..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              rows={2} />
            <div className="flex gap-2">
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => review('approve')} loading={reviewing}>Aprobar pago</Button>
              <Button variant="danger" onClick={() => review('reject')} loading={reviewing}>Rechazar</Button>
            </div>
          </div>
        )}

        {proofs.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-bold mb-2">Comprobantes ({proofs.length})</h3>
            <div className="space-y-2">
              {proofs.map((proof) => (
                <div key={proof.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate font-medium">{proof.fileName}</span>
                    <span className="shrink-0 text-xs text-slate-400">{fmtDate(proof.uploadedAtUtc)}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openProof(proof.id)}>Ver</Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ── Detalle de obligación ── */
function ObligationDetailModal({ obligation, onClose }: { obligation: EducativaObligationRow; onClose: () => void }) {
  const isOverdue = obligation.status === 'Overdue' || (obligation.status === 'Pending' && isObligationOverdue(obligation.dueDateUtc))
  const statusLabel = isOverdue ? 'Vencida' : obligationStatusLabel[obligation.status] ?? obligation.status
  const statusBadge = isOverdue ? obligationStatusBadge.Overdue : obligationStatusBadge[obligation.status]

  return (
    <Modal open onClose={onClose} title="Detalle de cuota" className="sm:max-w-lg">
      <div className="space-y-4 px-5 py-4 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          <div className="mb-3">
            <div className="font-bold text-slate-900 dark:text-white">{obligation.studentName}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{obligation.trainingName} · {obligation.commissionName}</div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Concepto</span><span className="font-medium">{obligation.description}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Tipo</span><span className="font-medium">{obligationConceptOf(obligation)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Vencimiento</span><span className="font-medium">{fmtDate(obligation.dueDateUtc)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Importe</span><span className="font-medium">{fmtMoney(obligation.amount, obligation.currency)}</span></div>
            {obligation.moraAmount > 0 && <div className="flex justify-between text-red-500"><span>Mora</span><span>{fmtMoney(obligation.moraAmount, obligation.currency)}</span></div>}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold dark:border-slate-600">
              <span>Total</span><span>{fmtMoney(obligation.totalToPay, obligation.currency)}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</div>
            <span className={`inline-block mt-0.5 rounded-full px-3 py-1 text-xs font-bold ${statusBadge}`}>{statusLabel}</span>
          </div>
          {obligation.paidAtUtc && <LabelValue label="Pagado" value={fmtDate(obligation.paidAtUtc)} />}
        </div>
      </div>
    </Modal>
  )
}

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  )
}

export default function PagosPage() {
  return (
    <ToastProvider>
      <PagosInner />
    </ToastProvider>
  )
}