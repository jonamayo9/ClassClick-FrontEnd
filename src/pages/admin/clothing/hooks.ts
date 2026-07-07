import { useAuth } from '@/stores/auth'

export function slug(): string {
  return useAuth.getState().activeCompanySlug ?? ''
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

export enum OrderStatus {
  Pending = 1,
  Approved = 2,
  Rejected = 3,
  Delivered = 4,
  Cancelled = 5,
}

export enum PaymentStatus {
  None = 0,
  DepositPending = 1,
  DepositPaid = 2,
  FullPending = 3,
  FullPaid = 4,
  Rejected = 5,
}

export enum PaymentMethod {
  None = 0,
  ManualProof = 1,
  MercadoPago = 2,
  Cash = 3,
}

export enum ProofType {
  Deposit = 1,
  Full = 2,
}

export enum ProofStatus {
  Pending = 1,
  Approved = 2,
  Rejected = 3,
}

export enum CancellationStatus {
  Pending = 1,
  Approved = 2,
  Rejected = 3,
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

export interface OrderItem {
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
}

export interface Order {
  id: string
  studentName: string
  studentDni?: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  paymentOption?: 1 | 2
  totalAmount: number
  depositAmount?: number
  pendingAmount?: number
  hasPendingPaymentProof?: boolean
  createdAtUtc: string
  approvedAtUtc?: string | null
  rejectedAtUtc?: string | null
  deliveredAtUtc?: string | null
  items?: OrderItem[]
}

export interface CancellationRequest {
  id: string
  studentName: string
  orderId: string
  reason: string
  status: CancellationStatus
  createdAtUtc?: string
}

export interface ClothingSettings {
  paymentAlias?: string
  paymentAliasHolder?: string
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
    [OrderStatus.Delivered]: { label: 'Entregado', variant: 'info' },
    [OrderStatus.Cancelled]: { label: 'Cancelado', variant: 'default' },
  }
  return map[s] ?? { label: String(s), variant: 'default' }
}

export function paymentStatusLabel(s: PaymentStatus): BadgeResult {
  const map: Record<PaymentStatus, BadgeResult> = {
    [PaymentStatus.None]: { label: 'Sin pago', variant: 'default' },
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
