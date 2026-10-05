import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { apiService } from '@/lib/api'
import { clothingCompanySlug, studentClothingHomePath, isEducationalContext } from '@/lib/clothing-context'
import { OrderTracker } from '@/components/clothing/order-tracker'
import { buildOrderTrackerSteps, isOrderTrackerVisible } from '@/components/clothing/order-tracker-steps'
import { RefundBanner } from '@/components/clothing/refund-banner'
import { latestRefundDetail } from '@/components/clothing/refund'

const ARS = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
function slug() { return clothingCompanySlug() }
function fmt(v: string | null | undefined) { if (!v) return ''; return new Date(v).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) }

interface OrderItem {
  productName: string
  variantName?: string
  personalizationText?: string
  quantity: number
  unitPrice: number
  subtotal: number
}

interface OrderPayment {
  concept: string | number
  method: string | number
  amount: number
  status: string | number
  refundState: string | number
  refundedAmount?: number | null
  refundNote?: string | null
  refundedAtUtc?: string | null
}

interface OrderProof {
  id: string
  type?: string
  status: string
  uploadedAtUtc?: string
  reviewedAtUtc?: string
  reviewNote?: string | null
  amountInformed?: number | null
  concept?: string | null
  canResubmit?: boolean
}

interface Order {
  id: string
  createdAtUtc: string
  status: string | number
  paymentStatus: string | number
  paymentOption: number
  deliveryStatus?: string | number
  deliveryMethod?: string | number | null
  totalAmount: number
  depositAmount?: number
  pendingAmount?: number
  fullTotal?: number
  paid?: number
  balance?: number
  totalCharged?: number
  totalRefunded?: number
  netRetained?: number
  balanceDue?: number
  orderRefundState?: string
  productsTotal?: number
  deliveryFee?: number
  deliveryAddressFormatted?: string | null
  deliveryZoneSnapshot?: string | null
  deliveryInstructions?: string | null
  currency?: string
  hasPendingPaymentProof?: boolean
  reservationExpiresAtUtc?: string | null
  payments?: OrderPayment[]
  paymentProofs?: OrderProof[]
  items?: OrderItem[]
}

interface TransferData {
  cbu?: string | null
  alias?: string | null
  holder?: string | null
  bankName?: string | null
  instructions?: string | null
  amount: number
  currency: string
  canPay: boolean
}

interface PaymentOption {
  concept: string
  amount: number
  available: boolean
}

interface PaymentOptions {
  fullTotal: number
  minimumInitialPayment: number
  balance: number
  paid: number
  allowsFullCheckout: boolean
  options: PaymentOption[]
  methods: { transferEnabled: boolean; transferCanPay: boolean; mercadoPagoEnabled: boolean; mercadoPagoConnected: boolean }
}

interface MpStatus {
  status: string
  isPaid: boolean
  paymentAttemptId: string
  paymentReference?: string | null
  message: string
}

const conceptLabel: Record<string, string> = {
  Deposit: 'Pago inicial',
  Full: 'Pago total',
  Balance: 'Saldo',
}

const DELIVERY_ACTIVE = ['InPreparation', 'ReadyForPickup', 'ReadyForDispatch', 'InTransit']
const TERMINAL_STATUS = ['Cancelled', 'Expired', 'Rejected', 'Delivered']

function isTerminal(o: Order | undefined): boolean {
  return !!o && TERMINAL_STATUS.includes(String(o.status))
}

/** Cuándo conviene refrescar el pedido en segundo plano sin consultas innecesarias. */
function shouldPollOrder(o: Order | undefined, mpActive: boolean): boolean {
  if (!o) return true
  const status = String(o.status)
  if (TERMINAL_STATUS.includes(status)) return false
  const ds = String(o.deliveryStatus ?? '')
  if (DELIVERY_ACTIVE.includes(ds)) return true
  if (o.hasPendingPaymentProof) return true
  if (mpActive) return true
  return false
}

