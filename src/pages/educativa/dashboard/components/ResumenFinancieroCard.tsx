import { TriangleAlert, ReceiptText, CircleDollarSign, Clock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { card, cardHover, muted, SEM } from './visual'

interface ResumenFinancieroData {
  overdue: number
  pending: number
  pendingAmount: number
  overdueAmount: number
}

interface ResumenFinancieroRow {
  color: keyof typeof SEM
  icon: React.ElementType
  label: string
  amount: string
  onClick?: () => void
}

interface ResumenFinancieroCardProps {
  fin: ResumenFinancieroData | undefined
  revenue?: number
  pendingReviewPayments?: number
  loading?: boolean
  onOpenOverdue?: () => void
  onOpenPending?: () => void
  onOpenRevenue?: () => void
  onOpenInReview?: () => void
  onVerPagos?: () => void
}

const money = (v?: number) => `$${(v ?? 0).toLocaleString('es-AR')}`

export function ResumenFinancieroCard({
  fin,
  revenue,
  pendingReviewPayments,
  loading,
  onOpenOverdue,
  onOpenPending,
  onOpenRevenue,
  onOpenInReview,
  onVerPagos,
}: ResumenFinancieroCardProps) {
  if (loading && !fin) {
    return (
      <div className={cn(card, 'animate-pulse p-5')}>
        <div className="h-4 w-36 rounded bg-slate-200 dark:bg-white/[0.06]" />
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-slate-200 dark:bg-white/[0.06]" />)}
        </div>
      </div>
    )
  }

  const rows: ResumenFinancieroRow[] = [
    {
      color: 'rose',
      icon: TriangleAlert,
      label: `${fin?.overdue ?? 0} cuota${(fin?.overdue ?? 0) === 1 ? '' : 's'} vencida${(fin?.overdue ?? 0) === 1 ? '' : 's'}`,
      amount: money(fin?.overdueAmount),
      onClick: onOpenOverdue,
    },
    {
      color: 'amber',
      icon: ReceiptText,
      label: `${fin?.pending ?? 0} cuota${(fin?.pending ?? 0) === 1 ? '' : 's'} pendiente${(fin?.pending ?? 0) === 1 ? '' : 's'}`,
      amount: money(fin?.pendingAmount),
      onClick: onOpenPending,
    },
    {
      color: 'blue',
      icon: CircleDollarSign,
      label: 'Recaudación del período',
      amount: money(revenue),
      onClick: onOpenRevenue,
    },
    {
      color: 'violet',
      icon: Clock,
      label: `${pendingReviewPayments ?? 0} pago${(pendingReviewPayments ?? 0) === 1 ? '' : 's'} en revisión`,
      amount: '—',
      onClick: onOpenInReview,
    },
  ]

  return (
    <div className={cn(card, cardHover, 'flex flex-col p-5')}>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Resumen financiero</h3>
      <div className="mt-4 flex flex-1 flex-col gap-2">
        {rows.map((row) => {
          const c = SEM[row.color]
          const Icon = row.icon
          return (
            <button
              key={row.label}
              type="button"
              onClick={row.onClick}
              disabled={!row.onClick}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                c.softBg,
                row.onClick && 'cursor-pointer hover:opacity-90',
              )}
            >
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', c.iconBg, c.text)}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                {row.label}
              </span>
              <span className="shrink-0 text-sm font-black tabular-nums text-slate-900 dark:text-white">{row.amount}</span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={onVerPagos}
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
      >
        Ver pagos y cuotas
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <p className={cn('mt-2 text-center text-[11px]', muted)}>Importes del corte del período seleccionado</p>
    </div>
  )
}