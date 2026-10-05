import { clothingCompanySlug } from '@/lib/clothing-context'

export function slug(): string {
  return clothingCompanySlug()
}

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export function money(value: number): string {
  return ARS.format(value)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const d = data as Record<string, unknown>
  if (Array.isArray(d?.items)) return d.items as T[]
  if (Array.isArray(d?.data)) return d.data as T[]
  return []
}

/* ─── Enums ─── */
// El backend serializa enums como STRINGS (JsonStringEnumConverter global).
// Estos enums reflejan los nombres de los miembros C# para comparar sin casts.

export enum OrderStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Delivered = 'Delivered',
  Cancelled = 'Cancelled',
  Expired = 'Expired',
}

export enum DeliveryStatus {
  NotStarted = 'NotStarted',
  InPreparation = 'InPreparation',
  ReadyForPickup = 'ReadyForPickup',
  Delivered = 'Delivered',
  ReadyForDispatch = 'ReadyForDispatch',
  InTransit = 'InTransit',
}

export enum PaymentState {
  Pending = 'Pending',
  InReview = 'InReview',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled',
  Refunded = 'Refunded',
}

export enum RefundState {
  None = 'None',
  Pending = 'Pending',
  Refunded = 'Refunded',
  Failed = 'Failed',
  Partial = 'Partial',
}

export enum PaymentConcept {
  Deposit = 'Deposit',
  Balance = 'Balance',
  Full = 'Full',
}

export enum PaymentMethodType {
  Transfer = 'Transfer',
  MercadoPago = 'MercadoPago',
  Cash = 'Cash',
}

export enum PaymentStatus {
  None = 'None',
  DepositPending = 'DepositPending',
  DepositPaid = 'DepositPaid',
  FullPending = 'FullPending',
  FullPaid = 'FullPaid',
  Rejected = 'Rejected',
}

export enum PaymentMethod {
  None = 'None',
  ManualProof = 'ManualProof',
  MercadoPago = 'MercadoPago',
  Cash = 'Cash',
}

export enum ProofType {
  Deposit = 'Deposit',
  Full = 'Full',
}

export enum ProofStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export enum CancellationStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

/* ─── Types ─── */

export interface Category {
  id: string
  name: string
  parentId?: string | null
  isActive: boolean
  children?: Category[]
}

export interface ProductVariant {
  id: string
  name: string
  tracksStock: boolean
  stockQuantity: number | null
  reservedQuantity: number
  availableQuantity: number | null
  isActive: boolean
}

export interface ProductImage {
  id: string
  imageUrl: string
  isMain: boolean
}

export interface Product {
  id: string
  categoryId: string
  categoryName?: string
  parentCategoryName?: string
  name: string
  description?: string
  price: number
  isReservation: boolean
  requiresDeposit: boolean
  depositAmount: number | null
  tracksStock: boolean
  stockQuantity: number | null
  reservedQuantity: number
  availableQuantity: number | null
  allowsFullPayment: boolean
  hasVariants: boolean
  isActive: boolean
  allowsPersonalization: boolean
  personalizationLabel?: string | null
  personalizationMaxLength?: number | null
  variants?: ProductVariant[]
  images?: ProductImage[]
  isAvailable?: boolean
  createdAtUtc?: string
}

export interface Payment {
  id: string
  orderId: string
  method: PaymentMethodType
  concept: PaymentConcept
  amount: number
  status: PaymentState
  provider: string
  providerPaymentId?: string | null
  externalReference?: string | null
  proofId?: string | null
  reviewNote?: string | null
  createdAtUtc: string
  approvedAtUtc?: string | null
  rejectedAtUtc?: string | null
  refundedAtUtc?: string | null
  refundState: RefundState
  refundedAmount?: number | null
  refundProviderId?: string | null
  requiresResolution: boolean
}

