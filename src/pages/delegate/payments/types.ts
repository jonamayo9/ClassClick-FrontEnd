export interface DelegateCharge {
  monthlyChargeId: string
  studentId: string
  studentFullName: string
  courseId: string
  courseName: string
  year: number
  month: number
  chargeTypeId: string | null
  chargeTypeName: string
  basePrice: number
  paymentMethodSurchargeAmount: number | null
  finalAmount: number
  dueDateUtc: string
  status: string
  paidAtUtc: string | null
  paymentMethod: string | number | null
  paymentMethodNameSnapshot: string | null
  paymentAmount: number | null
  finalAmountPaid: number | null
  paymentStatus: string | null
  hasProof: boolean
  proofStatus: string | null
  canViewProof: boolean
}

export interface DelegateAccountStatus {
  studentId: string
  fullName: string
  summary: {
    totalDebt: number
    pendingCount: number
    overdueCount: number
    paidCount: number
    nextDueDateUtc: string | null
    lastPaymentAtUtc: string | null
  }
  charges: DelegateCharge[]
}

export const PROOF_STATUS: Record<string, { label: string; classes: string }> = {
  InReview: { label: 'En revisión', classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-700' },
  Approved: { label: 'Aprobado', classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-700' },
  Rejected: { label: 'Rechazado', classes: 'bg-red-50 text-red-700 ring-1 ring-red-300 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700' },
}
