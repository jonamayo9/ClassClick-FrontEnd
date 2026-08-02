import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { apiService, getApiError } from '@/lib/api'
import { InvoiceStatus, statusLabel, paymentMethodLabel, type SuperAdminBillingInvoice } from './billing.types'
import { BillingProofPreviewModal, type BillingProofViewPayload } from '@/components/billing/billing-proof-preview-modal'
import { BillingPeriodDetail } from '@/components/billing/billing-period-detail'

interface Company { id: string; name: string; isActive: boolean }

interface Summary {
  pendingProofs: number
  overdueInvoices: number
  paidThisMonth: number
  totalIssuedThisMonth: number
}

interface AttentionItem {
  invoiceId: string
  proofId: string | null
  companyName: string
  period: string
  totalOriginal: number
  totalExpected: number
  submittedAtUtc: string | null
  dueDateUtc: string
  daysOverdue: number
}

interface Attention {
  pendingProofs: AttentionItem[]
  overdueInvoices: AttentionItem[]
}

const STATUS_VARIANT: Record<number, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'violet'> = {
  [InvoiceStatus.Draft]: 'default',
  [InvoiceStatus.Issued]: 'info',
  [InvoiceStatus.Pending]: 'warning',
  [InvoiceStatus.UnderReview]: 'violet',
  [InvoiceStatus.Paid]: 'success',
  [InvoiceStatus.Overdue]: 'danger',
  [InvoiceStatus.Cancelled]: 'default',
}

const FMT = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

function fmtDate(value: string | null | undefined) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('es-AR')
}

