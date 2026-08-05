import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import type { AlertItem } from '@/types/dashboard'

interface AlertModalProps {
  open: boolean
  alerts: AlertItem[]
  onClose: () => void
}

const severityIcons: Record<string, string> = { high: '🔴', medium: '🟡', low: '🔵' }

// Tarjeta destacada de acción administrativa: pagos pendientes de aprobación.
// Se diferencia del resto de las alertas (fondo/borde ámbar, ícono, badge y acción).
// Toda la tarjeta es un botón semántico (accesible por teclado con Enter/Space).
function PaymentApprovalCard({ alert, onOpen }: { alert: AlertItem; onOpen: () => void }) {
  const [navigating, setNavigating] = useState(false)

  function handleClick() {
    if (navigating) return
    setNavigating(true)
    onOpen()
  }

  const singular = alert.count === 1
  const title = singular ? 'Pago pendiente de aprobación' : 'Pagos pendientes de aprobación'
  const message = singular
    ? 'Tenés 1 pago informado que necesita ser revisado.'
    : `Tenés ${alert.count} pagos informados que necesitan ser revisados.`
  const actionLabel = singular ? 'Revisar pago' : 'Revisar pagos'

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`${title}. ${message}. ${actionLabel}.`}
      className="group relative w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-4 text-left shadow-sm transition hover:border-amber-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.99] dark:border-amber-600/60 dark:from-amber-950/40 dark:to-orange-950/30 dark:hover:border-amber-500"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black uppercase tracking-wide text-amber-900 dark:text-amber-200">{title}</h3>
            <Badge variant="warning" className="text-xs font-black">{alert.count}</Badge>
          </div>
          <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-300/90">{message}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-amber-700 underline-offset-2 group-hover:underline dark:text-amber-300">
            {actionLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </p>
        </div>
      </div>
    </button>
  )
}

export function AlertModal({ open, alerts, onClose }: AlertModalProps) {
  const navigate = useNavigate()
  const paymentAlert = alerts.find((a) => a.type === 'payment_pending_review')
  const otherAlerts = alerts.filter((a) => a.type !== 'payment_pending_review')

  return (
    <Modal open={open} onClose={onClose} title="⚠️ Atención">
      <div className="space-y-3 p-5 sm:p-6">
        <p className="text-sm text-slate-600 dark:text-slate-400">Se detectaron las siguientes situaciones que requieren atención:</p>

        {paymentAlert && (
          <PaymentApprovalCard
            alert={paymentAlert}
            onOpen={() => {
              onClose()
              if (paymentAlert.navigateTo) navigate(paymentAlert.navigateTo)
            }}
          />
        )}

        {otherAlerts.map((a) => (
          <div key={a.type} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800/50">
            <span className="text-lg">{severityIcons[a.severity] ?? '🔵'}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{a.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{a.message}</p>
            </div>
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">{a.count}</span>
          </div>
        ))}

        <div className="flex gap-3 pt-2">
          <button onClick={() => { onClose(); if (alerts[0]?.navigateTo) navigate(alerts[0].navigateTo) }}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700">
            Ir a revisar
          </button>
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  )
}
