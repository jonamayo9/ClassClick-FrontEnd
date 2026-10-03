import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { fmtMoney, fmtDate, EstudianteEnrollment } from '../types'

function accessBadge(e: EstudianteEnrollment) {
  if (e.hasAccess) return <Badge variant="success">Acceso habilitado</Badge>
  if (e.blockReason === 'Cancelled') return <Badge variant="default">Cancelada</Badge>
  return <Badge variant="danger">Acceso bloqueado</Badge>
}

export function EstudianteHomePage() {
  const slug = useAuth((s) => s.activeCompanySlug ?? '')
  const user = useAuth((s) => s.user)

  const profileQuery = useQuery({
    queryKey: ['student-profile', slug],
    queryFn: () => apiService.get<{ fullName?: string; firstName?: string }>(`/api/student/${slug}/me`),
    enabled: !!slug,
    retry: false,
  })

  const enrollmentsQuery = useQuery({
    queryKey: ['estudiante-enrollments', slug],
    queryFn: () => apiService.get<EstudianteEnrollment[]>(`/api/educativa/student/${slug}/enrollments`),
    enabled: !!slug,
    retry: false,
  })

  const enrollments = enrollmentsQuery.data ?? []
  const active = enrollments.filter((e) => e.status === 'Active')
  const displayName = profileQuery.data?.fullName || profileQuery.data?.firstName || user?.name || user?.email || 'Alumno'

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-violet-200">Portal del alumno</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Hola, {displayName}</h1>
          <p className="mt-1 text-sm text-violet-200">Tus formaciones y tu situación económica.</p>
        </div>
      </section>

      {enrollmentsQuery.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner /></div>}

      {!enrollmentsQuery.isLoading && enrollments.length === 0 && (
        <Card><EmptyState icon="🎓" title="Sin formaciones" description="Todavía no estás inscripto en ninguna comisión." /></Card>
      )}

      {enrollments.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Mis formaciones</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((e) => (
              <Link key={e.id} to={`/estudiante/formaciones/${e.id}`} className="group">
                <Card className="h-full transition hover:border-violet-300 hover:shadow-md dark:hover:border-violet-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">{e.trainingName}</h3>
                      <p className="text-xs text-slate-400">{e.commissionName}</p>
                    </div>
                    {accessBadge(e)}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400">Saldo</p>
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">{fmtMoney(e.balanceDue, e.snapshotCurrency)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400">Cuotas</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{e.paidInstallments}/{e.installmentCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400">Próx. vto.</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{fmtDate(e.nextDueDateUtc)}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {enrollments.length > 0 && (
        <p className="text-xs text-slate-400">
          Ver todas en <Link to="/estudiante/formaciones" className="font-semibold text-violet-600 dark:text-violet-400">Mis formaciones</Link> · Pagos en <Link to="/estudiante/pagos" className="font-semibold text-violet-600 dark:text-violet-400">Pagos</Link>.
        </p>
      )}
    </div>
  )
}