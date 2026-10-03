import { useNavigate } from 'react-router-dom'
import { CalendarClock, ChevronRight } from 'lucide-react'
import { formatDateOnly } from '@/lib/date'
import { cn } from '@/lib/utils'
import { card, cardHover, muted } from './visual'
import type { UpcomingItem } from '@/types/dashboard'

interface EduUpcomingTableProps {
  items: UpcomingItem[]
  loading?: boolean
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

const STATUS_PILL: Record<string, string> = {
  Vencida: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
  Vencido: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
  Pendiente: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  Próximo: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  Pagada: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  Vigente: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
}

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const money = (value?: number) => (value == null ? '-' : ARS.format(value))

function initialsOf(name?: string) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.charAt(0) ?? ''
  const second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return (first + second).toUpperCase() || '?'
}

export function EduUpcomingTable({ items, loading, page, totalPages, onPageChange }: EduUpcomingTableProps) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className={cn(card, 'animate-pulse p-5')}>
        <div className="h-4 w-40 rounded bg-slate-200 dark:bg-white/[0.06]" />
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-11 rounded-lg bg-slate-200 dark:bg-white/[0.06]" />)}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(card, cardHover, 'p-5')}>
      {!items.length ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-400 dark:text-slate-500">
            <CalendarClock className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className={cn('text-xs', muted)}>Sin vencimientos que requieran acción económica.</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full whitespace-nowrap text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400 dark:border-white/[0.08] dark:text-slate-500">
                  <th className="px-2.5 pb-2.5 text-left font-bold">Tipo</th>
                  <th className="px-2.5 pb-2.5 text-left font-bold">Período</th>
                  <th className="px-2.5 pb-2.5 text-left font-bold">Alumno</th>
                  <th className="px-2.5 pb-2.5 text-right font-bold">Monto</th>
                  <th className="px-2.5 pb-2.5 text-left font-bold">Vencimiento</th>
                  <th className="px-2.5 pb-2.5 text-left font-bold">Estado</th>
                  <th className="px-2.5 pb-2.5 text-right font-bold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {items.map((item) => {
                  const dateStr = formatDateOnly(item.dueDate)
                  const pill = STATUS_PILL[item.status] ?? 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/30'
                  return (
                    <tr key={item.id} className="transition hover:bg-slate-50/70 dark:hover:bg-white/[0.03]">
                      <td className="px-2.5 py-3 font-medium text-slate-700 dark:text-slate-200">
                        {item.chargeTypeName ?? item.concept}
                      </td>
                      <td className={cn('px-2.5 py-3', muted)}>{item.period ?? '-'}</td>
                      <td className="px-2.5 py-3 text-slate-700 dark:text-slate-200">
                        <span className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                            {initialsOf(item.studentName)}
                          </span>
                          {item.studentName}
                        </span>
                      </td>
                      <td className="px-2.5 py-3 text-right font-bold tabular-nums text-slate-900 dark:text-white">
                        {money(item.amount)}
                      </td>
                      <td className={cn('px-2.5 py-3', muted)}>{dateStr}</td>
                      <td className="px-2.5 py-3">
                        <span className={cn('inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold', pill)}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-2.5 py-3 text-right">
                        {item.navigateTo && (
                          <button
                            onClick={() => navigate(item.navigateTo!)}
                            className="text-xs font-semibold text-blue-600 transition hover:text-blue-500 dark:text-blue-400"
                          >
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

          {/* Mobile */}
          <div className="divide-y divide-slate-100 dark:divide-white/[0.05] md:hidden">
            {items.map((item) => {
              const dateStr = formatDateOnly(item.dueDate)
              const pill = STATUS_PILL[item.status] ?? 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/30'
              const typeName = item.chargeTypeName ?? item.concept
              return (
                <button
                  key={item.id}
                  onClick={() => item.navigateTo && navigate(item.navigateTo)}
                  className="flex w-full flex-col gap-1 px-1 py-2.5 text-left transition hover:bg-slate-50/70 dark:hover:bg-white/[0.03]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {initialsOf(item.studentName)}
                      </span>
                      <span className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {item.studentName}
                      </span>
                    </span>
                    <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold', pill)}>
                      {item.status}
                    </span>
                  </div>
                  <div className={cn('pl-9 text-xs', muted)}>{typeName}{item.period ? ` · ${item.period}` : ''}</div>
                  <div className="flex items-center justify-between gap-2 pl-9 text-xs">
                    <span className="font-bold tabular-nums text-slate-900 dark:text-white">{money(item.amount)}</span>
                    <span className="flex min-w-0 items-center gap-1">
                      <span className={cn('truncate', muted)}>Vence {dateStr}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-white/[0.08] dark:text-slate-400">
              <button
                onClick={() => onPageChange(Math.max(page - 1, 1))}
                disabled={page <= 1}
                className="min-h-8 rounded-lg px-2.5 font-semibold text-blue-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-400 dark:hover:bg-white/[0.06]"
              >
                ‹ Anterior
              </button>
              <span>Página {page} de {totalPages}</span>
              <button
                onClick={() => onPageChange(Math.min(page + 1, totalPages))}
                disabled={page >= totalPages}
                className="min-h-8 rounded-lg px-2.5 font-semibold text-blue-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-400 dark:hover:bg-white/[0.06]"
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