export function refundStateLabel(s: RefundState): BadgeResult {
  const map: Record<RefundState, BadgeResult> = {
    [RefundState.None]: { label: 'Sin reembolso', variant: 'default' },
    [RefundState.Pending]: { label: 'Reembolso pendiente', variant: 'warning' },
    [RefundState.Refunded]: { label: 'Reembolsado', variant: 'success' },
    [RefundState.Failed]: { label: 'Reembolso con problema', variant: 'danger' },
    [RefundState.Partial]: { label: 'Reembolso parcial', variant: 'info' },
  }
  return map[s] ?? { label: String(s), variant: 'default' }
}

export interface OrderItem {
  id?: string
  productId?: string
  productName: string
  variantName?: string
  quantity: number
  unitPrice: number
  subtotal: number
  personalizationText?: string
  personalizationLabel?: string
}

export interface PaymentProof {
  id: string
  orderId: string
  type: ProofType
  status: ProofStatus
  fileUrl: string
  isPdf?: boolean
  isImage?: boolean
  uploadedAtUtc?: string
  reviewedAtUtc?: string | null
  reviewNote?: string | null
  studentName?: string
  studentDni?: string
  orderTotalAmount?: number
  orderPendingAmount?: number
  amountInformed?: number | null
  concept?: PaymentConcept | null
  method?: PaymentMethodType | null
}

export interface Order {
  id: string
  studentName: string
  studentDni?: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  paymentOption?: 1 | 2
  deliveryStatus?: DeliveryStatus
  deliveryMethod?: 'None' | 'Pickup' | 'HomeDelivery' | null
  deliveryDistanceKm?: number | null
  deliveryFee?: number
  deliveryAddressFormatted?: string | null
  orderSource?: number
  totalAmount: number
  depositAmount?: number
  pendingAmount?: number
  fullTotal?: number
  paid?: number
  balance?: number
  hasPendingPaymentProof?: boolean
  reservationExpiresAtUtc?: string | null
  createdAtUtc: string
  approvedAtUtc?: string | null
  rejectedAtUtc?: string | null
  deliveredAtUtc?: string | null
  cancelledAtUtc?: string | null
  items?: OrderItem[]
  payments?: Payment[]
}

export interface CancellationRequest {
  id: string
  studentName: string
  orderId: string
  reason?: string | null
  status: CancellationStatus
  requiresRefund?: boolean
  refundStatus?: 'NotRequired' | 'Pending' | 'InProgress' | 'Refunded'
  adminReviewNote?: string | null
  createdAtUtc?: string
  reviewedAtUtc?: string | null
  refundInProgressAtUtc?: string | null
  refundedAtUtc?: string | null
  refundNote?: string | null
}

export interface ClothingTransferCompanyData {
  cbu?: string | null
  alias?: string | null
  holder?: string | null
  bankName?: string | null
  canPay: boolean
}

export interface ClothingSettings {
  paymentAlias?: string | null
  paymentAliasHolder?: string | null
  transferEnabled: boolean
  useCompanyTransferData: boolean
  transferCbu?: string | null
  transferAlias?: string | null
  transferHolder?: string | null
  transferBankName?: string | null
  transferInstructions?: string | null
  companyTransferData: ClothingTransferCompanyData
  mercadoPagoEnabled: boolean
  useCompanyMercadoPagoAccount: boolean
  mercadoPagoGeneralConnected: boolean
  mercadoPagoClothingConnected: boolean
  reservationHours: number
  balancePendingAlertDays?: number | null

  // Tienda Pública (Etapa 12)
  publicStoreEnabled: boolean
  publicStoreTitle?: string | null
  publicStoreDescription?: string | null
  publicStoreInstructions?: string | null
  pickupEnabled: boolean
  homeDeliveryEnabled: boolean
  currency: string
  originAddressFormatted?: string | null
  originStreet?: string | null
  originStreetNumber?: string | null
  originCity?: string | null
  originState?: string | null
  originPostalCode?: string | null
  originCountry?: string | null
  originLatitude?: number | null
  originLongitude?: number | null
}

export interface StockEntry {
  product: Product
}

/* ─── Status labels & badges ─── */

interface BadgeResult {
  label: string
  variant: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'violet'
}

