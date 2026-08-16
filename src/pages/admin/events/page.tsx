import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { UserCog } from 'lucide-react'
import { useEvents, useCreateEvent, useUpdateEvent } from './hooks'
import { EventFormModal } from './event-form'
import type { ClassClickEvent, EventStatus } from './hooks'

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

function money(value?: number | null) {
  if (value == null) return 'Gratuito'
  return ARS.format(value)
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const d = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!d) return '—'
  const time = value.includes('T') ? value.slice(11, 16) : ''
  return `${d[3]}/${d[2]}/${d[1]}${time ? ` ${time}` : ''}`
}

const STATUS_META: Record<EventStatus, { label: string; variant: 'default' | 'success' | 'info' | 'danger' }> = {
  Draft: { label: 'Borrador', variant: 'default' },
  Published: { label: 'Publicado', variant: 'success' },
  Finished: { label: 'Finalizado', variant: 'info' },
  Cancelled: { label: 'Cancelado', variant: 'danger' },
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'Draft', label: 'Borrador' },
  { value: 'Published', label: 'Publicado' },
  { value: 'Finished', label: 'Finalizado' },
  { value: 'Cancelled', label: 'Cancelado' },
]

export default function EventsPage() {
  const navigate = useNavigate()
  const { data: events = [], isLoading } = useEvents()
  const createMutation = useCreateEvent()
  const updateMutation = useUpdateEvent()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<ClassClickEvent | null>(null)
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([])

  const toastId = useRef(0)
  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId.current
    setToasts((p) => [...p, { id, message: msg, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500)
  }, [])

  const filtered = events.filter((e) => {
    const q = search.trim().toLowerCase()
    const matchSearch = !q || e.title.toLowerCase().includes(q) || (e.location ?? '').toLowerCase().includes(q)
    const matchStatus = !statusFilter || e.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="mx-auto max-w-5xl space-y-4 sm:space-y-5">
      {/* Header simple */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">Eventos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Organizá partidos, fiestas, muestras y encuentros.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/events/operators')}>
            <UserCog className="h-4 w-4" aria-hidden="true" />
            Operadores
          </Button>
          <Button
            className="bg-violet-600 text-white hover:bg-violet-700"
            onClick={() => { setEditItem(null); setFormOpen(true) }}
          >
            + Nuevo evento
          </Button>
        </div>
      </div>

      {/* Filtros compactos */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título o lugar..."
          className="sm:max-w-sm sm:flex-1"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:w-44"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        events.length === 0 ? (
          <EmptyState
            icon="🎪"
            title="Todavía no creaste ningún evento."
            description="Creá tu primer evento para comenzar a organizar reservas, entradas y accesos."
            action={{ label: 'Crear evento', onClick: () => { setEditItem(null); setFormOpen(true) } }}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-500">
            No hay eventos que coincidan con la búsqueda.
          </div>
        )
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <EventCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Create form */}
      {formOpen && (
        <EventFormModal
          open
          event={editItem}
          submitting={editItem ? updateMutation.isPending : createMutation.isPending}
          onSubmit={async (fd: FormData) => {
            if (editItem) {
              await updateMutation.mutateAsync({ id: editItem.id, formData: fd })
            } else {
              await createMutation.mutateAsync(fd)
            }
          }}
          toast={toast}
          onClose={() => { setFormOpen(false); setEditItem(null) }}
        />
      )}

      {/* Toasts */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:right-4 sm:left-auto sm:top-4 sm:bottom-auto sm:items-end sm:p-0">
        {toasts.map((t) => (
          <div key={t.id}
            className={`pointer-events-auto animate-slide-up rounded-xl border px-5 py-3 text-sm font-medium shadow-lg ${
              t.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
            }`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Card simple: info del evento + acción única "Administrar →". */
function EventCard({ item }: { item: ClassClickEvent }) {
  const navigate = useNavigate()
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <img
          src={item.imageUrl || undefined}
          alt={item.title}
          className="h-16 w-24 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900 dark:text-white">{item.title}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(item.startsAt)}</p>
          {item.location && <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{item.location}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_META[item.status].variant}>{STATUS_META[item.status].label}</Badge>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{money(item.ticketPrice)}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
        <Button variant="outline" size="sm" onClick={() => navigate(`/admin/events/${item.id}`)}>
          Administrar →
        </Button>
      </div>
    </div>
  )
}
