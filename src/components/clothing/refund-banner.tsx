import type { RefundBannerState } from './refund'

export interface RefundBannerProps {
  state: RefundBannerState
  /** Importe reembolsado formateado (ej: "$5.600"). Solo se muestra si el reembolso se ejecutó. */
  amountText?: string
  refundedAtUtc?: string | null
  /** Motivo registrado por el administrador. Nunca se inventa ni se muestran notas internas. */
  note?: string | null
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function RefundIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h13a5 5 0 015 5v0a5 5 0 01-5 5H9M3 10l4-4M3 10l4 4" />
    </svg>
  )
}

/**
 * Banner de reembolso con prioridad visual. El estado "Refunded/Partial" afirma devolución
 * ejecutada; "Pending/Failed" muestra el estado sin afirmar que el dinero ya fue devuelto.
 */
export function RefundBanner({ state, amountText, refundedAtUtc, note }: RefundBannerProps) {
  const isExecuted = state === 'Refunded' || state === 'Partial'

  const title =
    state === 'Refunded'
      ? 'Pedido reembolsado'
      : state === 'Partial'
        ? 'Reembolso parcial realizado'
        : state === 'Pending'
          ? 'Reembolso en proceso'
          : 'Reembolso con problema'

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
          <RefundIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-rose-700 dark:text-rose-300">{title}</p>

          {isExecuted && amountText && (
            <p className="mt-0.5 text-xs font-semibold text-rose-600 dark:text-rose-300/90">
              {state === 'Refunded' ? 'Importe reembolsado:' : 'Importe reintegrado:'} {amountText}
            </p>
          )}

          {!isExecuted && (
            <p className="mt-0.5 text-xs text-rose-600 dark:text-rose-300/80">
              {state === 'Pending'
                ? 'Estamos procesando la devolución. Todavía no se acreditó el dinero.'
                : 'La devolución no pudo completarse. La institución va a revisarlo.'}
            </p>
          )}

          {refundedAtUtc && <p className="mt-0.5 text-[11px] text-rose-500 dark:text-rose-400/80">Fecha: {fmtDate(refundedAtUtc)}</p>}
          {note && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-300/80">Motivo: {note}</p>}
        </div>
      </div>
    </div>
  )
}