function CopyRow({ label, value, copied, onCopy }: {
  label: string
  value?: string | null
  copied: boolean
  onCopy: () => void
}) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-700 dark:bg-violet-950/30">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-500">{label}</p>
        <p className="truncate text-sm font-bold text-violet-700 dark:text-violet-300">{value}</p>
      </div>
      <button
        onClick={onCopy}
        className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700"
      >
        {copied ? '✓ Copiado' : 'Copiar'}
      </button>
    </div>
  )
}

function DetailInner() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const orderId = id || sessionStorage.getItem('lastClothingOrderId') || ''
  const [mpAttempt, setMpAttempt] = useState<string>(() => sessionStorage.getItem('lastClothingMpAttempt') || '')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [justSubmitted, setJustSubmitted] = useState(false)
  const [copied, setCopied] = useState<{ cbu?: boolean; alias?: boolean }>({})

  const { data: order, isLoading } = useQuery({
    queryKey: ['clothing-order', slug(), orderId],
    queryFn: () => apiService.get<Order>(`/api/student/${slug()}/clothing/orders/${orderId}`),
    enabled: !!orderId && !!slug(),
    refetchInterval: (query) => (shouldPollOrder(query.state.data as Order | undefined, !!mpAttempt) ? 15000 : false),
  })

  const active = !!order && !isTerminal(order)
  const paid = order?.paid ?? 0
  const balance = order?.balance ?? 0
  const fullTotal = order?.fullTotal ?? order?.totalAmount ?? 0
  const totalCharged = order?.totalCharged ?? 0
  const totalRefunded = order?.totalRefunded ?? 0
  const netRetained = order?.netRetained ?? 0
  const balanceDue = order?.balanceDue ?? 0
  const orderRefundState = order?.orderRefundState || 'None'
  const hasRefund = orderRefundState !== 'None'
  const fullyPaid = paid > 0 && balance <= 0
  // Hay algo para pagar: saldo exigible real o monto pendiente legacy (pedidos históricos).
  // Un pedido totalmente reembolsado nunca habilita un segundo pago (BalanceDue = 0).
  const needsPayment = active && !(paid > 0 && balanceDue <= 0) && (balanceDue > 0 || (order?.pendingAmount ?? 0) > 0)

  const { data: options } = useQuery({
    queryKey: ['clothing-payment-options', slug(), orderId],
    queryFn: () => apiService.get<PaymentOptions>(`/api/student/${slug()}/clothing/orders/${orderId}/payment-options`),
    enabled: needsPayment,
    retry: false,
  })

  const { data: transferData } = useQuery({
    queryKey: ['clothing-transfer-data', slug(), orderId],
    queryFn: () => apiService.get<TransferData>(`/api/student/${slug()}/clothing/orders/${orderId}/transfer-data`),
    enabled: needsPayment && !!options?.methods.transferEnabled && !!options.methods.transferCanPay,
    retry: false,
  })

  const { data: mpStatus } = useQuery({
    queryKey: ['clothing-mp-status', slug(), orderId, mpAttempt],
    queryFn: () => apiService.get<MpStatus>(`/api/student/${slug()}/clothing/orders/${orderId}/mercadopago/status?attempt=${mpAttempt}`),
    enabled: !!orderId && !!mpAttempt && !!slug(),
    refetchInterval: 6000,
  })

  const refreshOrder = () => {
    queryClient.invalidateQueries({ queryKey: ['clothing-order', slug(), orderId] })
    queryClient.invalidateQueries({ queryKey: ['clothing-payment-options', slug(), orderId] })
    queryClient.invalidateQueries({ queryKey: ['clothing-transfer-data', slug(), orderId] })
  }

  useEffect(() => {
    if (mpStatus?.isPaid) refreshOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mpStatus?.isPaid])

  const uploadProof = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData(); fd.append('file', file)
      return apiService.postForm(`/api/student/${slug()}/clothing/orders/${orderId}/payment-proof`, fd)
    },
    onSuccess: () => {
      toast('Tu pago quedó en revisión. Te avisaremos cuando sea aprobado.')
      setProofFile(null)
      setJustSubmitted(true)
      refreshOrder()
    },
  })

  const startMp = useMutation({
    mutationFn: (concept: string) =>
      apiService.post<{ attemptId: string; initPoint?: string }>(`/api/student/${slug()}/clothing/orders/${orderId}/mercadopago/checkout`, { concept, context: isEducationalContext() ? 'EducationalStudent' : 'SportsStudent' }),
    onSuccess: (data) => {
      setMpAttempt(data.attemptId)
      sessionStorage.setItem('lastClothingMpAttempt', data.attemptId)
      if (data.initPoint) window.location.href = data.initPoint
    },
    onError: () => toast('Mercado Pago no está disponible en este momento.', 'error'),
  })

  const cancelRequest = useMutation({
    mutationFn: () =>
      apiService.post(`/api/student/${slug()}/clothing/orders/${orderId}/cancel-request`, {}),
    onSuccess: () => toast('Solicitud de cancelación enviada.'),
    onError: () => toast('No se pudo enviar la solicitud de cancelación.', 'error'),
  })

  const availableOptions = (options?.options ?? []).filter((o) => o.available)
  const depositOpt = availableOptions.find((o) => o.concept === 'Deposit')
  const fullOpt = availableOptions.find((o) => o.concept === 'Full')
  const balanceOpt = availableOptions.find((o) => o.concept === 'Balance')
  const showChoice = !!depositOpt && !!fullOpt && paid === 0

  const methods = options?.methods
  const canPayTransfer = !!methods?.transferEnabled && !!methods.transferCanPay && !!transferData && transferData.amount > 0
  const canPayMp = !!methods?.mercadoPagoEnabled && !!methods.mercadoPagoConnected

  const statusStr = String(order?.status ?? '')
  const isExpired = statusStr === 'Expired'
  const isCancelled = statusStr === 'Cancelled'
  const isDelivered = statusStr === 'Delivered'
  const isPending = statusStr === 'Pending' || statusStr === 'Approved'

  const pendingProof = !!order?.hasPendingPaymentProof || justSubmitted
  const rejectedProofs = (order?.paymentProofs ?? []).filter((p) => p.status === 'Rejected')
  const lastRejected = rejectedProofs[0]
  const canResubmit = rejectedProofs.some((p) => p.canResubmit)

  const refunds = order?.payments ?? []
  const hasApprovedMoney = paid > 0
  const hasPendingRefund = isCancelled && hasApprovedMoney && refunds.some((p) => p.refundState !== 'Refunded')
  const fullyRefunded = isCancelled && hasApprovedMoney && refunds.length > 0 && refunds.every((p) => p.refundState === 'Refunded')

  const deliveryStatusStr = String(order?.deliveryStatus ?? '')
  const deliveryLabel = hasRefund
    ? orderRefundState === 'Refunded'
      ? 'Reembolsado'
      : orderRefundState === 'Partial'
        ? 'Reembolso parcial'
        : orderRefundState === 'Pending'
          ? 'Reembolso en proceso'
          : 'Reembolso con problema'
    : isDelivered
      ? 'Entregado'
      : deliveryStatusStr === 'InPreparation'
        ? 'En preparación'
        : deliveryStatusStr === 'ReadyForPickup'
          ? 'Listo para entregar'
          : deliveryStatusStr === 'ReadyForDispatch'
            ? 'Listo para enviar'
            : deliveryStatusStr === 'InTransit'
              ? 'En tránsito'
              : fullyPaid
                ? 'Pago aprobado'
                : paid > 0
                  ? 'Saldo pendiente'
                  : 'Esperando pago'

  const deliveryBadgeVariant: 'success' | 'info' | 'warning' | 'danger' =
    hasRefund
      ? 'danger'
      : isDelivered || (fullyPaid && deliveryStatusStr === 'NotStarted')
        ? 'success'
        : ['InPreparation', 'ReadyForPickup', 'ReadyForDispatch', 'InTransit'].includes(deliveryStatusStr)
          ? 'info'
          : 'warning'

  async function copy(value: string, key: 'cbu' | 'alias') {
    try { await navigator.clipboard.writeText(value) } catch { /* ignore */ }
    setCopied({ ...copied, [key]: true })
    setTimeout(() => setCopied((c) => ({ ...c, [key]: false })), 3000)
  }

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>

  if (!order) return <div className="py-16 text-center text-sm text-slate-500">Pedido no encontrado.</div>

  // La reserva preventiva solo aplica mientras hay saldo pendiente. Con el pago
  // confirmado la reserva deja de aplicar y no corresponde mostrar el vencimiento.
  const reservedText = !isExpired && !isCancelled && !isDelivered && balance > 0 && order.reservationExpiresAtUtc
    ? `Reservado hasta ${fmt(order.reservationExpiresAtUtc)}`
    : null

  const showPaymentPanel = needsPayment && !pendingProof
  const showTransferBlock = canPayTransfer
  const showMpBlock = canPayMp && availableOptions.length > 0
  const showPaymentMethodsNotice = showPaymentPanel && !pendingProof && !showTransferBlock && !showMpBlock

  const refundDetail = latestRefundDetail(order?.payments ?? [])
  const fullyRefundedOrder = orderRefundState === 'Refunded'
  const trackerSteps = isOrderTrackerVisible(order.status) ? buildOrderTrackerSteps(order) : null

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-black text-slate-900 dark:text-white">Tu pedido</h1>
        <p className="mt-1 text-sm text-slate-500">#{order.id.slice(0, 8)} · {fmt(order.createdAtUtc)}</p>
      </div>

      {/* Reembolso: prioridad visual por encima del seguimiento */}
      {hasRefund && (orderRefundState === 'Refunded' || orderRefundState === 'Partial' || orderRefundState === 'Pending' || orderRefundState === 'Failed') && (
        <RefundBanner
          state={orderRefundState as 'Refunded' | 'Partial' | 'Pending' | 'Failed'}
          amountText={totalRefunded > 0 ? ARS(totalRefunded) : undefined}
          refundedAtUtc={refundDetail.refundedAtUtc}
          note={refundDetail.note}
        />
      )}

      {/* Seguimiento (elemento principal) */}
      {trackerSteps && (
        <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${fullyRefundedOrder ? 'opacity-70' : ''}`}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Seguimiento del pedido</p>
            <Badge variant={deliveryBadgeVariant}>{deliveryLabel}</Badge>
          </div>
          <OrderTracker steps={trackerSteps} />
        </div>
      )}

      {/* Estado */}
      {!trackerSteps && !hasRefund && (
        <div className="flex justify-center gap-2 flex-wrap">
          {isExpired && <Badge variant="default">Vencido</Badge>}
          {isCancelled && <Badge variant="default">Cancelado</Badge>}
          {hasPendingRefund && <Badge variant="warning">Reembolso pendiente</Badge>}
          {fullyRefunded && <Badge variant="danger">Reembolsado</Badge>}
        </div>
      )}

      {/* Estado Mercado Pago al volver */}
      {mpAttempt && mpStatus && (
        <div className={`rounded-xl border p-4 text-center ${mpStatus.isPaid ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{mpStatus.isPaid ? 'Pago aprobado' : mpMessage(mpStatus)}</p>
          {!mpStatus.isPaid && <p className="text-xs text-slate-500 dark:text-slate-400">{mpStatus.message}</p>}
        </div>
      )}

      {reservedText && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
          {reservedText}
        </div>
      )}

      {/* Pedido expirado */}
      {isExpired && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">La reserva venció.</p>
          <p className="mt-1 text-xs text-slate-500">Los productos vuelven a estar disponibles.</p>
          <Button className="mt-3 bg-violet-600 text-white hover:bg-violet-700" onClick={() => navigate(studentClothingHomePath())}>Volver a la tienda</Button>
        </div>
      )}

      {/* Resumen financiero */}
      <div className="rounded-xl border border-slate-200 overflow-hidden dark:border-slate-700">
        <div className="bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800">Resumen</div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <Row label="Total" value={ARS(fullTotal)} />
          <Row label="Cobrado" value={ARS(totalCharged)} accent />
          {totalRefunded > 0 && <Row label="Reembolsado" value={ARS(totalRefunded)} refund />}
          {hasRefund && <Row label="Neto retenido" value={ARS(netRetained)} />}
          <Row label="Saldo a pagar" value={ARS(balanceDue)} />
          {(order.deliveryFee ?? 0) > 0 && <Row label="Envío" value={ARS(order.deliveryFee ?? 0)} />}
        </div>
      </div>

      {/* Método de entrega */}
      {order.deliveryMethod && order.deliveryMethod !== 'None' && (
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Método de entrega</p>
          <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
            {order.deliveryMethod === 'HomeDelivery' ? 'Envío a domicilio' : 'Retiro en la institución'}
          </p>
          {order.deliveryAddressFormatted && <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{order.deliveryAddressFormatted}</p>}
          {order.deliveryZoneSnapshot && <p className="mt-0.5 text-xs text-slate-500">Zona: {order.deliveryZoneSnapshot}</p>}
          {order.deliveryInstructions && <p className="mt-0.5 text-xs text-slate-500">Nota: {order.deliveryInstructions}</p>}
        </div>
      )}

      {/* Comprobante en revisión */}
      {pendingProof && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Comprobante en revisión</p>
          <p className="text-xs text-emerald-600">Recibimos tu pago. Te avisaremos cuando sea aprobado.</p>
        </div>
      )}

      {/* Comprobante rechazado */}
      {lastRejected && canResubmit && !pendingProof && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3 dark:border-rose-900/50 dark:bg-rose-950/20">
          <div>
            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Tu comprobante fue rechazado</p>
            <p className="mt-0.5 text-xs text-rose-600">
              {lastRejected.reviewNote || 'No pudimos validar el comprobante. Podés volver a enviarlo.'}
            </p>
          </div>
          {(canPayTransfer || canPayMp) && (
            <p className="text-xs text-rose-600">Revisá los datos y subí un nuevo comprobante o aboná por otro medio.</p>
          )}
        </div>
      )}

      {/* ¿Cómo querés pagar? */}
      {showPaymentPanel && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-5 space-y-4 dark:border-violet-900/50 dark:bg-violet-950/20">
          <p className="text-sm font-bold text-violet-800 dark:text-violet-200">¿Cómo querés pagar?</p>

          {showChoice && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-300">¿Cuánto querés pagar ahora?</p>
              <div className="grid grid-cols-2 gap-2">
                <MpOption concept={depositOpt.concept} label="Pago inicial" amount={depositOpt.amount} onPay={(c) => startMp.mutate(c)} canPayMp={canPayMp} canPayTransfer={canPayTransfer} />
                <MpOption concept={fullOpt.concept} label="Pago total" amount={fullOpt.amount} onPay={(c) => startMp.mutate(c)} canPayMp={canPayMp} canPayTransfer={canPayTransfer} />
              </div>
            </div>
          )}

          {balanceOpt && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Saldo pendiente: {ARS(balance)}</p>
              <p className="text-xs text-amber-600">Tu pago inicial fue aprobado. Aboná el saldo para completar el pedido.</p>
            </div>
          )}

          {/* Transferencia */}
          {showTransferBlock && transferData && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-3 dark:border-orange-900/50 dark:bg-orange-950/20">
              <p className="text-sm font-bold text-orange-800 dark:text-orange-200">Transferencia</p>
              <div>
                <p className="text-2xl font-black text-orange-900 dark:text-orange-100">{ARS(transferData.amount)}</p>
                <p className="text-xs text-orange-600">Importe a transferir</p>
              </div>
              <div className="space-y-2">
                <CopyRow label="CBU/CVU" value={transferData.cbu} copied={!!copied.cbu} onCopy={() => copy(transferData.cbu ?? '', 'cbu')} />
                <CopyRow label="Alias" value={transferData.alias} copied={!!copied.alias} onCopy={() => copy(transferData.alias ?? '', 'alias')} />
                {transferData.holder && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Titular</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">{transferData.holder}</p>
                  </div>
                )}
                {transferData.bankName && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Banco / Billetera</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">{transferData.bankName}</p>
                  </div>
                )}
                {transferData.instructions && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Instrucciones</p>
                    <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{transferData.instructions}</p>
                  </div>
                )}
              </div>
              {!pendingProof && (
                <>
                  <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1 file:text-xs file:font-medium dark:text-slate-300 dark:file:bg-slate-700" />
                  <Button onClick={() => { if (proofFile) uploadProof.mutate(proofFile) }} disabled={!proofFile} loading={uploadProof.isPending}
                    className="w-full bg-violet-600 text-white hover:bg-violet-700">
                    {lastRejected && canResubmit ? 'Reenviar comprobante' : 'Subir comprobante'}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Mercado Pago */}
          {showMpBlock && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 space-y-3 dark:border-sky-900/50 dark:bg-sky-950/20">
              <p className="text-sm font-bold text-sky-800 dark:text-sky-200">Mercado Pago</p>
              {availableOptions.map((o) => (
                <Button
                  key={o.concept}
                  onClick={() => startMp.mutate(o.concept)}
                  loading={startMp.isPending}
                  disabled={startMp.isPending}
                  className="w-full bg-sky-600 text-white hover:bg-sky-700"
                >
                  Pagar {conceptLabel[o.concept] ?? o.concept}: {ARS(o.amount)}
                </Button>
              ))}
            </div>
          )}

          {/* Sin métodos de pago disponibles */}
          {showPaymentMethodsNotice && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No hay métodos de pago disponibles en este momento.</p>
              <p className="mt-1 text-xs text-slate-400">La institución va a habilitar el pago en breve.</p>
            </div>
          )}
        </div>
      )}

      {/* Productos */}
      {order.items && order.items.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800">Productos</div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.productName}{item.variantName ? ` · ${item.variantName}` : ''}</p>
                  {item.personalizationText && <p className="text-xs text-slate-400">{item.personalizationText}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white">{ARS(item.subtotal)}</p>
                  <p className="text-[10px] text-slate-400">{item.quantity} × {ARS(item.unitPrice)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="space-y-3">
        <div className="flex gap-3">
          {isPending && (
            <Button variant="outline" onClick={() => cancelRequest.mutate()} loading={cancelRequest.isPending} className="flex-1">
              Solicitar cancelación
            </Button>
          )}
          <Button onClick={() => navigate(studentClothingHomePath())} className="flex-1 bg-violet-600 text-white hover:bg-violet-700">Volver a la tienda</Button>
        </div>
        {isPending && paid > 0 && (
          <p className="text-center text-xs text-slate-400">
            Este pedido tiene pagos realizados. La cancelación puede requerir un reembolso.
          </p>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, accent, refund }: { label: string; value: string; accent?: boolean; refund?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm font-black ${accent ? 'text-emerald-600 dark:text-emerald-400' : refund ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>{value}</span>
    </div>
  )
}

function MpOption({ concept, label, amount, onPay, canPayMp, canPayTransfer }: {
  concept: string
  label: string
  amount: number
  onPay: (c: string) => void
  canPayMp: boolean
  canPayTransfer: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs font-bold text-slate-900 dark:text-white">{label}</p>
      <p className="text-base font-black text-violet-600 dark:text-violet-300">{ARS(amount)}</p>
      {label === 'Pago inicial' && <p className="text-[10px] text-slate-400">El resto quedará pendiente para abonarlo después.</p>}
      {canPayMp && <Button size="sm" className="w-full bg-sky-600 text-white hover:bg-sky-700" onClick={() => onPay(concept)}>Pagar con Mercado Pago</Button>}
      {!canPayMp && canPayTransfer && <p className="text-[10px] text-slate-400">Disponible por transferencia.</p>}
    </div>
  )
}

function mpMessage(s: MpStatus): string {
  if (s.isPaid) return 'Pago aprobado.'
  switch (s.status) {
    case 'Pending': return 'Estamos verificando tu pago.'
    case 'Rejected': return 'El pago no pudo completarse. Podés intentar nuevamente.'
    case 'Cancelled': return 'El pago fue cancelado.'
    case 'Applied': return 'Pago aprobado.'
    default: return 'Recibimos el pago, pero necesitamos revisar el pedido.'
  }
}

export default function StudentClothingOrderDetail() { return <ToastProvider><DetailInner /></ToastProvider> }