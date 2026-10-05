import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { money } from '@/lib/currency'
import { OrderTracker } from '@/components/clothing/order-tracker'
import { buildOrderTrackerSteps, isOrderTrackerVisible } from '@/components/clothing/order-tracker-steps'
import { RefundBanner } from '@/components/clothing/refund-banner'
import { latestRefundDetail } from '@/components/clothing/refund'
import {
  usePublicOrder,
  usePublicTransferData,
  usePublicUploadProof,
  usePublicMercadoPagoCheckout,
} from './hooks'

const STATUS_LABELS: Record<number, string> = {
  1: 'Pendiente',
  2: 'Aprobado',
  3: 'Rechazado',
  4: 'Entregado',
  5: 'Cancelado',
  6: 'Vencido',
}

const ORDER_STATUS_NAMES: Record<number, string> = {
  1: 'Pending',
  2: 'Approved',
  3: 'Rejected',
  4: 'Delivered',
  5: 'Cancelled',
  6: 'Expired',
}

// Orden del enum ClothingDeliveryStatus del backend (serializado como int en el DTO público).
const DELIVERY_STATUS_NAMES: Record<number, string> = {
  0: 'NotStarted',
  1: 'InPreparation',
  2: 'ReadyForPickup',
  3: 'Delivered',
  4: 'ReadyForDispatch',
  5: 'InTransit',
}

const PAYMENT_LABELS: Record<number, string> = {
  0: 'Sin pago',
  1: 'Seña pendiente',
  2: 'Seña pagada',
  3: 'Pago pendiente',
  4: 'Pago completo',
  5: 'Rechazado',
}

const PAYMENT_CONCEPT_LABELS: Record<string, string> = {
  Deposit: 'Adelanto',
  Full: 'Pago total',
  Balance: 'Saldo',
}

const PAYMENT_STATE_LABELS: Record<string, string> = {
  Pending: 'Pendiente',
  InReview: 'En revisión',
  Approved: 'Aprobado',
  Rejected: 'Rechazado',
  Cancelled: 'Cancelado',
  Refunded: 'Reembolsado',
}

const REFUND_STATE_LABELS: Record<string, string> = {
  None: 'Sin reembolso',
  Pending: 'Reembolso en proceso',
  Refunded: 'Reembolsado',
  Failed: 'Reembolso con problema',
  Partial: 'Reembolso parcial',
}

function nextConcept(paymentStatus: number): string {
  if (paymentStatus === 1) return 'Deposit'
  if (paymentStatus === 3) return 'Full'
  if (paymentStatus === 2) return 'Balance'
  return 'Full'
}

