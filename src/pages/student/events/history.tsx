import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { imgUrl } from '@/lib/media'
import { useStudentMyTickets, isPastEvent, formatEventShort } from './hooks'
import type { StudentMyTickets } from './hooks'

function HistoryCard({ item }: { item: StudentMyTickets }) {
  const navigate = useNavigate()
  const statusLabel = item.isCancelled
    ? 'Evento cancelado'
    : 'Evento finalizado'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex gap-4">
        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          {item.imageUrl ? (
            <img src={imgUrl(item.imageUrl) ?? ''} alt={item.eventTitle} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-100 to-fuchsia-100 text-2xl dark:from-violet-900 dark:to-fuchsia-900">🎪</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-bold text-slate-900 dark:text-white">{item.eventTitle}</p>
            <Badge variant={item.isCancelled ? 'danger' : 'default'} className="shrink-0">{statusLabel}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatEventShort(item.startsAtUtc, item.hasStartTime)}</p>
          {item.location && <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{item.location}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {item.confirmedQuantity > 0 && (
              <span className="font-bold text-emerald-700 dark:text-emerald-400">{item.confirmedQuantity} confirmadas</span>
            )}
            {item.usedQuantity > 0 && (
              <span className="text-slate-500 dark:text-slate-400">{item.usedQuantity} utilizadas</span>
            )}
            {item.pendingQuantity > 0 && (
              <span className="text-amber-600 dark:text-amber-400">{item.pendingQuantity} pendientes</span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <Button variant="outline" size="sm" onClick={() => navigate(`/student/events/${item.eventId}`)}>Ver detalle</Button>
      </div>
    </div>
  )
}

export default function StudentEventsHistoryPage() {
  const navigate = useNavigate()
  const { data: myTickets = [], isLoading } = useStudentMyTickets()

  const history = myTickets
    .filter((item) => isPastEvent(item))
    .sort((a, b) => +new Date(b.startsAtUtc) - +new Date(a.startsAtUtc))

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/student/events')}
          aria-label="Volver"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Eventos anteriores</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tu historial de eventos finalizados o cancelados.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center dark:border-slate-700 dark:bg-slate-800/30">
          <span className="text-4xl">📜</span>
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">No tenés eventos anteriores.</p>
          <p className="mt-1 max-w-xs text-xs text-slate-400 dark:text-slate-500">
            Cuando un evento en el que participaste finalice, lo vas a poder consultar desde acá.
          </p>
          <Button size="sm" className="mt-4 bg-violet-600 text-white hover:bg-violet-700" onClick={() => navigate('/student/events')}>
            Ver eventos
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => <HistoryCard key={item.eventId} item={item} />)}
        </div>
      )}
    </div>
  )
}
