import { useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService, getApiError } from '@/lib/api'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SelectField } from '@/components/ui/select-field'
import { Spinner } from '@/components/ui/spinner'
import { fmtMoney, fmtDate, EducativaObligation, EducativaEnrollmentPayment, paymentMethodLabel } from '../types'

interface PaymentMethodOption {
  id: string
  paymentMethod: string
  paymentMethodName?: string
  displayName?: string
  enabledBySuperAdmin: boolean
  isEnabledByAdmin: boolean
  surchargeType?: string
  surchargeValue?: number
  instructions?: string | null
  alias?: string | null
  cbu?: string | null
  holderName?: string | null
  bankName?: string | null
}

interface PayableObligation {
  id: string
  commissionEnrollmentId: string
  description: string
  amount: number
  currency: string
  dueDateUtc: string
  status: string
  moraAmount: number
  totalToPay: number
  studentName?: string | null
  periodLabel?: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  slug: string
  enrollmentId: string
  commissionId?: string
  /** Obligación ya conocida (ej. desde Pagos y Cuotas). Si no se pasa, se listan las cobrables. */
  initialObligation?: PayableObligation | null
  /** Nombre del alumno cuando se conoce en el origen (detalle del alumno / comisión). */
  studentName?: string | null
  onDone?: () => void
}

function obligationStatusBadge(status: string) {
  switch (status) {
    case 'Paid': return <Badge variant="success">Pagada</Badge>
    case 'Overdue': return <Badge variant="danger">Vencida</Badge>
    case 'Cancelled': return <Badge variant="default">Cancelada</Badge>
    default: return <Badge variant="warning">Pendiente</Badge>
  }
}

