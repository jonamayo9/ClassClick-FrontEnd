export type EstudianteEnrollmentStatus = 'Active' | 'Cancelled' | 'Completed'
export type EstudianteObligationKind = 'Matricula' | 'Cuota' | 'Custom'
export type EstudianteObligationStatus = 'Pending' | 'Overdue' | 'Paid' | 'Cancelled'
export type EstudiantePaymentStatus = 'Pending' | 'InReview' | 'Approved' | 'Rejected'
export type EstudianteCertStatus = 'Solicitado' | 'PendientePago' | 'Pagado' | 'EnGestion' | 'Emitido' | 'Rechazado' | 'Cancelado' | 'EnRevision'
export type EstudianteCertObligationStatus = 'Pending' | 'Paid' | 'Cancelled'

export interface EstudianteCertAvailable {
  enrollmentId: string
  trainingName: string
  commissionName: string
  certificateTypeId: string
  certificateTypeName: string
  price: number
  currency: string
  isRequired: boolean
  priceToDefine: boolean
  isFree: boolean
  completedAtUtc: string | null
  hasDebt: boolean
  debtMessage: string | null
}

export interface EstudianteCertRequest {
  id: string
  commissionEnrollmentId: string
  certificateTypeId: string
  trainingName: string
  certificateTypeName: string
  isRequired: boolean
  priceFrozen: number
  currency: string
  status: EstudianteCertStatus
  createdAtUtc: string
  emittedAtUtc: string | null
  obligationStatus: EstudianteCertObligationStatus | null
  paymentStatus: EstudiantePaymentStatus | null
  hasApprovedPayment: boolean
  canPay: boolean
  payBlockReason: string | null
  finalDocumentUrl?: string | null
}

export interface EstudianteCertPayment {
  id: string
  certificateRequestId: string
  commissionEnrollmentId: string
  certificateName?: string | null
  paymentMethod: string
  status: EstudiantePaymentStatus
  capitalAmount: number
  totalAmount: number
  currency: string
  createdAtUtc: string
  approvedAtUtc: string | null
  rejectedAtUtc: string | null
  reviewNote: string | null
  transferInstructions: string | null
  transferAlias: string | null
  transferCbu: string | null
  transferHolder: string | null
  transferBank: string | null
  latestProofUrl?: string | null
}

export interface EstudianteEnrollment {
  id: string
  commissionId: string
  trainingName: string
  commissionName: string
  startDate: string
  endDate: string
  status: EstudianteEnrollmentStatus
  enrolledAtUtc: string
  cancelledAtUtc: string | null
  snapshotCountryCode: string
  snapshotCurrency: string
  snapshotTotalContractual: number
  matriculaAmount: number
  installmentCount: number
  totalPaid: number
  balanceDue: number
  paidInstallments: number
  nextDueDateUtc: string | null
  overdueCount: number
  hasAccess: boolean
  blockReason: string | null
  blockMessage: string | null
  nextAction: string | null
}

export interface EstudianteObligation {
  id: string
  commissionEnrollmentId: string
  kind: EstudianteObligationKind
  installmentNumber: number | null
  description: string
  amount: number
  currency: string
  dueDateUtc: string
  status: EstudianteObligationStatus
  paidAtUtc: string | null
  cancelledAtUtc: string | null
  createdAtUtc: string
  moraAmount: number
  totalToPay: number
}

export interface EstudiantePayment {
  id: string
  commissionEnrollmentId: string
  enrollmentObligationId: string
  obligationDescription: string
  paymentMethod: string
  status: EstudiantePaymentStatus
  capitalAmount: number
  moraAmount: number
  totalAmount: number
  currency: string
  createdAtUtc: string
  approvedAtUtc: string | null
  rejectedAtUtc: string | null
  reviewNote: string | null
  transferInstructions: string | null
  transferAlias: string | null
  transferCbu: string | null
  transferHolder: string | null
  transferBank: string | null
  receiptUrl: string | null
  latestProofUrl: string | null
}

export interface EstudiantePaymentMethod {
  paymentMethod: string
  paymentMethodName: string
  instructions: string | null
  alias: string | null
  cbu: string | null
  holderName: string | null
  bankName: string | null
}

export function fmtMoney(value: number, currency: string): string {
  const formatted = (value ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${formatted} ${currency ?? ''}`.trim()
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function fmtDateOnly(value: string | null | undefined): string {
  if (!value) return '—'
  return value.slice(0, 10)
}