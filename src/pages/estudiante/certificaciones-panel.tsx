import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { fmtMoney, fmtDate } from './types'
import { EstudianteCertAvailable, EstudianteCertRequest, EstudianteCertPayment } from './types'

function certStatusBadge(status: EstudianteCertRequest['status']) {
  switch (status) {
    case 'Emitido': return <Badge variant="success">Emitido</Badge>
    case 'Rechazado': return <Badge variant="danger">Rechazado</Badge>
    case 'Cancelado': return <Badge variant="default">Cancelado</Badge>
    case 'Pagado': return <Badge variant="info">Pagado</Badge>
    case 'EnGestion': return <Badge variant="violet">En gestión</Badge>
    case 'EnRevision': return <Badge variant="violet">En revisión</Badge>
    case 'PendientePago': return <Badge variant="warning">Pend. de pago</Badge>
    default: return <Badge variant="default">Solicitado</Badge>
  }
}

function certPriceLabel(a: EstudianteCertAvailable) {
  if (a.priceToDefine) return 'Precio a definir por administración'
  if (a.isFree || a.price <= 0) return 'Gratis'
  return fmtMoney(a.price, a.currency)
}

function requestPriceLabel(r: EstudianteCertRequest) {
  if (r.status === 'EnRevision') return 'Precio a definir'
  if (r.priceFrozen <= 0) return 'Gratis'
  return fmtMoney(r.priceFrozen, r.currency)
}

function obligationBadge(status: EstudianteCertRequest['obligationStatus']) {
  switch (status) {
    case 'Paid': return <Badge variant="success">Obligación pagada</Badge>
    case 'Cancelled': return <Badge variant="default">Obligación cancelada</Badge>
    case 'Pending': return <Badge variant="warning">Obligación pendiente</Badge>
    default: return null
  }
}

function paymentBadge(status: EstudianteCertRequest['paymentStatus']) {
  switch (status) {
    case 'Approved': return <Badge variant="success">Pago aprobado</Badge>
    case 'InReview': return <Badge variant="info">Pago en revisión</Badge>
    case 'Rejected': return <Badge variant="danger">Pago rechazado</Badge>
    case 'Pending': return <Badge variant="warning">Pago iniciado</Badge>
    default: return null
  }
}