function OrderInner() {
  const { companySlug = '', publicToken = '' } = useParams()
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: order, isLoading, isError } = usePublicOrder(companySlug, publicToken)
  const canNeedTransfer = !!order && (order.balanceDue ?? 0) > 0 && ![3, 4, 5, 6].includes(order.status)
  const { data: transfer, isLoading: loadingTransfer } = usePublicTransferData(companySlug, publicToken, canNeedTransfer)
  const uploadMutation = usePublicUploadProof(companySlug, publicToken)
  const mpMutation = usePublicMercadoPagoCheckout(companySlug, publicToken)
  const [proofError, setProofError] = useState('')
  const [showProof, setShowProof] = useState(false)

  async function payWithMp() {
    if (!order) return
    const concept = nextConcept(order.paymentStatus)
    try {
      const res = await mpMutation.mutateAsync(concept)
      const data = res as unknown as { initPoint?: string | null }
      if (data.initPoint) window.location.href = data.initPoint
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(msg ?? 'No se pudo iniciar el pago con Mercado Pago.')
    }
  }

  async function handleFile(file: File | undefined) {
    setProofError('')
    if (!file) return
    try {
      await uploadMutation.mutateAsync(file)
      toast('Comprobante subido. Quedó en revisión.')
      setShowProof(false)
      queryClient.invalidateQueries({ queryKey: ['public-store', companySlug, 'order', publicToken] })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setProofError(msg ?? 'No se pudo subir el comprobante.')
    }
  }

  if (isLoading) {
    return <div className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950"><Spinner className="h-7 w-7 text-violet-600" /></div>
  }

  if (isError || !order) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="text-center">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Pedido no encontrado</h1>
          <p className="mt-1 text-sm text-slate-500">Revisá el enlace de tu pedido.</p>
          <Link to={`/tienda/${companySlug}`} className="mt-3 inline-block text-sm font-semibold text-violet-600">Volver a la tienda</Link>
        </div>
      </div>
    )
  }

  const orderStatusName = ORDER_STATUS_NAMES[order.status] ?? String(order.status)
  const deliveryStatusName = DELIVERY_STATUS_NAMES[order.deliveryStatus ?? 0] ?? 'NotStarted'
  const refundState = order.refundState || 'None'
  const hasRefund = refundState !== 'None'
  const fullyRefundedOrder = refundState === 'Refunded'
  const totalRefunded = order.totalRefunded ?? 0
  const netRetained = order.netRetained ?? 0
  const balanceDue = order.balanceDue ?? 0
  const refundDetail = latestRefundDetail(order.payments ?? [])
  const trackerSteps = isOrderTrackerVisible(orderStatusName)
    ? buildOrderTrackerSteps({
        status: orderStatusName,
        deliveryStatus: deliveryStatusName,
        deliveryMethod: order.deliveryMethod,
        paid: order.paid,
        balance: order.balance,
        orderRefundState: refundState,
        totalRefunded,
      })
    : null

  // Se paga solo si hay saldo realmente exigible y el pedido no está en estado terminal.
  // Un pedido totalmente reembolsado (BalanceDue = 0) nunca habilita un segundo pago.
  const canPay = balanceDue > 0 && ![3, 4, 5, 6].includes(order.status)
  const showTransfer = canPay && !!transfer && transfer.canPay && transfer.amount > 0
  const hasRejectedPayment = order.payments.some((p) => p.status === 'Rejected')

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600">Tu pedido</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {hasRefund ? (REFUND_STATE_LABELS[refundState] ?? refundState) : `${STATUS_LABELS[order.status] ?? order.status} · ${PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}`}
            </p>
          </div>
          <Link to={`/tienda/${companySlug}`} className="text-sm font-semibold text-violet-600">← Tienda</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        {/* Reembolso: prioridad visual por encima del seguimiento */}
        {hasRefund && (refundState === 'Refunded' || refundState === 'Partial' || refundState === 'Pending' || refundState === 'Failed') && (
          <RefundBanner
            state={refundState as 'Refunded' | 'Partial' | 'Pending' | 'Failed'}
            amountText={totalRefunded > 0 ? money(totalRefunded, order.currency) : undefined}
            refundedAtUtc={refundDetail.refundedAtUtc}
            note={refundDetail.note}
          />
        )}

        {/* Seguimiento (elemento principal) */}
        {trackerSteps && (
          <div className={`rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 ${fullyRefundedOrder ? 'opacity-70' : ''}`}>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Seguimiento del pedido</p>
            <OrderTracker steps={trackerSteps} />
          </div>
        )}

        {/* Estado de pago */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Total original</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{money(order.fullTotal, order.currency)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Total cobrado</p>
              <p className="text-sm font-semibold text-emerald-600">{money(order.paid, order.currency)}</p>
              {totalRefunded > 0 && (
                <>
                  <p className="text-xs text-slate-500">Reembolsado</p>
                  <p className="text-sm font-semibold text-rose-600">{money(totalRefunded, order.currency)}</p>
                </>
              )}
              {hasRefund && (
                <>
                  <p className="text-xs text-slate-500">Neto retenido</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{money(netRetained, order.currency)}</p>
                </>
              )}
              {balanceDue > 0 && (
                <>
                  <p className="text-xs text-slate-500">Saldo a pagar</p>
                  <p className="text-sm font-semibold text-red-600">{money(balanceDue, order.currency)}</p>
                </>
              )}
            </div>
          </div>

          {order.deliveryMethod && (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
              <p className="font-semibold text-slate-900 dark:text-white">
                {order.deliveryMethod === 'Pickup' ? 'Retiro en la institución' : 'Envío a domicilio'}
              </p>
              {order.deliveryAddressFormatted && <p className="text-slate-600 dark:text-slate-300">{order.deliveryAddressFormatted}</p>}
              {order.deliveryZoneLabel && <p className="text-xs text-slate-500">Zona: {order.deliveryZoneLabel} · Envío {money(order.deliveryFee, order.currency)}</p>}
              {order.deliveryInstructions && <p className="text-xs text-slate-500">Nota: {order.deliveryInstructions}</p>}
            </div>
          )}

          {order.hasPendingPaymentProof && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Comprobante en revisión</p>
              <p className="text-xs text-emerald-600">Recibimos tu comprobante. La institución lo está verificando.</p>
            </div>
          )}

          {hasRejectedPayment && !order.hasPendingPaymentProof && canPay && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
              <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Tu comprobante fue rechazado</p>
              <p className="text-xs text-rose-600">No pudimos validarlo. Podés volver a subirlo o abonar por otro medio.</p>
            </div>
          )}

          {canPay && (
            <div className="mt-4 space-y-3">
              {showTransfer && (
                <>
                  <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Transferencia bancaria</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">{money(transfer.amount, transfer.currency)}</p>
                    {transfer.cbu && <p className="text-slate-600 dark:text-slate-300">CBU: {transfer.cbu}</p>}
                    {transfer.alias && <p className="text-slate-600 dark:text-slate-300">Alias: {transfer.alias}</p>}
                    {(transfer.holder || transfer.bankName) && (
                      <p className="text-slate-600 dark:text-slate-300">{transfer.holder} · {transfer.bankName}</p>
                    )}
                    {transfer.instructions && <p className="mt-1 text-xs text-slate-500">{transfer.instructions}</p>}
                  </div>
                  {!order.hasPendingPaymentProof && (
                    !showProof ? (
                      <Button variant="outline" className="w-full" onClick={() => setShowProof(true)}>
                        {hasRejectedPayment ? 'Reenviar comprobante de transferencia' : 'Subir comprobante de transferencia'}
                      </Button>
                    ) : (
                      <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={(e) => handleFile(e.target.files?.[0])}
                        />
                        {proofError && <p className="text-sm text-red-600">{proofError}</p>}
                      </div>
                    )
                  )}
                </>
              )}
              {!showTransfer && (
                <Button className="w-full bg-violet-600 text-white hover:bg-violet-700" loading={mpMutation.isPending || loadingTransfer} onClick={payWithMp}>
                  Pagar con Mercado Pago
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Productos */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Productos</h2>
          <div className="space-y-2">
            {order.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{it.productName}</p>
                  <p className="text-xs text-slate-500">{it.variantName} × {it.quantity}</p>
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{money(it.subtotal, order.currency)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-2 text-sm dark:border-slate-700">
            <span className="text-slate-500">Productos</span><span>{money(order.productsTotal, order.currency)}</span>
          </div>
          {order.deliveryFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Envío</span><span>{money(order.deliveryFee, order.currency)}</span>
            </div>
          )}
        </div>

        {/* Pagos */}
        {order.payments.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Pagos</h2>
            <div className="space-y-2">
              {order.payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {PAYMENT_CONCEPT_LABELS[p.concept] ?? p.concept} · {p.method === 'MercadoPago' ? 'Mercado Pago' : 'Transferencia'}
                    </p>
                    <p className="text-xs text-slate-500">{PAYMENT_STATE_LABELS[p.status] ?? p.status}</p>
                  </div>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{money(p.amount, order.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function PublicClothingOrderPage() {
  return (
    <ToastProvider>
      <OrderInner />
    </ToastProvider>
  )
}