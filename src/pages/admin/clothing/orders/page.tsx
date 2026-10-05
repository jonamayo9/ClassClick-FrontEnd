import { useMemo, useState } from 'react'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { BackButton } from '@/components/ui/back-button'
import { PageHero } from '@/components/ui/page-hero'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { getApiError } from '@/lib/api'
import {
  money,
  OrderStatus,
  PaymentState,
  PaymentStatus,
  RefundState,
  ProofStatus,
  PaymentMethodType,
  DeliveryStatus,
  Order,
  Payment,
  CancellationRequest,
  CancellationStatus,
  commercialPaymentLabel,
  deliveryStatusLabel,
  paymentConceptLabel,
  paymentStateLabel,
  paymentMethodTypeLabel,
  orderStatusLabel,
  refundStateLabel,
  proofStatusLabel,
  proofTypeLabel,
  cancellationStatusLabel,
  cancellationRefundStatusLabel,
} from '../hooks'
import {
  useOrders,
  useOrderProofs,
  useOrderCancellationRequests,
  useDeliverOrder,
  usePrepareOrder,
  useReadyOrder,
  useDispatchOrder,
  useRejectOrder,
  useCancelOrder,
  useRefundMercadoPago,
  useMarkManualRefund,
  useReturnItemStock,
} from './hooks'
import { useApproveCancellation, useRejectCancellation } from '../cancellations/hooks'
import type { PaymentProof, OrderItem } from '../hooks'
import { ProofReviewModal } from './proof-review-modal'

function fmt(v: string | null | undefined) { if (!v) return '-'; return new Date(v).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) }
function fmtDateTime(v: string | null | undefined) { if (!v) return '-'; return new Date(v).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) }

