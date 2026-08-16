import { useState } from 'react'
import { ArrowLeftRight, Banknote, Check, Copy, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { money } from '@/lib/event-payment-helpers'

/** Icono consistente de medio de pago (sin emojis). Mercado Pago no tiene logo oficial en el repo → icono neutro. */
export function EventMethodIcon({ code }: { code: string }) {
  if (code === 'Cash' || code === 'Efectivo') return <Banknote className="h-5 w-5" aria-hidden="true" />
  if (code === 'Transfer' || code === 'Transferencia') return <ArrowLeftRight className="h-5 w-5" aria-hidden="true" />
  return <CreditCard className="h-5 w-5" aria-hidden="true" />
}

/** Opción de medio de pago con estructura visual consistente (radio semántico). */
export function EventMethodOption({ icon, label, description, active, onClick }: {
  icon: React.ReactNode
  label: string
  description?: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button type="button" role="radio" aria-checked={active} onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
        active
          ? 'border-violet-500 bg-violet-50 text-violet-700 dark:border-violet-400 dark:bg-violet-950/30 dark:text-violet-300'
          : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
      )}>
      <span className={active ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        {description && <span className="block text-xs text-slate-400">{description}</span>}
      </span>
    </button>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <b className={mono ? 'font-mono text-right' : 'text-right'}>{value}</b>
    </div>
  )
}

/**
 * Bloque "DATOS PARA TRANSFERIR" compartido por Student / Guest / Operator.
 * - Cada campo (alias / cbu / titular / banco) se renderiza SOLO si tiene valor; los vacíos no aparecen.
 * - Copiar alias solo si existe Alias (feedback Copy→Check + callback opcional).
 * - Si NO hay ningún dato bancario, no se muestra una card vacía: queda solo el Importe.
 * - Importe siempre visible (total final según contexto: con recargo online, sin recargo en puerta).
 */
export function EventTransferDetails({ alias, cbu, holderName, bankName, amount, onCopied }: {
  alias?: string | null
  cbu?: string | null
  holderName?: string | null
  bankName?: string | null
  amount: number
  onCopied?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const anyData = alias || cbu || holderName || bankName

  async function copyAlias() {
    if (!alias) return
    try {
      await navigator.clipboard.writeText(alias)
    } catch {
      // clipboard no disponible: el feedback igual se muestra, no bloquea
    }
    setCopied(true)
    onCopied?.()
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
      {anyData && (
        <>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Datos para transferir</p>
          <div className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
            {alias && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Alias</span>
                <span className="flex min-w-0 items-center gap-2">
                  <b className="truncate font-mono">{alias}</b>
                  <button type="button" onClick={copyAlias} aria-label="Copiar alias"
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </span>
              </div>
            )}
            {cbu && <Row label="CBU/CVU" value={cbu} mono />}
            {holderName && <Row label="Titular" value={holderName} />}
            {bankName && <Row label="Banco" value={bankName} />}
          </div>
        </>
      )}

      <div className={`flex items-center justify-between text-sm ${anyData ? 'mt-3 border-t border-slate-200 pt-2 dark:border-slate-700' : ''}`}>
        <span className="font-bold text-slate-700 dark:text-slate-200">Importe</span>
        <span className="text-lg font-black text-slate-900 dark:text-white">{money(amount)}</span>
      </div>
    </div>
  )
}
