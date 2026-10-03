import { useNavigate } from 'react-router-dom'
import { CalendarClock, ChevronRight } from 'lucide-react'
import { formatDateOnly } from '@/lib/date'
import type { UpcomingItem } from '@/types/dashboard'

interface UpcomingTableProps {
  items: UpcomingItem[]
  loading?: boolean
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  isSport?: boolean
}

const statusColors: Record<string, string> = {
  Vencida: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  Vencido: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  Pendiente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Próximo: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Vigente: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
}

const sportStatusColors: Record<string, string> = {
  Vencida: 'border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300',
  Vencido: 'border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300',
  Pendiente: 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300',
  Próximo: 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300',
  Vigente: 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300',
}

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const money = (value?: number) => (value == null ? '-' : ARS.format(value))

function initialsOf(name?: string) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.charAt(0) ?? ''
  const second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return (first + second).toUpperCase() || '?'
}

export function UpcomingTable({ items, loading, page, totalPages, onPageChange, isSport = false }: UpcomingTableProps) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className={isSport
        ? 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[rgba(120,150,200,0.25)] dark:bg-[#111C30] dark:shadow-[0_1px_6px_rgba(2,8,23,0.45)]'
        : 'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800'}>
        <div className="h-4 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-3 space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-9 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />)}
        </div>
      </div>
    )
  }

  if (isSport) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[rgba(120,150,200,0.25)] dark:bg-[#111C30] dark:shadow-[0_1px_6px_rgba(2,8,23,0.45)]">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-blue-500/15">
            <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Próximos vencimientos</h3>
        </div>
        {!items || items.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-500">Sin vencimientos próximos</p>
        ) : (
          <>
            {/* Desktop (md+): tabla compacta */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full whitespace-nowrap text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[rgba(120,150,200,0.15)]">
                    <th className="px-2.5 pb-2 text-left font-semibold text-slate-500 dark:text-slate-400">Tipo</th>
                    <th className="px-2.5 pb-2 text-left font-semibold text-slate-500 dark:text-slate-400">Período</th>
                    <th className="px-2.5 pb-2 text-left font-semibold text-slate-500 dark:text-slate-400">Alumno</th>
                    <th className="px-2.5 pb-2 text-right font-semibold text-slate-500 dark:text-slate-400">Monto</th>
                    <th className="px-2.5 pb-2 text-left font-semibold text-slate-500 dark:text-slate-400">Vencimiento</th>
                    <th className="px-2.5 pb-2 text-left font-semibold text-slate-500 dark:text-slate-400">Estado</th>
                    <th className="px-2.5 pb-2 text-right font-semibold text-slate-500 dark:text-slate-400"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const dateStr = formatDateOnly(item.dueDate)
                    const colorClass = sportStatusColors[item.status] ?? 'border-slate-200 bg-slate-100 text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-slate-300'
                    return (
                      <tr key={item.id} className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-[rgba(120,150,200,0.08)] dark:hover:bg-white/[0.04]">
                        <td className="px-2.5 py-3 text-slate-700 dark:text-slate-300">{item.chargeTypeName ?? item.concept}</td>
                        <td className="px-2.5 py-3 text-slate-500 dark:text-slate-400">{item.period ?? '-'}</td>
                        <td className="px-2.5 py-3 text-slate-700 dark:text-slate-300">
                          <span className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 dark:bg-[#172338] dark:text-slate-300">
                              {initialsOf(item.studentName)}
                            </span>
                            {item.studentName}
                          </span>
                        </td>
                        <td className="px-2.5 py-3 text-right font-bold text-slate-900 dark:text-white">{money(item.amount)}</td>
                        <td className="px-2.5 py-3 text-slate-500 dark:text-slate-400">{dateStr}</td>
                        <td className="px-2.5 py-3">
                          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${colorClass}`}>{item.status}</span>
                        </td>
                        <td className="px-2.5 py-3 text-right">
                          {item.navigateTo && (
                            <button onClick={() => navigate(item.navigateTo!)}
                              className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                              Ver detalle
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / tablet angosta (< md): lista compacta */}
            <div className="divide-y divide-slate-100 dark:divide-[rgba(120,150,200,0.08)] md:hidden">
              {items.map((item) => {
                const dateStr = formatDateOnly(item.dueDate)
                const colorClass = sportStatusColors[item.status] ?? 'border-slate-200 bg-slate-100 text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-slate-300'
                const typeName = item.chargeTypeName ?? item.concept
                return (
                  <button
                    key={item.id}
                    onClick={() => item.navigateTo && navigate(item.navigateTo)}
                    className="flex w-full flex-col gap-0.5 px-1 py-2.5 text-left transition hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-white/[0.04] dark:active:bg-white/[0.06]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 dark:bg-[#172338] dark:text-slate-300">
                          {initialsOf(item.studentName)}
                        </span>
                        <span className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white">{item.studentName}</span>
                      </span>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${colorClass}`}>{item.status}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {typeName}{item.period ? ` · ${item.period}` : ''}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">{money(item.amount)}</span>
                      <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">Vence {dateStr}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-[rgba(120,150,200,0.15)] dark:text-slate-400">
                <button
                  onClick={() => onPageChange(Math.max(page - 1, 1))}
                  disabled={page <= 1}
                  className="min-h-8 rounded-lg px-2.5 font-semibold text-blue-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-400 dark:hover:bg-white/5"
                >
                  ‹ Anterior
                </button>
                <span>Página {page} de {totalPages}</span>
                <button
                  onClick={() => onPageChange(Math.min(page + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="min-h-8 rounded-lg px-2.5 font-semibold text-blue-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-400 dark:hover:bg-white/5"
                >
                  Siguiente ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-200">Próximos vencimientos</h3>
      {!items || items.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">Sin vencimientos próximos</p>
      ) : (
        <>
          {/* Desktop (md+): tabla compacta */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full whitespace-nowrap text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-2.5 pb-2 text-left font-semibold text-slate-500 dark:text-slate-400">Tipo</th>
                  <th className="px-2.5 pb-2 text-left font-semibold text-slate-500 dark:text-slate-400">Período</th>
                  <th className="px-2.5 pb-2 text-left font-semibold text-slate-500 dark:text-slate-400">Alumno</th>
                  <th className="px-2.5 pb-2 text-right font-semibold text-slate-500 dark:text-slate-400">Monto</th>
                  <th className="px-2.5 pb-2 text-left font-semibold text-slate-500 dark:text-slate-400">Vencimiento</th>
                  <th className="px-2.5 pb-2 text-left font-semibold text-slate-500 dark:text-slate-400">Estado</th>
                  <th className="px-2.5 pb-2 text-right font-semibold text-slate-500 dark:text-slate-400"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const dateStr = formatDateOnly(item.dueDate)
                  const colorClass = statusColors[item.status] ?? 'bg-slate-100 text-slate-600'
                  return (
                    <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="px-2.5 py-2 text-slate-700 dark:text-slate-300">{item.chargeTypeName ?? item.concept}</td>
                      <td className="px-2.5 py-2 text-slate-500 dark:text-slate-400">{item.period ?? '-'}</td>
                      <td className="px-2.5 py-2 text-slate-700 dark:text-slate-300">{item.studentName}</td>
                      <td className="px-2.5 py-2 text-right text-slate-700 dark:text-slate-300">{money(item.amount)}</td>
                      <td className="px-2.5 py-2 text-slate-500 dark:text-slate-400">{dateStr}</td>
                      <td className="px-2.5 py-2">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${colorClass}`}>{item.status}</span>
                      </td>
                      <td className="px-2.5 py-2 text-right">
                        {item.navigateTo && (
                          <button onClick={() => navigate(item.navigateTo!)}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">
                            Ver detalle
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile / tablet angosta (< md): lista compacta */}
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50 md:hidden">
            {items.map((item) => {
              const dateStr = formatDateOnly(item.dueDate)
              const colorClass = statusColors[item.status] ?? 'bg-slate-100 text-slate-600'
              const typeName = item.chargeTypeName ?? item.concept
              return (
                <button
                  key={item.id}
                  onClick={() => item.navigateTo && navigate(item.navigateTo)}
                  className="flex w-full flex-col gap-0.5 px-1 py-2 text-left transition hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-700/40 dark:active:bg-slate-700/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{item.studentName}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${colorClass}`}>{item.status}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {typeName}{item.period ? ` · ${item.period}` : ''}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-900 dark:text-white">{money(item.amount)}</span>
                    <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">Vence {dateStr}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <button
                onClick={() => onPageChange(Math.max(page - 1, 1))}
                disabled={page <= 1}
                className="min-h-8 rounded-lg px-2.5 font-semibold text-indigo-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-indigo-400 dark:hover:bg-slate-700/50"
              >
                ‹ Anterior
              </button>
              <span>Página {page} de {totalPages}</span>
              <button
                onClick={() => onPageChange(Math.min(page + 1, totalPages))}
                disabled={page >= totalPages}
                className="min-h-8 rounded-lg px-2.5 font-semibold text-indigo-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-indigo-400 dark:hover:bg-slate-700/50"
              >
                Siguiente ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}