export function orderStatusLabel(s: OrderStatus): BadgeResult {
  const map: Record<OrderStatus, BadgeResult> = {
    [OrderStatus.Pending]: { label: 'Pendiente', variant: 'warning' },
    [OrderStatus.Approved]: { label: 'Aprobado', variant: 'success' },
    [OrderStatus.Rejected]: { label: 'Rechazado', variant: 'danger' },
    [OrderStatus.Delivered]: { label: 'Entregado', variant: 'success' },
    [OrderStatus.Cancelled]: { label: 'Cancelado', variant: 'danger' },
    [OrderStatus.Expired]: { label: 'Vencido', variant: 'warning' },
  }
  return map[s] ?? { label: String(s), variant: 'default' }
}

export function paymentStatusLabel(s: PaymentStatus): BadgeResult {
  const map: Record<PaymentStatus, BadgeResult> = {
    [PaymentStatus.None]: { label: 'Sin pago', variant: 'info' },
    [PaymentStatus.DepositPending]: { label: 'Seña pendiente', variant: 'warning' },
    [PaymentStatus.DepositPaid]: { label: 'Seña pagada', variant: 'info' },
    [PaymentStatus.FullPending]: { label: 'Pago pendiente', variant: 'warning' },
    [PaymentStatus.FullPaid]: { label: 'Pago completo', variant: 'success' },
    [PaymentStatus.Rejected]: { label: 'Rechazado', variant: 'danger' },
  }
  return map[s] ?? { label: String(s), variant: 'default' }
}

export function proofStatusLabel(s: ProofStatus): BadgeResult {
  const map: Record<ProofStatus, BadgeResult> = {
    [ProofStatus.Pending]: { label: 'En revisión', variant: 'warning' },
    [ProofStatus.Approved]: { label: 'Aprobado', variant: 'success' },
    [ProofStatus.Rejected]: { label: 'Rechazado', variant: 'danger' },
  }
  return map[s] ?? { label: String(s), variant: 'default' }
}

export function proofTypeLabel(t: ProofType): string {
  return t === ProofType.Deposit ? 'Seña' : 'Pago total'
}

export function paymentMethodLabel(m: PaymentMethod): string {
  const map: Record<PaymentMethod, string> = {
    [PaymentMethod.None]: '-',
    [PaymentMethod.ManualProof]: 'Comprobante',
    [PaymentMethod.MercadoPago]: 'Mercado Pago',
    [PaymentMethod.Cash]: 'Efectivo',
  }
  return map[m] ?? String(m)
}

export function cancellationStatusLabel(s: CancellationStatus): BadgeResult {
  const map: Record<CancellationStatus, BadgeResult> = {
    [CancellationStatus.Pending]: { label: 'Pendiente', variant: 'warning' },
    [CancellationStatus.Approved]: { label: 'Aprobada', variant: 'success' },
    [CancellationStatus.Rejected]: { label: 'Rechazada', variant: 'danger' },
  }
  return map[s] ?? { label: String(s), variant: 'default' }
}

export function cancellationRefundStatusLabel(s?: CancellationRequest['refundStatus']): BadgeResult {
  const map: Record<string, BadgeResult> = {
    NotRequired: { label: 'Sin reembolso', variant: 'default' },
    Pending: { label: 'Reembolso pendiente', variant: 'warning' },
    InProgress: { label: 'Reembolso en proceso', variant: 'info' },
    Refunded: { label: 'Reembolsado', variant: 'success' },
  }
  return (s && map[s]) ?? { label: '-', variant: 'default' }
}

export function deliveryStatusLabel(s: DeliveryStatus | number): BadgeResult {
  const map: Record<DeliveryStatus, BadgeResult> = {
    [DeliveryStatus.NotStarted]: { label: 'Sin iniciar', variant: 'info' },
    [DeliveryStatus.InPreparation]: { label: 'En preparación', variant: 'info' },
    [DeliveryStatus.ReadyForPickup]: { label: 'Listo para entregar', variant: 'warning' },
    [DeliveryStatus.ReadyForDispatch]: { label: 'Listo para despacho', variant: 'warning' },
    [DeliveryStatus.InTransit]: { label: 'En tránsito', variant: 'info' },
    [DeliveryStatus.Delivered]: { label: 'Entregado', variant: 'success' },
  }
  return map[s as DeliveryStatus] ?? { label: String(s), variant: 'default' }
}

