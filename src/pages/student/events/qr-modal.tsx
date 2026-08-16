import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { getApiError } from '@/lib/api'
import { useEventAccessPass, formatEventDate, formatEventTime } from './hooks'
import type { EventAccessPass } from './hooks'

/**
 * Modal QR de entradas, reutilizable (Home + Mis entradas).
 * Recibe un eventId y genera el access pass automáticamente al abrirse.
 */
export function StudentTicketQrModal({ eventId, onClose }: {
  eventId: string | null
  onClose: () => void
}) {
  const accessPass = useEventAccessPass()
  const [qr, setQr] = useState<EventAccessPass | null>(null)
  const [qrError, setQrError] = useState('')

  useEffect(() => {
    if (!eventId) {
      setQr(null)
      setQrError('')
      return
    }
    let cancelled = false
    setQr(null)
    setQrError('')
    accessPass.mutateAsync(eventId).then(
      (result) => { if (!cancelled) setQr(result) },
      (err: unknown) => {
        if (cancelled) return
        const response = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data
        setQrError(response?.message || getApiError(err) || 'No se pudo generar tu código de acceso.')
      },
    )
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  return (
    <Modal open={!!eventId} onClose={onClose} className="sm:max-w-md">
      <div className="flex flex-col items-center gap-4 p-5 text-center sm:p-6">
        {!qr && !qrError && <Spinner className="h-8 w-8 text-violet-600" />}

        {qrError && (
          <div className="w-full space-y-3">
            <span className="text-4xl">⚠️</span>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">No se pudo generar tu código</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{qrError}</p>
            <Button variant="outline" className="w-full" onClick={onClose}>Cerrar</Button>
          </div>
        )}

        {qr && (
          <>
            <div>
              <p className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{qr.eventTitle}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {formatEventDate(qr.startsAtUtc)} · {formatEventTime(qr.startsAtUtc)}
              </p>
              {qr.location && <p className="text-sm text-slate-500 dark:text-slate-400">{qr.location}</p>}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Entradas disponibles</p>
              <p className="text-5xl font-black text-violet-700 dark:text-violet-300">{qr.availableQuantity}</p>
              {qr.pendingQuantity > 0 && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{qr.pendingQuantity} pendientes de aprobación</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700">
              <QRCodeSVG value={qr.qrValue} size={280} level="M" bgColor="#FFFFFF" fgColor="#000000" />
            </div>

            <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-left dark:border-violet-900/50 dark:bg-violet-950/20">
              <p className="flex items-center gap-2 text-xs font-bold text-violet-800 dark:text-violet-200">
                <span>🔒</span> Tu código de acceso es personal.
              </p>
              <p className="mt-1 text-xs leading-5 text-violet-700 dark:text-violet-300">
                No lo compartas con otras personas. Mostralo únicamente cuando la institución te lo solicite al momento del ingreso.
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={onClose}>Cerrar</Button>
          </>
        )}
      </div>
    </Modal>
  )
}
