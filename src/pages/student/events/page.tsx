import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { imgUrl } from '@/lib/media'
import {
  useStudentEvents, useStudentMyTickets, isPastEvent,
  AVAILABILITY_LABEL, formatEventShort, money,
} from './hooks'
import { StudentTicketQrModal } from './qr-modal'
import type { StudentEvent, StudentMyTickets } from './hooks'

const badgeVariant: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
  Available: 'success',
  SalesNotStarted: 'warning',
  SalesEnded: 'default',
  EventEnded: 'default',
  SoldOut: 'danger',
}

function EventCard({ event }: { event: StudentEvent }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(`/student/events/${event.id}`)}
      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex gap-4">
        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          {event.imageUrl ? (
            <img src={imgUrl(event.imageUrl) ?? ''} alt={event.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-100 to-fuchsia-100 text-2xl dark:from-violet-900 dark:to-fuchsia-900">🎪</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-bold text-slate-900 dark:text-white">{event.title}</p>
            <Badge variant={badgeVariant[event.availability] ?? 'default'} className="shrink-0">
              {AVAILABILITY_LABEL[event.availability]}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatEventShort(event.startsAtUtc, event.hasStartTime)}</p>
          {event.location && <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{event.location}</p>}
          <p className="mt-1.5 text-sm font-bold text-violet-700 dark:text-violet-300">
            {event.requiresTicket ? `Desde ${money(event.ticketPrice)}` : 'Entrada gratuita'}
          </p>
        </div>
      </div>
    </button>
  )
}

function MyTicketsCard({ item, onView }: { item: StudentMyTickets; onView: () => void }) {
  const navigate = useNavigate()
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
          <p className="truncate font-bold text-slate-900 dark:text-white">{item.eventTitle}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatEventShort(item.startsAtUtc, item.hasStartTime)}</p>
          {item.location && <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{item.location}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {item.availableQuantity > 0 && (
              <span className="font-bold text-emerald-700 dark:text-emerald-400">✓ {item.availableQuantity} disponibles</span>
            )}
            {item.pendingQuantity > 0 && (
              <span className="text-amber-600 dark:text-amber-400">⏳ {item.pendingQuantity} pendientes</span>
            )}
            {item.usedQuantity > 0 && (
              <span className="text-slate-500 dark:text-slate-400">{item.usedQuantity} utilizadas</span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <Button variant="outline" size="sm" onClick={() => navigate(`/student/events/${item.eventId}`)}>Ver detalle</Button>
        {item.canViewQr && (
          <Button className="bg-violet-600 text-white hover:bg-violet-700" size="sm" onClick={onView}>Ver entradas</Button>
        )}
      </div>
    </div>
  )
}

export default function StudentEventsPage() {
  const navigate = useNavigate()
  const { data: events = [], isLoading } = useStudentEvents()
  const { data: myTickets = [], isLoading: loadingTickets } = useStudentMyTickets()

  const [tab, setTab] = useState<'events' | 'tickets'>('events')
  const [qrEventId, setQrEventId] = useState<string | null>(null)

  const upcoming = events.filter((e) => e.availability !== 'EventEnded')

  // Mis entradas: separar "actuales" (lo que tengo ahora) de "anteriores" (historial).
  const currentTickets = myTickets
    .filter((item) => !isPastEvent(item))
    .sort((a, b) => +new Date(a.startsAtUtc) - +new Date(b.startsAtUtc))
  const historyTickets = myTickets
    .filter((item) => isPastEvent(item))
    .sort((a, b) => +new Date(b.startsAtUtc) - +new Date(a.startsAtUtc))

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Eventos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Descubrí las actividades que preparó tu institución.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => setTab('events')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === 'events' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
        >
          Próximos eventos
        </button>
        <button
          type="button"
          onClick={() => setTab('tickets')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === 'tickets' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
        >
          Mis entradas
        </button>
      </div>

      {tab === 'tickets' ? (
        loadingTickets ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {currentTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center dark:border-slate-700 dark:bg-slate-800/30">
                <span className="text-4xl">🎟️</span>
                <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Todavía no tenés entradas.</p>
                <p className="mt-1 max-w-xs text-xs text-slate-400 dark:text-slate-500">
                  Cuando reserves o compres entradas para un evento, van a aparecer acá.
                </p>
                <Button size="sm" className="mt-4 bg-violet-600 text-white hover:bg-violet-700" onClick={() => setTab('events')}>
                  Ver eventos
                </Button>
              </div>
            ) : (
              currentTickets.map((item) => (
                <MyTicketsCard key={item.eventId} item={item} onView={() => setQrEventId(item.eventId)} />
              ))
            )}

            {/* Sección secundaria: historial */}
            <button
              type="button"
              onClick={() => navigate('/student/events/history')}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Anteriores</span>
              <span className="flex items-center gap-2">
                {historyTickets.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {historyTickets.length}
                  </span>
                )}
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>
        )
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center dark:border-slate-700 dark:bg-slate-800/30">
          <span className="text-4xl">🎪</span>
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            No hay eventos disponibles por el momento.
          </p>
          <p className="mt-1 max-w-xs text-xs text-slate-400 dark:text-slate-500">
            Cuando tu institución publique uno, vas a poder verlo desde acá.
          </p>
        </div>
      ) : upcoming.length > 0 ? (
        <div className="space-y-3">
          {upcoming.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center dark:border-slate-700 dark:bg-slate-800/30">
          <span className="text-4xl">🎪</span>
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            No hay eventos disponibles por el momento.
          </p>
          <p className="mt-1 max-w-xs text-xs text-slate-400 dark:text-slate-500">
            Cuando tu institución publique uno, vas a poder verlo desde acá.
          </p>
        </div>
      )}

      {!isLoading && tab === 'events' && events.length > 0 && (
        <Button variant="outline" className="w-full" onClick={() => navigate('/student')}>
          Volver al inicio
        </Button>
      )}

      {/* QR modal (compartido con Home) */}
      <StudentTicketQrModal eventId={qrEventId} onClose={() => setQrEventId(null)} />
    </div>
  )
}

