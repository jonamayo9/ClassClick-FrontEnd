import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { fmtMoney, fmtDateOnly, EstudianteEnrollment } from '../types'

function statusBadge(e: EstudianteEnrollment) {
  if (e.status === 'Cancelled') return <Badge variant="default">Cancelada</Badge>
  if (e.status === 'Completed') return <Badge variant="info">Finalizada</Badge>
  return <Badge variant="success">Activa</Badge>
}

function accessBadge(e: EstudianteEnrollment) {
  if (e.hasAccess) return <Badge variant="success">Acceso</Badge>
  if (e.blockReason === 'Cancelled') return <Badge variant="default">Sin acceso</Badge>
  return <Badge variant="danger">Bloqueado</Badge>
}

export function EstudianteFormacionesPage() {
  const slug = useAuth((s) => s.activeCompanySlug ?? '')

  const query = useQuery({
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
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Mis formaciones</h1>
          <p className="mt-1 text-sm text-violet-200">Tus inscripciones y su situación de acceso.</p>
        </div>
      </section>

      {query.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner /></div>}
      {query.isError && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          No se pudieron cargar tus formaciones.
        </p>
      )}

      {!query.isLoading && !query.isError && (query.data ?? []).length === 0 && (
        <Card><EmptyState icon="🎓" title="Sin formaciones" description="Todavía no estás inscripto en ninguna comisión." /></Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(query.data ?? []).map((e) => (
          <Link key={e.id} to={`/estudiante/formaciones/${e.id}`} className="group">
            <Card className="h-full transition hover:border-violet-300 hover:shadow-md dark:hover:border-violet-700">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">{e.trainingName}</h3>
                  <p className="text-xs text-slate-400">{e.commissionName}</p>
                </div>
                {statusBadge(e)}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {accessBadge(e)}
                {e.overdueCount > 0 && <Badge variant="danger">{e.overdueCount} vencida{e.overdueCount === 1 ? '' : 's'}</Badge>}
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {fmtDateOnly(e.startDate)} → {fmtDateOnly(e.endDate)} · Inscripto {fmtDateOnly(e.enrolledAtUtc)}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Saldo: <span className={e.balanceDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>{fmtMoney(e.balanceDue, e.snapshotCurrency)}</span>
              </p>
              {e.blockMessage && <p className="mt-1 text-[11px] text-slate-400">{e.blockMessage}</p>}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}