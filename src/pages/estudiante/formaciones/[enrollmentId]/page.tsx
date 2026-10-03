import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { fmtMoney, fmtDateOnly, EstudianteEnrollment, EstudianteObligation } from '../../types'
import { CertificacionesPanel } from '../../certificaciones-panel'

function obligationBadge(status: string) {
  switch (status) {
    case 'Paid': return <Badge variant="success">Pagada</Badge>
    case 'Overdue': return <Badge variant="danger">Vencida</Badge>
    case 'Cancelled': return <Badge variant="default">Cancelada</Badge>
    default: return <Badge variant="warning">Pendiente</Badge>
  }
}

type Tab = 'general' | 'certificaciones'

export function EstudianteFormacionDetailPage() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>()
  const slug = useAuth((s) => s.activeCompanySlug ?? '')
  const [tab, setTab] = useState<Tab>('general')

  const enrollmentQuery = useQuery({
    queryKey: ['estudiante-enrollment', slug, enrollmentId],
    queryFn: () => apiService.get<EstudianteEnrollment>(`/api/educativa/student/${slug}/enrollments/${enrollmentId}`),
    enabled: !!slug && !!enrollmentId,
    retry: false,
  })

  const obligationsQuery = useQuery({
    queryKey: ['estudiante-obligations', slug, enrollmentId],
    queryFn: () => apiService.get<EstudianteObligation[]>(`/api/educativa/student/${slug}/enrollments/${enrollmentId}/obligations`),
    enabled: !!slug && !!enrollmentId,
    retry: false,
  })

  const e = enrollmentQuery.data
  const obligations = obligationsQuery.data ?? []
  const isCompleted = e?.status === 'Completed'

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      {enrollmentQuery.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner /></div>}
      {enrollmentQuery.isError && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">No se pudo cargar la formación.</p>
      )}

      {e && (
        <>
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
            <div className="relative">
              <Link to="/estudiante/formaciones" className="text-xs text-violet-200 underline-offset-2 hover:underline">← Mis formaciones</Link>
              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{e.trainingName}</h1>
              <p className="text-sm text-violet-200">{e.commissionName} · {fmtDateOnly(e.startDate)} → {fmtDateOnly(e.endDate)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {e.status === 'Active' ? <Badge variant="success">Activa</Badge>
                  : e.status === 'Completed' ? <Badge variant="info">Finalizada</Badge>
                  : <Badge variant="default">Cancelada</Badge>}
                {e.hasAccess ? <Badge variant="success">Acceso habilitado</Badge> : <Badge variant="danger">Acceso bloqueado</Badge>}
              </div>
            </div>
          </section>

          {/* Tabs: solo se habilita Certificaciones cuando la cursada está Completed */}
          <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
            <button
              onClick={() => setTab('general')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tab === 'general' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              General
            </button>
            <button
              onClick={() => isCompleted && setTab('certificaciones')}
              disabled={!isCompleted}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tab === 'certificaciones' ? 'bg-violet-600 text-white' : isCompleted ? 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800' : 'cursor-not-allowed text-slate-300 dark:text-slate-600'}`}
              title={isCompleted ? 'Certificaciones' : 'Disponible al finalizar la cursada'}
            >
              Certificaciones {isCompleted ? '' : '🔒'}
            </button>
          </div>

          {tab === 'general' && (
            <>
              {/* Acceso (backend es autoridad) */}
              <Card>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Situación de acceso</h2>
                {e.hasAccess ? (
                  <p className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">Acceso habilitado.</p>
                ) : (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">{e.blockMessage ?? 'Acceso bloqueado.'}</p>
                    {e.nextAction && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Acción sugerida: {e.nextAction} → <Link to="/estudiante/pagos" className="font-semibold text-violet-600 dark:text-violet-400">Pagos</Link></p>
                    )}
                  </div>
                )}
              </Card>

              {/* Situación económica */}
              <Card>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Situación económica</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Total contractual</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white">{fmtMoney(e.snapshotTotalContractual, e.snapshotCurrency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Pagado</p>
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{fmtMoney(e.totalPaid, e.snapshotCurrency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Saldo</p>
                    <p className={`text-base font-bold ${e.balanceDue > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{fmtMoney(e.balanceDue, e.snapshotCurrency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Cuotas</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white">{e.paidInstallments}/{e.installmentCount}</p>
                  </div>
                </div>
              </Card>

              {/* Obligaciones */}
              <Card className="p-0">
                <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Obligaciones</h2>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {obligations.map((o) => (
                    <div key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{o.description}</p>
                        <p className="text-xs text-slate-400">Vence {fmtDateOnly(o.dueDateUtc)}</p>
                        <div className="mt-1">{obligationBadge(o.status)}</div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{fmtMoney(o.amount, o.currency)}</p>
                        {o.status === 'Pending' && o.moraAmount > 0 && (
                          <p className="text-[10px] text-red-500">Mora {fmtMoney(o.moraAmount, o.currency)}</p>
                        )}
                        {o.status === 'Pending' && (
                          <p className="text-[10px] text-slate-400">Total hoy {fmtMoney(o.totalToPay, o.currency)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {obligations.length === 0 && <p className="px-5 py-6 text-center text-sm text-slate-400">Sin obligaciones generadas.</p>}
                </div>
              </Card>
            </>
          )}

          {tab === 'certificaciones' && isCompleted && (
            <CertificacionesPanel enrollmentId={enrollmentId} />
          )}
        </>
      )}
    </div>
  )
}