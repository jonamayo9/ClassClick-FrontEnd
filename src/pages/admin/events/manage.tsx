import { useCallback, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Home, Ticket, QrCode, Users, Settings, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { getApiError } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { formatEventDate, formatEventTime, money } from '@/pages/student/events/hooks'
import {
  useAdminEvent, useEventReportSummary, useEventReportSales, useEventReportCheckIns,
  usePublishEvent, useFinishEvent, useCancelEvent, useDeleteEvent, useUpdateEvent,
  useEventOperators, useUpdateEventOperatorAssignments,
  useResendEventAccess, useAdjustEventUsage,
} from './hooks'
import { EventFormModal } from './event-form'
import { SalesTab, CheckInsTab } from './report'
import type { ClassClickEvent, EventReportSaleRow, EventReportUsageRow, EventReportPage, EventOperator } from './hooks'

const STATUS_META: Record<string, { label: string; variant: 'default' | 'success' | 'info' | 'danger' }> = {
  Draft: { label: 'Borrador', variant: 'default' },
  Published: { label: 'Publicado', variant: 'success' },
  Finished: { label: 'Finalizado', variant: 'info' },
  Cancelled: { label: 'Cancelado', variant: 'danger' },
}

export default function AdminEventManagementPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const slug = useAuth((s) => s.activeCompanySlug)
  const qc = useQueryClient()

  const { data: event, isLoading: loadingEvent } = useAdminEvent(id)
  const { data: summary, isLoading: loadingSummary } = useEventReportSummary(id)

  const publishMutation = usePublishEvent()
  const finishMutation = useFinishEvent()
  const cancelMutation = useCancelEvent()
  const deleteMutation = useDeleteEvent()
  const updateMutation = useUpdateEvent()
  const resendAccess = useResendEventAccess(id)
  const adjustUsage = useAdjustEventUsage(id)

  const [tab, setTab] = useState<'summary' | 'sales' | 'checkins' | 'operators' | 'settings'>('summary')
  const [editOpen, setEditOpen] = useState(false)
  const [confirm, setConfirm] = useState<{ type: 'publish' | 'delete'; item: ClassClickEvent } | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [resendFor, setResendFor] = useState<EventReportSaleRow | null>(null)
  const [correctFor, setCorrectFor] = useState<EventReportUsageRow | null>(null)
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([])
  const toastId = useRef(0)
  const toast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const n = ++toastId.current
    setToasts((p) => [...p, { id: n, message, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== n)), 3500)
  }, [])

  const [salesFilter, setSalesFilter] = useState({ page: 1, pageSize: 20, search: '', status: '', origin: '', paymentMethod: '' })
  const { data: salesPage, isFetching: fetchingSales } = useEventReportSales(id, salesFilter)

  const [checkInFilters, setCheckInFilters] = useState({ page: 1, pageSize: 20, search: '' })
  const [checkInSearch, setCheckInSearch] = useState('')
  const [checkInPage, setCheckInPage] = useState(1)
  const { data: checkInsPage, isFetching: fetchingCheckIns } = useEventReportCheckIns(id, checkInFilters.page, checkInFilters.pageSize, checkInFilters.search)

  function refetchEvent() {
    qc.invalidateQueries({ queryKey: ['event', slug, id] })
    qc.invalidateQueries({ queryKey: ['events'] })
  }

  async function runConfirm() {
    if (!confirm || !id) return
    const { type, item } = confirm
    try {
      if (type === 'publish') await publishMutation.mutateAsync(item.id)
      if (type === 'delete') await deleteMutation.mutateAsync(item.id)
      toast(type === 'publish' ? 'Evento publicado.' : 'Evento eliminado.')
      setConfirm(null)
      refetchEvent()
      if (type === 'delete') navigate('/admin/events')
    } catch (err: unknown) {
      toast(getApiError(err) || 'No se pudo completar la acción.', 'error')
    }
  }

  async function runCancel() {
    if (!id) return
    try {
      await cancelMutation.mutateAsync({ id, reason: cancelReason.trim() || undefined })
      setCancelOpen(false)
      setCancelReason('')
      toast('Evento cancelado. Los compradores externos fueron notificados.')
      refetchEvent()
    } catch (err: unknown) {
      toast(getApiError(err) || 'No se pudo cancelar el evento.', 'error')
    }
  }

  async function runFinish() {
    if (!id) return
    try {
      await finishMutation.mutateAsync(id)
      setFinishOpen(false)
      toast('Evento finalizado. Ya no se registran nuevos ingresos ni ventas.')
      refetchEvent()
    } catch (err: unknown) {
      toast(getApiError(err) || 'No se pudo finalizar el evento.', 'error')
    }
  }

  async function runResend() {
    if (!resendFor) return
    try {
      const result = await resendAccess.mutateAsync(resendFor.purchaseId)
      toast(result.email ? `Acceso reenviado a ${result.email}.` : 'Acceso reenviado.')
      setResendFor(null)
    } catch (err: unknown) {
      toast(getApiError(err) || 'No se pudo reenviar el acceso.', 'error')
    }
  }

  async function runCorrect(correctQuantity: number, reason: string) {
    if (!correctFor) return
    try {
      await adjustUsage.mutateAsync({ usageId: correctFor.id, correctQuantity, reason })
      toast('Ingreso corregido (queda registrado el ajuste auditado).')
      setCorrectFor(null)
    } catch (err: unknown) {
      toast(getApiError(err) || 'No se pudo corregir el ingreso.', 'error')
    }
  }

  if (loadingEvent) {
    return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No encontramos el evento.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/events')}>Volver a eventos</Button>
      </div>
    )
  }

  const isPublished = event.status === 'Published'

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button onClick={() => navigate('/admin/events')} className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400">
            ← Volver a eventos
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{event.title}</h1>
            <Badge variant={STATUS_META[event.status].variant}>{STATUS_META[event.status].label}</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatEventDate(event.startsAt)}{event.hasStartTime ? ` · ${formatEventTime(event.startsAt)}` : ''}{event.location ? ` · ${event.location}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isPublished && (
            <Button className="bg-violet-600 text-white hover:bg-violet-700" size="sm" onClick={() => navigate(`/admin/events/${event.id}/check-in`)}>
              <ScanLine className="h-4 w-4" /> Abrir control de ingreso
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/events/${event.id}/report`)}>📊 Reporte completo</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex gap-1" role="tablist" aria-label="Gestión del evento">
          {([
            ['summary', 'Resumen', Home],
            ['sales', 'Entradas', Ticket],
            ['checkins', 'Accesos', QrCode],
            ['operators', 'Operadores', Users],
            ['settings', 'Configuración', Settings],
          ] as const).map(([key, label, Icon]) => {
            const active = tab === key
            return (
              <button key={key} type="button" role="tab" aria-selected={active} onClick={() => setTab(key)}
                className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 px-1 pb-2.5 pt-2.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset ${
                  active
                    ? 'text-violet-700 dark:text-violet-300'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}>
                <Icon className={`h-5 w-5 ${active ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}`} strokeWidth={active ? 2.2 : 1.7} aria-hidden="true" />
                <span className={`max-w-full truncate text-[10px] uppercase tracking-wide sm:text-[11px] ${active ? 'font-bold' : 'font-medium'}`}>
                  {label}
                </span>
                <span aria-hidden="true" className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full transition ${active ? 'bg-violet-600 dark:bg-violet-400' : 'bg-transparent'}`} />
              </button>
            )
          })}
        </nav>
      </div>

      {tab === 'summary' && (
        <SummaryTab summary={summary} loading={loadingSummary} onOpenCheckIn={() => navigate(`/admin/events/${event.id}/check-in`)} canCheckIn={isPublished} />
      )}

      {tab === 'sales' && (
        <SalesTab
          filter={salesFilter} setFilter={setSalesFilter}
          page={salesPage as EventReportPage<EventReportSaleRow> | undefined} fetching={fetchingSales}
          onResendAccess={(s) => setResendFor(s)}
        />
      )}

      {tab === 'checkins' && (
        <CheckInsTab
          search={checkInSearch} setSearch={setCheckInSearch}
          filters={checkInFilters} setFilters={setCheckInFilters}
          page={checkInPage} setPage={setCheckInPage}
          data={checkInsPage as EventReportPage<EventReportUsageRow> | undefined} fetching={fetchingCheckIns}
          onCorrect={(u) => setCorrectFor(u)}
        />
      )}

      {tab === 'operators' && (
        <OperatorsTab eventId={event.id} onManage={() => navigate('/admin/events/operators')} toast={toast} />
      )}

      {tab === 'settings' && (
        <SettingsTab
          event={event}
          onEdit={() => setEditOpen(true)}
          onCancel={() => setCancelOpen(true)}
          onFinish={() => setFinishOpen(true)}
          onPublish={() => setConfirm({ type: 'publish', item: event })}
          onDelete={() => setConfirm({ type: 'delete', item: event })}
        />
      )}

      {/* Editar */}
      {editOpen && (
        <EventFormModal
          open
          event={event}
          submitting={updateMutation.isPending}
          onSubmit={async (fd: FormData) => {
            await updateMutation.mutateAsync({ id: event.id, formData: fd })
            refetchEvent()
          }}
          toast={toast}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* Publicar / eliminar */}
      {confirm && (
        <ConfirmModal
          open
          title={confirm.type === 'publish' ? 'Publicar evento' : 'Eliminar evento'}
          message={confirm.type === 'publish'
            ? `Vas a publicar "${confirm.item.title}". Los alumnos podrán verlo.`
            : `Vas a eliminar el borrador "${confirm.item.title}". Esta acción no se puede deshacer.`}
          confirmText={confirm.type === 'publish' ? 'Publicar' : 'Eliminar'}
          variant={confirm.type === 'publish' ? 'primary' : 'danger'}
          loading={confirm.type === 'publish' ? publishMutation.isPending : deleteMutation.isPending}
          onConfirm={runConfirm}
          onClose={() => setConfirm(null)}
        />
      )}

      {/* Cancelar evento */}
      {cancelOpen && (
        <CancelEventModal
          title={event.title}
          summary={summary}
          reason={cancelReason}
          setReason={setCancelReason}
          loading={cancelMutation.isPending}
          onCancel={() => { setCancelOpen(false); setCancelReason('') }}
          onConfirm={runCancel}
        />
      )}

      {/* Finalizar evento */}
      {finishOpen && (
        <FinishEventModal
          title={event.title}
          summary={summary}
          loading={finishMutation.isPending}
          onCancel={() => setFinishOpen(false)}
          onConfirm={runFinish}
        />
      )}

      {/* Reenviar acceso */}
      {resendFor && (
        <ConfirmModal
          open
          title="Reenviar acceso"
          message={`Se enviará nuevamente el acceso al comprador externo de esta compra (${resendFor.attendeeName}). No se crea un nuevo enlace: se reenvía el mismo.`}
          confirmText="Reenviar"
          variant="primary"
          loading={resendAccess.isPending}
          onConfirm={runResend}
          onClose={() => setResendFor(null)}
        />
      )}

      {/* Corrección de ingreso */}
      {correctFor && (
        <CorrectUsageModal usage={correctFor} onClose={() => setCorrectFor(null)} onSubmit={runCorrect} submitting={adjustUsage.isPending} />
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

function SummaryTab({ summary, loading, onOpenCheckIn, canCheckIn }: {
  summary?: import('./hooks').EventReportSummary
  loading: boolean
  onOpenCheckIn: () => void
  canCheckIn: boolean
}) {
  return (
    <div className="space-y-4">
      {loading || !summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Metric label="Confirmadas" value={String(summary.confirmedQuantity)} />
          <Metric label="Ingresaron" value={String(summary.usedQuantity)} />
          <Metric label="Disponibles" value={String(summary.availableQuantity)} tone="ok" />
          <Metric label="Pendientes" value={String(summary.pendingQuantity)} />
          <Metric label="Recaudación" value={money(summary.totalRevenue)} tone="money" />
        </div>
      )}
      {canCheckIn && (
        <Button className="w-full bg-violet-600 text-white hover:bg-violet-700" onClick={onOpenCheckIn}>Abrir control de ingreso</Button>
      )}
    </div>
  )
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'ok' | 'money' }) {
  const color = tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'money' ? 'text-violet-700 dark:text-violet-300' : 'text-slate-900 dark:text-white'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
    </div>
  )
}

function SettingsTab({ event, onEdit, onPublish, onCancel, onFinish, onDelete }: {
  event: ClassClickEvent
  onEdit: () => void
  onPublish: () => void
  onCancel: () => void
  onFinish: () => void
  onDelete: () => void
}) {
  const isDraft = event.status === 'Draft'
  const isPublished = event.status === 'Published'
  const publicUrl = event.publicSalesEnabled && event.publicSlug ? `/e/${event.publicSlug}` : null

  return (
    <div className="space-y-3">
      {publicUrl && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-700 dark:text-violet-300">Venta pública activa</p>
          <p className="mt-1 break-all font-mono text-xs text-slate-600 dark:text-slate-300">{window.location.origin}{publicUrl}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${publicUrl}`); }}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700"
            >
              Copiar enlace
            </button>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer"
              className="rounded-lg border border-violet-300 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-950/40">
              Ver página pública
            </a>
          </div>
        </div>
      )}

      <button type="button" onClick={onEdit}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Editar evento</p>
          <p className="text-xs text-slate-400">Precio, cupos, fechas, imagen, condiciones y opciones de venta.</p>
        </div>
        <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">Editar →</span>
      </button>

      {isDraft && (
        <button type="button" onClick={onPublish}
          className="flex w-full items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left transition hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40">
          <div>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Publicar evento</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">Los alumnos podrán ver el evento y comprar entradas.</p>
          </div>
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Publicar →</span>
        </button>
      )}

      {isPublished && (
        <button type="button" onClick={onFinish}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Finalizar evento</p>
            <p className="text-xs text-slate-400">Cierra la operación: sin nuevos ingresos ni ventas.</p>
          </div>
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Finalizar →</span>
        </button>
      )}

      {(isDraft || isPublished) && (
        <button type="button" onClick={onCancel}
          className="flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/20 dark:hover:bg-amber-950/40">
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Cancelar evento</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">Impide nuevos ingresos y ventas; se notifica a los compradores externos.</p>
          </div>
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Cancelar →</span>
        </button>
      )}

      {event.cancellationReason && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
          <p className="text-xs font-bold uppercase tracking-widest">Motivo de cancelación</p>
          <p className="mt-1">{event.cancellationReason}</p>
        </div>
      )}

      {isDraft && (
        <button type="button" onClick={onDelete}
          className="flex w-full items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-left transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/20 dark:hover:bg-red-950/40">
          <div>
            <p className="text-sm font-bold text-red-700 dark:text-red-300">Eliminar borrador</p>
            <p className="text-xs text-red-600 dark:text-red-400">Esta acción no se puede deshacer.</p>
          </div>
          <span className="text-sm font-semibold text-red-600 dark:text-red-400">Eliminar →</span>
        </button>
      )}
    </div>
  )
}

