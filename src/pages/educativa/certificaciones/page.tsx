import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { apiService, getApiError } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/input'
import { SelectField } from '@/components/ui/select-field'
import { SearchableCombobox } from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/date-picker'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { ActionMenu } from '@/components/ui/action-menu'
import {
  EducativaCertificateType,
  EducativaCertificateRequest,
  EducativaCertificatePayment,
  EducativaCertificateHistoryStep,
  EducativaTraining,
  EducativaCommission,
  CertificateRequestStatus,
  certStatusLabel,
  fmtDate,
  fmtDateTime,
  fmtPrice,
  fmtMoney,
  paymentMethodLabel,
  PagedResult,
} from '../types'

type Tab = 'solicitudes' | 'tipos'

const STATUS_ORDER: CertificateRequestStatus[] = ['Solicitado', 'EnRevision', 'PendientePago', 'Pagado', 'EnGestion', 'Emitido', 'Rechazado', 'Cancelado']

// Paleta única de estados, consistente con el resto de Educativa.
function certStatusBadge(status: CertificateRequestStatus) {
  switch (status) {
    case 'Emitido': return <Badge variant="success">Emitido</Badge>
    case 'Rechazado': return <Badge variant="danger">Rechazado</Badge>
    case 'Cancelado': return <Badge variant="default">Cancelado</Badge>
    case 'Pagado': return <Badge variant="info">Pagado</Badge>
    case 'EnGestion': return <Badge variant="violet">En gestión</Badge>
    case 'EnRevision': return <Badge variant="violet">En revisión</Badge>
    case 'PendientePago': return <Badge variant="warning">Pendiente de pago</Badge>
    default: return <Badge variant="default">Solicitado</Badge>
  }
}

function obligationFlag(status: string | null | undefined) {
  switch (status) {
    case 'Pending': return <Badge variant="warning">Obligación pendiente</Badge>
    case 'Cancelled': return <Badge variant="default">Obligación cancelada</Badge>
    default: return null
  }
}

function paymentFlag(status: string | null | undefined) {
  switch (status) {
    case 'InReview': return <Badge variant="warning">Pago en revisión</Badge>
    case 'Rejected': return <Badge variant="danger">Pago rechazado</Badge>
    case 'Pending': return <Badge variant="default">Pago iniciado</Badge>
    default: return null
  }
}

function requirementFlag(isRequired: boolean) {
  return isRequired ? <Badge variant="info">Obligatorio</Badge> : <Badge variant="default">Opcional</Badge>
}

function priceFlag(price: number) {
  return price > 0 ? <Badge variant="default">De pago</Badge> : <Badge variant="success">Gratis</Badge>
}

function requestPriceFlag(r: EducativaCertificateRequest) {
  if (r.status === 'EnRevision') return <Badge variant="violet">Precio a definir</Badge>
  return priceFlag(r.priceFrozen)
}

function documentFlag(r: EducativaCertificateRequest) {
  if (r.status !== 'Emitido') return null
  return r.hasFinalDocument ? <Badge variant="success">Con documento</Badge> : <Badge variant="warning">Sin documento</Badge>
}