export function CertificacionesPanel({ enrollmentId }: { enrollmentId?: string }) {
  const slug = useAuth((s) => s.activeCompanySlug ?? '')
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [payTarget, setPayTarget] = useState<{ requestId: string; payment: EstudianteCertPayment } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const qs = enrollmentId ? `?enrollmentId=${enrollmentId}` : ''

  const availableQuery = useQuery({
    queryKey: ['estudiante-cert-available', slug, enrollmentId ?? 'all'],
    queryFn: () => apiService.get<EstudianteCertAvailable[]>(`/api/educativa/student/${slug}/certificates/available${qs}`),
    enabled: !!slug,
    retry: false,
  })

  const mineQuery = useQuery({
    queryKey: ['estudiante-cert-mine', slug, enrollmentId ?? 'all'],
    queryFn: () => apiService.get<EstudianteCertRequest[]>(`/api/educativa/student/${slug}/certificates/mine${qs}`),
    enabled: !!slug,
    retry: false,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['estudiante-cert-available', slug] })
    queryClient.invalidateQueries({ queryKey: ['estudiante-cert-mine', slug] })
  }

  const available = availableQuery.data ?? []
  const mine = mineQuery.data ?? []
  const requestedTypeIds = new Set(mine.map((m) => m.certificateTypeId))
  const selectable = available.filter((a) => !requestedTypeIds.has(a.certificateTypeId))
  const requiredAvailable = selectable.find((a) => a.isRequired)
  const hasRequiredSelected = selected.some((id) => selectable.find((a) => a.certificateTypeId === id)?.isRequired)
  // Deuda académica: se muestra Certificados pero se bloquea Solicitar hasta regularizar.
  const hasDebt = available.some((a) => a.hasDebt)
  const debtMessage = available.find((a) => a.hasDebt)?.debtMessage ?? 'Tenés deuda pendiente en esta formación. Regularizala antes de solicitar certificados.'

  function toggle(id: string, isRequired: boolean) {
    if (hasDebt) return
    if (isRequired) {
      // Seleccionar el obligatorio.
      setSelected((prev) => (prev.includes(id) ? prev : [...prev, id]))
      return
    }
    if (!hasRequiredSelected) return
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function confirmSelection() {
    if (hasDebt) return
    if (!requiredAvailable) return
    const first = selectable.find((a) => a.certificateTypeId === selected[0]) ?? selectable[0]
    if (!first) return
    setBusy('confirm')
    try {
      await apiService.post(`/api/educativa/student/${slug}/certificates/confirm`, {
        commissionEnrollmentId: first.enrollmentId,
        certificateTypeIds: selected,
      })
      setSelected([])
      invalidate()
    } catch { /* backend es autoridad */ } finally {
      setBusy(null)
    }
  }

  async function payRequest(r: EstudianteCertRequest) {
    setBusy('pay-' + r.id)
    try {
      const payment = await apiService.post<EstudianteCertPayment>(`/api/educativa/student/${slug}/certificates/${r.id}/payments`, {
        paymentMethod: 'Transfer',
      })
      setPayTarget({ requestId: r.id, payment })
    } catch { /* ignore */ } finally {
      setBusy(null)
    }
  }

  async function payMercadoPago(r: EstudianteCertRequest) {
    setBusy('mp-' + r.id)
    try {
      const payment = await apiService.post<EstudianteCertPayment>(`/api/educativa/student/${slug}/certificates/${r.id}/payments`, {
        paymentMethod: 'MercadoPago',
      })
      const checkout = await apiService.post<{ paymentAttemptId: string; preferenceId: string; initPoint?: string | null }>(
        `/api/educativa/student/${slug}/certificates/${r.id}/payments/${payment.id}/mercadopago/checkout`,
        {},
      )
      if (checkout.initPoint) {
        window.open(checkout.initPoint, '_blank', 'noopener,noreferrer')
        window.location.href = `/estudiante/pagos/mercadopago/result?attempt=${checkout.paymentAttemptId}`
      }
    } catch { /* backend es autoridad */ } finally {
      setBusy(null)
    }
  }

  async function uploadProof(file: File) {
    if (!payTarget) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      await apiService.postForm(`/api/educativa/student/${slug}/certificates/${payTarget.requestId}/payments/${payTarget.payment.id}/proof`, form)
      setPayTarget(null)
      invalidate()
    } catch { /* ignore */ } finally {
      setUploading(false)
    }
  }

  async function download(r: EstudianteCertRequest) {
    const res = await apiService.get<{ downloadUrl: string }>(`/api/educativa/student/${slug}/certificates/${r.id}/download`)
    window.open(res.downloadUrl, '_blank')
  }

  const showSelection = selectable.length > 0

  return (
    <div className="space-y-5">
      {availableQuery.isLoading && <div className="flex justify-center py-8 text-slate-400"><Spinner /></div>}

      {/* Selección de certificados */}
      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Certificados disponibles</h2>
        {!showSelection && !availableQuery.isLoading && (
          <Card>
            <EmptyState icon="🎖️" title="Sin certificados por solicitar" description="Ya solicitaste los certificados disponibles para esta cursada." />
          </Card>
        )}
        {showSelection && (
          <>
            {hasDebt && (
              <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                <div className="min-w-0">
                  <p className="font-bold">Debés regularizar tu deuda para solicitar certificados</p>
                  <p className="mt-0.5 text-amber-700 dark:text-amber-400">{debtMessage}</p>
                </div>
                <Link to="/estudiante/pagos" className="shrink-0">
                  <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700">Ir a pagar</Button>
                </Link>
              </div>
            )}
            {!requiredAvailable && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
                No hay certificado obligatorio configurado para esta formación. Contactá a la administración.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {[...selectable].sort((a, b) => Number(b.isRequired) - Number(a.isRequired)).map((a) => {
                const isSelected = selected.includes(a.certificateTypeId)
                const canSelect = !hasDebt && (a.isRequired || hasRequiredSelected)
                return (
                  <Card key={a.certificateTypeId} className={`p-4 ${isSelected ? 'ring-2 ring-violet-500' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{a.certificateTypeName}</p>
                          {a.isRequired && <Badge variant="info">Obligatorio</Badge>}
                        </div>
                        <p className="text-xs text-slate-400">{a.trainingName} · {a.commissionName}</p>
                        <p className={`mt-1 text-sm font-semibold ${a.priceToDefine ? 'text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-slate-300'}`}>{certPriceLabel(a)}</p>
                      </div>
                      <Button size="sm" variant={isSelected ? 'primary' : 'outline'} disabled={!canSelect} onClick={() => toggle(a.certificateTypeId, a.isRequired)}>
                        {isSelected ? 'Seleccionado' : 'Seleccionar'}
                      </Button>
                    </div>
                    {!a.isRequired && !hasRequiredSelected && !hasDebt && (
                      <p className="mt-2 text-[10px] text-slate-400">Primero seleccioná el certificado obligatorio.</p>
                    )}
                  </Card>
                )
              })}
            </div>
            <div className="mt-3">
              <Button variant="primary" disabled={hasDebt || selected.length === 0 || !requiredAvailable} loading={busy === 'confirm'} onClick={confirmSelection}>
                Confirmar selección
              </Button>
            </div>
          </>
        )}
      </section>

      {/* Mis solicitudes */}
      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Mis solicitudes</h2>
        {mine.length === 0 && !mineQuery.isLoading && (
          <p className="text-sm text-slate-400">Todavía no solicitaste certificados para esta cursada.</p>
        )}
        <div className="space-y-3">
          {[...mine].sort((a, b) => Number(b.isRequired) - Number(a.isRequired)).map((m) => {
            const canStartPayment = m.canPay && (m.status === 'Solicitado' || m.status === 'PendientePago')
            const blockReason = m.payBlockReason && !m.canPay && (m.status === 'Solicitado' || m.status === 'PendientePago' || m.status === 'EnRevision')
              ? m.payBlockReason
              : null
            return (
              <Card key={m.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{m.certificateTypeName}</p>
                    {m.isRequired && <Badge variant="info">Obligatorio</Badge>}
                    {certStatusBadge(m.status)}
                  </div>
                  <p className="text-xs text-slate-400">
                    {m.trainingName} · Solicitada {fmtDate(m.createdAtUtc)} · Importe {requestPriceLabel(m)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {obligationBadge(m.obligationStatus)}
                    {paymentBadge(m.paymentStatus)}
                  </div>
                  {blockReason && (
                    <p className="mt-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">{m.payBlockReason}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {canStartPayment && (
                    <Button size="sm" variant="primary" loading={busy === 'pay-' + m.id} onClick={() => payRequest(m)}>
                      Pagar por transferencia
                    </Button>
                  )}
                  {canStartPayment && (
                    <Button size="sm" variant="outline" loading={busy === 'mp-' + m.id} onClick={() => payMercadoPago(m)}>
                      Mercado Pago
                    </Button>
                  )}
                  {m.status === 'PendientePago' && !m.canPay && (
                    <Button size="sm" variant="outline" disabled title={m.payBlockReason ?? ''}>Pagar</Button>
                  )}
                  {m.finalDocumentUrl && m.status === 'Emitido' && (
                    <Button size="sm" variant="outline" onClick={() => download(m)}>Descargar certificado</Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Modal de pago (transferencia + comprobante) */}
      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title="Pagar certificado" description={payTarget ? `${fmtMoney(payTarget.payment.totalAmount, payTarget.payment.currency)}` : undefined}>
        {payTarget && (
          <div className="space-y-4 p-5 sm:p-6">
            {payTarget.payment.transferInstructions && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{payTarget.payment.transferInstructions}</p>
            )}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
              {payTarget.payment.transferAlias && <p className="flex justify-between"><span className="text-slate-400">Alias</span><span className="font-semibold">{payTarget.payment.transferAlias}</span></p>}
              {payTarget.payment.transferCbu && <p className="flex justify-between"><span className="text-slate-400">CBU</span><span className="font-semibold">{payTarget.payment.transferCbu}</span></p>}
              {payTarget.payment.transferHolder && <p className="flex justify-between"><span className="text-slate-400">Titular</span><span className="font-semibold">{payTarget.payment.transferHolder}</span></p>}
              {payTarget.payment.transferBank && <p className="flex justify-between"><span className="text-slate-400">Banco</span><span className="font-semibold">{payTarget.payment.transferBank}</span></p>}
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Adjuntá el comprobante de transferencia:</p>
              <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.pdf" className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-violet-700 dark:file:bg-violet-900/40 dark:file:text-violet-300"
                onChange={(e) => { if (e.target.files?.[0]) uploadProof(e.target.files[0]) }} />
            </div>
            {uploading && <p className="text-xs text-slate-400">Subiendo comprobante...</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}