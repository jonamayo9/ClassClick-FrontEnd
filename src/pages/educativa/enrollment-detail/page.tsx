import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { CollectPaymentModal } from '../components/CollectPaymentModal'
import { fmtMoney, fmtDate, EducativaEnrollment, EducativaObligation, EducativaEnrollmentPayment, EducativaLegajoCertificate } from '../types'

const methodLabels: Record<string, string> = {
  Cash: 'Efectivo',
  Transfer: 'Transferencia',
  MercadoPago: 'Mercado Pago',
  DebitCard: 'Tarjeta de débito',
  CreditCard: 'Tarjeta de crédito',
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-0.5 text-base font-bold ${tone ?? 'text-slate-900 dark:text-white'}`}>{value}</p>
    </div>
  )
}

export function EducativaEnrollmentDetailPage() {
  const { companySlug, commissionId, enrollmentId } = useParams<{ companySlug: string; commissionId: string; enrollmentId: string }>()
  const slug = companySlug ?? ''
  const commission = commissionId ?? ''
  const enrollment = enrollmentId ?? ''
  const queryClient = useQueryClient()

  const [collectTarget, setCollectTarget] = useState<EducativaObligation | null>(null)
  const [reviewTarget, setReviewTarget] = useState<EducativaEnrollmentPayment | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['educativa-enrollment', slug, commission, enrollment] })
    queryClient.invalidateQueries({ queryKey: ['educativa-obligations', slug, commission, enrollment] })
    queryClient.invalidateQueries({ queryKey: ['educativa-payments', slug, commission, enrollment] })
    queryClient.invalidateQueries({ queryKey: ['educativa-enrollments', slug, commission] })
  }

  const enrollmentQuery = useQuery({
    queryKey: ['educativa-enrollment', slug, commission, enrollment],
    queryFn: () => apiService.get<EducativaEnrollment>(`/api/educativa/${slug}/commissions/${commission}/enrollments/${enrollment}`),
    enabled: !!slug && !!commission && !!enrollment,
    retry: false,
  })

  const obligationsQuery = useQuery({
    queryKey: ['educativa-obligations', slug, commission, enrollment],
    queryFn: () => apiService.get<EducativaObligation[]>(`/api/educativa/${slug}/commissions/${commission}/enrollments/${enrollment}/obligations`),
    enabled: !!slug && !!commission && !!enrollment,
    retry: false,
  })

  const paymentsQuery = useQuery({
    queryKey: ['educativa-payments', slug, commission, enrollment],
    queryFn: () => apiService.get<EducativaEnrollmentPayment[]>(`/api/educativa/${slug}/enrollments/${enrollment}/payments`),
    enabled: !!slug && !!commission && !!enrollment,
    retry: false,
  })

  const legajoQuery = useQuery({
    queryKey: ['educativa-legajo', slug, enrollmentQuery.data?.userId],
    queryFn: () => apiService.get<EducativaLegajoCertificate[]>(`/api/educativa/${slug}/certificates/legajo?userId=${enrollmentQuery.data?.userId}`),
    enabled: !!slug && !!enrollmentQuery.data?.userId,
    retry: false,
  })

  async function doReview(action: 'approve' | 'reject') {
    if (!reviewTarget) return
    setReviewing(true)
    setError(null)
    try {
      await apiService.post(
        `/api/educativa/${slug}/enrollments/${enrollment}/payments/${reviewTarget.id}/${action}`,
        reviewNote ? { reviewNote } : {},
      )
      setReviewTarget(null)
      setReviewNote('')
      invalidate()
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'No se pudo revisar el pago.')
    } finally {
      setReviewing(false)
    }
  }

  const data = enrollmentQuery.data
  const obligations = obligationsQuery.data ?? []
  const payments = paymentsQuery.data ?? []
  const legajo = legajoQuery.data ?? []

  // Recibo del pago aprobado real de cada obligación (si una cuota tuvo varios pagos,
  // se toma el pago aprobado real, no uno arbitrario).
  const receiptByObligation = new Map<string, EducativaEnrollmentPayment>()
  for (const p of payments) {
    if (p.status === 'Approved' && p.receiptUrl && !receiptByObligation.has(p.enrollmentObligationId)) {
      receiptByObligation.set(p.enrollmentObligationId, p)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      {enrollmentQuery.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner /></div>}
      {enrollmentQuery.isError && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          No se pudo cargar la inscripción.
        </p>
      )}

      {data && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            
            <div className="relative">
              <Link to={`/educativa/${slug}/commissions/${commission}/enrollments`} className="text-xs text-blue-200 underline-offset-2 hover:underline">
                ← Alumnos de la comisión
              </Link>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{data.studentName}</h1>
                  <p className="text-sm text-blue-200">{data.studentEmail}</p>
                </div>
                {data.status === 'Active' ? <Badge variant="success" className="self-start">Inscripción activa</Badge>
                  : data.status === 'Cancelled' ? <Badge variant="default" className="self-start">Cancelada</Badge>
                  : <Badge variant="info" className="self-start">Completada</Badge>}
              </div>
            </div>
          </section>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">{error}</p>}

          {/* Datos de la inscripción */}
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Datos de la inscripción</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Inscripto" value={fmtDate(data.enrolledAtUtc)} />
              <Stat label="Total contractual" value={fmtMoney(data.snapshotTotalContractual, data.snapshotCurrency)} />
              <Stat label="Total pagado" value={fmtMoney(data.totalPaid, data.snapshotCurrency)} tone="text-emerald-600 dark:text-emerald-400" />
              <Stat label="Saldo pendiente" value={fmtMoney(data.balanceDue, data.snapshotCurrency)} tone={data.balanceDue > 0 ? 'text-red-600 dark:text-red-400' : undefined} />
            </div>
          </section>

          {/* Snapshot económico */}
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Snapshot económico (contrato)</h2>
            <Card>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Matrícula</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white">{fmtMoney(data.matriculaAmount, data.snapshotCurrency)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Cuotas</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white">{data.paidInstallments}/{data.installmentCount}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Importe cuota</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white">{fmtMoney(data.snapshotInstallmentAmount, data.snapshotCurrency)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Próximo venc.</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white">{fmtDate(data.nextDueDateUtc)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Vencidas</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white">{data.overdueCount}</p>
                </div>
              </div>
            </Card>
          </section>

          {/* Obligaciones */}
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Obligaciones</h2>
            <Card className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {obligations.map((o) => {
                  const payable = data.status === 'Active' && (o.status === 'Pending' || o.status === 'Overdue')
                  return (
                    <div key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{o.description}</p>
                        <p className="text-xs text-slate-400">Vence {fmtDate(o.dueDateUtc)} · {fmtMoney(o.amount, o.currency)}</p>
                        <div className="mt-1">{obligationBadge(o.status)}</div>
                      </div>
                      {payable && (
                        <Button size="sm" variant="primary" onClick={() => setCollectTarget(o)}>
                          Cobrar
                        </Button>
                      )}
                      {o.status === 'Paid' && receiptByObligation.get(o.id) && (
                        <a href={receiptByObligation.get(o.id)!.receiptUrl!} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline">Ver recibo</Button>
                        </a>
                      )}
                    </div>
                  )
                })}
                {obligations.length === 0 && (
                  <p className="px-5 py-6 text-center text-sm text-slate-400">Sin obligaciones generadas.</p>
                )}
              </div>
            </Card>
          </section>

          {/* Pagos */}
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Pagos realizados</h2>
            <Card className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.map((p) => (
                  <div key={p.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{p.obligationDescription}</p>
                        {paymentBadge(p.status)}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {methodLabels[p.paymentMethod] ?? p.paymentMethod} · {fmtDate(p.createdAtUtc)} · {p.currency}
                      </p>
                      {p.reviewNote && <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">Nota: {p.reviewNote}</p>}
                      {p.transferInstructions && p.paymentMethod === 'Transfer' && (
                        <p className="mt-0.5 text-xs text-slate-400">Dónde transferir: {p.transferInstructions}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{fmtMoney(p.totalAmount, p.currency)}</p>
                        <p className="text-[10px] text-slate-400">Capital {fmtMoney(p.capitalAmount, p.currency)} · Mora {fmtMoney(p.moraAmount, p.currency)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {p.latestProofUrl && (
                          <a href={p.latestProofUrl} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline">Comprobante</Button>
                          </a>
                        )}
                        {p.status === 'InReview' && (
                          <>
                            <Button size="sm" variant="primary" onClick={() => { setReviewTarget(p); setReviewNote('') }}>Aprobar</Button>
                            <Button size="sm" variant="danger" onClick={() => { setReviewTarget(p); setReviewNote('') }}>Rechazar</Button>
                          </>
                        )}
                        {p.receiptUrl && (
                          <a href={p.receiptUrl} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline">Recibo</Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {payments.length === 0 && (
                  <p className="px-5 py-6 text-center text-sm text-slate-400">Sin pagos registrados.</p>
                )}
              </div>
            </Card>
          </section>

          {/* Legajo Educativa: certificados emitidos */}
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Legajo · Certificados emitidos</h2>
            <Card className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {legajo.map((c) => (
                  <div key={c.certificateRequestId} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.certificateTypeName}</p>
                      <p className="text-xs text-slate-400">{c.trainingName} · {c.commissionName}</p>
                      <p className="text-xs text-slate-400">Emitido {c.emittedAtUtc ? fmtDate(c.emittedAtUtc) : '—'}</p>
                    </div>
                    {c.finalDocumentUrl && (
                      <a href={c.finalDocumentUrl} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline">Descargar</Button>
                      </a>
                    )}
                  </div>
                ))}
                {legajo.length === 0 && (
                  <p className="px-5 py-6 text-center text-sm text-slate-400">Sin certificados emitidos todavía.</p>
                )}
              </div>
            </Card>
          </section>
        </>
      )}

      {/* Registrar cobro */}
      <CollectPaymentModal
        open={!!collectTarget}
        onClose={() => setCollectTarget(null)}
        slug={slug}
        enrollmentId={enrollment}
        commissionId={commission}
        initialObligation={collectTarget}
        studentName={data?.studentName}
        onDone={invalidate}
      />

      {/* Revisar transferencia */}
      <Modal
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        title={reviewTarget?.status === 'InReview' ? 'Revisar transferencia' : 'Revisar pago'}
        description={reviewTarget ? `${reviewTarget.obligationDescription} · ${fmtMoney(reviewTarget.totalAmount, reviewTarget.currency)}` : undefined}
      >
        <div className="space-y-4 px-5 py-4 sm:px-6">
          <Textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Nota de revisión (opcional)"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReviewTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => doReview('reject')} loading={reviewing}>Rechazar</Button>
            <Button variant="primary" onClick={() => doReview('approve')} loading={reviewing}>Aprobar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}


