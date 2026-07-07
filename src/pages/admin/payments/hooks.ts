import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { useCallback, useMemo, useState } from 'react'
import type { Charge, Payment, PaymentMethod, CourseOption, ProofSubmission, ProofView } from '@/types/payments'

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export function money(value: number) { return ARS.format(value) }

function unwrapList<T>(result: T[] | { items?: T[]; data?: T[] }): T[] {
  if (Array.isArray(result)) return result
  if (Array.isArray((result as { items?: T[] })?.items)) return (result as { items: T[] }).items
  if (Array.isArray((result as { data?: T[] })?.data)) return (result as { data: T[] }).data
  return []
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

export function useCourseOptions() {
  return useQuery({
    queryKey: ['courses-options', slug()],
    queryFn: () => apiService.get<CourseOption[] | { items?: CourseOption[]; data?: CourseOption[] }>(`/api/admin/${slug()}/dashboard/courses/options`).then(unwrapList),
    enabled: !!slug(),
  })
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods', slug()],
    queryFn: () => apiService.get<PaymentMethod[] | { items?: PaymentMethod[]; data?: PaymentMethod[] }>(`/api/admin/${slug()}/payment-methods`).then(unwrapList),
    enabled: !!slug(),
  })
}

/* ── Charges ── */
export function useCharges(year: number, month: number, status: string, search: string, page: number, chargeTypeId?: string) {
  const params = new URLSearchParams()
  if (year) params.set('year', String(year))
  if (month) params.set('month', String(month))
  if (status) params.set('status', status)
  if (search) params.set('search', search)
  if (chargeTypeId) params.set('chargeTypeId', chargeTypeId)
  params.set('page', String(page))
  params.set('pageSize', '25')

  return useQuery({
    queryKey: ['charges', slug(), year, month, status, search, page, chargeTypeId],
    queryFn: async () => {
      const raw = await apiService.get<unknown>(`/api/admin/${slug()}/monthly-charges?${params}`)
      const data = raw as Record<string, unknown>
      if (Array.isArray(raw)) {
        return { items: raw as Charge[], totalCount: raw.length, totalPages: 1, page: 1 }
      }
      if (Array.isArray(data?.items)) {
        return { items: data.items as Charge[], totalCount: (data.totalCount as number) ?? data.items.length, totalPages: (data.totalPages as number) ?? 1, page: (data.page as number) ?? 1 }
      }
      if (Array.isArray(data?.data)) {
        return { items: data.data as Charge[], totalCount: (data.totalCount as number) ?? data.data.length, totalPages: (data.totalPages as number) ?? 1, page: (data.page as number) ?? 1 }
      }
      return { items: [], totalCount: 0, totalPages: 1, page: 1 }
    },
    enabled: !!slug(),
  })
}

/* ── Payments ── */
export function usePayments(filters: { search: string; courseId: string; period: string; method: string; status: string; chargeType: string; page: number }) {
  return useQuery({
    queryKey: ['payments', slug(), filters],
    queryFn: async () => {
      const data = await apiService.get<Payment[] | { items?: Payment[]; data?: Payment[] }>(`/api/admin/${slug()}/payments`)
      return unwrapList(data)
    },
    enabled: !!slug(),
    select: useCallback((data: Payment[]) => {
      return data.filter((p) => {
        if (filters.search) {
          const s = filters.search.toLowerCase()
          if (!p.studentFullName.toLowerCase().includes(s) && !p.studentDni.includes(s)) return false
        }
        if (filters.courseId && p.courseId !== filters.courseId) return false
        if (filters.period) {
          const [m, y] = filters.period.split('/')
          if (m && p.month !== parseInt(m)) return false
          if (y && p.year !== parseInt(y)) return false
        }
        if (filters.status) {
          const statusMap: Record<string, string> = { '2': 'inreview', '3': 'approved', '4': 'rejected' }
          const expected = statusMap[filters.status] ?? filters.status
          if (normalizeStatus(p.paymentStatus) !== expected) return false
        }
        if (filters.chargeType === 'scholarship' && !p.hasScholarship) return false
        if (filters.chargeType === 'promotion' && !p.hasPromotion) return false
        return true
      })
    }, [filters]),
  })
}

/* ── Mutations ── */
export function useApprovePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, reviewNote }: { paymentId: string; reviewNote: string }) =>
      apiService.post(`/api/admin/${slug()}/payments/${paymentId}/approve`, { reviewNote }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); qc.invalidateQueries({ queryKey: ['charges'] }) },
  })
}

export function useRejectSubmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ submissionId, reviewNote }: { submissionId: string; reviewNote: string }) =>
      apiService.post(`/api/admin/${slug()}/payments/proof-submissions/${submissionId}/reject`, { reviewNote }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  })
}

export function useProofSubmissions(paymentId: string | null) {
  return useQuery({
    queryKey: ['proof-submissions', slug(), paymentId],
    queryFn: () => apiService.get<ProofSubmission[] | { items?: ProofSubmission[]; data?: ProofSubmission[] }>(`/api/admin/${slug()}/payments/${paymentId}/proof-submissions`).then(unwrapList),
    enabled: !!paymentId && !!slug(),
  })
}

