import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useModule } from '@/hooks/useModule'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import {
  commercialPaymentLabel,
  deliveryStatusLabel,
  DeliveryStatus,
  type Payment,
  type OrderStatus,
  type PaymentStatus,
} from '@/pages/admin/clothing/hooks'

interface OrderRow {
  orderId: string
  orderNumber: string
  buyerName: string
  fullTotal: number
  paid: number
  balance: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  deliveryStatus: DeliveryStatus
  hasPendingPaymentProof: boolean
}

interface DashboardSummary {
  enabled: boolean
  counts: { newOrders: number; inReview: number; inPreparation: number }
  orders: OrderRow[]
}

const ARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

function statChip(label: string, value: number, cls: string) {
  return (
    <div className={`flex flex-col rounded-lg px-3 py-1.5 ${cls}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span>
      <span className="text-sm font-black">{value}</span>
    </div>
  )
}

/** Card del dashboard "Pedidos de Indumentaria". Se oculta sola cuando el módulo está
 *  deshabilitado o el usuario no tiene acceso (enabled=false viene del backend). */
export function ClothingOrdersDashboardCard({ slug, vertical }: { slug: string; vertical: 'deportivo' | 'educativa' }) {
  const clothingOn = useModule('clothing')
  const [selected, setSelected] = useState<OrderRow | null>(null)

  // En Deportivo el módulo se lee del auth (empresa activa). En Educativo la fuente de
  // verdad es el slug del path y la decisión la toma el backend (enabled).
  const skipByModule = vertical === 'deportivo' && !clothingOn

  const { data } = useQuery({
    queryKey: ['clothing-dashboard-summary', slug],
    queryFn: () => apiService.get<DashboardSummary>(`/api/admin/${slug}/clothing/orders/dashboard`),
    enabled: !!slug && !skipByModule,
    refetchInterval: 5 * 60 * 1000,
  })

  if (skipByModule || !data?.enabled) return null

  const ordersBase = vertical === 'educativa' ? `/educativa/${slug}/clothing/orders` : '/admin/clothing/orders'
  const counts = data.counts

  return (
    <>
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Pedidos de Indumentaria</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Comprobantes, pagos y preparación de la tienda.</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {statChip('Nuevos', counts.newOrders, 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300')}
          {statChip('En revisión', counts.inReview, 'bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-300')}
          {statChip('En preparación', counts.inPreparation, 'bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-300')}
        </div>
        <Link
          to={ordersBase}
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
        >
          Ver todos
        </Link>
      </div>

      <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        {data.orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-6 text-center">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No hay pedidos activos</p>
            <p className="text-xs text-slate-400">Los movimientos históricos de la tienda se consultan en «Ver todos».</p>
          </div>
        ) : (
          data.orders.map((o) => {
            const pay = commercialPaymentLabel({
              status: o.status,
              paymentStatus: o.paymentStatus,
              paid: o.paid,
              balance: o.balance,
              hasPendingPaymentProof: o.hasPendingPaymentProof,
              payments: [] as Payment[],
            })
            const delivery = deliveryStatusLabel(o.deliveryStatus)
            return (
              <button
                key={o.orderId}
                type="button"
                onClick={() => setSelected(o)}
                className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <span className="font-semibold text-slate-900 dark:text-white">
                  #{o.orderNumber} · {o.buyerName}
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-300">{ARS(o.fullTotal)}</span>
                  <Badge variant={pay.variant}>{pay.label}</Badge>
                  {o.deliveryStatus !== DeliveryStatus.NotStarted && (
                    <Badge variant={delivery.variant}>{delivery.label}</Badge>
                  )}
                </span>
              </button>
            )
          })
        )}
      </div>
    </Card>

    <Modal
      open={!!selected}
      onClose={() => setSelected(null)}
      title={selected ? `Pedido #${selected.orderNumber}` : ''}
    >
      {selected && (
        <div className="space-y-3 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{selected.buyerName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pedido de indumentaria</p>
            </div>
            <span className="text-xl font-black text-violet-600 dark:text-violet-300">{ARS(selected.fullTotal)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pagado</p>
              <p className="mt-0.5 text-base font-black text-emerald-600 dark:text-emerald-400">{ARS(selected.paid)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saldo</p>
              <p className="mt-0.5 text-base font-black text-rose-600 dark:text-rose-400">{ARS(selected.balance)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="default">Estado: {selected.status}</Badge>
            <Badge variant="default">Pago: {commercialPaymentLabel({
              status: selected.status,
              paymentStatus: selected.paymentStatus,
              paid: selected.paid,
              balance: selected.balance,
              hasPendingPaymentProof: selected.hasPendingPaymentProof,
              payments: [] as Payment[],
            }).label}</Badge>
            {selected.deliveryStatus !== DeliveryStatus.NotStarted && (
              <Badge variant="default">Entrega: {deliveryStatusLabel(selected.deliveryStatus).label}</Badge>
            )}
          </div>
          <Link
            to={`${ordersBase}?order=${selected.orderId}`}
            className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
          >
            Abrir pedido completo
          </Link>
        </div>
      )}
    </Modal>
    </>
  )
}