export function paymentConceptLabel(c: PaymentConcept): string {
  const map: Record<PaymentConcept, string> = {
    [PaymentConcept.Deposit]: 'Pago inicial',
    [PaymentConcept.Balance]: 'Saldo',
    [PaymentConcept.Full]: 'Pago total',
  }
  return map[c] ?? String(c)
}

export function paymentStateLabel(s: PaymentState): BadgeResult {
  const map: Record<PaymentState, BadgeResult> = {
    [PaymentState.Pending]: { label: 'Pendiente', variant: 'warning' },
    [PaymentState.InReview]: { label: 'En revisión', variant: 'warning' },
    [PaymentState.Approved]: { label: 'Aprobado', variant: 'success' },
    [PaymentState.Rejected]: { label: 'Rechazado', variant: 'danger' },
    [PaymentState.Cancelled]: { label: 'Cancelado', variant: 'danger' },
    [PaymentState.Refunded]: { label: 'Reembolsado', variant: 'info' },
  }
  return map[s] ?? { label: String(s), variant: 'default' }
}

export function paymentMethodTypeLabel(m: PaymentMethodType): string {
  const map: Record<PaymentMethodType, string> = {
    [PaymentMethodType.Transfer]: 'Transferencia',
    [PaymentMethodType.MercadoPago]: 'Mercado Pago',
    [PaymentMethodType.Cash]: 'Efectivo',
  }
  return map[m] ?? String(m)
}

/** Etiqueta comercial de estado de pago del pedido (no técnico). */
export function commercialPaymentLabel(
  order: Pick<Order, 'status' | 'paymentStatus' | 'paid' | 'balance' | 'hasPendingPaymentProof'> & { payments?: Payment[] }
): BadgeResult {
  // Un comprobante pendiente es la señal real de "Pago en revisión", tanto para el
  // modelo nuevo (ClothingPayment InReview) como para pedidos legacy sin ClothingPayment.
  if (order.hasPendingPaymentProof) {
    return { label: 'Pago en revisión', variant: 'warning' }
  }
  if (order.payments?.some((p) => p.status === PaymentState.InReview)) {
    return { label: 'Pago en revisión', variant: 'warning' }
  }
  // Estados terminales del pedido tienen prioridad sobre el estado de un pago puntual.
  if (order.status === OrderStatus.Expired) return { label: 'Vencido', variant: 'warning' }
  if (order.status === OrderStatus.Cancelled) return { label: 'Cancelado', variant: 'danger' }
  if (order.status === OrderStatus.Rejected) return { label: 'Rechazado', variant: 'danger' }
  if (order.payments?.some((p) => p.requiresResolution)) {
    return { label: 'Requiere resolución', variant: 'danger' }
  }
  const balance = order.balance ?? 0
  if (balance === 0 && (order.paid ?? 0) > 0) return { label: 'Pagado', variant: 'success' }
  if (order.payments?.some((p) => p.concept === PaymentConcept.Deposit && p.status === PaymentState.Approved)) {
    return { label: 'Adelanto pagado', variant: 'info' }
  }
  if (order.payments?.some((p) => p.status === PaymentState.Rejected || p.status === PaymentState.Cancelled)) {
    return { label: 'Pago rechazado', variant: 'danger' }
  }
  return { label: 'Pendiente de pago', variant: 'warning' }
}

/* ─── Helpers ─── */

export function canDeliverOrder(order: Order): boolean {
  return order.status === OrderStatus.Approved && order.paymentStatus === PaymentStatus.FullPaid
}

export function orderSortPriority(order: Order): number {
  if (order.hasPendingPaymentProof) return 0
  if (order.status === OrderStatus.Pending) return 1
  if (order.status === OrderStatus.Cancelled) return 2
  if (order.status === OrderStatus.Rejected) return 3
  if (order.status === OrderStatus.Approved) return 4
  if (order.status === OrderStatus.Delivered) return 5
  return 99
}

export function generateMonthsBack(count: number): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    months.push({ value, label })
  }
  return months
}

export { unwrapList }
