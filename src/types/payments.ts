export type PaymentStatus = 'pending' | 'inreview' | 'approved' | 'rejected'
export type ChargeStatus = 'pending' | 'paid' | 'overdue' | 'inreview'

export interface Payment {
  id: string
  studentFullName: string
  studentDni: string
  courseId: string
  courseName: string
  month: number
  year: number
  amount: number
  finalAmount: number
  finalAmountPaid: number
  basePrice: number
  paymentMethod: string | number
  paymentMethodNameSnapshot: string
  paymentMethodSurchargeAmount: number
  paymentStatus: PaymentStatus
  paidAtUtc: string | null
  reviewedAtUtc: string | null
  reviewNote: string
  hasScholarship: boolean
  scholarshipDiscountAmount: number
  scholarshipDiscountValue: number
  scholarshipName: string
  hasSiblingDiscount: boolean
  siblingDiscountAmount: number
  siblingDiscountPercent: number
  hasPromotion: boolean
  promotionAmount: number
  promotionDiscountAmount: number
  lateChargeAmount: number
  manualDiscountAmount: number
  manualIncreaseAmount: number
}

export interface Charge {
  id: string
  studentFullName: string
  studentDni: string
  courseId: string
  courseName: string
  month: number
  year: number
  status: ChargeStatus
  basePrice: number
  finalAmount: number
  finalAmountPaid: number
  siblingDiscountAmount: number
  siblingDiscountPercent: number
  scholarshipDiscountAmount: number
  scholarshipDiscountValue: number
  scholarshipDiscountType: string
  scholarshipName: string
  lateChargeAmount: number
  hasScholarship: boolean
  hasPromotion: boolean
  isManual: boolean
  paymentMethod: string | number
  paymentMethodNameSnapshot: string
  paymentMethodSurchargeAmount: number
  baseAmountBeforePaymentMethod: number
  classesPerWeek: number
  dueDateUtc: string
  generatedAtUtc: string
  paymentId: string
  paymentReference: string
  notes: string
  chargeTypeId?: string
  chargeTypeName?: string
  detailItems?: { id: string; description: string; amount: number; sortOrder: number }[]
}

export interface ProofSubmission {
  id: string
  paymentId: string
  attemptNumber: number
  fileName: string
  uploadedAtUtc: string
  status: string | number
  isDeletedFromStorage: boolean
}

export interface PaymentMethod {
  paymentMethod: string | number
  paymentMethodName: string
  name: string
  displayName: string
  surchargeType: string
  surchargeValue: number
  enabledBySuperAdmin: boolean
}

export interface CourseOption {
  id: string
  name: string
}

export interface ProofView {
  url: string
  fileName: string
  isImage: boolean
  isPdf: boolean
}
