export const BillingMode = { FixedPlan: 1, UsageBased: 2, Hybrid: 3 } as const
export type BillingModeValue = (typeof BillingMode)[keyof typeof BillingMode]

// ExtraChargeMode: el backend serializa los enums como STRING ("PerUser"/"Fixed")
// por JsonStringEnumConverter. Internamente usamos siempre "PerUser"/"Fixed".
export type ExtraChargeModeKey = 'PerUser' | 'Fixed'

export function normalizeExtraChargeMode(value: unknown): ExtraChargeModeKey {
  const v = String(value ?? '').trim().toLowerCase()
  if (v === '1' || v === 'peruser') return 'PerUser'
  if (v === '2' || v === 'fixed') return 'Fixed'
  return 'PerUser'
}

export function isFixedExtraChargeMode(value: unknown): boolean {
  return normalizeExtraChargeMode(value) === 'Fixed'
}

export const InvoiceStatus = { Draft: 1, Issued: 2, Pending: 3, UnderReview: 4, Paid: 5, Overdue: 6, Cancelled: 7 } as const
export type InvoiceStatusValue = (typeof InvoiceStatus)[keyof typeof InvoiceStatus]

// Traducción centralizada de estado. El backend serializa los enums como STRING
// (JsonStringEnumConverter), por eso se aceptan número y string.
const STATUS_LABELS: Record<string, string> = {
  '1': 'Borrador',
  Draft: 'Borrador',
  '2': 'Emitida',
  Issued: 'Emitida',
  '3': 'Pendiente',
  Pending: 'Pendiente',
  '4': 'En revisión',
  UnderReview: 'En revisión',
  '5': 'Pagada',
  Paid: 'Pagada',
  '6': 'Vencida',
  Overdue: 'Vencida',
  '7': 'Cancelada',
  Cancelled: 'Cancelada',
}

const PM_LABELS: Record<string, string> = {
  '1': 'Transferencia',
  Transfer: 'Transferencia',
  '2': 'Mercado Pago',
  MercadoPago: 'Mercado Pago',
  '3': 'Efectivo',
  Cash: 'Efectivo',
  '4': 'Otro',
  Other: 'Otro',
}

export function statusLabel(status: string | number | undefined | null): string {
  if (status === undefined || status === null || status === '') return 'Estado no disponible'
  const label = STATUS_LABELS[String(status)]
  if (label) return label
  if (import.meta.env.DEV) console.warn(`[billing] Estado de cargo no reconocido: ${String(status)}`)
  return 'Estado no disponible'
}

export function paymentMethodLabel(method: string | number | undefined | null): string | null {
  if (method === undefined || method === null || method === '') return null
  const label = PM_LABELS[String(method)]
  if (label) return label
  if (import.meta.env.DEV) console.warn(`[billing] Medio de pago no reconocido: ${String(method)}`)
  return null
}

export interface CompanyInvoiceSettings {
  companyId: string
  isEnabled: boolean
  autoGenerate: boolean
  generationDay: number
  monthlyAmount: number
  currency: string
  planName: string | null
  graceDays: number
  allowsTransfer: boolean
  classClickAlias: string | null
  classClickCbu: string | null
  classClickHolder: string | null
  billingMode: number
  createdAtUtc: string
  updatedAtUtc: string | null
}

export interface SuperAdminBillingInvoice {
  id: string
  companyId: string
  companyName: string | null
  periodYear: number
  periodMonth: number
  period: string
  invoiceNumber: string
  planName: string | null
  description: string | null
  amount: number
  totalAmount: number
  basePrice: number
  includedUsers: number
  billableUsers: number
  extraUsers: number
  extraChargeMode: string | number
  extraUserPrice: number
  extraFixedAmount: number
  baseAmount: number
  extraAmount: number
  lateFeePercentage: number
  lateFeeAmount: number
  amountWithLateFee: number
  currency: string
  billingMode: number
  status: string | number
  issuedAtUtc: string
  dueDateUtc: string
  paidAtUtc: string | null
  paymentMethod: string | number | null
  paymentReference: string | null
  notes: string | null
  createdBy: string | null
  isAutomatic: boolean
  createdAtUtc: string
  cancelledAtUtc: string | null
  cancelledByUserId: string | null
  hasPaymentProof: boolean
  paymentProofStatus: string | null
  paymentProofSubmittedAtUtc: string | null
  paymentProofReviewedAtUtc: string | null
  paymentProofReviewNote: string | null
  paymentProofTotalExpected: number | null
}
