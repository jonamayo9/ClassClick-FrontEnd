import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatEventShort } from '@/pages/student/events/hooks'
import { useOperatorMyEvents } from '@/pages/admin/events/hooks'

const STATUS_META: Record<string, { label: string; variant: 'default' | 'success' | 'info' | 'danger' }> = {
  Draft: { label: 'Borrador', variant: 'default' },
  Published: { label: 'Publicado', variant: 'success' },
  Finished: { label: 'Finalizado', variant: 'info' },
  Cancelled: { label: 'Cancelado', variant: 'danger' },
}

export default function OperatorEventsPage() {
  const navigate = useNavigate()
  const { data: events = [], isLoading } = useOperatorMyEvents()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Mis eventos</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Los eventos donde estás asignado para operar el ingreso.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div>
      ) : events.length === 0 ? (
        <EmptyState
          icon="🎪"
          title="Todavía no tenés eventos asignados."
          description="Cuando te asignen a un evento, vas a poder controlar el ingreso desde acá."
        />
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.eventId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{e.title}</p>
                    <Badge variant={STATUS_META[e.status]?.variant ?? 'default'} className="shrink-0">{STATUS_META[e.status]?.label ?? e.status}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatEventShort(e.startsAtUtc, e.hasStartTime)}</p>
                  {e.location && <p className="truncate text-xs text-slate-400 dark:text-slate-500">{e.location}</p>}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {e.canCheckIn && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">✓ Control de ingreso</span>}
                    {e.canSellAtDoor && <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">✓ Venta en puerta</span>}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
                {e.status === 'Published' && e.canCheckIn ? (
                  <Button className="bg-violet-600 text-white hover:bg-violet-700" size="sm" onClick={() => navigate(`/event-operator/events/${e.eventId}/check-in`)}>
                    🎫 Controlar ingreso
                  </Button>
                ) : (
                  <span className="text-xs text-slate-400">{e.status === 'Published' ? 'Sin permiso de ingreso' : 'El evento no admite ingresos'}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
