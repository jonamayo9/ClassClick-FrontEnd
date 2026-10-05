import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHero } from '@/components/ui/page-hero'
import { Button } from '@/components/ui/button'
import { apiService, getApiError } from '@/lib/api'
import { clothingCompanySlug, studentClothingHomePath, studentClothingOrderPath } from '@/lib/clothing-context'
import { OrderTracker } from '@/components/clothing/order-tracker'
import { buildOrderTrackerSteps, isOrderTrackerVisible } from '@/components/clothing/order-tracker-steps'

const ARS = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
function slug() { return clothingCompanySlug() }
function fmt(v: string | null | undefined) { if (!v) return ''; return new Date(v).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) }

const TERMINAL_STATUS = ['Cancelled', 'Expired', 'Rejected', 'Delivered']

interface Order {
  id: string
  createdAtUtc: string
  status: string | number
  paymentStatus: string | number
  deliveryStatus?: string | number
  deliveryMethod?: string | number | null
  hasPendingPaymentProof?: boolean
  totalAmount: number
  fullTotal?: number
  paid?: number
  balance?: number
  totalRefunded?: number
  orderRefundState?: string
  reservationExpiresAtUtc?: string | null
  items?: { productName: string; variantName?: string; quantity: number; subtotal: number }[]
}

function friendlyStatus(o: Order): { label: string; cls: string } {
  const status = String(o.status)
  const refundState = String(o.orderRefundState ?? 'None')
  if (refundState === 'Refunded') return { label: 'Reembolsado', cls: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' }
  if (refundState === 'Partial') return { label: 'Reembolso parcial', cls: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' }
  if (refundState === 'Pending') return { label: 'Reembolso en proceso', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' }
  if (refundState === 'Failed') return { label: 'Reembolso con problema', cls: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' }
  if (status === 'Cancelled') return { label: 'Cancelado', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' }
  if (status === 'Expired') return { label: 'Vencido', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' }
  if (status === 'Delivered') return { label: 'Entregado', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' }
  if (o.hasPendingPaymentProof) return { label: 'Pago en revisión', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' }
  const paid = o.paid ?? 0
  const balance = o.balance ?? 0
  if (balance === 0 && paid > 0) return { label: 'Pagado', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' }
  if (paid > 0) return { label: 'Adelanto pagado', cls: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300' }
  return { label: 'Esperando pago', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' }
}

function OrdersInner() {
  const navigate = useNavigate()
  const [historyOpen, setHistoryOpen] = useState(false)

  const { data: orders = [], isLoading, isError, error } = useQuery({
    queryKey: ['clothing-orders', slug()],
    queryFn: () => apiService.get<Order[]>(`/api/student/${slug()}/clothing/orders`),
    enabled: !!slug(),
    retry: false,
    select: (d: unknown) => { if (Array.isArray(d)) return d as Order[]; const r = d as { items?: Order[]; data?: Order[] }; return r.items ?? r.data ?? [] },
    refetchInterval: (query) => {
      const d = query.state.data as unknown
      const arr = Array.isArray(d) ? (d as Order[]) : (d as { items?: Order[]; data?: Order[] })?.items ?? (d as { items?: Order[]; data?: Order[] })?.data ?? []
      return arr.some((o) => !TERMINAL_STATUS.includes(String(o.status))) ? 20000 : false
    },
  })

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>

  if (isError) {
    const status = (error as { response?: { status?: number } })?.response?.status
    const message = getApiError(error)
    const moduleOff = status === 400 && /no está habilitado/i.test(message)
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-4 py-16 text-center">
        <span className="text-5xl">🧥</span>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          {moduleOff ? 'Indumentaria no disponible' : status === 403 ? 'Acceso no permitido' : 'No se pudieron cargar los pedidos'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {moduleOff
            ? 'La tienda de indumentaria no está habilitada para esta empresa.'
            : status === 403
              ? 'No tenés acceso a la tienda de indumentaria.'
              : 'Ocurrió un error al cargar los pedidos. Volvé a intentarlo en unos minutos.'}
        </p>
      </div>
    )
  }

  const isTerminalStatus = (o: Order) => ['Rejected', 'Delivered', 'Cancelled', 'Expired'].includes(String(o.status))
  const pendingOrders = orders.filter((o) => !isTerminalStatus(o))
  const completedOrders = orders.filter((o) => isTerminalStatus(o))

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      <PageHero
        label="Tienda"
        title="Mis pedidos"
        description="Seguí el estado de tus compras."
        stats={[
          ...(pendingOrders.length > 0 ? [{ label: 'En curso', value: pendingOrders.length }] : []),
          { label: 'Total', value: orders.length },
        ]}
      />

      {orders.length === 0 ? (
        <EmptyState icon="🧥" title="Sin pedidos" description="Todavía no realizaste ningún pedido." action={{ label: 'Ir a la tienda', onClick: () => navigate(studentClothingHomePath()) }} />
      ) : (
        <div className="space-y-6">
          {pendingOrders.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pedidos en curso</h2>
              {pendingOrders.map((o) => <OrderCard key={o.id} order={o} onOpen={() => navigate(`${studentClothingOrderPath()}/${o.id}`)} />)}
            </section>
          )}

          {completedOrders.length > 0 && (
            <section className="space-y-3">
              <button onClick={() => setHistoryOpen(!historyOpen)}
                className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 transition">
                <svg className={`h-4 w-4 transition-transform duration-200 ${historyOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                Pedidos anteriores ({completedOrders.length})
              </button>
              {historyOpen && <div className="space-y-3">{completedOrders.map((o) => <OrderCard key={o.id} order={o} onOpen={() => navigate(`${studentClothingOrderPath()}/${o.id}`)} />)}</div>}
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, onOpen }: { order: Order; onOpen: () => void }) {
  const status = friendlyStatus(order)
  const total = order.fullTotal ?? order.totalAmount
  const paid = order.paid ?? 0
  const balance = order.balance ?? 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">#{order.id.slice(0, 8)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{fmt(order.createdAtUtc)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${status.cls}`}>{status.label}</span>
      </div>

      {order.hasPendingPaymentProof && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
          Recibimos tu comprobante. Estamos verificando el pago.
        </p>
      )}

      {(order.totalRefunded ?? 0) > 0 && (
        <p className="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          Reembolsado: {ARS(order.totalRefunded ?? 0)}
        </p>
      )}

      {order.items && order.items.length > 0 && (
        <p className="mt-2 line-clamp-1 text-xs text-slate-500">
          {order.items.map((i) => `${i.productName}${i.variantName ? ` · ${i.variantName}` : ''} ×${i.quantity}`).join(', ')}
        </p>
      )}

      {isOrderTrackerVisible(order.status) && (
        <div className="mt-3 rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-800/40">
          <OrderTracker steps={buildOrderTrackerSteps(order)} size="sm" />
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 py-1.5 dark:bg-slate-800/50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</p>
          <p className="text-sm font-black text-slate-900 dark:text-white">{ARS(total)}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 py-1.5 dark:bg-emerald-950/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Pagado</p>
          <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">{ARS(paid)}</p>
        </div>
        <div className="rounded-lg bg-amber-50 py-1.5 dark:bg-amber-950/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Saldo</p>
          <p className="text-sm font-black text-amber-700 dark:text-amber-300">{ARS(balance)}</p>
        </div>
      </div>

      <div className="mt-3">
        <Button size="sm" className="w-full bg-violet-600 text-white hover:bg-violet-700">Ver detalle</Button>
      </div>
    </div>
  )
}

export default function StudentClothingOrders() { return <ToastProvider><OrdersInner /></ToastProvider> }
