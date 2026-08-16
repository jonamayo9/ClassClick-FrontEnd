import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useStudentEventPurchase, useValidateEventMercadoPago, PURCHASE_STATUS_LABEL } from './hooks'

const POLL_INTERVAL_MS = 3000
const POLL_MAX_MS = 30000

const SUCCESS_STATUSES = ['Paid', 'Confirmed']
const STOP_STATUSES = ['Paid', 'Confirmed', 'Expired', 'Rejected', 'Cancelled']

export default function StudentEventPaymentResultPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const purchaseId = searchParams.get('purchase')
  const eventId = searchParams.get('event') || undefined

  const { data: purchase, isFetching } = useStudentEventPurchase(purchaseId ?? undefined)
  const validate = useValidateEventMercadoPago()

  const [polling, setPolling] = useState(true)
  const [deadline] = useState(() => Date.now() + POLL_MAX_MS)
  const message = 'Estamos confirmando tu pago...'

  useEffect(() => {
    if (!polling || !purchaseId) return

    const timer = setInterval(async () => {
      const current = purchase
      if (current && (SUCCESS_STATUSES.includes(current.status) || STOP_STATUSES.includes(current.status))) {
        setPolling(false)
        return
      }
      if (Date.now() > deadline) {
        setPolling(false)
        return
      }
      try {
        await validate.mutateAsync(purchaseId)
      } catch {
        // se reintenta en el próximo tick
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling, purchaseId, deadline])

  const success = purchase != null && SUCCESS_STATUSES.includes(purchase.status)
  const expired = purchase?.status === 'Expired'
  const rejected = purchase?.status === 'Rejected'
  const pending = purchase != null && !success && !expired && !rejected
  const label = purchase ? PURCHASE_STATUS_LABEL[purchase.status] : ''

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <Card className="overflow-hidden p-0">
        <div className={`h-1 ${success ? 'bg-emerald-500' : rejected || expired ? 'bg-red-500' : 'bg-amber-500'}`} />
        <div className="flex flex-col items-center gap-4 p-6 text-center sm:p-8">
          {isFetching && !purchase && <Spinner className="h-8 w-8 text-violet-600" />}

          {!purchase && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-violet-500" />
              <p className="text-base font-bold text-slate-900 dark:text-white">Estamos confirmando tu pago...</p>
            </>
          )}

          {success && (
            <>
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="text-base font-bold text-slate-900 dark:text-white">¡Pago confirmado!</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Compraste {purchase.quantity} {purchase.quantity === 1 ? 'entrada' : 'entradas'} para {purchase.eventTitle}.
              </p>
            </>
          )}

          {expired && (
            <>
              <Clock className="h-12 w-12 text-amber-500" />
              <p className="text-base font-bold text-slate-900 dark:text-white">La reserva venció.</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Las entradas fueron liberadas. Podés intentar realizar una nueva compra.
              </p>
            </>
          )}

          {rejected && (
            <>
              <XCircle className="h-12 w-12 text-red-500" />
              <p className="text-base font-bold text-slate-900 dark:text-white">El pago fue rechazado.</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Podés volver al evento e intentar nuevamente.</p>
            </>
          )}

          {pending && purchase && (
            <>
              <AlertTriangle className="h-12 w-12 text-amber-500" />
              <p className="text-base font-bold text-slate-900 dark:text-white">{label}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
            </>
          )}

          <div className="mt-2 flex w-full flex-col gap-2">
            {success && (
              <Button className="w-full bg-violet-600 text-white hover:bg-violet-700" onClick={() => navigate('/student/events')}>
                Ver mis entradas
              </Button>
            )}
            {(expired || rejected) && (
              <Button className="w-full bg-violet-600 text-white hover:bg-violet-700" onClick={() => navigate(`/student/events/${eventId}`)}>
                Comprar nuevamente
              </Button>
            )}
            {pending && (
              <Button variant="outline" className="w-full" onClick={() => navigate(`/student/events/${eventId}`)}>
                Volver al evento
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
