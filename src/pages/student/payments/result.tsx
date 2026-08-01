import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock, Loader2, RotateCw, ShieldAlert, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useMercadoPagoPaymentStatus } from './hooks'

const POLL_INTERVAL_MS = 3000
const POLL_MAX_MS = 30000

type Category =
  | 'confirming'
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'chargedback'
  | 'error'
  | 'conflict'
  | 'unknown'

const STOP_STATUSES = new Set([
  'Applied', 'Rejected', 'Cancelled', 'Expired', 'Refunded', 'ChargedBack', 'Error',
])

// Applied es el éxito final de Checkout Pro. Approved significa que Mercado Pago confirmó
// el pago pero todavía falta aplicar la transacción: se continúa consultando.
// isPaid por sí solo puede ser éxito (Applied) o conflicto (otro medio), según el estado y
// el mensaje funcional que devuelva el backend; nunca se trata isPaid como éxito genérico
// ni se infiere el medio de pago desde el frontend.
function isPollingFinal(status: string, isPaid: boolean): boolean {
  if (isPaid) return true
  return STOP_STATUSES.has(status)
}

function categoryOf(status: string, isPaid: boolean): Category {
  if (isPaid) return status === 'Applied' ? 'approved' : 'conflict'
  switch (status) {
    case 'Approved': return 'confirming'
    case 'Applied': return 'approved'
    case 'Pending': return 'pending'
    case 'Rejected': return 'rejected'
    case 'Cancelled': return 'cancelled'
    case 'Expired': return 'expired'
    case 'Refunded': return 'refunded'
    case 'ChargedBack': return 'chargedback'
    case 'Error': return 'error'
    default: return 'confirming'
  }
}

function ResultIcon({ category }: { category: Category }) {
  switch (category) {
    case 'approved':
      return <CheckCircle2 className="h-12 w-12 text-emerald-500" />
    case 'pending':
    case 'expired':
      return <Clock className="h-12 w-12 text-amber-500" />
    case 'rejected':
    case 'cancelled':
      return <XCircle className="h-12 w-12 text-red-500" />
    case 'error':
      return <ShieldAlert className="h-12 w-12 text-red-500" />
    case 'conflict':
      return <AlertTriangle className="h-12 w-12 text-amber-500" />
    case 'refunded':
    case 'chargedback':
      return <RotateCw className="h-12 w-12 text-slate-500" />
    default:
      return null
  }
}

export default function MercadoPagoResultPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const attempt = searchParams.get('attempt')

  const { data, isError, isFetching, refetch } = useMercadoPagoPaymentStatus(attempt)

  const [polling, setPolling] = useState(true)
  const [deadline] = useState(() => Date.now() + POLL_MAX_MS)

  useEffect(() => {
    if (!polling || !attempt) return

    const timer = setInterval(() => {
      if (data && isPollingFinal(data.status, data.isPaid)) {
        setPolling(false)
        return
      }
      if (Date.now() > deadline) {
        setPolling(false)
        return
      }
      refetch()
    }, POLL_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [polling, attempt, data, deadline, refetch])

  const message = data?.message || 'Estamos confirmando tu pago.'
  const category = data ? categoryOf(data.status, data.isPaid) : 'confirming'
  const final = data ? isPollingFinal(data.status, data.isPaid) : false
  const showUpdate = !final || category === 'error' || isError

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <Card className="overflow-hidden p-0">
        <div className={`h-1 ${category === 'approved' ? 'bg-emerald-500' : category === 'error' || category === 'rejected' || category === 'cancelled' ? 'bg-red-500' : 'bg-amber-500'}`} />
        <div className="flex flex-col items-center gap-4 p-6 text-center sm:p-8">
          {isFetching && !data && <Spinner className="h-8 w-8 text-blue-600" />}

          {!data && !isError && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <p className="text-base font-bold text-slate-900 dark:text-white">
                Estamos confirmando tu pago
              </p>
            </>
          )}

          {isError && (
            <>
              <ShieldAlert className="h-12 w-12 text-red-500" />
              <p className="text-base font-bold text-slate-900 dark:text-white">
                No pudimos verificar el pago
              </p>
            </>
          )}

          {data && (
            <>
              <ResultIcon category={category} />
              {!final && (
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {message}
                </p>
              )}
              {final && (
                <p className="text-base font-bold text-slate-900 dark:text-white">{message}</p>
              )}
            </>
          )}

          <div className="mt-2 flex w-full flex-col gap-2">
            <Button
              className="w-full bg-blue-600 text-white hover:bg-blue-500"
              onClick={() => navigate('/student/payments')}
            >
              Volver a mis cuotas
            </Button>
            {showUpdate && (
              <Button variant="outline" className="w-full" onClick={() => { setPolling(true); refetch() }}>
                Actualizar estado
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