export function CollectPaymentModal({
  open,
  onClose,
  slug,
  enrollmentId,
  commissionId,
  initialObligation,
  studentName,
  onDone,
}: Props) {
  const queryClient = useQueryClient()
  const [obligationId, setObligationId] = useState('')
  const [method, setMethod] = useState('')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<EducativaEnrollmentPayment | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const hasPreloadedObligation = !!initialObligation

  const obligationsQuery = useQuery({
    queryKey: ['educativa-obligations', slug, commissionId, enrollmentId],
    queryFn: () => apiService.get<EducativaObligation[]>(
      `/api/educativa/${slug}/commissions/${commissionId}/enrollments/${enrollmentId}/obligations`,
    ),
    enabled: open && !hasPreloadedObligation && !!slug && !!commissionId && !!enrollmentId,
    retry: false,
  })

  const methodsQuery = useQuery({
    queryKey: ['educativa-payment-methods', slug],
    queryFn: () => apiService.get<PaymentMethodOption[]>(`/api/educativa/${slug}/payment-methods`),
    enabled: open && !!slug,
    retry: false,
  })

  const methods = useMemo(
    () => (methodsQuery.data ?? []).filter((pm) => pm.enabledBySuperAdmin && pm.isEnabledByAdmin),
    [methodsQuery.data],
  )

  const payables = useMemo(() => {
    const list = obligationsQuery.data ?? []
    return list.filter((o) => o.status === 'Pending' || o.status === 'Overdue')
  }, [obligationsQuery.data])

  const selectedObligation: PayableObligation | null = useMemo(() => {
    if (initialObligation) return initialObligation
    return payables.find((o) => o.id === obligationId) ?? null
  }, [initialObligation, payables, obligationId])

  const selectedMethod = methods.find((pm) => String(pm.paymentMethod) === method)

  function reset() {
    setObligationId('')
    setMethod('')
    setReference('')
    setNote('')
    setError(null)
    setResult(null)
    setProofFile(null)
  }

  function close() {
    if (busy || uploadingProof) return
    reset()
    onClose()
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['educativa-obligations', slug] })
    queryClient.invalidateQueries({ queryKey: ['educativa-enrollments', slug] })
    queryClient.invalidateQueries({ queryKey: ['educativa-financial-summary', slug] })
    queryClient.invalidateQueries({ queryKey: ['educativa-payments', slug] })
    queryClient.invalidateQueries({ queryKey: ['educativa-student-detail', slug] })
    onDone?.()
  }

  async function handleConfirm() {
    if (!selectedObligation || !method) return
    setBusy(true)
    setError(null)
    try {
      const payment = await apiService.post<EducativaEnrollmentPayment>(
        `/api/educativa/${slug}/enrollments/${enrollmentId}/payments/collect`,
        {
          enrollmentObligationId: selectedObligation.id,
          paymentMethod: method,
          note: isTransfer ? reference || undefined : note || undefined,
        },
      )
      setResult(payment)

      invalidate()
    } catch (err) {
      setError(getApiError(err) || 'No se pudo registrar el cobro.')
    } finally {
      setBusy(false)
    }
  }

  async function handleUploadProof() {
    if (!result || !proofFile) return
    setUploadingProof(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', proofFile)
      const updated = await apiService.post<EducativaEnrollmentPayment>(
        `/api/educativa/${slug}/enrollments/${enrollmentId}/payments/${result.id}/proof`,
        form,
      )
      setProofFile(null)
      setResult(updated)
      invalidate()
    } catch (err) {
      setError(getApiError(err) || 'No se pudo subir el comprobante.')
    } finally {
      setUploadingProof(false)
    }
  }

  const isCash = method === 'Cash'
  const isTransfer = method === 'Transfer'
  const isMercadoPago = method === 'MercadoPago'

  return (
    <Modal
      open={open}
      onClose={close}
      title="Registrar cobro"
      description="El pago se registra recién al confirmar."
      className="sm:max-w-lg"
    >
      <div className="space-y-4 px-5 py-4 sm:px-6">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">{error}</p>
        )}

        {!hasPreloadedObligation && (
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Concepto / obligación</label>
            {obligationsQuery.isLoading && <div className="flex justify-center py-4 text-slate-400"><Spinner /></div>}
            {!obligationsQuery.isLoading && payables.length === 0 && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-400 dark:bg-slate-800">No hay obligaciones pendientes o vencidas para cobrar.</p>
            )}
            {!obligationsQuery.isLoading && payables.length > 0 && (
              <SelectField
                value={obligationId}
                onValueChange={(v) => { setObligationId(v); setMethod(''); setResult(null) }}
                placeholder="Seleccioná la obligación a cobrar"
                aria-label="Obligación"
                options={payables.map((o) => ({
                  value: o.id,
                  label: `${o.description} · ${fmtMoney(o.totalToPay, o.currency)}`,
                  description: o.periodLabel ? `Período ${o.periodLabel}` : `Vence ${fmtDate(o.dueDateUtc)}`,
                }))}
              />
            )}
          </div>
        )}

        {selectedObligation && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Alumno</p>
                <p className="text-sm font-semibold">{selectedObligation.studentName || studentName || '—'}</p>
              </div>
              {obligationStatusBadge(selectedObligation.status)}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Concepto</p>
                <p className="font-medium">{selectedObligation.description}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Período</p>
                <p className="font-medium">{selectedObligation.periodLabel ?? '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Vencimiento</p>
                <p className="font-medium">{fmtDate(selectedObligation.dueDateUtc)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Capital</p>
                <p className="font-medium">{fmtMoney(selectedObligation.amount, selectedObligation.currency)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mora</p>
                <p className="font-medium text-red-500">{selectedObligation.moraAmount > 0 ? fmtMoney(selectedObligation.moraAmount, selectedObligation.currency) : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total a cobrar</p>
                <p className="font-black">{fmtMoney(selectedObligation.totalToPay, selectedObligation.currency)}</p>
              </div>
            </div>
          </div>
        )}

        {!result && (
          <>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Medio de pago <span className="text-red-500">*</span></label>
              {methods.length === 0 ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                  No hay medios de pago habilitados en Config. pagos para esta empresa.
                </p>
              ) : (
                <SelectField
                  value={method}
                  onValueChange={setMethod}
                  placeholder="Seleccioná el medio de pago"
                  aria-label="Medio de pago"
                  options={methods.map((pm) => ({
                    value: String(pm.paymentMethod),
                    label: pm.displayName || pm.paymentMethodName || paymentMethodLabel[pm.paymentMethod] || pm.paymentMethod,
                  }))}
                />
              )}
            </div>

            {selectedMethod && Number(selectedMethod.surchargeValue) > 0 && (
              <div className="rounded-xl bg-amber-50 p-3 text-sm ring-1 ring-amber-200 dark:bg-amber-900/30 dark:ring-amber-700">
                <p className="font-semibold text-amber-800 dark:text-amber-300">Recargo por método de pago</p>
                <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                  {selectedMethod.surchargeType === 'Percentage'
                    ? `${selectedMethod.surchargeValue}% de recargo sobre el total`
                    : `$${selectedMethod.surchargeValue} de recargo`}
                </p>
              </div>
            )}

            {isTransfer && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Referencia / comprobante (opcional)</label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N° de transacción, comprobante..." />
              </div>
            )}

            {isCash && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Nota (opcional)</label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Observaciones internas..." />
              </div>
            )}

            {isMercadoPago && (
              <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                Estás registrando que la institución ya recibió este pago mediante Mercado Pago. No se inicia ningún checkout y se acredita de inmediato.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={close}>Cancelar</Button>
              <Button onClick={handleConfirm} loading={busy} disabled={!selectedObligation || !method}>
                Confirmar cobro
              </Button>
            </div>
          </>
        )}

        {result && (
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              {result.status === 'Approved' && <p className="font-semibold">Cobro registrado y acreditado.</p>}
              {result.status !== 'Approved' && <p className="font-semibold">Pago registrado. Queda pendiente de revisión.</p>}
              {result.totalAmount != null && (
                <p className="mt-0.5">Importe: {fmtMoney(result.totalAmount, result.currency)}</p>
              )}
            </div>

            {isTransfer && (result.transferAlias || result.transferCbu || result.transferHolder || result.transferBank || result.transferInstructions) && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Datos para la transferencia</p>
                <div className="mt-2 space-y-1 text-slate-700 dark:text-slate-300">
                  {result.transferHolder && <p><span className="text-slate-400">Titular:</span> {result.transferHolder}</p>}
                  {result.transferAlias && <p><span className="text-slate-400">Alias:</span> {result.transferAlias}</p>}
                  {result.transferCbu && <p><span className="text-slate-400">CBU:</span> {result.transferCbu}</p>}
                  {result.transferBank && <p><span className="text-slate-400">Banco:</span> {result.transferBank}</p>}
                  {result.transferInstructions && <p className="pt-1 text-xs">{result.transferInstructions}</p>}
                </div>
              </div>
            )}

            {isTransfer && result && (
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {result.status === 'Approved' ? 'Comprobante de transferencia (opcional, como evidencia del cobro)' : 'Comprobante de transferencia (opcional)'}
                </p>
                <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Elegir archivo</Button>
                  <span className="truncate text-xs text-slate-400">{proofFile ? proofFile.name : 'Ninguno'}</span>
                  {proofFile && (
                    <Button variant="primary" size="sm" loading={uploadingProof} onClick={handleUploadProof}>Subir</Button>
                  )}
                </div>
              </div>
            )}

            {result.receiptUrl && (
              <a href={result.receiptUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">Ver recibo</Button>
              </a>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={close}>Cerrar</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}