export function useProofViewUrl(chargeId: string | null) {
  return useQuery({
    queryKey: ['charge-proof-view', slug(), chargeId],
    queryFn: async () => {
      try {
        return await apiService.get<ProofView>(`/api/admin/${slug()}/monthly-charges/${chargeId}/proof/view`)
      } catch {
        return null
      }
    },
    enabled: !!chargeId && !!slug(),
    retry: false,
  })
}

export function useProofSubmissionView(submissionId: string | null) {
  return useQuery({
    queryKey: ['proof-submission-view', slug(), submissionId],
    queryFn: () => apiService.get<ProofView>(`/api/admin/${slug()}/payments/proof-submissions/${submissionId}/view`),
    enabled: !!submissionId && !!slug(),
  })
}

export function useBulkGenerateCharges() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { year: number; month: number; chargeTypeId?: string; courseId?: string; courseIds?: string[]; studentIds?: string[]; skipExisting: boolean }) =>
      apiService.post(`/api/admin/${slug()}/payments/monthly-charges/manual/bulk`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['charges'] }),
  })
}

export function useUpdateCharge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ chargeId, ...body }: { chargeId: string; basePrice?: number; dueDateUtc?: string; lateChargeAmount?: number; siblingDiscountAmount?: number; notes?: string }) =>
      apiService.put(`/api/admin/${slug()}/payments/monthly-charges/${chargeId}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['charges'] }),
  })
}

export function useManualPay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ chargeId, ...body }: { chargeId: string; paymentMethod: string | number; paymentReference?: string; notes?: string }) =>
      apiService.post(`/api/admin/${slug()}/monthly-charges/${chargeId}/pay-manual`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['charges'] }); qc.invalidateQueries({ queryKey: ['payments'] }) },
  })
}

export function useDeleteCharge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (chargeId: string) => apiService.del(`/api/admin/${slug()}/monthly-charges/${chargeId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['charges'] }),
  })
}

/* ── Labels & Badges ── */
export function getChargePaymentMethodText(method: string | number | undefined): string {
  const map: Record<string, string> = {
    '1': 'Transferencia', '2': 'Tarjeta de débito', '3': 'Tarjeta de crédito',
    '4': 'Mercado Pago', '5': 'Efectivo',
    'transfer': 'Transferencia', 'transferencia': 'Transferencia',
    'debitcard': 'Tarjeta de débito', 'tarjeta de débito': 'Tarjeta de débito', 'tarjetadebito': 'Tarjeta de débito', 'debito': 'Tarjeta de débito',
    'creditcard': 'Tarjeta de crédito', 'tarjeta de crédito': 'Tarjeta de crédito', 'tarjetacredito': 'Tarjeta de crédito', 'credito': 'Tarjeta de crédito',
    'mercadopago': 'Mercado Pago',
    'cash': 'Efectivo', 'efectivo': 'Efectivo',
  }
  return map[String(method).toLowerCase()] ?? String(method)
}

