import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { CollectPaymentModal } from './CollectPaymentModal'
import { cn } from '@/lib/utils'
import {
  fmtMoney,
  fmtDate,
  EducativaStudentDetail,
  EducativaStudentDetailEnrollment,
  EducativaObligation,
  EducativaEnrollmentPayment,
  EducativaLegajoCertificate,
} from '../types'

const methodLabels: Record<string, string> = {
  Cash: 'Efectivo',
  Transfer: 'Transferencia',
  MercadoPago: 'Mercado Pago',
  DebitCard: 'Tarjeta de débito',
  CreditCard: 'Tarjeta de crédito',
}

function enrollmentStatusBadge(status: string) {
  switch (status) {
    case 'Active': return <Badge variant="success">Activa</Badge>
    case 'Cancelled': return <Badge variant="default">Cancelada</Badge>
    default: return <Badge variant="info">Completada</Badge>
  }
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">{value || '—'}</p>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn('mt-0.5 text-base font-bold', tone ?? 'text-slate-900 dark:text-white')}>{value}</p>
    </div>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  slug: string
  userId: string
  /** Inscripción a dejar seleccionada inicialmente (cuando se abre desde una Comisión). */
  initialEnrollmentId?: string | null
  /** Notifica a la pantalla origen para refrescar sus listados tras acciones financieras. */
  onDataChanged?: () => void
}