function CancelEventModal({ title, summary, reason, setReason, loading, onCancel, onConfirm }: {
  title: string
  summary?: import('./hooks').EventReportSummary
  reason: string
  setReason: (v: string) => void
  loading: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const confirmed = summary?.confirmedQuantity ?? 0
  const pending = summary?.pendingQuantity ?? 0
  const buyers = confirmed + pending

  return (
    <Modal open onClose={onCancel} title="Cancelar evento" description={`${title} · Esta acción impedirá nuevos ingresos y nuevas ventas.`}>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800">
            <p className="text-xl font-black text-slate-900 dark:text-white">{confirmed}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Confirmadas</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800">
            <p className="text-xl font-black text-slate-900 dark:text-white">{pending}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pendientes</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800">
            <p className="text-xl font-black text-slate-900 dark:text-white">{buyers}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Entradas</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Motivo de cancelación (opcional)</label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Ej: falta de autorización municipal" />
          <p className="mt-1 text-[11px] text-slate-400">Se informa a los compradores externos. El QR queda inutilizable para nuevos ingresos.</p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading}>Volver</Button>
          <Button className="bg-rose-600 text-white hover:bg-rose-700" loading={loading} onClick={onConfirm}>Cancelar evento</Button>
        </div>
      </div>
    </Modal>
  )
}