function OrdersPageInner() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [filterDelivery, setFilterDelivery] = useState('')
  // Deep-link desde banners/notificaciones: /orders?order={orderId} abre el detalle.
  const [detailOrderId, setDetailOrderId] = useState<string | null>(() => {
    const sp = new URLSearchParams(window.location.search)
    return sp.get('order')
  })

  const { data: orders = [], isLoading } = useOrders({
    status: filterStatus || undefined,
    paymentStatus: filterPayment || undefined,
    deliveryMethod: filterDelivery || undefined,
  })
  const { data: proofs = [] } = useOrderProofs(detailOrderId)

  const rejectOrder = useRejectOrder()
  const cancelOrder = useCancelOrder()
  const prepareOrder = usePrepareOrder()
  const dispatchOrder = useDispatchOrder()
  const readyOrder = useReadyOrder()
  const deliverOrder = useDeliverOrder()
  const refundMp = useRefundMercadoPago()
  const manualRefund = useMarkManualRefund()
  const returnItem = useReturnItemStock()
  const toast = useToast()

  const [reviewProof, setReviewProof] = useState<{ proof: PaymentProof; phase: 'view' | 'approve' | 'reject' } | null>(null)
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [refundAction, setRefundAction] = useState<{ order: Order; payment: Payment; mode: 'mp' | 'manual' } | null>(null)
  const [refundNote, setRefundNote] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [returnAction, setReturnAction] = useState<{ order: Order; item: OrderItem } | null>(null)
  const [returnQuantity, setReturnQuantity] = useState('1')

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase()
    if (!text) return orders
    return orders.filter((o) => {
      const haystack = `${o.id} ${o.studentName} ${o.studentDni ?? ''}`.toLowerCase()
      return haystack.includes(text)
    })
  }, [orders, search])

  const detailOrder = detailOrderId ? orders.find((o) => o.id === detailOrderId) ?? null : null

  async function confirmRejectOrder() {
    if (!rejectOrderId) return
    try {
      await rejectOrder.mutateAsync({ orderId: rejectOrderId, reason: rejectReason })
      toast('Pedido rechazado.')
      setRejectOrderId(null)
      setRejectReason('')
    } catch {
      toast('No se pudo rechazar el pedido.', 'error')
    }
  }

  async function confirmCancelOrder() {
    if (!cancelOrderId) return
    setCancelError('')
    try {
      await cancelOrder.mutateAsync({ orderId: cancelOrderId, reason: cancelReason })
      toast('Pedido cancelado. La reserva fue liberada.')
      setCancelOrderId(null)
      setCancelReason('')
    } catch (err) {
      setCancelError(getApiError(err))
    }
  }

  async function confirmRefund() {
    if (!refundAction) return
    try {
      const amount = refundAmount.trim() ? Math.max(0, Number(refundAmount) || 0) : undefined
      if (refundAction.mode === 'mp') {
        await refundMp.mutateAsync({ orderId: refundAction.order.id, paymentId: refundAction.payment.id, note: refundNote, amount })
        toast(amount ? `Reembolso de ${money(amount)} en proceso con Mercado Pago.` : 'Reembolso de Mercado Pago procesado.')
      } else {
        await manualRefund.mutateAsync({ orderId: refundAction.order.id, paymentId: refundAction.payment.id, note: refundNote, amount })
        toast(amount ? `Reembolso de ${money(amount)} marcado como realizado.` : 'Reembolso marcado como realizado.')
      }
      setRefundAction(null)
      setRefundNote('')
      setRefundAmount('')
    } catch {
      toast('No se pudo procesar el reembolso.', 'error')
    }
  }

  async function confirmReturn() {
    if (!returnAction) return
    try {
      const qty = Math.max(1, Number(returnQuantity) || 1)
      await returnItem.mutateAsync({ orderId: returnAction.order.id, itemId: returnAction.item.id!, quantity: qty })
      toast('Stock devuelto.')
      setReturnAction(null)
      setReturnQuantity('1')
    } catch {
      toast('No se pudo devolver el stock.', 'error')
    }
  }

  const stats = {
    total: orders.length,
    // Pendientes: pedidos pendientes de pago SIN comprobante en revisión.
    pending: orders.filter((o) => o.status === OrderStatus.Pending && !o.hasPendingPaymentProof).length,
    // En revisión: pedidos con comprobante pendiente (señal real del pago a verificar).
    inReview: orders.filter((o) => o.hasPendingPaymentProof).length,
    requiresResolution: orders.filter((o) => o.payments?.some((p) => p.requiresResolution)).length,
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <BackButton to="/admin/clothing" label="Volver a la tienda" />
      <PageHero
        label="Pedidos"
        title="Pedidos de la tienda"
        description="Pagos, comprobantes, preparación y entregas."
        stats={[
          { label: 'Total', value: stats.total },
          { label: 'Pendientes', value: stats.pending },
          { label: 'En revisión', value: stats.inReview },
          { label: 'Requieren resolución', value: stats.requiresResolution },
        ]}
      />

      <Card className="p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Pedidos</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} pedidos</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:w-[880px]">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar alumno, DNI o pedido" />
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Estado pedido</option>
              <option value="pending">Pendiente</option>
              <option value="approved">Confirmado</option>
              <option value="rejected">Rechazado</option>
              <option value="delivered">Entregado</option>
              <option value="cancelled">Cancelado</option>
              <option value="expired">Vencido</option>
            </Select>
            <Select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}>
              <option value="">Estado de pago</option>
              <option value="none">Sin pago</option>
              <option value="depositpending">Adelanto pendiente</option>
              <option value="depositpaid">Adelanto pagado</option>
              <option value="fullpending">Pago pendiente</option>
              <option value="fullpaid">Pagado</option>
              <option value="rejected">Rechazado</option>
            </Select>
            <Select value={filterDelivery} onChange={(e) => setFilterDelivery(e.target.value)}>
              <option value="">Tipo de entrega</option>
              <option value="pickup">Retiro</option>
              <option value="home">Envío a domicilio</option>
              <option value="none">Sin entrega</option>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Spinner className="h-6 w-6 text-violet-600" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🛒" title="Sin pedidos" description="No hay pedidos para los filtros actuales." />
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => (
              <OrderRow key={o.id} order={o} onClick={() => setDetailOrderId(o.id)} />
            ))}
          </div>
        )}
      </Card>

      {/* Detalle */}
      {detailOrder && (
        <OrderDetail
          order={detailOrder}
          proofs={proofs}
          onClose={() => setDetailOrderId(null)}
          onReviewProof={(proof, phase) => setReviewProof({ proof, phase: phase ?? 'view' })}
          onRejectOrder={(orderId) => { setRejectReason(''); setRejectOrderId(orderId) }}
          onCancel={(orderId) => { setCancelReason(''); setCancelError(''); setCancelOrderId(orderId) }}
          onPrepare={() => { prepareOrder.mutate(detailOrder.id); toast('Pase a preparación iniciado.') }}
          onReady={() => { readyOrder.mutate(detailOrder.id); toast(detailOrder.deliveryMethod === 'HomeDelivery' ? 'Pedido listo para despacho.' : 'Pedido listo para entregar.') }}
          onDispatch={() => { dispatchOrder.mutate(detailOrder.id); toast('Pedido en tránsito.') }}
          onDeliver={() => { deliverOrder.mutate(detailOrder.id); toast('Pedido entregado.') }}
          onRefundMp={(order, payment) => { setRefundNote(''); setRefundAmount(''); setRefundAction({ order, payment, mode: 'mp' }) }}
          onManualRefund={(order, payment) => { setRefundNote(''); setRefundAmount(''); setRefundAction({ order, payment, mode: 'manual' }) }}
          onReturnItem={(order, item) => { setReturnQuantity('1'); setReturnAction({ order, item }) }}
        />
      )}

      {/* Modal de revisión de comprobante (dentro del contexto del pedido, sin navegar) */}
      <ProofReviewModal
        key={reviewProof ? `${reviewProof.proof.id}-${reviewProof.phase}` : 'closed'}
        proof={reviewProof?.proof ?? null}
        open={!!reviewProof}
        initialPhase={reviewProof?.phase}
        onClose={() => setReviewProof(null)}
      />

      {/* Modal rechazo de pedido */}
      {rejectOrderId && (
        <OverlayModal title="Rechazar pedido" onClose={() => setRejectOrderId(null)}>
          <p className="text-sm text-slate-500 dark:text-slate-400">El alumno recibirá una notificación con el motivo.</p>
          <Textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo del rechazo (obligatorio)" />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRejectOrderId(null)}>Cancelar</Button>
            <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={confirmRejectOrder} disabled={!rejectReason.trim()} loading={rejectOrder.isPending}>
              Rechazar pedido
            </Button>
          </div>
        </OverlayModal>
      )}

      {/* Modal cancelar pedido */}
      {cancelOrderId && (
        <OverlayModal title="Cancelar pedido" onClose={() => setCancelOrderId(null)}>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
            Al cancelar este pedido:
            <ul className="mt-1 list-disc pl-4 text-xs">
              <li>Se libera automáticamente la reserva del stock.</li>
              <li>Los comprobantes pendientes se invalidan y no podrán aprobarse.</li>
              <li>No se reintegran unidades que ya fueron descontadas definitivamente.</li>
            </ul>
          </div>
          <Textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Motivo (opcional)" />
          {cancelError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-950/20 dark:text-rose-300">
              {cancelError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setCancelOrderId(null); setCancelError('') }}>Volver</Button>
            <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={confirmCancelOrder} loading={cancelOrder.isPending}>
              Confirmar cancelación
            </Button>
          </div>
        </OverlayModal>
      )}

      {/* Modal refund MP / manual */}
      {refundAction && (
        <OverlayModal title={refundAction.mode === 'mp' ? 'Reembolsar pago (Mercado Pago)' : 'Marcar reembolso realizado'} onClose={() => setRefundAction(null)}>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {refundAction.mode === 'mp'
              ? `Se reembolsará del pago ${paymentConceptLabel(refundAction.payment.concept)} a la cuenta de Mercado Pago original.`
              : `Marcarás como realizado el reembolso del pago ${paymentConceptLabel(refundAction.payment.concept)}. No lo muestres como devuelto antes de gestionarlo.`}
          </p>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
              Importe a reembolsar
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder={money(refundAction.payment.amount)}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Vacío = reembolso total. Reembolsable: {money(Math.max(0, refundAction.payment.amount - (refundAction.payment.refundedAmount ?? 0)))}
              {refundAction.payment.refundedAmount ? ` · Ya reembolsado: ${money(refundAction.payment.refundedAmount)}` : ''}
            </p>
          </div>
          <Textarea rows={3} value={refundNote} onChange={(e) => setRefundNote(e.target.value)}
            placeholder={refundAction.mode === 'manual' ? 'Referencia de la devolución (obligatorio). Ej: Transferencia devuelta al CBU informado. Ref. 123456' : 'Nota (opcional)'} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRefundAction(null)}>Cancelar</Button>
            <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={confirmRefund}
              disabled={refundAction.mode === 'manual' && !refundNote.trim()}
              loading={refundMp.isPending || manualRefund.isPending}>
              {refundAction.mode === 'mp' ? 'Reembolsar' : 'Marcar realizado'}
            </Button>
          </div>
        </OverlayModal>
      )}

      {/* Modal devolución de stock */}
      {returnAction && (
        <OverlayModal title="Devolver al stock" onClose={() => setReturnAction(null)}>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {returnAction.item.productName}{returnAction.item.variantName ? ` · ${returnAction.item.variantName}` : ''} · cantidad en el pedido: {returnAction.item.quantity}.
            Solo se devuelve stock que fue descontado físicamente.
          </p>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Cantidad a devolver</label>
            <Input type="number" min="1" value={returnQuantity} onChange={(e) => setReturnQuantity(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setReturnAction(null)}>Cancelar</Button>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={confirmReturn} loading={returnItem.isPending}>
              Devolver al stock
            </Button>
          </div>
        </OverlayModal>
      )}
    </div>
  )
}

function OverlayModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl dark:bg-slate-900">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  )
}

function OrderRow({ order, onClick }: { order: Order; onClick: () => void }) {
  const pay = commercialPaymentLabel(order)
  const delivery = deliveryStatusLabel(order.deliveryStatus ?? DeliveryStatus.NotStarted)
  const orderStatus = orderStatusLabel(order.status)
  const balance = order.balance ?? 0
  const paid = order.paid ?? 0
  const fullTotal = order.fullTotal ?? order.totalAmount
  const hasPendingProof = !!order.hasPendingPaymentProof

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
    >
      {hasPendingProof && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/20">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-300">📎 Hay un comprobante pendiente de revisión</p>
          <Badge variant="warning">En revisión</Badge>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Identificación y alumno */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="text-sm font-black text-slate-900 dark:text-white">#{order.id.slice(0, 8)}</p>
            <span className="text-xs text-slate-400">{fmtDateTime(order.createdAtUtc)}</span>
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{order.studentName}</p>
          {order.studentDni && <p className="text-xs text-slate-400">DNI {order.studentDni}</p>}
          {order.items && order.items.length > 0 && (
            <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
              {order.items.map((i) => `${i.productName}${i.variantName ? ` · ${i.variantName}` : ''} ×${i.quantity}`).join(', ')}
            </p>
          )}
        </div>

        {/* Importes */}
        <div className="grid w-full grid-cols-3 gap-2 text-center sm:w-auto sm:min-w-[260px]">
          <div className="rounded-lg bg-slate-50 py-1.5 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</p>
            <p className="text-sm font-black text-slate-900 dark:text-white">{money(fullTotal)}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 py-1.5 dark:bg-emerald-950/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Pagado</p>
            <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">{money(paid)}</p>
          </div>
          <div className="rounded-lg bg-amber-50 py-1.5 dark:bg-amber-950/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Saldo</p>
            <p className="text-sm font-black text-amber-700 dark:text-amber-300">{money(balance)}</p>
          </div>
        </div>

        {/* Estados */}
        <div className="flex flex-wrap items-center gap-1.5 lg:justify-end lg:max-w-[260px]">
          <Badge variant={pay.variant}>{pay.label}</Badge>
          {order.deliveryStatus !== DeliveryStatus.NotStarted && (
            <Badge variant={delivery.variant}>Entrega: {delivery.label}</Badge>
          )}
          {order.deliveryMethod === 'HomeDelivery' && (
            <Badge variant="violet">Envío{order.deliveryDistanceKm != null ? ` · ${order.deliveryDistanceKm} km` : ''}</Badge>
          )}
          {order.deliveryMethod === 'Pickup' && <Badge variant="violet">Retiro</Badge>}
          {order.status !== OrderStatus.Pending && order.status !== OrderStatus.Approved && (
            <Badge variant={orderStatus.variant}>{orderStatus.label}</Badge>
          )}
          {order.payments?.some((p) => p.requiresResolution) && <Badge variant="danger">Requiere resolución</Badge>}
        </div>

        {/* Acción */}
        <div className="shrink-0">
          <Button onClick={onClick} className="w-full bg-violet-600 text-white hover:bg-violet-700 lg:w-auto">Ver detalle</Button>
        </div>
      </div>
    </div>
  )
}