function CertificacionesInner() {
  const { companySlug } = useParams<{ companySlug: string }>()
  const slug = companySlug ?? ''
  const toast = useToast()
  const qc = useQueryClient()

  const [tab, setTab] = useState<Tab>('solicitudes')

  // Filtros de solicitudes
  const [search, setSearch] = useState('')
  const [trainingId, setTrainingId] = useState('')
  const [commissionId, setCommissionId] = useState('')
  const [certificateTypeId, setCertificateTypeId] = useState('')
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Modales / acciones
  const [typeModal, setTypeModal] = useState<EducativaCertificateType | null>(null)
  const [detailTarget, setDetailTarget] = useState<EducativaCertificateRequest | null>(null)
  const [reviewTarget, setReviewTarget] = useState<EducativaCertificateRequest | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [rejectTarget, setRejectTarget] = useState<EducativaCertificateRequest | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [confirmEmit, setConfirmEmit] = useState<EducativaCertificateRequest | null>(null)
  const [confirmManage, setConfirmManage] = useState<EducativaCertificateRequest | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<EducativaCertificateRequest | null>(null)
  const [confirmToggleType, setConfirmToggleType] = useState<EducativaCertificateType | null>(null)
  const [defineTarget, setDefineTarget] = useState<EducativaCertificateRequest | null>(null)
  const [defineAmount, setDefineAmount] = useState('')
  const [defineNote, setDefineNote] = useState('')

  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const fileTarget = useRef<{ requestId?: string; typeId?: string } | null>(null)

  const trainingsQuery = useQuery({
    queryKey: ['educativa-trainings', slug],
    queryFn: () => apiService.get<EducativaTraining[]>(`/api/educativa/${slug}/trainings`),
    enabled: !!slug,
    retry: false,
  })
  const trainings = trainingsQuery.data ?? []

  const commissionsQuery = useQuery({
    queryKey: ['educativa-commissions', slug],
    queryFn: () => apiService.get<PagedResult<EducativaCommission>>(`/api/educativa/${slug}/commissions?page=1&pageSize=200`),
    enabled: !!slug,
    retry: false,
  })
  const commissions = commissionsQuery.data?.items ?? []
  const filteredCommissions = trainingId ? commissions.filter((c) => c.trainingId === trainingId) : commissions

  const typesQuery = useQuery({
    queryKey: ['educativa-cert-types', slug],
    queryFn: () => apiService.get<EducativaCertificateType[]>(`/api/educativa/${slug}/certificates/types`),
    enabled: !!slug,
    retry: false,
  })
  const types = typesQuery.data ?? []

  const requestsParams = new URLSearchParams({ page: String(page), pageSize: '20' })
  if (search) requestsParams.set('search', search)
  if (status) requestsParams.set('status', status)
  if (trainingId) requestsParams.set('trainingId', trainingId)
  if (commissionId) requestsParams.set('commissionId', commissionId)
  if (certificateTypeId) requestsParams.set('certificateTypeId', certificateTypeId)
  if (fromDate) requestsParams.set('fromCreatedUtc', `${fromDate}T00:00:00Z`)
  if (toDate) requestsParams.set('toCreatedUtc', `${toDate}T23:59:59Z`)

  const requestsQuery = useQuery({
    queryKey: ['educativa-cert-requests', slug, search, trainingId, commissionId, certificateTypeId, status, fromDate, toDate, page],
    queryFn: () => apiService.get<{ total: number; items: EducativaCertificateRequest[] }>(`/api/educativa/${slug}/certificates/requests?${requestsParams}`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })
  const requests = requestsQuery.data?.items ?? []
  const total = requestsQuery.data?.total ?? 0

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['educativa-cert-types', slug] })
    qc.invalidateQueries({ queryKey: ['educativa-cert-requests', slug] })
    qc.invalidateQueries({ queryKey: ['educativa-cert-detail', slug] })
    qc.invalidateQueries({ queryKey: ['educativa-cert-history', slug] })
    qc.invalidateQueries({ queryKey: ['educativa-cert-payments', slug] })
  }

  const resetFilters = () => {
    setSearch(''); setTrainingId(''); setCommissionId(''); setCertificateTypeId(''); setStatus('')
    setFromDate(''); setToDate(''); setPage(1)
  }
  const secondaryActiveCount = [trainingId, commissionId, certificateTypeId, status, fromDate, toDate].filter(Boolean).length

  // ── Tipos de certificado ──────────────────────────────────────────────
  async function saveType() {
    const t = typeModal
    if (!t) return
    if (!t.name.trim()) { toast('El nombre es obligatorio.', 'error'); return }
    if (!t.trainingId) { toast('Seleccioná una Formación.', 'error'); return }
    if (t.price < 0) { toast('El precio no puede ser negativo.', 'error'); return }
    const body = {
      trainingId: t.trainingId,
      name: t.name.trim(),
      price: t.price,
      currency: 'ARS',
      isRequired: t.isRequired,
      isActive: t.isActive,
    }
    setBusy(true)
    try {
      if (t.id) await apiService.put(`/api/educativa/${slug}/certificates/types/${t.id}`, body)
      else await apiService.post(`/api/educativa/${slug}/certificates/types`, body)
      toast(t.id ? 'Tipo actualizado.' : 'Tipo creado.')
      setTypeModal(null)
      invalidate()
    } catch (err) {
      toast(getApiError(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function toggleType(t: EducativaCertificateType) {
    setBusy(true)
    try {
      await apiService.put(`/api/educativa/${slug}/certificates/types/${t.id}`, {
        trainingId: t.trainingId,
        name: t.name,
        price: t.price,
        currency: t.currency,
        isRequired: t.isRequired,
        isActive: !t.isActive,
      })
      toast(t.isActive ? 'Tipo desactivado.' : 'Tipo activado.')
      setConfirmToggleType(null)
      invalidate()
    } catch (err) {
      toast(getApiError(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  function pickFile(target: { requestId?: string; typeId?: string }) {
    fileTarget.current = target
    fileRef.current?.click()
  }

  async function uploadFile(file: File) {
    const target = fileTarget.current
    if (!target) return
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      if (target.requestId) {
        await apiService.postForm(`/api/educativa/${slug}/certificates/requests/${target.requestId}/document`, form)
        toast('Certificado adjuntado.')
      } else if (target.typeId) {
        await apiService.postForm(`/api/educativa/${slug}/certificates/types/${target.typeId}/template`, form)
        toast('Plantilla cargada.')
      }
      invalidate()
    } catch (err) {
      toast(getApiError(err), 'error')
    } finally {
      setBusy(false)
      fileTarget.current = null
    }
  }

  // ── Acciones sobre solicitudes ────────────────────────────────────────
  async function changeStatus(r: EducativaCertificateRequest, next: CertificateRequestStatus, note?: string) {
    setBusy(true)
    try {
      await apiService.post(`/api/educativa/${slug}/certificates/requests/${r.id}/status`, { status: next, note: note?.trim() || null })
      toast(`Solicitud ${certStatusLabel[next]?.toLowerCase() ?? next}.`)
      invalidate()
    } catch (err) {
      toast(getApiError(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function doReview(action: 'approve' | 'reject') {
    if (!reviewTarget || !reviewTarget.latestPaymentId) return
    setBusy(true)
    try {
      await apiService.post(
        `/api/educativa/${slug}/certificates/requests/${reviewTarget.id}/payments/${reviewTarget.latestPaymentId}/${action}`,
        { reviewNote: reviewNote.trim() || null },
      )
      toast(action === 'approve' ? 'Pago aprobado. La solicitud pasa a Pagado.' : 'Pago rechazado.')
      setReviewTarget(null)
      setReviewNote('')
      invalidate()
    } catch (err) {
      toast(getApiError(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function defineAmountSubmit() {
    if (!defineTarget) return
    const amount = Number(defineAmount)
    if (!Number.isFinite(amount) || amount < 0) { toast('Ingresá un importe válido (0 = sin costo).', 'error'); return }
    setBusy(true)
    try {
      await apiService.post(`/api/educativa/${slug}/certificates/requests/${defineTarget.id}/define-amount`, {
        amount,
        note: defineNote.trim() || null,
      })
      toast(amount > 0 ? 'Importe definido. La solicitud pasó a Pendiente de pago.' : 'Importe definido sin costo. La solicitud pasó a En gestión.')
      setDefineTarget(null)
      setDefineAmount('')
      setDefineNote('')
      invalidate()
    } catch (err) {
      toast(getApiError(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  function downloadCert(r: EducativaCertificateRequest) {
    if (r.finalDocumentUrl) window.open(r.finalDocumentUrl, '_blank')
  }

  const filterBar = (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">Búsqueda (alumno)</label>
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Nombre o email" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">Formación</label>
          <SearchableCombobox
            value={trainingId}
            onValueChange={(v) => { setTrainingId(v); setCommissionId(''); setPage(1) }}
            options={[{ value: '', label: 'Todas las formaciones' }, ...trainings.map((t) => ({ value: t.id, label: t.name }))]}
            placeholder="Todas las formaciones"
            searchPlaceholder="Buscar formación..."
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">Comisión</label>
          <SearchableCombobox
            value={commissionId}
            onValueChange={(v) => { setCommissionId(v); setPage(1) }}
            options={[{ value: '', label: 'Todas las comisiones' }, ...filteredCommissions.map((c) => ({ value: c.id, label: c.name }))]}
            placeholder="Todas las comisiones"
            searchPlaceholder="Buscar comisión..."
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">Tipo de certificado</label>
          <SelectField value={certificateTypeId} onValueChange={(v) => { setCertificateTypeId(v); setPage(1) }} placeholder="Todos los tipos"
            options={[{ value: '', label: 'Todos los tipos' }, ...types.map((t) => ({ value: t.id, label: t.name }))]}
            aria-label="Tipo de certificado" />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">Estado</label>
          <SelectField value={status} onValueChange={(v) => { setStatus(v); setPage(1) }} placeholder="Todos los estados"
            options={[{ value: '', label: 'Todos los estados' }, ...STATUS_ORDER.map((s) => ({ value: s, label: certStatusLabel[s] }))]}
            aria-label="Estado" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">Solicitada desde</label>
          <DatePicker value={fromDate} onChange={(v) => { setFromDate(v); setPage(1) }} placeholder="Desde" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">Solicitada hasta</label>
          <DatePicker value={toDate} onChange={(v) => { setToDate(v); setPage(1) }} placeholder="Hasta" />
        </div>
        <div className="flex items-end">
          <Button variant="ghost" size="sm" onClick={resetFilters}>Limpiar filtros</Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black sm:text-2xl">Certificaciones</h1>
            <p className="mt-1 text-sm text-blue-200">Tipos de certificado, solicitudes, pagos y emisión en un solo lugar.</p>
          </div>
          {tab === 'tipos' && (
            <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50"
              onClick={() => setTypeModal({ id: '', trainingId: '', trainingName: '', name: '', price: 0, currency: 'ARS', isRequired: false, isActive: true, hasTemplate: false })}>
              + Nuevo tipo
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {([['solicitudes', 'Solicitudes'], ['tipos', 'Tipos de certificado']] as const).map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key); setPage(1) }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${tab === key ? 'bg-white shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Solicitudes ── */}
      {tab === 'solicitudes' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Input className="max-w-[220px]" placeholder="Buscar alumno..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            <Button variant="outline" size="sm" className="inline-flex items-center gap-1.5" onClick={() => setFiltersOpen((v) => !v)}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtros{secondaryActiveCount > 0 ? ` (${secondaryActiveCount})` : ''}
            </Button>
          </div>

          {filtersOpen && (
            <Card className="p-4">{filterBar}</Card>
          )}

          <Card className="p-0">
            {requestsQuery.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner className="h-7 w-7" /></div>}
            {!requestsQuery.isLoading && requests.length === 0 && (
              <EmptyState icon="🎖️" title="Sin solicitudes" description="No hay solicitudes para los filtros seleccionados." />
            )}
            {!requestsQuery.isLoading && requests.length > 0 && (
              <>
                {/* Desktop */}
                <div className="hidden overflow-x-auto scrollbar-hide md:block">
                  <table className="w-full min-w-[1040px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                        <th className="px-4 py-3">Alumno</th>
                        <th className="px-4 py-3">Certificado</th>
                        <th className="px-4 py-3">Formación / Comisión</th>
                        <th className="px-4 py-3">Solicitada</th>
                        <th className="px-4 py-3 text-right">Importe</th>
                        <th className="px-4 py-3 text-center">Estado</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {requests.map((r) => (
                        <tr key={r.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900 dark:text-white">{r.studentName}</p>
                            <p className="text-[11px] text-slate-400">{r.studentEmail}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 dark:text-slate-200">{r.certificateTypeName}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {requirementFlag(r.isRequired)}
                              {requestPriceFlag(r)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {r.trainingName}<span className="block text-xs text-slate-400">{r.commissionName}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{fmtDate(r.createdAtUtc)}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {r.status === 'EnRevision'
                              ? <span className="text-violet-600 dark:text-violet-400">A definir</span>
                              : r.priceFrozen > 0
                                ? <span className="text-slate-900 dark:text-white">{fmtPrice(r.priceFrozen)}</span>
                                : <span className="text-emerald-600 dark:text-emerald-400">Gratis</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-center gap-1">
                              {certStatusBadge(r.status)}
                              <div className="flex flex-wrap justify-center gap-1">
                                {paymentFlag(r.paymentStatus)}
                                {obligationFlag(r.obligationStatus)}
                                {documentFlag(r)}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {r.paymentStatus === 'InReview' && r.latestPaymentId && (
                                <Button size="sm" variant="outline" onClick={() => { setReviewTarget(r); setReviewNote('') }}>Revisar pago</Button>
                              )}
                              {r.status === 'EnRevision' && (
                                <Button size="sm" onClick={() => { setDefineTarget(r); setDefineAmount(''); setDefineNote('') }}>Definir importe</Button>
                              )}
                              {r.status === 'Pagado' && (
                                <Button size="sm" onClick={() => setConfirmManage(r)}>Iniciar gestión</Button>
                              )}
                              {r.status === 'EnGestion' && (
                                <Button size="sm" onClick={() => setConfirmEmit(r)}>Emitir</Button>
                              )}
                              {r.status === 'Emitido' && !r.hasFinalDocument && (
                                <Button size="sm" onClick={() => pickFile({ requestId: r.id })}>Adjuntar certificado</Button>
                              )}
                              {r.hasFinalDocument && r.finalDocumentUrl && (
                                <Button size="sm" variant="outline" onClick={() => downloadCert(r)}>Descargar</Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => setDetailTarget(r)}>Detalle</Button>
                              {(['Solicitado', 'EnRevision', 'PendientePago', 'Pagado', 'EnGestion'] as CertificateRequestStatus[]).includes(r.status) && (
                                <ActionMenu actions={[
                                  {
                                    label: 'Rechazar solicitud', danger: true as const,
                                    onClick: () => { setRejectTarget(r); setRejectNote('') },
                                  },
                                  ...(r.status === 'Solicitado' || r.status === 'EnRevision' || r.status === 'PendientePago' ? [{
                                    label: 'Cancelar solicitud', danger: true as const,
                                    onClick: () => setConfirmCancel(r),
                                  }] : []),
                                ]} />
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="space-y-2 p-2 md:hidden">
                  {requests.map((r) => (
                    <Card key={r.id} className="p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900 dark:text-white">{r.studentName}</p>
                          <p className="text-[11px] text-slate-400">{r.studentEmail}</p>
                        </div>
                        <span className="shrink-0">{certStatusBadge(r.status)}</span>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.certificateTypeName}</p>
                        <p className="text-[11px] text-slate-400">{r.trainingName} · {r.commissionName}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {requirementFlag(r.isRequired)}
                        {requestPriceFlag(r)}
                        {paymentFlag(r.paymentStatus)}
                        {obligationFlag(r.obligationStatus)}
                        {documentFlag(r)}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                          {r.status === 'EnRevision'
                            ? <span className="text-violet-600 dark:text-violet-400">A definir</span>
                            : r.priceFrozen > 0
                              ? fmtPrice(r.priceFrozen)
                              : <span className="text-emerald-600 dark:text-emerald-400">Gratis</span>}
                        </span>
                        <span className="text-[11px] text-slate-400">Solicitada {fmtDate(r.createdAtUtc)}</span>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {r.paymentStatus === 'InReview' && r.latestPaymentId && (
                          <Button size="sm" variant="outline" onClick={() => { setReviewTarget(r); setReviewNote('') }}>Revisar pago</Button>
                        )}
                        {r.status === 'EnRevision' && (
                          <Button size="sm" onClick={() => { setDefineTarget(r); setDefineAmount(''); setDefineNote('') }}>Definir importe</Button>
                        )}
                        {r.status === 'Pagado' && <Button size="sm" onClick={() => setConfirmManage(r)}>Iniciar gestión</Button>}
                        {r.status === 'EnGestion' && <Button size="sm" onClick={() => setConfirmEmit(r)}>Emitir</Button>}
                        {r.status === 'Emitido' && !r.hasFinalDocument && (
                          <Button size="sm" onClick={() => pickFile({ requestId: r.id })}>Adjuntar certificado</Button>
                        )}
                        {r.hasFinalDocument && r.finalDocumentUrl && (
                          <Button size="sm" variant="outline" onClick={() => downloadCert(r)}>Descargar</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setDetailTarget(r)}>Detalle</Button>
                        {(['Solicitado', 'EnRevision', 'PendientePago', 'Pagado', 'EnGestion'] as CertificateRequestStatus[]).includes(r.status) && (
                          <ActionMenu actions={[
                            {
                              label: 'Rechazar solicitud', danger: true as const,
                              onClick: () => { setRejectTarget(r); setRejectNote('') },
                            },
                            ...(r.status === 'Solicitado' || r.status === 'EnRevision' || r.status === 'PendientePago' ? [{
                              label: 'Cancelar solicitud', danger: true as const,
                              onClick: () => setConfirmCancel(r),
                            }] : []),
                          ]} />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="p-2"><Pagination page={page} pageSize={20} totalCount={total} onPageChange={setPage} /></div>
              </>
            )}
          </Card>
        </>
      )}

      {/* ── Tipos de certificado ── */}
      {tab === 'tipos' && (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Catálogo ({types.length})</p>
            {typesQuery.isLoading && <Spinner className="h-4 w-4 text-slate-400" />}
          </div>
          {typesQuery.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner className="h-7 w-7" /></div>}
          {!typesQuery.isLoading && types.length === 0 && (
            <EmptyState icon="🎖️" title="Sin tipos de certificado" description="Creá el primer tipo para habilitar certificaciones en las formaciones."
              action={{ label: '+ Nuevo tipo', onClick: () => setTypeModal({ id: '', trainingId: '', trainingName: '', name: '', price: 0, currency: 'ARS', isRequired: false, isActive: true, hasTemplate: false }) }} />
          )}
          {!typesQuery.isLoading && types.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {types.map((t) => (
                <Card key={t.id} className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{t.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{t.trainingName}</p>
                    </div>
                    {t.isActive ? <Badge variant="success">Activo</Badge> : <Badge variant="default">Inactivo</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {requirementFlag(t.isRequired)}
                    {t.hasTemplate && <Badge variant="violet">Plantilla</Badge>}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                    {t.hasTemplate && t.templateUrl && (
                      <Button size="sm" variant="outline" onClick={() => window.open(t.templateUrl!, '_blank')}>Ver plantilla</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setTypeModal(t)}>Editar</Button>
                    <Button size="sm" variant="ghost" className={t.isActive ? 'text-red-500' : 'text-green-600'}
                      onClick={() => setConfirmToggleType(t)}>
                      {t.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Archivo oculto para adjuntar documento/plantilla */}
      <input ref={fileRef} type="file" className="hidden" accept=".pdf,.png,.jpg"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }} />

      {/* ── Modal de tipo de certificado ── */}
      <Modal open={!!typeModal} onClose={() => setTypeModal(null)}
        title={typeModal?.id ? 'Editar tipo de certificado' : 'Nuevo tipo de certificado'}
        description="El precio del certificado se determina por regla: 1 cuota de la inscripción dentro de los 6 meses, o importe definido por administración después.">
        <div className="space-y-4 px-5 py-4 sm:px-6">
          {typeModal && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nombre</label>
                <Input placeholder="Ej: Certificado de Finalización" value={typeModal.name}
                  onChange={(e) => setTypeModal({ ...typeModal, name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Formación</label>
                <SelectField value={typeModal.trainingId} onValueChange={(v) => setTypeModal({ ...typeModal, trainingId: v })}
                  placeholder="Seleccionar formación"
                  options={trainings.map((tr) => ({ value: tr.id, label: tr.name }))}
                  aria-label="Formación" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-700">
                  <input type="checkbox" className="h-4 w-4 rounded accent-blue-600" checked={typeModal.isRequired}
                    onChange={(e) => setTypeModal({ ...typeModal, isRequired: e.target.checked })} />
                  Obligatorio
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-700">
                  <input type="checkbox" className="h-4 w-4 rounded accent-blue-600" checked={typeModal.isActive}
                    onChange={(e) => setTypeModal({ ...typeModal, isActive: e.target.checked })} />
                  Activo
                </label>
              </div>
              {typeModal.id && (
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Plantilla</p>
                  {typeModal.hasTemplate ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">Plantilla cargada.</p>
                      <div className="flex gap-2">
                        {typeModal.templateUrl && <Button size="sm" variant="outline" onClick={() => window.open(typeModal.templateUrl!, '_blank')}>Ver</Button>}
                        <Button size="sm" variant="outline" onClick={() => pickFile({ typeId: typeModal.id })} loading={busy}>Reemplazar</Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => pickFile({ typeId: typeModal.id })} loading={busy}>Cargar plantilla</Button>
                  )}
                  <p className="mt-1.5 text-[11px] text-slate-400">PDF o imagen. Se usará como plantilla del certificado.</p>
                </div>
              )}
            </>
          )}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <Button variant="outline" onClick={() => setTypeModal(null)}>Cancelar</Button>
            <Button loading={busy} onClick={saveType}>Guardar</Button>
          </div>
        </div>
      </Modal>

      {/* ── Revisar pago ── */}
      <Modal open={!!reviewTarget} onClose={() => setReviewTarget(null)}
        title="Revisar pago de certificación"
        description={reviewTarget ? `${reviewTarget.studentName} · ${reviewTarget.certificateTypeName} · ${fmtPrice(reviewTarget.priceFrozen)}` : undefined}
        className="sm:max-w-md">
        <div className="space-y-4 px-5 py-4 sm:px-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            El pago está en revisión. Al aprobarlo, la solicitud pasa automáticamente a <strong>Pagado</strong>.
          </p>
          {reviewTarget?.latestPaymentId && (
            <ReviewPaymentProof requestId={reviewTarget.id} paymentId={reviewTarget.latestPaymentId} slug={slug} />
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nota (opcional)</label>
            <Input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Nota de revisión..." />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <Button variant="outline" onClick={() => setReviewTarget(null)}>Cancelar</Button>
            <Button variant="danger" loading={busy} onClick={() => doReview('reject')}>Rechazar</Button>
            <Button loading={busy} className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => doReview('approve')}>Aprobar pago</Button>
          </div>
        </div>
      </Modal>

      {/* ── Rechazar solicitud ── */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Rechazar solicitud" className="sm:max-w-md">
        <div className="space-y-4 px-5 py-4 sm:px-6">
          <p className="text-xs text-slate-500">{rejectTarget?.studentName} · {rejectTarget?.certificateTypeName}</p>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Motivo / nota para el alumno</label>
            <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3}
              placeholder="Ej: Necesitamos regularizar la documentación antes de continuar."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancelar</Button>
            <Button variant="danger" loading={busy} onClick={() => { const r = rejectTarget; if (r) { changeStatus(r, 'Rechazado', rejectNote); setRejectTarget(null) } }}>Rechazar</Button>
          </div>
        </div>
      </Modal>

      {/* ── Definir importe (solicitud fuera de la ventana de 6 meses) ── */}
      <Modal open={!!defineTarget} onClose={() => setDefineTarget(null)}
        title="Definir importe de certificación"
        description={defineTarget ? `${defineTarget.studentName} · ${defineTarget.certificateTypeName}` : undefined}
        className="sm:max-w-md">
        <div className="space-y-4 px-5 py-4 sm:px-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            La solicitud se creó después de los 6 meses de la finalización: el precio no se calcula automáticamente. Al confirmar el importe se genera la obligación y pasa a <strong>Pendiente de pago</strong>.
          </p>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Importe (ARS) · 0 = sin costo</label>
            <Input type="number" min={0} step="0.01" value={defineAmount} onChange={(e) => setDefineAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nota para el alumno (opcional)</label>
            <textarea value={defineNote} onChange={(e) => setDefineNote(e.target.value)} rows={3}
              placeholder="Ej: Importe definido por administración."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <Button variant="outline" onClick={() => setDefineTarget(null)}>Cancelar</Button>
            <Button loading={busy} onClick={defineAmountSubmit}>Confirmar importe</Button>
          </div>
        </div>
      </Modal>

      {/* ── Confirmaciones ── */}
      <ConfirmModal open={!!confirmManage} onClose={() => setConfirmManage(null)} title="Iniciar gestión"
        message={confirmManage ? `¿Iniciar la gestión del certificado "${confirmManage.certificateTypeName}" de ${confirmManage.studentName}? La solicitud pasa de Pagado a En gestión.` : ''}
        confirmText="Iniciar gestión" variant="primary" loading={busy}
        onConfirm={() => { const r = confirmManage; if (r) { changeStatus(r, 'EnGestion'); setConfirmManage(null) } }} />

      <ConfirmModal open={!!confirmEmit} onClose={() => setConfirmEmit(null)} title="Emitir certificado"
        message={confirmEmit ? `¿Marcar como emitido el certificado "${confirmEmit.certificateTypeName}" de ${confirmEmit.studentName}? Podés adjuntar el documento luego de emitir.` : ''}
        confirmText="Emitir" variant="primary" loading={busy}
        onConfirm={() => { const r = confirmEmit; if (r) { changeStatus(r, 'Emitido'); setConfirmEmit(null) } }} />

      <ConfirmModal open={!!confirmCancel} onClose={() => setConfirmCancel(null)} title="Cancelar solicitud"
        message={confirmCancel ? `¿Cancelar la solicitud "${confirmCancel.certificateTypeName}" de ${confirmCancel.studentName}? Esta acción no se puede deshacer.` : ''}
        confirmText="Cancelar" variant="danger" loading={busy}
        onConfirm={() => { const r = confirmCancel; if (r) { changeStatus(r, 'Cancelado'); setConfirmCancel(null) } }} />

      <ConfirmModal open={!!confirmToggleType} onClose={() => setConfirmToggleType(null)}
        title={confirmToggleType?.isActive ? 'Desactivar tipo de certificado' : 'Activar tipo de certificado'}
        message={confirmToggleType?.isActive
          ? `Desactivar "${confirmToggleType.name}" impide nuevas solicitudes, pero no afecta solicitudes ya creadas.`
          : `Activar "${confirmToggleType?.name}" lo habilita para nuevas solicitudes.`}
        confirmText={confirmToggleType?.isActive ? 'Desactivar' : 'Activar'}
        variant={confirmToggleType?.isActive ? 'danger' : 'primary'} loading={busy}
        onConfirm={() => { if (confirmToggleType) toggleType(confirmToggleType) }} />

      {/* ── Detalle ── */}
      {detailTarget && (
        <CertificationDetailModal
          request={detailTarget}
          slug={slug}
          onClose={() => setDetailTarget(null)}
          onReview={(r) => { setDetailTarget(null); setReviewTarget(r); setReviewNote('') }}
          onAttach={(r) => { setDetailTarget(null); pickFile({ requestId: r.id }) }}
        />
      )}
    </div>
  )
}

/* ── Comprobante del pago en revisión ── */
function ReviewPaymentProof({ requestId, paymentId, slug }: { requestId: string; paymentId: string; slug: string }) {
  const { data: payments } = useQuery({
    queryKey: ['educativa-cert-payments', slug, requestId],
    queryFn: () => apiService.get<EducativaCertificatePayment[]>(`/api/educativa/${slug}/certificates/requests/${requestId}/payments`),
    enabled: !!slug,
    retry: false,
  })
  const payment = payments?.find((p) => p.id === paymentId)

  if (!payment) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <span className="font-semibold text-slate-500">Método:</span>{' '}
          <span className="text-slate-700 dark:text-slate-200">{paymentMethodLabel[payment.paymentMethod] ?? payment.paymentMethod}</span>
        </span>
        <span>
          <span className="font-semibold text-slate-500">Total:</span>{' '}
          <span className="font-bold text-slate-900 dark:text-white">{fmtMoney(payment.totalAmount, payment.currency)}</span>
        </span>
      </div>
      {payment.latestProofUrl && (
        <a href={payment.latestProofUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-block font-semibold text-blue-600 hover:underline dark:text-blue-400">
          Ver comprobante
        </a>
      )}
    </div>
  )
}

/* ── Detalle de solicitud ── */
function CertificationDetailModal({ request, slug, onClose, onReview, onAttach }: {
  request: EducativaCertificateRequest
  slug: string
  onClose: () => void
  onReview: (r: EducativaCertificateRequest) => void
  onAttach: (r: EducativaCertificateRequest) => void
}) {
  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['educativa-cert-history', slug, request.id],
    queryFn: () => apiService.get<EducativaCertificateHistoryStep[]>(`/api/educativa/${slug}/certificates/requests/${request.id}/history`),
    enabled: !!slug,
    retry: false,
  })

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['educativa-cert-payments', slug, request.id],
    queryFn: () => apiService.get<EducativaCertificatePayment[]>(`/api/educativa/${slug}/certificates/requests/${request.id}/payments`),
    enabled: !!slug,
    retry: false,
  })

  const info = (label: string, value: string) => (
    <div>
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  )

  return (
    <Modal open onClose={onClose} className="sm:max-w-3xl"
      title={request.certificateTypeName}
      description={`Certificación de ${request.studentName} · ${request.trainingName}`}>
      <div className="space-y-5 px-5 py-4 sm:px-6">
        {/* Encabezado con estados */}
        <div className="flex flex-wrap items-center gap-2">
          {certStatusBadge(request.status)}
          {requirementFlag(request.isRequired)}
          {priceFlag(request.priceFrozen)}
          {paymentFlag(request.paymentStatus)}
          {obligationFlag(request.obligationStatus)}
          {documentFlag(request)}
          <span className="text-[11px] text-slate-400">{request.commissionName}</span>
        </div>

        {/* Solicitud */}
        <section>
          <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Solicitud</h3>
          <div className="grid gap-x-6 gap-y-2 rounded-xl border border-slate-200 p-4 text-sm sm:grid-cols-2 dark:border-slate-700">
            {info('Solicitada', fmtDateTime(request.createdAtUtc))}
            {info('Última actualización', fmtDateTime(request.updatedAtUtc))}
            {info('Formación', request.trainingName)}
            {info('Comisión', request.commissionName)}
            {info('Alumno', request.studentName)}
            {info('Email', request.studentEmail)}
            {info('Importe', request.status === 'EnRevision' ? 'A definir por administración' : request.priceFrozen > 0 ? fmtPrice(request.priceFrozen) : 'Gratis')}
            {request.emittedAtUtc ? info('Emitido', fmtDateTime(request.emittedAtUtc)) : null}
          </div>
        </section>

        {/* Pago */}
        <section>
          <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Pago</h3>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            {loadingPayments ? (
              <div className="flex justify-center py-4 text-slate-400"><Spinner /></div>
            ) : !payments || payments.length === 0 ? (
              <p className="text-xs text-slate-400">
                {request.status === 'Solicitado' ? 'El alumno todavía no inició el pago.' : 'Sin pagos registrados.'}
              </p>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {paymentMethodLabel[p.paymentMethod] ?? p.paymentMethod}
                        <span className="ml-2 font-bold text-slate-900 dark:text-white">{fmtMoney(p.totalAmount, p.currency)}</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {fmtDateTime(p.createdAtUtc)}
                        {p.status === 'InReview' ? ' · En revisión' : p.status === 'Approved' && p.approvedAtUtc ? ` · Aprobado ${fmtDateTime(p.approvedAtUtc)}` : p.status === 'Rejected' ? ' · Rechazado' : ''}
                      </p>
                      {p.reviewNote && <p className="mt-0.5 text-[11px] text-slate-500">Nota: {p.reviewNote}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {p.latestProofUrl && <a href={p.latestProofUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">Comprobante</Button></a>}
                      {p.status === 'InReview' && (
                        <Button size="sm" onClick={() => onReview(request)}>Revisar</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Historial */}
        <section>
          <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Historial de estados</h3>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            {loadingHistory ? (
              <div className="flex justify-center py-4 text-slate-400"><Spinner /></div>
            ) : !history || history.length === 0 ? (
              <p className="text-xs text-slate-400">Sin registros.</p>
            ) : (
              <ol className="space-y-0">
                {history.map((h, i) => {
                  const last = i === history.length - 1
                  const toLabel = certStatusLabel[h.toStatus as CertificateRequestStatus] ?? h.toStatus
                  const fromLabel = h.fromStatus ? certStatusLabel[h.fromStatus as CertificateRequestStatus] ?? h.fromStatus : 'Creación'
                  return (
                    <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                      {!last && <span className="absolute left-[7px] top-4 h-full w-px bg-slate-200 dark:bg-slate-700" />}
                      <span className={`z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ${last ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {fromLabel} → {toLabel}
                        </p>
                        <p className="text-[11px] text-slate-400">{fmtDateTime(h.changedAtUtc)}</p>
                        {h.note && <p className="mt-0.5 text-[11px] text-slate-500">{h.note}</p>}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </section>

        {/* Documento */}
        <section>
          <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Documento</h3>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            {request.hasFinalDocument && request.finalDocumentUrl ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Certificado final disponible</p>
                <Button size="sm" variant="outline" onClick={() => window.open(request.finalDocumentUrl!, '_blank')}>Descargar</Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sin documento adjuntado</p>
                  <p className="text-[11px] text-slate-400">El certificado final se adjunta cuando la solicitud está emitida.</p>
                </div>
                {request.status === 'Emitido' && (
                  <Button size="sm" onClick={() => onAttach(request)}>Adjuntar certificado</Button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </Modal>
  )
}

export default function EducativaCertificacionesPage() {
  return <ToastProvider><CertificacionesInner /></ToastProvider>
}

export { EducativaCertificacionesPage, CertificacionesInner }