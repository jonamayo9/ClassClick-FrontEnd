import { useState, useRef, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { fmtMoney, fmtDate, EstudianteEnrollment, EstudianteObligation, EstudiantePayment, EstudiantePaymentMethod } from '../types'

const paymentMethodLabel: Record<string, string> = {
  Transfer: 'Transferencia',
  DebitCard: 'Tarjeta de débito',
  CreditCard: 'Tarjeta de crédito',
  MercadoPago: 'Mercado Pago',
  Cash: 'Efectivo',
}

function obligationBadge(status: string) {
  switch (status) {
    case 'Paid': return <Badge variant="success">Pagada</Badge>
    case 'Overdue': return <Badge variant="danger">Vencida</Badge>
    case 'Cancelled': return <Badge variant="default">Cancelada</Badge>
    default: return <Badge variant="warning">Pendiente</Badge>
  }
}

function paymentBadge(status: string) {
  switch (status) {
    case 'Approved': return <Badge variant="success">Aprobado</Badge>
    case 'InReview': return <Badge variant="info">En revisión</Badge>
    case 'Rejected': return <Badge variant="danger">Rechazado</Badge>
    default: return <Badge variant="warning">Pendiente</Badge>
  }
}

function EnrollmentPaymentsCard({ slug, enrollment }: { slug: string; enrollment: EstudianteEnrollment }) {
  const queryClient = useQueryClient()
  const [paying, setPaying] = useState<EstudianteObligation | null>(null)
  const [cashPaying, setCashPaying] = useState<EstudianteObligation | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mpBusyObligation, setMpBusyObligation] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const obligationsQuery = useQuery({
    queryKey: ['estudiante-obligations', slug, enrollment.id],
    queryFn: () => apiService.get<EstudianteObligation[]>(`/api/educativa/student/${slug}/enrollments/${enrollment.id}/obligations`),
    enabled: !!slug,
    retry: false,
  })

  const paymentsQuery = useQuery({
    queryKey: ['estudiante-payments', slug, enrollment.id],
    queryFn: () => apiService.get<EstudiantePayment[]>(`/api/educativa/student/${slug}/enrollments/${enrollment.id}/payments`),
    enabled: !!slug,
    retry: false,
  })

  const methodsQuery = useQuery({
    queryKey: ['estudiante-payment-methods', slug],
    queryFn: () => apiService.get<EstudiantePaymentMethod[]>(`/api/educativa/student/${slug}/payment-methods`),
    enabled: !!slug,
    retry: false,
  })

  const obligations = obligationsQuery.data ?? []
  const payments = paymentsQuery.data ?? []
  const methods = methodsQuery.data ?? []
  const transferMethod = methods.find((m) => m.paymentMethod === 'Transfer')
  const mpEnabled = methods.some((m) => m.paymentMethod === 'MercadoPago')
  const cashEnabled = methods.some((m) => m.paymentMethod === 'Cash')

  // Recibo del pago aprobado real de cada obligación (si una cuota tuvo varios pagos,
  // se toma el pago aprobado real, no uno arbitrario).
  const receiptByObligation = useMemo(() => {
    const map = new Map<string, EstudiantePayment>()
    for (const p of payments) {
      if (p.status === 'Approved' && p.receiptUrl && !map.has(p.enrollmentObligationId)) {
        map.set(p.enrollmentObligationId, p)
      }
    }
    return map
  }, [payments])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['estudiante-enrollments', slug] })
    queryClient.invalidateQueries({ queryKey: ['estudiante-obligations', slug] })
    queryClient.invalidateQueries({ queryKey: ['estudiante-payments', slug] })
  }

  async function openTransfer(obligation: EstudianteObligation) {
    setError(null)
    setFile(null)
    setPaying(obligation)
  }

  async function submitTransfer() {
    if (!paying || !file) return
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('enrollmentObligationId', paying.id)
      form.append('file', file)
      await apiService.postForm(
        `/api/educativa/student/${slug}/enrollments/${enrollment.id}/payments/transfer`,
        form,
      )
      setPaying(null)
      setFile(null)
      invalidate()
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'No se pudo enviar la transferencia.')
    } finally {
      setBusy(false)
    }
  }

  async function submitCash() {
    if (!cashPaying) return
    setBusy(true)
    setError(null)
    try {
      await apiService.post<EstudiantePayment>(
        `/api/educativa/student/${slug}/enrollments/${enrollment.id}/payments`,
        { enrollmentObligationId: cashPaying.id, paymentMethod: 'Cash' },
      )
      setCashPaying(null)
      invalidate()
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'No se pudo informar el pago en efectivo.')
    } finally {
      setBusy(false)
    }
  }

  async function payMercadoPago(obligation: EstudianteObligation) {
    setError(null)
    setMpBusyObligation(obligation.id)
    try {
      const p = await apiService.post<EstudiantePayment>(
        `/api/educativa/student/${slug}/enrollments/${enrollment.id}/payments`,
        { enrollmentObligationId: obligation.id, paymentMethod: 'MercadoPago' },
      )
      const checkout = await apiService.post<{ paymentAttemptId: string; preferenceId: string; initPoint?: string | null }>(
        `/api/educativa/student/${slug}/enrollments/${enrollment.id}/payments/${p.id}/mercadopago/checkout`,
        {},
      )
      if (checkout.initPoint) {
        window.open(checkout.initPoint, '_blank', 'noopener,noreferrer')
        window.location.href = `/estudiante/pagos/mercadopago/result?attempt=${checkout.paymentAttemptId}`
      } else {
        setError('No fue posible iniciar el pago con Mercado Pago.')
      }
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'No se pudo iniciar el pago con Mercado Pago.')
    } finally {
      setMpBusyObligation(null)
    }
  }

  const close = () => { if (!busy) { setPaying(null); setFile(null) } }

  return (
    <>
      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{enrollment.trainingName}</h2>
            <p className="text-xs text-slate-400">{enrollment.commissionName}</p>
          </div>
          <p className={`text-sm font-bold ${enrollment.balanceDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            Saldo: {fmtMoney(enrollment.balanceDue, enrollment.snapshotCurrency)}
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {obligations.map((o) => (
            <div key={o.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{o.description}</p>
                <p className="text-xs text-slate-400">Vence {fmtDate(o.dueDateUtc)} · {fmtMoney(o.amount, o.currency)}</p>
                {o.status === 'Pending' && o.moraAmount > 0 && <p className="text-[11px] text-red-500">Mora {fmtMoney(o.moraAmount, o.currency)} · Total {fmtMoney(o.totalToPay, o.currency)}</p>}
                <div className="mt-1">{obligationBadge(o.status)}</div>
              </div>
              {(o.status === 'Pending' || o.status === 'Overdue') && enrollment.status === 'Active' && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {transferMethod && <Button size="sm" variant="primary" onClick={() => openTransfer(o)}>Pagar por transferencia</Button>}
                  {mpEnabled && <Button size="sm" variant="outline" onClick={() => payMercadoPago(o)} loading={mpBusyObligation === o.id}>Pagar con Mercado Pago</Button>}
                  {cashEnabled && <Button size="sm" variant="outline" onClick={() => { setError(null); setCashPaying(o) }}>Pagar en efectivo</Button>}
                </div>
              )}
              {o.status === 'Paid' && receiptByObligation.get(o.id) && (
                <div className="flex shrink-0 items-center gap-2">
                  <a href={receiptByObligation.get(o.id)!.receiptUrl!} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">Ver recibo</Button>
                  </a>
                </div>
              )}
            </div>
          ))}
          {obligations.length === 0 && <p className="px-5 py-4 text-sm text-slate-400">Sin obligaciones.</p>}
        </div>

        {payments.length > 0 && (
          <div className="border-t border-slate-200 px-5 py-3 dark:border-slate-700">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Pagos realizados</p>
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{p.obligationDescription}</p>
                      {paymentBadge(p.status)}
                    </div>
                    <p className="text-xs text-slate-400">{paymentMethodLabel[p.paymentMethod] ?? p.paymentMethod} · {fmtDate(p.createdAtUtc)} · {fmtMoney(p.totalAmount, p.currency)} (capital {fmtMoney(p.capitalAmount, p.currency)}{p.moraAmount > 0 ? ` + mora ${fmtMoney(p.moraAmount, p.currency)}` : ''})</p>
                    {p.reviewNote && <p className="text-[11px] text-amber-600 dark:text-amber-400">Nota: {p.reviewNote}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {p.latestProofUrl && <a href={p.latestProofUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">Comprobante</Button></a>}
                    {p.receiptUrl && <a href={p.receiptUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">Recibo</Button></a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Modal open={!!paying} onClose={close} title="Pagar por transferencia" description={paying?.description}>
        <div className="space-y-4 p-5 sm:p-6">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">{error}</p>}

          {paying && (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Importe a transferir</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{fmtMoney(paying.totalToPay, paying.currency)}</p>
                {paying.moraAmount > 0 && <p className="text-xs text-red-500">Incluye mora de {fmtMoney(paying.moraAmount, paying.currency)}</p>}
                <div className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                  {transferMethod?.holderName && <p><span className="text-slate-400">Titular:</span> {transferMethod.holderName}</p>}
                  {transferMethod?.alias && <p><span className="text-slate-400">Alias:</span> {transferMethod.alias}</p>}
                  {transferMethod?.cbu && <p><span className="text-slate-400">CBU:</span> {transferMethod.cbu}</p>}
                  {transferMethod?.bankName && <p><span className="text-slate-400">Banco:</span> {transferMethod.bankName}</p>}
                  {transferMethod?.instructions && <p className="pt-1 text-xs text-slate-500 dark:text-slate-400">{transferMethod.instructions}</p>}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Comprobante de transferencia (obligatorio)</p>
                <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => fileRef.current?.click()}>Elegir archivo</Button>
                  <span className="text-xs text-slate-400">{file ? file.name : 'Ninguno'}</span>
                </div>
                {!file && <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Debés adjuntar el comprobante de la transferencia para poder continuar.</p>}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={close}>Cancelar</Button>
                <Button variant="primary" onClick={submitTransfer} loading={busy} disabled={!file}>Confirmar pago</Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal open={!!cashPaying} onClose={() => setCashPaying(null)} title="Pagar en efectivo" description={cashPaying?.description}>
        <div className="space-y-4 p-5 sm:p-6">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">{error}</p>}
          {cashPaying && (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Importe a abonar</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{fmtMoney(cashPaying.totalToPay, cashPaying.currency)}</p>
                {cashPaying.moraAmount > 0 && <p className="text-xs text-red-500">Incluye mora de {fmtMoney(cashPaying.moraAmount, cashPaying.currency)}</p>}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Estás informando que vas a abonar en efectivo. El pago quedará <b>pendiente de confirmación por la institución</b> y no se acredita automáticamente.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setCashPaying(null)}>Cancelar</Button>
                <Button variant="primary" onClick={submitCash} loading={busy}>Confirmar</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  )
}

export function EstudiantePagosPage() {
  const slug = useAuth((s) => s.activeCompanySlug ?? '')

  const enrollmentsQuery = useQuery({
    queryKey: ['estudiante-enrollments', slug],
    queryFn: () => apiService.get<EstudianteEnrollment[]>(`/api/educativa/student/${slug}/enrollments`),
    enabled: !!slug,
    retry: false,
  })

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-violet-200">Portal del alumno</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Pagos</h1>
          <p className="mt-1 text-sm text-violet-200">Matrícula y cuotas. Importes y mora calculados por el sistema.</p>
        </div>
      </section>

      {enrollmentsQuery.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner /></div>}

      {!enrollmentsQuery.isLoading && (enrollmentsQuery.data ?? []).length === 0 && (
        <Card><EmptyState icon="💳" title="Sin pagos" description="No tenés obligaciones por el momento." /></Card>
      )}

      <div className="space-y-4">
        {(enrollmentsQuery.data ?? []).map((e) => (
          <EnrollmentPaymentsCard key={e.id} slug={slug} enrollment={e} />
        ))}
      </div>
    </div>
  )
}