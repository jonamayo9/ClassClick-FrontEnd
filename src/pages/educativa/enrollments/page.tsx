import { useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { CollectPaymentModal } from '../components/CollectPaymentModal'
import { StudentDetailModal } from '../components/StudentDetailModal'
import { fmtMoney, fmtDate, scheduleSummary, EducativaCommission, EducativaEnrollment, EducativaStudent } from '../types'

export function EducativaEnrollmentsPage() {
  const { companySlug, commissionId } = useParams<{ companySlug: string; commissionId: string }>()
  const slug = companySlug ?? ''
  const commission = commissionId ?? ''
  const queryClient = useQueryClient()

  const [enrollOpen, setEnrollOpen] = useState(false)
  const [enrollStudentId, setEnrollStudentId] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [cashEnrollment, setCashEnrollment] = useState<EducativaEnrollment | null>(null)
  const [cancelTarget, setCancelTarget] = useState<EducativaEnrollment | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [detailTarget, setDetailTarget] = useState<{ userId: string; enrollmentId: string } | null>(null)
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([])
  const toastId = useRef(0)
  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId.current
    setToasts((p) => [...p, { id, message: msg, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500)
  }, [])

  const commissionQuery = useQuery({
    queryKey: ['educativa-commission', slug, commission],
    queryFn: () => apiService.get<EducativaCommission>(`/api/educativa/${slug}/commissions/${commission}`),
    enabled: !!slug && !!commission,
    retry: false,
  })

  const enrollmentsQuery = useQuery({
    queryKey: ['educativa-enrollments', slug, commission],
    queryFn: () => apiService.get<EducativaEnrollment[]>(
      `/api/educativa/${slug}/commissions/${commission}/enrollments`,
    ),
    enabled: !!slug && !!commission,
    retry: false,
  })

  const studentsQuery = useQuery({
    queryKey: ['educativa-students', slug],
    queryFn: () => apiService.get<EducativaStudent[]>(`/api/educativa/${slug}/students`),
    enabled: enrollOpen && !!slug,
    retry: false,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['educativa-enrollments', slug, commission] })
  }

  async function doEnroll() {
    if (!enrollStudentId) return
    setEnrolling(true)
    try {
      await apiService.post(`/api/educativa/${slug}/commissions/${commission}/enrollments`, { userId: enrollStudentId })
      toast('Alumno inscripto.')
      setEnrollOpen(false)
      setEnrollStudentId('')
      invalidate()
    } catch (err) {
      toast((err as { message?: string })?.message ?? 'No se pudo inscribir.', 'error')
    } finally {
      setEnrolling(false)
    }
  }

  async function doCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await apiService.post(`/api/educativa/${slug}/commissions/${commission}/enrollments/${cancelTarget.id}/cancel`)
      toast('Inscripción cancelada.')
      setCancelTarget(null)
      invalidate()
    } catch (err) {
      toast((err as { message?: string })?.message ?? 'No se pudo cancelar.', 'error')
    } finally {
      setCancelling(false)
    }
  }

  const commissionData = commissionQuery.data
  const enrollments = enrollmentsQuery.data ?? []
  const commissionClosed = !!commissionData && commissionData.endDate < new Date().toISOString().slice(0, 10)
  const commissionFull = !!commissionData && commissionData.capacity != null && commissionData.activeEnrollments >= commissionData.capacity
  const canEnroll = !!commissionData && commissionData.isActive && !commissionClosed && !commissionFull

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link to={`/educativa/${slug}/commissions`} className="text-xs text-blue-200 underline-offset-2 hover:underline">
              ← Comisiones
            </Link>
            <p className="mt-1 text-xs font-bold uppercase text-blue-600 dark:text-blue-300">Educativa · Alumnos</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{commissionData?.name ?? 'Comisión'}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {commissionData ? `${commissionData.trainingName} · ${fmtDate(commissionData.startDate)} → ${fmtDate(commissionData.endDate)}` : ''}
            </p>
            {commissionData && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Cursada: <span className="font-semibold text-slate-700 dark:text-slate-200">{scheduleSummary(commissionData.schedules, true) || 'Sin horarios definidos'}</span>
              </p>
            )}
            {commissionData && (
              <p className="mt-1 text-xs text-blue-200">
                Ocupación: {commissionData.activeEnrollments}/{commissionData.capacity}
                {commissionClosed ? ' · Comisión finalizada' : commissionFull ? ' · Cupo lleno' : ''}
              </p>
            )}
          </div>
          <Button className="bg-white text-blue-700 hover:bg-blue-50" onClick={() => { setEnrollOpen(true); setEnrollStudentId('') }} disabled={!canEnroll}>
            + Inscribir alumno
          </Button>
        </div>
      </section>
      {!canEnroll && commissionData && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          {commissionClosed ? 'Esta comisión ya finalizó y no admite nuevas inscripciones.' : commissionFull ? 'Esta comisión alcanzó su cupo.' : 'La comisión no está activa.'}
        </p>
      )}

      {enrollmentsQuery.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner /></div>}
      {enrollmentsQuery.isError && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          No se pudieron cargar las inscripciones.
        </p>
      )}

      {!enrollmentsQuery.isLoading && !enrollmentsQuery.isError && enrollments.length === 0 && (
        <Card>
          <EmptyState
            icon="👥"
            title="Sin alumnos inscriptos"
            description="Inscribí un alumno para comenzar."
            action={{ label: 'Inscribir alumno', onClick: () => setEnrollOpen(true) }}
          />
        </Card>
      )}

      {enrollments.length > 0 && (
        <Card className="overflow-x-auto scrollbar-hide p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400 dark:border-slate-700">
                <th className="px-4 py-3 font-bold">Alumno</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold">Total</th>
                <th className="px-4 py-3 font-bold">Pagado</th>
                <th className="px-4 py-3 font-bold">Saldo</th>
                <th className="px-4 py-3 font-bold">Cuotas</th>
                <th className="px-4 py-3 font-bold">Próx. vto.</th>
                <th className="px-4 py-3 font-bold">Vencidas</th>
                <th className="px-4 py-3 font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {enrollments.map((e) => (
                <tr key={e.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40" onClick={() => setDetailTarget({ userId: e.userId, enrollmentId: e.id })}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{e.studentName}</p>
                    <p className="text-xs text-slate-400">{e.studentEmail}</p>
                    <p className="text-[10px] text-slate-400">Inscripto {fmtDate(e.enrolledAtUtc)}</p>
                  </td>
                  <td className="px-4 py-3">
                    {e.status === 'Active' ? <Badge variant="success">Activa</Badge>
                      : e.status === 'Cancelled' ? <Badge variant="default">Cancelada</Badge>
                      : <Badge variant="info">Completada</Badge>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{fmtMoney(e.snapshotTotalContractual, e.snapshotCurrency)}</td>
                  <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">{fmtMoney(e.totalPaid, e.snapshotCurrency)}</td>
                  <td className={`px-4 py-3 font-semibold ${e.balanceDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                    {fmtMoney(e.balanceDue, e.snapshotCurrency)}
                  </td>
                  <td className="px-4 py-3">{e.paidInstallments}/{e.installmentCount}</td>
                  <td className="px-4 py-3">{fmtDate(e.nextDueDateUtc)}</td>
                  <td className="px-4 py-3">
                    {e.overdueCount > 0 ? <Badge variant="danger">{e.overdueCount}</Badge> : <span className="text-slate-300">0</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Link to={`/educativa/${slug}/commissions/${commission}/enrollments/${e.id}`}>
                        <Button size="sm" variant="outline">Detalle</Button>
                      </Link>
                      <Button size="sm" variant="outline" onClick={() => setCashEnrollment(e)} disabled={e.status !== 'Active'}>
                        Cobrar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setCancelTarget(e)} disabled={e.status !== 'Active'}>
                        Cancelar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Inscribir alumno */}
      <Modal open={enrollOpen} onClose={() => setEnrollOpen(false)} title="Inscribir alumno" description="El alumno debe estar dado de alta como Student en esta empresa.">
        <div className="space-y-4 px-5 py-4 sm:px-6">
          {studentsQuery.isLoading && <div className="flex justify-center py-6 text-slate-400"><Spinner /></div>}
          {studentsQuery.isError && <p className="text-sm text-red-500">No se pudieron cargar los alumnos.</p>}
          {(studentsQuery.data ?? []).length === 0 && !studentsQuery.isLoading && (
            <p className="text-sm text-slate-500">No hay alumnos dados de alta en esta empresa. Primero registralos.</p>
          )}
          {(studentsQuery.data ?? []).length > 0 && (
            <Select
              value={enrollStudentId}
              onChange={(e) => setEnrollStudentId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="">Seleccioná un alumno…</option>
              {(studentsQuery.data ?? []).map((s) => (
                <option key={s.userId} value={s.userId}>{s.fullName} · {s.email}</option>
              ))}
            </Select>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEnrollOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={doEnroll} loading={enrolling} disabled={!enrollStudentId}>Inscribir</Button>
          </div>
        </div>
      </Modal>

      {/* Cancelar inscripción */}
      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancelar inscripción"
        description={cancelTarget ? `Se cancelará la inscripción de ${cancelTarget.studentName}. El histórico económico se conserva.` : undefined}
      >
        <div className="flex justify-end gap-2 px-5 py-4 sm:px-6">
          <Button variant="ghost" onClick={() => setCancelTarget(null)}>No</Button>
          <Button variant="danger" onClick={doCancel} loading={cancelling}>Cancelar inscripción</Button>
        </div>
      </Modal>

      {/* Registrar cobro */}
      <CollectPaymentModal
        open={!!cashEnrollment}
        onClose={() => setCashEnrollment(null)}
        slug={slug}
        commissionId={commission}
        enrollmentId={cashEnrollment?.id ?? ''}
        studentName={cashEnrollment?.studentName}
        onDone={invalidate}
      />

      {/* Detalle del alumno */}
      <StudentDetailModal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        slug={slug}
        userId={detailTarget?.userId ?? ''}
        initialEnrollmentId={detailTarget?.enrollmentId}
        onDataChanged={invalidate}
      />

      {toasts.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-[120] flex -translate-x-1/2 flex-col gap-2">
          {toasts.map((t) => (
            <div key={t.id} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${t.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

