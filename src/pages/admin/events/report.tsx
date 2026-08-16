import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { formatEventDate, formatEventTime } from '@/pages/student/events/hooks'
import {
  useAdminEvent, useEventReportSummary, useEventReportTimeline, useEventReportSales,
  useEventReportCheckIns, downloadEventReport,
} from './hooks'
import type { EventReportSaleRow, EventReportUsageRow } from './hooks'

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const money = (v?: number | null) => (v == null ? 'Gratis' : ARS.format(v))

const STATUS_LABEL: Record<string, string> = {
  PendingPayment: 'Pendiente de pago',
  PendingReview: 'Pendiente de aprobación',
  Paid: 'Pagada',
  Confirmed: 'Confirmada',
  Expired: 'Vencida',
  Rejected: 'Rechazada',
  Cancelled: 'Cancelada',
  Refunded: 'Reembolsada',
}

const METHOD_LABEL: Record<string, string> = {
  MercadoPago: 'Mercado Pago',
  Transfer: 'Transferencia',
  Cash: 'Efectivo',
  Free: 'Gratuito',
  SinSeleccionar: 'Sin seleccionar',
}

export default function EventReportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: event, isLoading: loadingEvent } = useAdminEvent(id)
  const { data: summary, isLoading: loadingSummary } = useEventReportSummary(id)
  const { data: timeline } = useEventReportTimeline(id)

  const [tab, setTab] = useState<'summary' | 'sales' | 'checkins'>('summary')

  const [salesFilter, setSalesFilter] = useState({ page: 1, pageSize: 20, search: '', status: '', origin: '', paymentMethod: '' })
  const { data: salesPage, isFetching: fetchingSales } = useEventReportSales(id, salesFilter)

  const [checkInPage, setCheckInPage] = useState(1)
  const [checkInSearch, setCheckInSearch] = useState('')
  const [checkInsFilters, setCheckInsFilters] = useState<{ page: number; pageSize: number; search: string }>({ page: 1, pageSize: 20, search: '' })
  const { data: checkInsPage, isFetching: fetchingCheckIns } = useEventReportCheckIns(id, checkInsFilters.page, checkInsFilters.pageSize, checkInsFilters.search)

  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null)

  async function handleExport(format: 'xlsx' | 'pdf') {
    if (!id) return
    setExporting(format)
    try {
      await downloadEventReport(id, format)
    } catch {
      // sin toast: se ignora silenciosamente
    } finally {
      setExporting(null)
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

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button onClick={() => navigate('/admin/events')} className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400">
            ← Volver a eventos
          </button>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{event.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatEventDate(event.startsAt)}{event.hasStartTime ? ` · ${formatEventTime(event.startsAt)}` : ''}{event.location ? ` · ${event.location}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" loading={exporting === 'xlsx'} onClick={() => handleExport('xlsx')}>Exportar Excel</Button>
          <Button variant="outline" size="sm" loading={exporting === 'pdf'} onClick={() => handleExport('pdf')}>Exportar PDF</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {([
          ['summary', 'Resumen'],
          ['sales', 'Ventas'],
          ['checkins', 'Ingresos'],
        ] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === key ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <SummaryTab summary={summary} timeline={timeline} loading={loadingSummary} />
      )}

      {tab === 'sales' && (
        <SalesTab
          filter={salesFilter}
          setFilter={setSalesFilter}
          page={salesPage}
          fetching={fetchingSales}
        />
      )}

      {tab === 'checkins' && (
        <CheckInsTab
          search={checkInSearch}
          setSearch={setCheckInSearch}
          filters={checkInsFilters}
          setFilters={setCheckInsFilters}
          page={checkInPage}
          setPage={setCheckInPage}
          data={checkInsPage}
          fetching={fetchingCheckIns}
        />
      )}
    </div>
  )
}

function MetricCard({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'ok' | 'money' }) {
  const color = tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'money' ? 'text-violet-700 dark:text-violet-300' : 'text-slate-900 dark:text-white'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
    </div>
  )
}

function SummaryTab({ summary, timeline, loading }: { summary?: import('./hooks').EventReportSummary; timeline?: import('./hooks').EventReportTimeline; loading: boolean }) {
  if (loading || !summary) {
    return <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div>
  }

  const hasCheckIns = summary.usedQuantity > 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MetricCard label="Confirmadas" value={String(summary.confirmedQuantity)} />
        <MetricCard label="Utilizadas" value={String(summary.usedQuantity)} />
        <MetricCard label="Disponibles" value={String(summary.availableQuantity)} tone="ok" />
        <MetricCard label="Pendientes" value={String(summary.pendingQuantity)} />
        <MetricCard label="Recaudación" value={money(summary.totalRevenue)} tone="money" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Ventas por origen</h3>
          {summary.byOrigin.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Todavía no hay entradas vendidas.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {summary.byOrigin.map((o) => {
                const pct = summary.confirmedQuantity > 0 ? Math.round((o.quantity / summary.confirmedQuantity) * 100) : 0
                return (
                  <div key={o.origin}>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{o.label}</span>
                      <span className="text-slate-500 dark:text-slate-400">{o.quantity} · {pct}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Recaudación por medio</h3>
          {summary.byPaymentMethod.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Todavía no hay entradas vendidas.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {summary.byPaymentMethod.map((m) => (
                <div key={m.paymentMethod} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{m.label}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {m.paymentMethod === 'Free' ? `${m.quantity} entradas` : `${m.quantity} · ${money(m.revenue)}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ingresos por horario */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Ingresos por horario</h3>
        {!hasCheckIns || !timeline || timeline.checkIns.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Todavía no se registraron ingresos.</p>
        ) : (
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline.checkIns} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip formatter={(value) => [`${String(value ?? '')} personas`, 'Ingresos']} />
                <Bar dataKey="quantity" fill="#7c3aed" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  )
}

export function SalesTab({ filter, setFilter, page, fetching, onResendAccess }: {
  filter: { page: number; pageSize: number; search: string; status: string; origin: string; paymentMethod: string }
  setFilter: (f: typeof filter) => void
  page?: import('./hooks').EventReportPage<EventReportSaleRow>
  fetching: boolean
  onResendAccess?: (s: EventReportSaleRow) => void
}) {
  const items = page?.items ?? []
  const total = page?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / filter.pageSize))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value, page: 1 })}
          placeholder="Buscar alumno..." className="sm:max-w-xs" />
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value, page: 1 })}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          <option value="">Estado: todos</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filter.origin} onChange={(e) => setFilter({ ...filter, origin: e.target.value, page: 1 })}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          <option value="">Origen: todos</option>
          <option value="StudentOnline">Online</option>
          <option value="AdminDoorSale">Puerta</option>
        </select>
        <select value={filter.paymentMethod} onChange={(e) => setFilter({ ...filter, paymentMethod: e.target.value, page: 1 })}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          <option value="">Medio: todos</option>
          {Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {fetching && items.length === 0 ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-500">
          Todavía no hay entradas vendidas.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Alumno</th>
                <th className="px-4 py-3">Cant.</th>
                <th className="px-4 py-3">Unitario</th>
                <th className="px-4 py-3">Base</th>
                <th className="px-4 py-3">Recargo</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Medio</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
                {onResendAccess && <th className="px-4 py-3">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((s) => {
                const isGuest = s.origin === 'PublicOnline'
                return (
                  <tr key={s.purchaseId} className="bg-white dark:bg-slate-900">
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{s.attendeeName}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{s.quantity}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{money(s.unitPrice)}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{money(s.baseAmount)}</td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{money(s.surchargeAmount)}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">{money(s.totalAmount)}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{METHOD_LABEL[s.paymentMethod] ?? s.paymentMethod}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{s.origin === 'AdminDoorSale' ? 'Puerta' : 'Online'}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{STATUS_LABEL[s.status] ?? s.status}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-400">{formatEventDate(s.createdAtUtc)} {formatEventTime(s.createdAtUtc)}</td>
                    {onResendAccess && (
                      <td className="px-4 py-2.5">
                        {isGuest && (
                          <button type="button" onClick={() => onResendAccess(s)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                            Reenviar acceso
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > filter.pageSize && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <Button variant="outline" size="sm" disabled={filter.page <= 1 || fetching} onClick={() => setFilter({ ...filter, page: filter.page - 1 })}>Anterior</Button>
          <span>Página {filter.page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={filter.page >= totalPages || fetching} onClick={() => setFilter({ ...filter, page: filter.page + 1 })}>Siguiente</Button>
        </div>
      )}
    </div>
  )
}

export function CheckInsTab({ search, setSearch, filters, setFilters, page, setPage, data, fetching, onCorrect }: {
  search: string
  setSearch: (s: string) => void
  filters: { page: number; pageSize: number; search: string }
  setFilters: (f: typeof filters) => void
  page: number
  setPage: (p: number) => void
  data?: import('./hooks').EventReportPage<EventReportUsageRow>
  fetching: boolean
  onCorrect?: (u: EventReportUsageRow) => void
}) {
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setFilters({ ...filters, search: e.target.value, page: 1 }); setPage(1) }}
          placeholder="Buscar alumno..." className="sm:max-w-xs" />
      </div>

      {fetching && items.length === 0 ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-500">
          Todavía no se registraron ingresos.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Alumno</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Fecha/hora</th>
                <th className="px-4 py-3">Registrado por</th>
                <th className="px-4 py-3">Origen</th>
                {onCorrect && <th className="px-4 py-3">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((u) => {
                const corrected = (u.adjustedQuantity ?? 0) > 0
                const effective = u.effectiveQuantity ?? u.quantity
                return (
                  <tr key={u.id} className="bg-white dark:bg-slate-900">
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{u.attendeeName}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {corrected ? (
                        <span>
                          <span className="text-slate-400 line-through">{u.quantity}</span>
                          {' → '}<b className="text-slate-900 dark:text-white">{effective}</b>
                          <span className="ml-1 text-[11px] text-emerald-600 dark:text-emerald-400">({u.adjustedQuantity} corregidas)</span>
                        </span>
                      ) : (
                        u.quantity
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{formatEventDate(u.usedAtUtc)} {formatEventTime(u.usedAtUtc)}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{u.usedByUserName ?? '-'}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{u.origin === 'AdminCheckIn' ? 'Scanner' : u.origin}</td>
                    {onCorrect && (
                      <td className="px-4 py-2.5">
                        <button type="button" onClick={() => onCorrect(u)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                          Corregir
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > filters.pageSize && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <Button variant="outline" size="sm" disabled={page <= 1 || fetching} onClick={() => { setPage(page - 1); setFilters({ ...filters, page: page - 1 }) }}>Anterior</Button>
          <span>Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages || fetching} onClick={() => { setPage(page + 1); setFilters({ ...filters, page: page + 1 }) }}>Siguiente</Button>
        </div>
      )}
    </div>
  )
}

