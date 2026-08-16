import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { imgUrl } from '@/lib/media'
import { formatEventShort, money } from './hooks'
import type { StudentEvent } from './hooks'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

/** Card horizontal compacta de "Próximos eventos" para el carrusel del Home. */
function FeaturedEventCard({ event }: { event: StudentEvent }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(`/student/events/${event.id}`)}
      aria-label={`Ver evento ${event.title}`}
      className="flex min-h-[140px] w-full shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 sm:min-h-[150px]"
    >
      <div className="relative w-[38%] shrink-0 overflow-hidden sm:w-[32%]">
        {event.imageUrl ? (
          <img src={imgUrl(event.imageUrl) ?? ''} alt={event.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-100 to-fuchsia-100 text-3xl dark:from-violet-900 dark:to-fuchsia-900">🎪</div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-3">
        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{event.title}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatEventShort(event.startsAtUtc, event.hasStartTime)}</p>
        {event.location && <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{event.location}</p>}
        <div className="mt-auto">
          <div className="my-2 h-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs font-bold text-violet-700 dark:text-violet-300">
              {event.requiresTicket ? `Desde ${money(event.ticketPrice)}` : 'Entrada gratuita'}
            </p>
            <span className="shrink-0 text-xs font-semibold text-violet-600 dark:text-violet-400">Ver evento →</span>
          </div>
        </div>
      </div>
    </button>
  )
}

/** Carrusel horizontal de "Próximos eventos" para el Home del alumno (1 card completa por slide). */
export function StudentEventsCarousel({ events }: { events: StudentEvent[] }) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  function handleScroll() {
    const el = containerRef.current
    if (!el || events.length === 0) return
    // La card activa es la que tiene su centro más cercano al centro del contenedor.
    const center = el.scrollLeft + el.clientWidth / 2
    let best = 0
    let bestDist = Number.POSITIVE_INFINITY
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i] as HTMLElement
      const childCenter = child.offsetLeft + child.offsetWidth / 2
      const dist = Math.abs(childCenter - center)
      if (dist < bestDist) { bestDist = dist; best = i }
    }
    setActiveIndex(Math.min(best, events.length - 1))
  }

  function scrollToIndex(index: number) {
    const el = containerRef.current
    const child = el?.children[index] as HTMLElement | undefined
    child?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', inline: 'start', block: 'nearest' })
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Próximos eventos</h2>
        <button onClick={() => navigate('/student/events')} className="text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white">Ver todos →</button>
      </div>

      {/* Contenedor externo seguro: nada sobresale del ancho de la sección. */}
      <div className="w-full min-w-0 overflow-hidden">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 scrollbar-none"
        >
          {events.map((e) => <FeaturedEventCard key={e.id} event={e} />)}
        </div>
      </div>

      {events.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" role="group" aria-label="Navegación de próximos eventos">
          {events.map((e, i) => (
            <button
              key={e.id}
              type="button"
              onClick={() => scrollToIndex(i)}
              aria-label={`Ir al evento ${i + 1}: ${e.title}`}
              aria-current={i === activeIndex}
              className={`h-2 rounded-full transition-all ${i === activeIndex ? 'w-6 bg-violet-600' : 'w-2 bg-slate-300 dark:bg-slate-600'}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