function OrderDetail({ order, proofs, onClose, onReviewProof, onRejectOrder, onCancel, onPrepare, onReady, onDispatch, onDeliver, onRefundMp, onManualRefund, onReturnItem }: {
  order: Order
  proofs: PaymentProof[]
  onClose: () => void
  onReviewProof: (proof: PaymentProof, phase?: 'view' | 'approve' | 'reject') => void
  onRejectOrder: (orderId: string) => void
  onCancel: (orderId: string) => void
  onPrepare: () => void
  onReady: () => void
  onDispatch: () => void
  onDeliver: () => void
  onRefundMp: (order: Order, payment: Payment) => void
  onManualRefund: (order: Order, payment: Payment) => void
  onReturnItem: (order: Order, item: OrderItem) => void
}) {
  const pay = commercialPaymentLabel(order)
  const delivery = deliveryStatusLabel(order.deliveryStatus ?? DeliveryStatus.NotStarted)
  const balance = order.balance ?? 0
  const fullTotal = order.fullTotal ?? order.totalAmount
  const isActiveOrder = order.status === OrderStatus.Pending || order.status === OrderStatus.Approved
  const deliveryStarted = order.deliveryStatus != null &&
    [DeliveryStatus.InPreparation, DeliveryStatus.ReadyForPickup, DeliveryStatus.ReadyForDispatch, DeliveryStatus.InTransit].includes(order.deliveryStatus)
  const isTerminalOrder = order.status === OrderStatus.Delivered || order.status === OrderStatus.Cancelled || order.status === OrderStatus.Expired || order.status === OrderStatus.Rejected
  const hasApprovedMoney = (order.paid ?? 0) > 0 || order.paymentStatus === PaymentStatus.DepositPaid || order.paymentStatus === PaymentStatus.FullPaid

  // Cancelación directa permitida solo sin dinero aprobado, sin preparación/envío iniciado
  // y sin estado terminal. Pedidos con pagos aprobados se gestionan por Solicitudes de cancelación.
  const canCancel = !isTerminalOrder && !deliveryStarted && !hasApprovedMoney

  const canPrepare = order.deliveryStatus === DeliveryStatus.NotStarted && order.status !== OrderStatus.Cancelled && order.status !== OrderStatus.Expired && order.status !== OrderStatus.Delivered
  const canReady = order.deliveryStatus === DeliveryStatus.InPreparation
  const canDispatch = order.deliveryMethod === 'HomeDelivery' && order.deliveryStatus === DeliveryStatus.ReadyForDispatch
  const canDeliver = balance === 0 && (order.deliveryStatus === DeliveryStatus.ReadyForPickup || (order.deliveryMethod === 'HomeDelivery' && order.deliveryStatus === DeliveryStatus.InTransit))
  const canReject = order.status === OrderStatus.Pending

  // Historial y resolución de solicitudes de cancelación desde el detalle del pedido.
  const { data: cancelRequests = [], isLoading: loadingCancels } = useOrderCancellationRequests(order.id)
  const approveCancellation = useApproveCancellation()
  const rejectCancellation = useRejectCancellation()
  const [cancelAction, setCancelAction] = useState<{ request: CancellationRequest; type: 'approve' | 'reject' } | null>(null)
  const [cancelReviewNote, setCancelReviewNote] = useState('')
  const [cancelReviewError, setCancelReviewError] = useState('')
  const toast = useToast()

  async function confirmCancelReview() {
    if (!cancelAction) return
    setCancelReviewError('')
    if (cancelAction.type === 'reject' && !cancelReviewNote.trim()) {
      setCancelReviewError('Indicá el motivo del rechazo (es obligatorio).')
      return
    }
    try {
      if (cancelAction.type === 'approve') {
        await approveCancellation.mutateAsync({ id: cancelAction.request.id, note: cancelReviewNote })
        toast('Cancelación aprobada. La reserva fue liberada.')
      } else {
        await rejectCancellation.mutateAsync({ id: cancelAction.request.id, note: cancelReviewNote })
        toast('Solicitud de cancelación rechazada.')
      }
      setCancelAction(null)
      setCancelReviewNote('')
    } catch {
      setCancelReviewError('No se pudo procesar la solicitud. Intentá nuevamente.')
    }
  }

  return (
    <OverlayModal title={`Pedido #${order.id.slice(0, 8)}`} onClose={onClose}>
      <div className="flex flex-wrap gap-2">
        <Badge variant={pay.variant}>{pay.label}</Badge>
        {order.deliveryStatus !== DeliveryStatus.NotStarted && (
          <Badge variant={delivery.variant}>Entrega: {delivery.label}</Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Alumno</p>
          <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">{order.studentName}</p>
          {order.studentDni && <p className="text-xs text-slate-400">DNI {order.studentDni}</p>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Fecha</p>
          <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">{fmtDateTime(order.createdAtUtc)}</p>
          {order.reservationExpiresAtUtc && <p className="text-xs text-slate-400">Reserva hasta {fmt(order.reservationExpiresAtUtc)}</p>}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Resumen financiero</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 p-3 text-center dark:border-slate-700">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Total</p>
            <p className="mt-0.5 text-sm font-black text-slate-900 dark:text-white">{money(fullTotal)}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">Pagado</p>
            <p className="mt-0.5 text-sm font-black text-emerald-700 dark:text-emerald-300">{money(order.paid ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500">Saldo</p>
            <p className="mt-0.5 text-sm font-black text-amber-700 dark:text-amber-300">{money(balance)}</p>
          </div>
        </div>
      </div>

      {order.items && order.items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800">Productos</div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.productName}{item.variantName ? ` · ${item.variantName}` : ''}</p>
                  {item.personalizationText && <p className="text-xs text-slate-400">{item.personalizationText}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900 dark:text-white">{money(item.subtotal)}</p>
                    <p className="text-[10px] text-slate-400">{item.quantity} × {money(item.unitPrice)}</p>
                  </div>
                  {!isActiveOrder && item.id && (
                    <Button variant="outline" size="sm" className="text-[11px]" onClick={() => onReturnItem(order, item)}>
                      Devolver stock
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Pagos</p>
        {order.payments && order.payments.length > 0 ? (
          <div className="space-y-2">
            {order.payments.map((p) => (
              <PaymentRow key={p.id} payment={p} order={order} onRefundMp={onRefundMp} onManualRefund={onManualRefund} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Sin pagos registrados.</p>
        )}
      </div>

      {proofs.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Comprobantes</p>
          <div className="space-y-2">
            {proofs.map((proof) => {
              const st = proofStatusLabel(proof.status)
              const isPending = proof.status === ProofStatus.Pending
              return (
                <div key={proof.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ${isPending ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{proofTypeLabel(proof.type)}</p>
                      <Badge variant={st.variant}>{st.label}</Badge>
                      {isPending && <Badge variant="warning">Revisar</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {fmtDateTime(proof.uploadedAtUtc)}
                      {proof.method != null && ` · ${paymentMethodTypeLabel(proof.method)}`}
                      {proof.amountInformed != null && ` · ${money(proof.amountInformed)}`}
                      {proof.concept != null && ` · ${paymentConceptLabel(proof.concept)}`}
                    </p>
                    {proof.reviewNote && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">{proof.status === ProofStatus.Rejected ? 'Motivo de rechazo' : 'Nota'}:</span> {proof.reviewNote}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isPending && (
                      <>
                        <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => onReviewProof(proof, 'approve')}>
                          Aprobar
                        </Button>
                        <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => onReviewProof(proof, 'reject')}>
                          Rechazar
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" onClick={() => onReviewProof(proof)}>
                      {proof.fileUrl ? 'Ver comprobante' : 'Ver'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {proofs.length === 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Comprobantes</p>
          <p className="text-xs text-slate-400">Sin comprobantes cargados.</p>
        </div>
      )}

      {/* Cancelaciones / rechazos: historial consultable y resolución de solicitudes pendientes */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Cancelaciones y rechazos</p>
        {loadingCancels ? (
          <p className="text-xs text-slate-400">Cargando historial...</p>
        ) : cancelRequests.length === 0 ? (
          <p className="text-xs text-slate-400">Sin solicitudes de cancelación registradas.</p>
        ) : (
          <div className="space-y-2">
            {cancelRequests.map((req) => {
              const cs = cancellationStatusLabel(req.status)
              const refund = cancellationRefundStatusLabel(req.refundStatus)
              const isPendingCancel = req.status === CancellationStatus.Pending
              return (
                <div key={req.id} className={`rounded-xl border p-3 ${isPendingCancel ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">Solicitud de cancelación</p>
                        <Badge variant={cs.variant}>{cs.label}</Badge>
                        {req.requiresRefund && <Badge variant={refund.variant}>{refund.label}</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {fmtDateTime(req.createdAtUtc)}
                        {req.reviewedAtUtc && ` · Revisada ${fmtDateTime(req.reviewedAtUtc)}`}
                      </p>
                      {req.reason && (
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-semibold">Motivo:</span> {req.reason}
                        </p>
                      )}
                      {req.adminReviewNote && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold">Nota del administrador:</span> {req.adminReviewNote}
                        </p>
                      )}
                      {req.refundNote && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold">Devolución:</span> {req.refundNote}
                        </p>
                      )}
                    </div>
                    {isPendingCancel && (
                      <div className="flex shrink-0 items-center gap-2">
                        <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => { setCancelReviewNote(''); setCancelReviewError(''); setCancelAction({ request: req, type: 'approve' }) }}>
                          Aprobar
                        </Button>
                        <Button size="sm" variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400" onClick={() => { setCancelReviewNote(''); setCancelReviewError(''); setCancelAction({ request: req, type: 'reject' }) }}>
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Preparación y entrega</p>
        <div className="flex flex-wrap gap-2">
          {canPrepare && <Button size="sm" className="bg-sky-600 text-white hover:bg-sky-700" onClick={onPrepare}>Iniciar preparación</Button>}
          {canReady && <Button size="sm" className="bg-sky-600 text-white hover:bg-sky-700" onClick={onReady}>{order.deliveryMethod === 'HomeDelivery' ? 'Listo para despacho' : 'Listo para entregar'}</Button>}
          {canDispatch && <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={onDispatch}>Despachar / En tránsito</Button>}
          {canDeliver && <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={onDeliver}>Entregar</Button>}
          {canReject && <Button size="sm" variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400" onClick={() => onRejectOrder(order.id)}>Rechazar pedido</Button>}
          {canCancel && <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => onCancel(order.id)}>Cancelar pedido</Button>}
          {balance > 0 && <p className="w-full text-xs text-slate-400">La entrega se habilita cuando el saldo llegue a $0.</p>}
        </div>
      </div>

      {/* Modal resolución de solicitud de cancelación */}
      {cancelAction && (
        <Modal
          open={!!cancelAction}
          onClose={() => { setCancelAction(null); setCancelReviewNote(''); setCancelReviewError('') }}
          title={cancelAction.type === 'approve' ? 'Aprobar cancelación' : 'Rechazar cancelación'}
          ariaLabel="Revisión de solicitud de cancelación"
          className="sm:max-w-md"
        >
          <div className="space-y-4 p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {cancelAction.type === 'approve'
                ? 'Al aprobar se libera la reserva del stock y se invalidan los comprobantes pendientes.'
                : 'Indicá el motivo. El alumno recibirá la notificación con la respuesta.'}
            </p>
            {cancelAction.type === 'reject' && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Motivo del rechazo <span className="text-rose-500">*</span>
                </label>
                <Textarea rows={3} value={cancelReviewNote} onChange={(e) => setCancelReviewNote(e.target.value)} placeholder="Motivo (obligatorio)" />
              </div>
            )}
            {cancelReviewError && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{cancelReviewError}</p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setCancelAction(null); setCancelReviewNote(''); setCancelReviewError('') }}>Volver</Button>
              <Button
                className={cancelAction.type === 'approve' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-rose-600 text-white hover:bg-rose-700'}
                onClick={confirmCancelReview}
                loading={approveCancellation.isPending || rejectCancellation.isPending}
                disabled={cancelAction.type === 'reject' && !cancelReviewNote.trim()}
              >
                {cancelAction.type === 'approve' ? 'Confirmar aprobación' : 'Rechazar solicitud'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </OverlayModal>
  )
}

function PaymentRow({ payment, order, onRefundMp, onManualRefund }: {
  payment: Payment
  order: Order
  onRefundMp: (order: Order, payment: Payment) => void
  onManualRefund: (order: Order, payment: Payment) => void
}) {
  const state = paymentStateLabel(payment.status)
  const concept = paymentConceptLabel(payment.concept)
  const method = paymentMethodTypeLabel(payment.method)
  const refund = refundStateLabel(payment.refundState)
  const isMp = payment.method === PaymentMethodType.MercadoPago
  const canRefund = (payment.status === PaymentState.Approved || payment.requiresResolution) &&
    payment.refundState !== RefundState.Refunded &&
    payment.refundState !== RefundState.Pending

  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white">{concept} · {money(payment.amount)}</p>
          <p className="text-xs text-slate-400">{method}{payment.providerPaymentId ? ` · ${payment.providerPaymentId}` : ''}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 flex-wrap">
          <Badge variant={state.variant}>{state.label}</Badge>
          {payment.refundState !== RefundState.None && <Badge variant={refund.variant}>{refund.label}</Badge>}
          {payment.requiresResolution && <Badge variant="danger">Requiere resolución</Badge>}
        </div>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        {fmtDateTime(payment.approvedAtUtc ?? payment.rejectedAtUtc ?? payment.createdAtUtc)}
        {payment.reviewNote ? ` · ${payment.reviewNote}` : ''}
        {payment.refundState !== RefundState.None && payment.refundedAmount ? ` · Reembolsado ${money(payment.refundedAmount)}${payment.refundedAtUtc ? ` (${fmt(payment.refundedAtUtc)})` : ''}` : ''}
      </p>
      {canRefund && (
        <div className="mt-2 flex justify-end gap-2">
          {isMp ? (
            <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => onRefundMp(order, payment)}>
              Reembolsar
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400" onClick={() => onManualRefund(order, payment)}>
              Marcar reembolso realizado
            </Button>
          )}
        </div>
      )}
      {payment.refundState === RefundState.Pending && (
        <p className="mt-1 text-[11px] text-amber-600">Reembolso en proceso. Se verifica con Mercado Pago.</p>
      )}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <ToastProvider>
      <OrdersPageInner />
    </ToastProvider>
  )
}