function FinishEventModal({ title, summary, loading, onCancel, onConfirm }: {
  title: string
  summary?: import('./hooks').EventReportSummary
  loading: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const confirmed = summary?.confirmedQuantity ?? 0
  const used = summary?.usedQuantity ?? 0
  const pending = summary?.pendingQuantity ?? 0
  const notUsed = Math.max(0, confirmed - used)

  return (
    <Modal open onClose={onCancel} title="Finalizar evento" description={`${title} · Al finalizar ya no se podrán registrar nuevos ingresos ni ventas.`}>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Confirmadas" value={confirmed} />
          <Stat label="Ingresaron" value={used} tone="ok" />
          <Stat label="No utilizadas" value={notUsed} />
          <Stat label="Pendientes" value={pending} tone={pending > 0 ? 'warn' : undefined} />
          <Stat label="Recaudación" value={summary ? money(summary.totalRevenue) : '–'} tone="money" />
        </div>

        {pending > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
            Hay {pending} {pending === 1 ? 'compra' : 'compras'} pendiente{pending === 1 ? '' : 's'} de pago o revisión. Podés finalizar igual; el cupo reservado se mantiene en el histórico.
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading}>Volver</Button>
          <Button className="bg-blue-600 text-white hover:bg-blue-700" loading={loading} onClick={onConfirm}>Finalizar evento</Button>
        </div>
      </div>
    </Modal>
  )
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'ok' | 'warn' | 'money' }) {
  const color = tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'warn' ? 'text-amber-600 dark:text-amber-400'
      : tone === 'money' ? 'text-violet-700 dark:text-violet-300'
        : 'text-slate-900 dark:text-white'
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800">
      <p className={`text-xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
    </div>
  )
}

function CorrectUsageModal({ usage, onClose, onSubmit, submitting }: {
  usage: EventReportUsageRow
  onClose: () => void
  onSubmit: (correctQuantity: number, reason: string) => void
  submitting: boolean
}) {
  const [correct, setCorrect] = useState(() => usage.effectiveQuantity ?? usage.quantity)
  const [reason, setReason] = useState('')
  const original = usage.quantity
  const effective = usage.effectiveQuantity ?? original
  const correctedSoFar = usage.adjustedQuantity ?? 0

  return (
    <Modal open onClose={onClose} title="Corregir ingreso" description={`${usage.attendeeName} · ${usage.usedAtUtc ? formatEventDate(usage.usedAtUtc) : ''} ${usage.usedAtUtc ? formatEventTime(usage.usedAtUtc) : ''}`}>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Registrado" value={original} />
          <Stat label="Corregido" value={correctedSoFar} tone="warn" />
          <Stat label="Efectivo" value={effective} tone="ok" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Cantidad correcta (0 a {effective})</label>
          <Input type="number" min={0} max={effective} value={correct}
            onChange={(e) => setCorrect(Math.min(effective, Math.max(0, Number(e.target.value) || 0)))} />
          <p className="mt-1 text-[11px] text-slate-400">Solo se puede reducir. Se registra un ajuste auditado; el ingreso original queda intacto.</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Motivo *</label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Ej: se marcó una entrada adicional por error" />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button className="bg-violet-600 text-white hover:bg-violet-700" loading={submitting}
            disabled={correct >= effective || !reason.trim()}
            onClick={() => onSubmit(correct, reason)}>
            Guardar corrección
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function OperatorsTab({ eventId, onManage, toast }: {
  eventId: string
  onManage: () => void
  toast: (m: string, t?: 'success' | 'error') => void
}) {
  const { data: operators = [], isLoading } = useEventOperators()
  const updateMutation = useUpdateEventOperatorAssignments()
  const [adding, setAdding] = useState(false)
  const [picking, setPicking] = useState<EventOperator | null>(null)
  const [perms, setPerms] = useState({ canCheckIn: true, canSellAtDoor: false })
  const [error, setError] = useState('')

  const assigned = operators.filter((op) => op.assignments.some((a) => a.eventId === eventId))

  async function toggleAssign(op: EventOperator) {
    setError('')
    try {
      const current = op.assignments.filter((a) => a.eventId !== eventId)
      if (op.assignments.some((a) => a.eventId === eventId && a.canCheckIn === perms.canCheckIn && a.canSellAtDoor === perms.canSellAtDoor)) {
        // quitar asignación
        await updateMutation.mutateAsync({ userId: op.userId, assignments: current.map((a) => ({ eventId: a.eventId, canCheckIn: a.canCheckIn, canSellAtDoor: a.canSellAtDoor })) })
        toast('Operador desasignado.')
      } else {
        await updateMutation.mutateAsync({
          userId: op.userId,
          assignments: [
            ...current.map((a) => ({ eventId: a.eventId, canCheckIn: a.canCheckIn, canSellAtDoor: a.canSellAtDoor })),
            { eventId, canCheckIn: perms.canCheckIn, canSellAtDoor: perms.canSellAtDoor },
          ],
        })
        toast('Asignación guardada.')
      }
      setPicking(null)
    } catch (err: unknown) {
      setError(getApiError(err) || 'No se pudo guardar la asignación.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">Personas asignadas a este evento con sus permisos.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onManage}>Gestionar operadores</Button>
          <Button className="bg-violet-600 text-white hover:bg-violet-700" size="sm" onClick={() => { setAdding(true); setPicking(null); setError('') }}>+ Agregar operador</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div>
      ) : assigned.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-500">
          Todavía no hay operadores asignados a este evento.
        </div>
      ) : (
        <div className="space-y-2">
          {assigned.map((op) => {
            const a = op.assignments.find((x) => x.eventId === eventId)!
            return (
              <div key={op.userId} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{op.firstName} {op.lastName}</p>
                  <p className="text-xs text-slate-400">{op.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex flex-wrap gap-1">
                    {a.canCheckIn ? <PermCheck label="Control de ingreso" /> : <PermDash label="Control de ingreso" />}
                    {a.canSellAtDoor ? <PermCheck label="Venta en puerta" /> : <PermDash label="Venta en puerta" />}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => { setPicking(op); setPerms({ canCheckIn: a.canCheckIn, canSellAtDoor: a.canSellAtDoor }); setError('') }}>
                    Editar
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {adding && (
        <Modal open onClose={() => setAdding(false)} title="Agregar operador" description="Elegí un operador existente para asignarlo a este evento.">
          <div className="space-y-3 p-5">
            {operators.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
                No hay operadores creados. <button onClick={onManage} className="font-bold text-violet-600 hover:underline dark:text-violet-400">Gestionar operadores →</button>
              </div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {operators.map((op) => {
                  const already = op.assignments.some((a) => a.eventId === eventId)
                  return (
                    <button key={op.userId} type="button" disabled={already}
                      onClick={() => { setPicking(op); setPerms({ canCheckIn: true, canSellAtDoor: false }); setError('') }}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${already ? 'cursor-not-allowed border-slate-100 opacity-50 dark:border-slate-800' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
                      <span className="font-semibold text-slate-900 dark:text-white">{op.firstName} {op.lastName}</span>
                      <span className="text-xs text-slate-400">{already ? 'Asignado' : 'Asignar'}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </Modal>
      )}

      {picking && (
        <Modal open onClose={() => setPicking(null)} title={`Permisos · ${picking.firstName} ${picking.lastName}`} description="Permisos de este operador en este evento.">
          <div className="space-y-4 p-5">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={perms.canCheckIn} onChange={(e) => setPerms((p) => ({ ...p, canCheckIn: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                Control de ingreso
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={perms.canSellAtDoor} onChange={(e) => setPerms((p) => ({ ...p, canSellAtDoor: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                Venta en puerta
              </label>
            </div>
            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setPicking(null)} disabled={updateMutation.isPending}>Cancelar</Button>
              <Button className="bg-violet-600 text-white hover:bg-violet-700" loading={updateMutation.isPending} onClick={() => toggleAssign(picking)}>
                Guardar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function PermCheck({ label }: { label: string }) {
  return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">✓ {label}</span>
}
function PermDash({ label }: { label: string }) {
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400 dark:bg-slate-800 dark:text-slate-500">— {label}</span>
}