export function paymentStatusBadge(status: string | number) {
  const key = normalizeStatus(status)
  const map: Record<string, { label: string; classes: string }> = {
    pending: { label: 'Pendiente', classes: 'bg-slate-50 text-slate-600 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600' },
    inreview: { label: 'En revisión', classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-700' },
    approved: { label: 'Aprobado', classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-700' },
    rejected: { label: 'Rechazado', classes: 'bg-red-50 text-red-700 ring-1 ring-red-300 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700' },
  }
  return map[key] ?? { label: String(status), classes: 'bg-slate-50 text-slate-600 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600' }
}

const statusAlias: Record<string, string> = {
  pagada: 'paid', pendiente: 'pending', vencida: 'overdue',
  'en revisión': 'inreview', enrevision: 'inreview', en_revision: 'inreview',
  aprobado: 'approved', aprobada: 'approved', rechazado: 'rejected', rechazada: 'rejected',
  '0': 'pending', '1': 'paid', '2': 'inreview', '3': 'approved', '4': 'rejected',
}

const chargeStatusAlias: Record<string, string> = {
  pagada: 'paid', pendiente: 'pending', vencida: 'overdue',
  '0': 'pending',
  '1': 'paid',
  '2': 'inreview',
  '3': 'overdue',
  '4': 'cancelled',
  '5': 'refundpending',
}

export function normalizeStatus(status: string | number): string {
  const lower = String(status).toLowerCase().trim()
  return statusAlias[lower] ?? lower
}

function normalizeChargeStatus(status: string | number): string {
  const lower = String(status).toLowerCase().trim()
  return chargeStatusAlias[lower] ?? lower
}

export function chargeStatusBadge(status: string | number) {
  const key = normalizeChargeStatus(status)
  const map: Record<string, { label: string; classes: string }> = {
    pending: { label: 'Pendiente', classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-700' },
    paid: { label: 'Pagada', classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-700' },
    overdue: { label: 'Vencida', classes: 'bg-red-50 text-red-700 ring-1 ring-red-300 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700' },
    inreview: { label: 'En revisión', classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-700' },
    cancelled: { label: 'Cancelada', classes: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400' },
    refundpending: { label: 'Pend. aprobación', classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-700' },
  }
  return map[key] ?? { label: String(status), classes: 'bg-slate-50 text-slate-600 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600' }
}

export function isChargePaid(status: string | number): boolean {
  return normalizeChargeStatus(status) === 'paid'
}

export function isChargeOverdue(status: string | number): boolean {
  return normalizeChargeStatus(status) === 'overdue'
}

export function isChargeCancelled(status: string | number): boolean {
  return normalizeChargeStatus(status) === 'cancelled'
}

/* ── Main page state ── */
export function usePaymentsPage() {
  const activeSlug = useAuth((s) => s.activeCompanySlug)
  const [tab, setTab] = useState<'charges' | 'payments' | 'financing'>('charges')

  const now = new Date()
  const [chargeYear, setChargeYear] = useState(now.getFullYear())
  const [chargeMonth, setChargeMonth] = useState(now.getMonth() + 1)
  const [chargeStatus, setChargeStatus] = useState('')
  const [chargeSearch, setChargeSearch] = useState('')
  const [chargeTypeId, setChargeTypeId] = useState('')
  const [chargePage, setChargePage] = useState(1)

  const [paySearch, setPaySearch] = useState('')
  const [payCourseId, setPayCourseId] = useState('')
  const [payPeriod, setPayPeriod] = useState('')
  const [payMethod, setPayMethod] = useState('')
  const [payStatus, setPayStatus] = useState('')
  const [payChargeType, setPayChargeType] = useState('')
  const [payPage, setPayPage] = useState(1)

  const { data: courses } = useCourseOptions()
  const { data: paymentMethods } = usePaymentMethods()
  const { data: paymentsData, isLoading: loadingPayments } = usePayments({
    search: paySearch, courseId: payCourseId, period: payPeriod,
    method: payMethod, status: payStatus, chargeType: payChargeType, page: payPage,
  })
  const { data: chargesData, isLoading: loadingCharges } = useCharges(chargeYear, chargeMonth, chargeStatus, chargeSearch, chargePage, chargeTypeId)

  const chargeItems = chargesData?.items
  const charges = useMemo(() => chargeItems ?? [], [chargeItems])
  const chargeTotalCount = chargesData?.totalCount ?? 0
  const chargeTotalPages = chargesData?.totalPages ?? 1

  const payments = useMemo(() => paymentsData ?? [], [paymentsData])
  const payMethods = paymentMethods ?? []

  const chargeSummary = useMemo(() => {
    if (!charges.length) return { total: 0, paid: 0, pending: 0, overdue: 0 }
    return charges.reduce(
      (acc, c) => {
        acc.total += c.finalAmount
        const s = normalizeStatus(c.status)
        if (s === 'paid') acc.paid += c.finalAmountPaid
        if (s === 'pending') acc.pending += c.finalAmount
        if (s === 'overdue') acc.overdue += c.finalAmount
        return acc
      },
      { total: 0, paid: 0, pending: 0, overdue: 0 }
    )
  }, [charges])

  const paySummary = useMemo(() => {
    if (!payments.length) return { total: 0, inreview: 0, approved: 0, rejected: 0 }
    return payments.reduce(
      (acc, p) => {
        acc.total += p.finalAmount
        const s = normalizeStatus(p.paymentStatus)
        if (s === 'inreview') acc.inreview++
        if (s === 'approved') acc.approved++
        if (s === 'rejected') acc.rejected++
        return acc
      },
      { total: 0, inreview: 0, approved: 0, rejected: 0 }
    )
  }, [payments])

  const resetChargesFilters = () => { setChargeStatus(''); setChargeSearch(''); setChargeTypeId(''); setChargePage(1) }
  const resetPaymentsFilters = () => {
    setPaySearch(''); setPayCourseId(''); setPayPeriod(''); setPayMethod(''); setPayStatus(''); setPayChargeType('')
  }

  return {
    activeSlug, tab, setTab,
    chargeYear, setChargeYear, chargeMonth, setChargeMonth,
    chargeStatus, setChargeStatus, chargeSearch, setChargeSearch,
    chargeTypeId, setChargeTypeId,
    chargePage, setChargePage, charges, loadingCharges,
    chargeTotalCount, chargeTotalPages, chargeSummary,
    resetChargesFilters,
    paySearch, setPaySearch, payCourseId, setPayCourseId,
    payPeriod, setPayPeriod, payMethod, setPayMethod,
    payStatus, setPayStatus, payChargeType, setPayChargeType,
    payPage, setPayPage, payments, loadingPayments, paySummary,
    resetPaymentsFilters,
    courses, paymentMethods: payMethods,
  }
}
