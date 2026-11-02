import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { apiService, getApiError } from '@/lib/api'
import { useAuth } from '@/stores/auth'

interface MonitorEntry {
  accessLogId: string
  displayName: string
  granted: boolean
  warning: boolean
  denialReason?: string | null
  message?: string | null
  occurredAtUtc: string
}

function formatTime(value?: string | null) {
  return value ? new Date(value).toLocaleTimeString('es-AR') : '—'
}

export default function AccessMonitorPage() {
  const { companySlug = '' } = useParams<{ companySlug: string }>()
  const token = useAuth((state) => state.token)

  const recentQuery = useQuery({
    queryKey: ['access-monitor-recent', companySlug],
    queryFn: () => apiService.get<MonitorEntry[]>(`/api/access/monitor/${companySlug}/recent?limit=8`),
    enabled: !!token && !!companySlug,
    refetchInterval: 4000,
  })

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <Card className="max-w-md text-center">
          <h1 className="text-xl font-black">Monitor Access</h1>
          <p className="mt-2 text-sm text-slate-500">Necesitás iniciar sesión para ver el monitor.</p>
          <Link to="/login" className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-slate-900">Iniciar sesión</Link>
        </Card>
      </div>
    )
  }

  if (recentQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950"><Spinner className="h-10 w-10 text-white" /></div>
  }

  if (recentQuery.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <Card className="max-w-md text-center">
          <h1 className="text-xl font-black">Monitor no disponible</h1>
          <p className="mt-2 text-sm text-slate-500">{getApiError(recentQuery.error) || 'No tenés permiso para ver el monitor.'}</p>
        </Card>
      </div>
    )
  }

  const entries = recentQuery.data ?? []
  const latest = entries[0]

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">ClassClick Access</p>
            <h1 className="text-xl font-black">Monitor de recepción</h1>
          </div>
          <Link to={`/access/reception/${companySlug}`} className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/10">Ir a recepción</Link>
        </header>

        {latest ? (
          <div className={`rounded-3xl border p-8 text-center ${latest.granted ? (latest.warning ? 'border-amber-400/40 bg-amber-500/15' : 'border-emerald-400/40 bg-emerald-500/15') : 'border-red-400/40 bg-red-500/15'}`}>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/60">{latest.granted ? (latest.warning ? 'Advertencia' : 'Autorizado') : 'Rechazado'}</p>
            <h2 className="mt-3 text-4xl font-black">{latest.displayName}</h2>
            <p className="mt-3 text-sm text-white/70">{latest.message || latest.denialReason || 'Sin observaciones'}</p>
            <p className="mt-2 text-xs text-white/50">{formatTime(latest.occurredAtUtc)}</p>
          </div>
        ) : (
          <Card className="bg-slate-900 p-8 text-center text-slate-400">Esperando ingresos...</Card>
        )}

        <Card className="bg-slate-900 p-4">
          <h2 className="mb-3 text-sm font-bold">Últimos movimientos</h2>
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.accessLogId} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm">
                <span>{entry.displayName}</span>
                <span className="flex items-center gap-3 text-xs text-slate-400">
                  {formatTime(entry.occurredAtUtc)}
                  <Badge variant={entry.granted ? (entry.warning ? 'warning' : 'success') : 'danger'}>{entry.granted ? (entry.warning ? 'Advertencia' : 'OK') : 'Rechazado'}</Badge>
                </span>
              </div>
            ))}
            {entries.length === 0 && <p className="text-xs text-slate-400">Sin movimientos recientes.</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}
