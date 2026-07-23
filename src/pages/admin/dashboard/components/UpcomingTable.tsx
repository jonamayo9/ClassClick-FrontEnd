import { useNavigate } from 'react-router-dom'
import { formatDateOnly } from '@/lib/date'
import type { UpcomingItem } from '@/types/dashboard'

interface UpcomingTableProps {
  items: UpcomingItem[]
  loading?: boolean
}

const statusColors: Record<string, string> = {
  Vencida: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  Vencido: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  Pendiente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Próximo: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Vigente: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
}

export function UpcomingTable({ items, loading }: UpcomingTableProps) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="h-4 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-3 space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Próximos vencimientos</h3>
      {!items || items.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">Sin vencimientos próximos</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="pb-2 text-left font-semibold text-slate-500 dark:text-slate-400">Concepto</th>
                <th className="pb-2 text-left font-semibold text-slate-500 dark:text-slate-400">Alumno</th>
                <th className="pb-2 text-left font-semibold text-slate-500 dark:text-slate-400">Vencimiento</th>
                <th className="pb-2 text-left font-semibold text-slate-500 dark:text-slate-400">Estado</th>
                <th className="pb-2 text-right font-semibold text-slate-500 dark:text-slate-400"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const dateStr = formatDateOnly(item.dueDate)
                const colorClass = statusColors[item.status] ?? 'bg-slate-100 text-slate-600'
                return (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-2.5 text-slate-700 dark:text-slate-300">{item.concept}</td>
                    <td className="py-2.5 text-slate-700 dark:text-slate-300">{item.studentName}</td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{dateStr}</td>
                    <td className="py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${colorClass}`}>{item.status}</span></td>
                    <td className="py-2.5 text-right">
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
      )}
    </div>
  )
}