function timeAgo(iso: string | null) {
  if (!iso) return ''
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `hace ${Math.max(1, mins)} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  return `hace ${Math.floor(hours / 24)} d`
}

function proofStatusLabel(status: string | null | undefined) {
  if (!status) return '-'
  return status === 'Pending' ? 'Pendiente' : status === 'Approved' ? 'Aprobado' : status === 'Rejected' ? 'Rechazado' : status
}

function BillingInvoicesInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const proofIdParam = searchParams.get('reviewProofId')
  const proofHandled = useRef(false)

  const { data: companies = [] } = useQuery({
    queryKey: ['superadmin-companies'],
    queryFn: () => apiService.get<Company[]>('/api/superadmin/companies'),
  })

  // Filtros: visibles + avanzados.
  const [companyId, setCompanyId] = useState('')
  const [status, setStatus] = useState('')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [search, setSearch] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [page, setPage] = useState(1)

  const params = new URLSearchParams()
  if (companyId) params.set('companyId', companyId)
  if (year) params.set('year', year)
  if (month) params.set('month', month)
  if (status) params.set('status', status)
  if (search.trim()) params.set('search', search.trim())
  params.set('page', String(page))
  params.set('pageSize', '15')

  const { data: list, isLoading } = useQuery({
    queryKey: ['billing-invoices', companyId, year, month, status, search.trim(), page],
    queryFn: () => apiService.get<{ items: SuperAdminBillingInvoice[]; total: number }>(`/api/superadmin/billing/invoices?${params.toString()}`),
  })

  const { data: summary } = useQuery({
    queryKey: ['billing-invoices-summary'],
    queryFn: () => apiService.get<Summary>('/api/superadmin/billing/invoices/summary'),
    refetchInterval: 60_000,
  })

  const { data: attention } = useQuery({
    queryKey: ['billing-invoices-attention'],
    queryFn: () => apiService.get<Attention>('/api/superadmin/billing/invoices/attention'),
    refetchInterval: 60_000,
  })

  const [detailTarget, setDetailTarget] = useState<SuperAdminBillingInvoice | null>(null)
  const [reviewTarget, setReviewTarget] = useState<{ invoiceId: string } | null>(null)
  const [proofPreview, setProofPreview] = useState<{ invoiceId: string; period: string } | null>(null)
  const [reviewMode, setReviewMode] = useState<'approve' | 'reject' | null>(null)
  const [reviewForm, setReviewForm] = useState({ reference: '', notes: '', reason: '' })

  const { data: reviewDetail } = useQuery({
    queryKey: ['billing-invoice', reviewTarget?.invoiceId],
    queryFn: () => apiService.get<SuperAdminBillingInvoice>(`/api/superadmin/billing/invoices/${reviewTarget!.invoiceId}`),
    enabled: !!reviewTarget,
  })

  // Apertura directa por proofId (desde notificación). Limpia el parámetro tras cargar.
  useEffect(() => {
    if (!proofIdParam || proofHandled.current) return
    proofHandled.current = true
    apiService
      .get<SuperAdminBillingInvoice>(`/api/superadmin/billing/invoices/by-proof/${proofIdParam}`)
      .then((inv) => {
        setReviewTarget({ invoiceId: inv.id })
        setSearchParams({}, { replace: true })
      })
      .catch(() => {
        setSearchParams({}, { replace: true })
      })
  }, [proofIdParam, setSearchParams])

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ['billing-invoices-summary'] })
    qc.invalidateQueries({ queryKey: ['billing-invoices-attention'] })
    qc.invalidateQueries({ queryKey: ['billing-invoices'] })
    qc.invalidateQueries({ queryKey: ['billing-invoice'] })
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  const approveMutation = useMutation({
    mutationFn: () =>
      apiService.post(`/api/superadmin/billing/invoices/${reviewTarget!.invoiceId}/proof/approve`, {
        paymentReference: reviewForm.reference || null,
        notes: reviewForm.notes || null,
      }),
    onSuccess: () => {
      toast('Comprobante aprobado. Cargo marcado como pagado.')
      setReviewTarget(null)
      setReviewMode(null)
      setReviewForm({ reference: '', notes: '', reason: '' })
      invalidateAll()
    },
    onError: (err) => toast(getApiError(err), 'error'),
  })

  const rejectMutation = useMutation({
    mutationFn: () =>
      apiService.post(`/api/superadmin/billing/invoices/${reviewTarget!.invoiceId}/proof/reject`, { reason: reviewForm.reason }),
    onSuccess: () => {
      toast('Comprobante rechazado.')
      setReviewTarget(null)
      setReviewMode(null)
      setReviewForm({ reference: '', notes: '', reason: '' })
      invalidateAll()
    },
    onError: (err) => toast(getApiError(err), 'error'),
  })

  function resetFilters() {
    setCompanyId('')
    setStatus('')
    setYear('')
    setMonth('')
    setSearch('')
    setPage(1)
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 2023 }, (_, i) => currentYear - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const reviewTransferSurcharge =
    reviewDetail && reviewDetail.paymentProofTotalExpected != null && reviewDetail.paymentProofTotalExpected > reviewDetail.amountWithLateFee
      ? reviewDetail.paymentProofTotalExpected - reviewDetail.amountWithLateFee
      : 0

  const reviewResolved = !!reviewDetail && (
    Number(reviewDetail.status) === InvoiceStatus.Paid ||
    Number(reviewDetail.status) === InvoiceStatus.Cancelled ||
    reviewDetail.paymentProofStatus === 'Approved' ||
    reviewDetail.paymentProofStatus === 'Rejected'
  )

  return (
    <div className="space-y-5 pb-8">
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Cobros de empresas</h1>
        <p className="mt-1 text-sm text-slate-400">Seguimiento de cargos, comprobantes y pagos de las empresas.</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Comprobantes por revisar" value={String(summary?.pendingProofs ?? 0)} accent="violet" />
        <SummaryCard label="Cargos vencidos" value={String(summary?.overdueInvoices ?? 0)} accent="red" />
        <SummaryCard label="Pagados este mes" value={String(summary?.paidThisMonth ?? 0)} accent="emerald" />
        <SummaryCard label="Total facturado" value={FMT.format(summary?.totalIssuedThisMonth ?? 0)} accent="default" />
      </div>

      {/* Requieren mi atención */}
      {(attention?.pendingProofs.length || attention?.overdueInvoices.length) ? (
        <div className="space-y-3">
          <h2 className="text-sm font-bold">Requieren mi atención</h2>

          {attention!.pendingProofs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">Comprobantes recibidos</p>
              {attention!.pendingProofs.map((item) => (
                <Card key={item.invoiceId} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{item.companyName}</p>
                    <p className="text-xs text-slate-400">Período {item.period} · {FMT.format(item.totalExpected)}</p>
                    <p className="text-xs text-slate-400">Comprobante recibido {timeAgo(item.submittedAtUtc)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="violet">Comprobante recibido</Badge>
                    <Button size="sm" onClick={() => { setReviewTarget({ invoiceId: item.invoiceId }); setReviewMode(null); setReviewForm({ reference: '', notes: '', reason: '' }) }} className="bg-slate-800 text-white hover:bg-slate-700">
                      Revisar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {attention!.overdueInvoices.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">Cargos vencidos</p>
              {attention!.overdueInvoices.map((item) => (
                <Card key={item.invoiceId} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{item.companyName}</p>
                    <p className="text-xs text-slate-400">Período {item.period} · {FMT.format(item.totalExpected)}</p>
                    <p className="text-xs text-slate-400">Vence {fmtDate(item.dueDateUtc)} · {item.daysOverdue} día{item.daysOverdue === 1 ? '' : 's'} vencida</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="danger">Vencida</Badge>
                    <Button variant="outline" size="sm" onClick={() => {
                      const inv = list?.items.find((x) => x.id === item.invoiceId)
                      if (inv) setDetailTarget(inv)
                    }}>Ver</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Filtros */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px]">
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Buscar empresa</label>
            <Select value={companyId} onChange={(e) => { setCompanyId(e.target.value); setPage(1) }}>
              <option value="">Todas</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="min-w-[160px]">
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Estado</label>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
              <option value="">Todos</option>
              {Object.values(InvoiceStatus).map((v) => <option key={v} value={String(v)}>{statusLabel(v)}</option>)}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? 'Menos filtros' : 'Más filtros'}
            </Button>
            <Button variant="outline" size="sm" onClick={resetFilters}>Limpiar</Button>
          </div>
        </div>

        {showAdvanced && (
          <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="min-w-[110px]">
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Año</label>
              <Select value={year} onChange={(e) => { setYear(e.target.value); setPage(1) }}>
                <option value="">Todos</option>
                {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
              </Select>
            </div>
            <div className="min-w-[110px]">
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Mes</label>
              <Select value={month} onChange={(e) => { setMonth(e.target.value); setPage(1) }}>
                <option value="">Todos</option>
                {months.map((m) => <option key={m} value={String(m)}>{String(m).padStart(2, '0')}</option>)}
              </Select>
            </div>
            <div className="min-w-[180px]">
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Número interno</label>
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar por número..." />
            </div>
          </div>
        )}
      </Card>

      {/* Historial */}
      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-bold">Historial de cobros</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-14"><Spinner className="h-8 w-8 text-slate-600" /></div>
        ) : !list || list.items.length === 0 ? (
          <EmptyState title="Sin cargos" description="Los cargos se generan automáticamente a partir del consumo registrado." />
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="space-y-2 md:hidden">
              {list.items.map((inv) => (
                <div key={inv.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold truncate">{inv.companyName ?? '-'}</span>
                    <Badge variant={STATUS_VARIANT[Number(inv.status)] ?? 'default'}>{statusLabel(inv.status)}</Badge>
                  </div>
                  <p className="text-xs text-slate-400">{inv.period}</p>
                  <p className="mt-1 text-sm font-black">{FMT.format(inv.amountWithLateFee || inv.totalAmount)}</p>
                  <p className="text-xs text-slate-400">Vence {fmtDate(inv.dueDateUtc)} · {paymentMethodLabel(inv.paymentMethod) ?? '—'}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Number(inv.status) === InvoiceStatus.UnderReview ? (
                      <Button size="sm" onClick={() => { setReviewTarget({ invoiceId: inv.id }); setReviewMode(null); setReviewForm({ reference: '', notes: '', reason: '' }) }} className="bg-slate-800 text-white hover:bg-slate-700">Revisar</Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setDetailTarget(inv)}>Ver</Button>
                    )}
                    {inv.hasPaymentProof && (
                      <Button variant="outline" size="sm" onClick={() => setProofPreview({ invoiceId: inv.id, period: inv.period })}>Ver comprobante</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: tabla */}
            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <th className="px-3 py-2">Empresa</th>
                    <th className="px-3 py-2">Período</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Vencimiento</th>
                    <th className="px-3 py-2">Medio</th>
                    <th className="px-3 py-2">Fecha de pago</th>
                    <th className="px-3 py-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((inv) => (
                    <tr key={inv.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2">{inv.companyName ?? '-'}</td>
                      <td className="px-3 py-2">{inv.period}</td>
                      <td className="px-3 py-2 font-medium">{FMT.format(inv.amountWithLateFee || inv.totalAmount)}</td>
                      <td className="px-3 py-2"><Badge variant={STATUS_VARIANT[Number(inv.status)] ?? 'default'}>{statusLabel(inv.status)}</Badge></td>
                      <td className="px-3 py-2">{fmtDate(inv.dueDateUtc)}</td>
                      <td className="px-3 py-2">{paymentMethodLabel(inv.paymentMethod) ?? '—'}</td>
                      <td className="px-3 py-2">{inv.paidAtUtc ? fmtDate(inv.paidAtUtc) : '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {Number(inv.status) === InvoiceStatus.UnderReview ? (
                            <Button size="sm" onClick={() => { setReviewTarget({ invoiceId: inv.id }); setReviewMode(null); setReviewForm({ reference: '', notes: '', reason: '' }) }} className="bg-slate-800 text-white hover:bg-slate-700">Revisar</Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => setDetailTarget(inv)}>Ver</Button>
                          )}
                          {inv.hasPaymentProof && (
                            <Button variant="outline" size="sm" onClick={() => setProofPreview({ invoiceId: inv.id, period: inv.period })}>Ver comprobante</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination page={page} pageSize={15} totalCount={list.total} onPageChange={setPage} />
          </>
        )}
      </Card>

      {/* Modal Revisar comprobante */}
      {reviewTarget && reviewDetail && (
        <Modal open onClose={() => setReviewTarget(null)} title={`Revisar comprobante — ${reviewDetail.companyName ?? ''}`} className="sm:max-w-lg">
          <div className="px-5 py-4 sm:px-6 space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              <DetailRow label="Empresa" value={reviewDetail.companyName} />
              <DetailRow label="Período" value={reviewDetail.period} />
              <DetailRow label="Número interno" value={reviewDetail.invoiceNumber} />
              <DetailRow label="Importe original" value={FMT.format(reviewDetail.totalAmount)} />
              {reviewDetail.lateFeeAmount > 0 && (
                <DetailRow label={`Mora (${reviewDetail.lateFeePercentage}%)`} value={FMT.format(reviewDetail.lateFeeAmount)} />
              )}
              {reviewTransferSurcharge > 0 && <DetailRow label="Recargo por transferencia" value={FMT.format(reviewTransferSurcharge)} />}
              <DetailRow label="Total esperado" value={reviewDetail.paymentProofTotalExpected != null ? FMT.format(reviewDetail.paymentProofTotalExpected) : FMT.format(reviewDetail.amountWithLateFee)} />
              <DetailRow label="Fecha de envío" value={fmtDate(reviewDetail.paymentProofSubmittedAtUtc)} />
              <DetailRow label="Referencia sugerida" value={`Cargo ClassClick ${reviewDetail.period} - ${reviewDetail.invoiceNumber}`} />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setProofPreview({ invoiceId: reviewTarget.invoiceId, period: reviewDetail.period })}>Ver comprobante</Button>
            </div>

            {!reviewMode && reviewResolved && (
              <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <h3 className="text-sm font-bold">Estado de la revisión</h3>
                <DetailRow label="Comprobante" value={proofStatusLabel(reviewDetail?.paymentProofStatus)} />
                {reviewDetail?.paymentProofReviewedAtUtc && (
                  <DetailRow label="Fecha de revisión" value={fmtDate(reviewDetail.paymentProofReviewedAtUtc)} />
                )}
                {reviewDetail?.paymentProofStatus === 'Approved' && (
                  <DetailRow label="Referencia" value={reviewDetail.paymentReference} />
                )}
                {reviewDetail?.paymentProofStatus === 'Rejected' && reviewDetail?.paymentProofReviewNote && (
                  <DetailRow label="Motivo de rechazo" value={reviewDetail.paymentProofReviewNote} />
                )}
                {Number(reviewDetail?.status) === InvoiceStatus.Paid && (
                  <DetailRow label="Cargo" value="Pagado" />
                )}
              </div>
            )}

            {!reviewMode && !reviewResolved && (
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => setReviewMode('approve')} className="bg-emerald-600 text-white hover:bg-emerald-700">Aprobar</Button>
                <Button variant="danger" size="sm" onClick={() => setReviewMode('reject')} className="bg-red-600 text-white hover:bg-red-700">Rechazar</Button>
              </div>
            )}

            {reviewMode === 'approve' && (
              <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <p className="text-xs font-semibold text-emerald-600">Al aprobar, el cargo queda pagado por Transferencia.</p>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Referencia de pago</label>
                  <Input value={reviewForm.reference} onChange={(e) => setReviewForm({ ...reviewForm, reference: e.target.value })} placeholder="Nº de transferencia" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Observación</label>
                  <textarea value={reviewForm.notes} onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })} rows={2} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setReviewMode(null)}>Volver</Button>
                  <Button size="sm" loading={approveMutation.isPending} onClick={() => approveMutation.mutate()} className="bg-emerald-600 text-white hover:bg-emerald-700">Confirmar aprobación</Button>
                </div>
              </div>
            )}

            {reviewMode === 'reject' && (
              <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Motivo del rechazo *</label>
                  <textarea value={reviewForm.reason} onChange={(e) => setReviewForm({ ...reviewForm, reason: e.target.value })} rows={2} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setReviewMode(null)}>Volver</Button>
                  <Button size="sm" variant="danger" loading={rejectMutation.isPending} disabled={!reviewForm.reason.trim()} onClick={() => rejectMutation.mutate()} className="bg-red-600 text-white hover:bg-red-700">Confirmar rechazo</Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Ver detalle */}
      {detailTarget && (
        <Modal open onClose={() => setDetailTarget(null)} title={`Cargo ${detailTarget.period} — ${detailTarget.companyName ?? ''}`} className="sm:max-w-2xl">
          <div className="px-5 py-4 sm:px-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              <DetailRow label="Período" value={detailTarget.period} />
              <DetailRow label="Número interno" value={detailTarget.invoiceNumber} />
              <DetailRow label="Estado" value={statusLabel(detailTarget.status)} />
              <DetailRow label="Emisión" value={fmtDate(detailTarget.issuedAtUtc)} />
              <DetailRow label="Vencimiento" value={fmtDate(detailTarget.dueDateUtc)} />
              <DetailRow label="Medio" value={paymentMethodLabel(detailTarget.paymentMethod)} />
              <DetailRow label="Fecha de pago" value={detailTarget.paidAtUtc ? fmtDate(detailTarget.paidAtUtc) : '-'} />
              <DetailRow label="Referencia" value={detailTarget.paymentReference} />
            </div>

            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
              <BillingPeriodDetail
                period={detailTarget.period}
                billableUsers={detailTarget.billableUsers}
                extraUsers={detailTarget.extraUsers}
                basePrice={detailTarget.baseAmount}
                extraChargeMode={detailTarget.extraChargeMode}
                extraUserPrice={detailTarget.extraUserPrice}
                extraFixedAmount={detailTarget.extraFixedAmount}
                extraAmount={detailTarget.extraAmount}
                totalAmount={detailTarget.totalAmount}
              />
            </div>

            {detailTarget.lateFeeAmount > 0 && (
              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                <h3 className="text-sm font-bold mb-3">Importe del cargo</h3>
                <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  <DetailRow label="Importe original" value={FMT.format(detailTarget.totalAmount)} />
                  <DetailRow label={`Mora (${detailTarget.lateFeePercentage}%)`} value={FMT.format(detailTarget.lateFeeAmount)} />
                  <DetailRow label="Total actualizado" value={FMT.format(detailTarget.amountWithLateFee)} />
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              {detailTarget.hasPaymentProof && (
                <Button variant="outline" size="sm" onClick={() => setProofPreview({ invoiceId: detailTarget.id, period: detailTarget.period })}>Ver comprobante</Button>
              )}
              <Button size="sm" onClick={() => downloadPdf(detailTarget)} className="bg-slate-800 text-white hover:bg-slate-700">Descargar PDF</Button>
            </div>
          </div>
        </Modal>
      )}

      <BillingProofPreviewModal
        open={!!proofPreview}
        onClose={() => setProofPreview(null)}
        period={proofPreview?.period ?? ''}
        load={
          proofPreview
            ? () =>
                apiService.get<BillingProofViewPayload>(
                  `/api/superadmin/billing/invoices/${proofPreview.invoiceId}/proof/view`,
                )
            : async () => {
                throw new Error('No invoice seleccionada')
              }
        }
      />
    </div>
  )
}

async function downloadPdf(invoice: SuperAdminBillingInvoice) {
  const blob = await apiService.getBlob(`/api/superadmin/billing/invoices/${invoice.id}/download/pdf`)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `billing-ClassClick-${invoice.companyId.slice(0, 8)}-${invoice.periodYear}-${String(invoice.periodMonth).padStart(2, '0')}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent: 'violet' | 'red' | 'emerald' | 'default' }) {  const accentClasses = {
    violet: 'text-violet-700 dark:text-violet-300',
    red: 'text-red-600 dark:text-red-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    default: 'text-slate-800 dark:text-slate-200',
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-black ${accentClasses[accent]}`}>{value}</p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between gap-2 border-b border-slate-100 pb-1.5 dark:border-slate-800">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-right text-xs font-medium">{value === undefined || value === null || value === '' ? '-' : value}</span>
    </div>
  )
}

export default function BillingInvoicesPage() {
  return <ToastProvider><BillingInvoicesInner /></ToastProvider>
}