export function StudentDetailModal({ open, onClose, slug, userId, initialEnrollmentId, onDataChanged }: Props) {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cashEnrollment, setCashEnrollment] = useState<EducativaStudentDetailEnrollment | null>(null)
  const [reviewTarget, setReviewTarget] = useState<EducativaEnrollmentPayment | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) setSelectedId(null)
  }, [open, userId])

  const detailQuery = useQuery({
    queryKey: ['educativa-student-detail', slug, userId],
    queryFn: () => apiService.get<EducativaStudentDetail>(`/api/educativa/${slug}/students/${userId}/detail`),
    enabled: open && !!slug && !!userId,
    retry: false,
  })

  const enrollments = detailQuery.data?.enrollments ?? []
  const student = detailQuery.data?.student

  const activeEnrollmentId =
    selectedId ??
    (initialEnrollmentId && enrollments.some((e) => e.id === initialEnrollmentId) ? initialEnrollmentId : null) ??
    enrollments[0]?.id ??
    null

  const selectedEnrollment = enrollments.find((e) => e.id === activeEnrollmentId) ?? null
  const commissionId = selectedEnrollment?.commissionId ?? ''
  const enrollmentId = selectedEnrollment?.id ?? ''

  const obligationsQuery = useQuery({
    queryKey: ['educativa-obligations', slug, commissionId, enrollmentId],
    queryFn: () => apiService.get<EducativaObligation[]>(
      `/api/educativa/${slug}/commissions/${commissionId}/enrollments/${enrollmentId}/obligations`,
    ),
    enabled: open && !!commissionId && !!enrollmentId,
    retry: false,
  })

  const paymentsQuery = useQuery({
    queryKey: ['educativa-payments', slug, commissionId, enrollmentId],
    queryFn: () => apiService.get<EducativaEnrollmentPayment[]>(`/api/educativa/${slug}/enrollments/${enrollmentId}/payments`),
    enabled: open && !!commissionId && !!enrollmentId,
    retry: false,
  })

  const legajoQuery = useQuery({
    queryKey: ['educativa-legajo', slug, userId],
    queryFn: () => apiService.get<EducativaLegajoCertificate[]>(`/api/educativa/${slug}/certificates/legajo?userId=${userId}`),
    enabled: open && !!userId,
    retry: false,
  })

  const invalidateDetail = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['educativa-obligations', slug, commissionId, enrollmentId] })
    qc.invalidateQueries({ queryKey: ['educativa-payments', slug, commissionId, enrollmentId] })
    qc.invalidateQueries({ queryKey: ['educativa-student-detail', slug, userId] })
    qc.invalidateQueries({ queryKey: ['educativa-enrollments', slug, commissionId] })
    onDataChanged?.()
  }, [qc, slug, commissionId, enrollmentId, userId, onDataChanged])

  async function doReview(action: 'approve' | 'reject') {
    if (!reviewTarget) return
    setReviewing(true)
    setError(null)
    try {
      await apiService.post(
        `/api/educativa/${slug}/enrollments/${enrollmentId}/payments/${reviewTarget.id}/${action}`,
        reviewNote ? { reviewNote } : {},
      )
      setReviewTarget(null)
      setReviewNote('')
      invalidateDetail()
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'No se pudo revisar el pago.')
    } finally {
      setReviewing(false)
    }
  }

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
    <Modal
      open={open}
      onClose={onClose}
      title={student ? student.fullName : 'Detalle del alumno'}
      description={student?.email}
      className="sm:max-w-5xl"
    >
      <div className="space-y-6 px-5 py-4 sm:px-6">
        {detailQuery.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner /></div>}
        {detailQuery.isError && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
            No se pudo cargar el detalle del alumno.
          </p>
        )}

        {student && (
          <>
            {/* Cabecera */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-600 to-blue-800 p-4 text-white sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-black">
                  {student.firstName?.[0] ?? ''}{student.lastName?.[0] ?? ''}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-black">{student.fullName}</p>
                  <p className="truncate text-sm text-blue-100">{student.email}</p>
                  <p className="mt-0.5 text-[11px] text-blue-200">{student.dni ? `DNI ${student.dni}` : 'Sin DNI'}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${student.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                  {student.isActive ? 'Activo' : 'Inactivo'}
                </span>
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${student.registrationCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {student.registrationCompleted ? 'Registrado' : 'Pendiente de registro'}
                </span>
              </div>
            </div>

            {/* Datos personales */}
            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Datos personales</h2>
              <Card>
                <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4">
                  <Info label="Nombre" value={student.fullName} />
                  <Info label="DNI" value={student.dni ?? ''} />
                  <Info label="Email" value={student.email} />
                  <Info label="Teléfono" value={student.phone ?? ''} />
                  <Info label="WhatsApp" value={student.whatsAppNumber ?? ''} />
                  <Info label="Fecha de nacimiento" value={student.dateOfBirth ? `${fmtDate(student.dateOfBirth)}${student.age != null ? ` · ${student.age} años` : ''}` : ''} />
                  <Info label="País" value={student.country ?? ''} />
                  <Info label="Provincia" value={student.province ?? ''} />
                </div>
              </Card>
            </section>

            {/* Inscripciones */}
            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                Inscripciones ({enrollments.length})
              </h2>
              {enrollments.length === 0 && (
                <Card>
                  <p className="p-6 text-center text-sm text-slate-400">Este alumno no tiene inscripciones Educativa.</p>
                </Card>
              )}
              <div className="space-y-2">
                {enrollments.map((en) => {
                  const active = en.id === activeEnrollmentId
                  return (
                    <button
                      key={en.id}
                      type="button"
                      onClick={() => setSelectedId(en.id)}
                      className={cn(
                        'w-full rounded-2xl border p-4 text-left transition',
                        active
                          ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/30 dark:bg-blue-950/30'
                          : 'border-slate-200 bg-white hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700',
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white">{en.commissionName}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {en.trainingName}{en.categoryName ? ` · ${en.categoryName}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          {enrollmentStatusBadge(en.status)}
                          <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {en.academicSituation}
                          </span>
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${en.economicStatus === 'Al día' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300'}`}>
                            {en.economicStatus}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4 lg:grid-cols-6">
                        <p className="text-slate-500 dark:text-slate-400">Inscripto <span className="font-semibold text-slate-700 dark:text-slate-200">{fmtDate(en.enrolledAtUtc)}</span></p>
                        <p className="text-slate-500 dark:text-slate-400">Comisión <span className="font-semibold text-slate-700 dark:text-slate-200">{fmtDate(en.commissionStartDate)} → {fmtDate(en.commissionEndDate)}</span></p>
                        <p className="text-slate-500 dark:text-slate-400">Total <span className="font-semibold text-slate-700 dark:text-slate-200">{fmtMoney(en.snapshotTotalContractual, en.snapshotCurrency)}</span></p>
                        <p className="text-slate-500 dark:text-slate-400">Pagado <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtMoney(en.totalPaid, en.snapshotCurrency)}</span></p>
                        <p className="text-slate-500 dark:text-slate-400">Saldo <span className={`font-semibold ${en.balanceDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>{fmtMoney(en.balanceDue, en.snapshotCurrency)}</span></p>
                        <p className="text-slate-500 dark:text-slate-400">Cuotas <span className="font-semibold text-slate-700 dark:text-slate-200">{en.paidInstallments}/{en.installmentCount}</span> · Vencidas <span className={`font-semibold ${en.overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>{en.overdueCount}</span></p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Detalle de inscripción */}
            {selectedEnrollment && (
              <section>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Detalle de inscripción</h2>
                  <Link
                    to={`/educativa/${slug}/commissions/${selectedEnrollment.commissionId}/enrollments/${selectedEnrollment.id}`}
                    className="text-xs font-semibold text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                    onClick={onClose}
                  >
                    Abrir detalle completo →
                  </Link>
                </div>

                {error && (
                  <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">{error}</p>
                )}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <Stat label="Total contractual" value={fmtMoney(selectedEnrollment.snapshotTotalContractual, selectedEnrollment.snapshotCurrency)} />
                  <Stat label="Total pagado" value={fmtMoney(selectedEnrollment.totalPaid, selectedEnrollment.snapshotCurrency)} tone="text-emerald-600 dark:text-emerald-400" />
                  <Stat label="Saldo pendiente" value={fmtMoney(selectedEnrollment.balanceDue, selectedEnrollment.snapshotCurrency)} tone={selectedEnrollment.balanceDue > 0 ? 'text-rose-600 dark:text-rose-400' : undefined} />
                  <Stat label="Cuotas" value={`${selectedEnrollment.paidInstallments}/${selectedEnrollment.installmentCount}`} />
                  <Stat label="Vencidas" value={String(selectedEnrollment.overdueCount)} tone={selectedEnrollment.overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : undefined} />
                  <Stat label="Estado económico" value={selectedEnrollment.economicStatus} tone={selectedEnrollment.economicStatus === 'Al día' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} />
                </div>

                {/* Snapshot económico */}
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400">Matrícula</p>
                      <p className="text-base font-bold text-slate-900 dark:text-white">{fmtMoney(selectedEnrollment.matriculaAmount, selectedEnrollment.snapshotCurrency)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400">Cuotas</p>
                      <p className="text-base font-bold text-slate-900 dark:text-white">{selectedEnrollment.paidInstallments}/{selectedEnrollment.installmentCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400">Importe cuota</p>
                      <p className="text-base font-bold text-slate-900 dark:text-white">{fmtMoney(selectedEnrollment.snapshotInstallmentAmount, selectedEnrollment.snapshotCurrency)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400">Próximo venc.</p>
                      <p className="text-base font-bold text-slate-900 dark:text-white">{fmtDate(selectedEnrollment.nextDueDateUtc)}</p>
                    </div>
                    <div className="flex items-end justify-end">
                      <Button size="sm" variant="primary" onClick={() => setCashEnrollment(selectedEnrollment)} disabled={selectedEnrollment.status !== 'Active'}>
                        💵 Cobrar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Obligaciones */}
                <div className="mt-4">
                  <h3 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">Obligaciones</h3>
                  <Card className="p-0">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {obligations.map((o) => (
                        <div key={o.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{o.description}</p>
                            <p className="text-xs text-slate-400">Vence {fmtDate(o.dueDateUtc)} · {fmtMoney(o.amount, o.currency)}</p>
                            <div className="mt-1">{obligationBadge(o.status)}</div>
                          </div>
                          {o.status === 'Pending' || o.status === 'Overdue'
                            ? <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{fmtMoney(o.totalToPay, o.currency)}</p>
                            : <p className="text-sm font-semibold text-slate-400">{fmtMoney(o.totalToPay, o.currency)}</p>}
                          <div className="flex shrink-0 items-center gap-1.5">
                            {o.status === 'Paid' && receiptByObligation.get(o.id) && (
                              <a href={receiptByObligation.get(o.id)!.receiptUrl!} target="_blank" rel="noreferrer">
                                <Button size="sm" variant="outline">Ver recibo</Button>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                      {obligations.length === 0 && (
                        <p className="px-5 py-6 text-center text-sm text-slate-400">Sin obligaciones generadas.</p>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Pagos realizados */}
                <div className="mt-4">
                  <h3 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">Pagos realizados</h3>
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
                </div>

                {/* Legajo · Certificados */}
                <div className="mt-4">
                  <h3 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">Legajo · Certificados emitidos</h3>
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
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Registrar cobro */}
      <CollectPaymentModal
        open={!!cashEnrollment}
        onClose={() => setCashEnrollment(null)}
        slug={slug}
        commissionId={cashEnrollment?.commissionId ?? ''}
        enrollmentId={cashEnrollment?.id ?? ''}
        studentName={student?.fullName}
        onDone={invalidateDetail}
      />

      {/* Revisar transferencia */}
      <Modal
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        title="Revisar pago"
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
    </Modal>
  )
}