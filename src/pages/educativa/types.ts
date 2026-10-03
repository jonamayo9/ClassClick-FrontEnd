export type EnrollmentStatus = 'Active' | 'Cancelled' | 'Completed'
export type ObligationKind = 'Matricula' | 'Cuota' | 'Custom'
export type ObligationStatus = 'Pending' | 'Overdue' | 'Paid' | 'Cancelled'
export type EnrollmentPaymentStatus = 'Pending' | 'InReview' | 'Approved' | 'Rejected'

export interface EducativaCommission {
  id: string
  trainingId: string
  trainingName: string
  trainingCountryConfigId: string
  countryCode: string
  currency: string
  name: string
  startDate: string
  endDate: string
  capacity: number | null
  activeEnrollments: number
  remainingCapacity?: number | null
  isActive: boolean
  docenteUserId?: string | null
  docenteName?: string | null
  createdAtUtc: string
  updatedAtUtc: string
  temporalStatus: string
  availability: string
  isAcceptingEnrollments: boolean
  compensation?: {
    ruleId: string | null
    compensationType: string | null
    value: number | null
    currency: string | null
    label: string | null
  } | null
  schedules?: EducativaCommissionClass[]
  scheduleSummary?: string
}

export interface PagedResult<T> {
  total: number
  page: number
  pageSize: number
  items: T[]
}

export interface EducativaTrainingType {
  id: string
  name: string
  code?: string | null
  description?: string | null
  isActive: boolean
  sortOrder: number
  createdAtUtc: string
}

export interface EducativaTrainingCategory {
  id: string
  name: string
  isActive: boolean
  trainingCount: number
  createdAtUtc: string
  updatedAtUtc: string
}

export interface EducativaTrainingCountryConfig {
  id: string
  trainingId: string
  countryCode: string
  currency: string
  requiresEnrollmentFee: boolean
  enrollmentFee: number
  installmentCount: number | null
  installmentAmount: number
  installmentDueDayOfMonth: number | null
  installmentFrequencyMonths: number | null
  paymentMode: string
  allowsFinancing: boolean
  financingMaxInstallments: number | null
  allowsDiscountedEnrollment: boolean
  allowedEnrollmentDiscounts: number[]
  notes?: string | null
  createdAtUtc: string
  updatedAtUtc: string
}

export interface EducativaTraining {
  id: string
  trainingTypeId: string
  trainingTypeName: string
  categoryId?: string | null
  categoryName?: string | null
  name: string
  description: string
  isActive: boolean
  coverImagePath?: string | null
  durationValue?: number | null
  durationUnit?: string | null
  durationLabel?: string | null
  countries: EducativaTrainingCountryConfig[]
  createdAtUtc: string
  updatedAtUtc: string
}

export interface EducativaCommissionClass {
  id: string
  commissionId: string
  commissionName: string
  dayOfWeek: number | string
  dayLabel: string
  startTime: string
  endTime: string
  timeLabel: string
  isActive: boolean
  createdAtUtc: string
  updatedAtUtc: string
}

export type AttendanceStatus = 'Presente' | 'Ausente' | 'Tarde' | 'Justificado'
export const attendanceStatusLabel: Record<string, string> = {
  Presente: 'Presente',
  Ausente: 'Ausente',
  Tarde: 'Tarde',
  Justificado: 'Justificado',
}

const DAY_SHORT: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 0: 'Dom' }
const DAY_FULL: Record<number, string> = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 0: 'Domingo' }

const DAY_NAME_TO_NUM: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
  Domingo: 0, Lunes: 1, Martes: 2, Miércoles: 3, Jueves: 4, Viernes: 5, Sábado: 6,
}

/**
 * Normaliza el dayOfWeek que envía el backend (enum DayOfWeek serializado como string
 * "Monday", número 0-6, o nombre en español) al número 0-6 usado por los selects (0=Domingo).
 */
export function normalizeDayOfWeek(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isNaN(n)) return n
  return DAY_NAME_TO_NUM[String(value)] ?? 0
}

function joinDays(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} y ${names[1]}`
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}

/** Resume la cursada: "Lun y Mié · 18:00-20:00" o "Lun y Mié 18:00-20:00 · Sáb 09:00-13:00". */
export function scheduleSummary(schedules?: EducativaCommissionClass[] | null, fullDays = false): string {
  const list = (schedules ?? []).filter((s) => s.isActive)
  if (list.length === 0) return ''
  const day = (d: number) => (fullDays ? DAY_FULL[d] ?? '' : DAY_SHORT[d] ?? '')
  const time = (s: EducativaCommissionClass) => `${s.startTime.slice(0, 5)}–${s.endTime.slice(0, 5)}`

  const byTime = new Map<string, EducativaCommissionClass[]>()
  for (const s of list) {
    const k = time(s)
    byTime.set(k, [...(byTime.get(k) ?? []), s])
  }

  if (byTime.size === 1) {
    const [[t, items]] = [...byTime.entries()]
    const sorted = [...items].sort((a, b) => normalizeDayOfWeek(a.dayOfWeek) - normalizeDayOfWeek(b.dayOfWeek))
    return `${joinDays(sorted.map((i) => day(normalizeDayOfWeek(i.dayOfWeek))))} · ${t}`
  }

  return [...byTime.entries()]
    .map(([t, items]) => `${joinDays(items.map((i) => day(normalizeDayOfWeek(i.dayOfWeek))))} ${t}`)
    .join(' · ')
}

export interface EducativaAttendanceRosterItem {
  commissionEnrollmentId: string
  userId: string
  studentName: string
  commissionClassId?: string | null
  commissionName?: string | null
  trainingName?: string | null
  status?: AttendanceStatus | null
  observation?: string | null
  registeredByName?: string | null
  registeredAtUtc?: string | null
  lastModifiedByName?: string | null
  lastModifiedAtUtc?: string | null
}

export interface EducativaDocenteClass {
  commissionId: string
  commissionName: string
  trainingName: string
  commissionClassId: string
  classLabel: string
  students: EducativaAttendanceRosterItem[]
}

export interface EducativaDocenteDayGroup {
  dayOfWeek: number
  dayLabel: string
  startTime: string
  endTime: string
  timeSlotLabel: string
  items: EducativaDocenteClass[]
}

export interface EducativaAttendanceReportRow {
  commissionId: string
  commissionName: string
  trainingName: string
  docenteName?: string | null
  commissionClassId: string
  dayOfWeek: number
  dayLabel: string
  startTime: string
  endTime: string
  timeLabel: string
  date: string
  totalAlumnos: number
  presentes: number
  ausentes: number
  tardes: number
  justificados: number
  sinRegistrar: number
  registrados: number
}

export interface EducativaAttendanceReportSummary {
  totalAlumnos: number
  presentes: number
  ausentes: number
  tardes: number
  justificados: number
  sinRegistrar: number
}

export interface EducativaAttendanceReportPage {
  total: number
  page: number
  pageSize: number
  items: EducativaAttendanceReportRow[]
  summary: EducativaAttendanceReportSummary
}

export interface EducativaAttendanceDetailRow {
  commissionEnrollmentId: string
  commissionId: string
  commissionName: string
  userId: string
  studentName: string
  commissionClassId: string
  date: string
  status?: AttendanceStatus | null
  observation?: string | null
  registeredByName?: string | null
  registeredAtUtc?: string | null
  lastModifiedByName?: string | null
  lastModifiedAtUtc?: string | null
}

export interface EducativaDocente {
  userId: string
  firstName: string
  lastName: string
  email: string
  fullName: string
}

export type ObligationKindEdu = 'Matricula' | 'Cuota' | 'Custom'
export type ObligationStatusEdu = 'Pending' | 'Overdue' | 'Paid' | 'Cancelled'

export interface EducativaFinancialSummary {
  totalObligations: number
  pending: number
  overdue: number
  paid: number
  cancelled: number
  pendingAmount: number
  overdueAmount: number
  paidAmount: number
  pendingReviewPayments: number
}

export interface EducativaObligationRow {
  id: string
  commissionEnrollmentId: string
  userId: string
  studentName: string
  commissionName: string
  trainingName: string
  kind: ObligationKindEdu
  installmentNumber: number | null
  installmentCount: number | null
  description: string
  amount: number
  currency: string
  dueDateUtc: string
  status: ObligationStatusEdu
  moraAmount: number
  totalToPay: number
  paidAtUtc: string | null
  snapshotPaymentMode?: string | null
  periodLabel?: string | null
  /** Pago aprobado que saldó la obligación (para acceder al recibo real). */
  paymentId?: string | null
  hasReceipt?: boolean
}

export interface EducativaPaymentRow {
  id: string
  commissionEnrollmentId: string
  enrollmentObligationId: string
  obligationDescription: string
  userId: string
  studentName: string
  commissionName: string
  trainingName: string
  paymentMethod: string
  status: EnrollmentPaymentStatus
  capitalAmount: number
  moraAmount: number
  totalAmount: number
  currency: string
  createdAtUtc: string
  approvedAtUtc: string | null
  rejectedAtUtc: string | null
  reviewNote: string | null
  hasReceipt: boolean
  latestProofUrl?: string | null
  periodLabel?: string | null
}

export interface EducativaFinancialPage<T> {
  total: number
  page: number
  pageSize: number
  items: T[]
}

export interface EducativaPaymentProof {
  id: string
  paymentId: string
  fileName: string
  contentType: string
  fileSizeBytes: number
  attemptNumber: number
  status: EnrollmentPaymentStatus
  uploadedAtUtc: string
  uploadedByUserRole: string | null
}

export interface EducativaPaymentProofView {
  url: string
  fileName: string
  contentType: string
  isImage: boolean
  isPdf: boolean
}

export const obligationKindLabel: Record<string, string> = {
  Matricula: 'Inscripción',
  Cuota: 'Cuota',
  Single: 'Pago único',
  Custom: 'Cuota custom',
}

export type ObligationTypeLabel = 'Inscripción' | 'Cuota' | 'Pago único' | 'Cuota custom'

export function obligationTypeOf(o: { kind: string; snapshotPaymentMode?: string | null }): ObligationTypeLabel {
  if (o.kind === 'Matricula') return 'Inscripción'
  if (o.kind === 'Custom') return 'Cuota custom'
  if (o.snapshotPaymentMode === 'single') return 'Pago único'
  return 'Cuota'
}

/**
 * Concepto visible de una obligación (formatter centralizado).
 * - Matrícula      → "Inscripción"
 * - Cuota (single) → "Pago único"
 * - Cuota          → "Cuota {InstallmentNumber}/{InstallmentCount}"
 * - Custom         → su descripción (concepto real), fallback "Cuota custom"
 * El denominador SIEMPRE sale del snapshot congelado de la inscripción.
 */
export function obligationConceptOf(o: {
  kind: string
  installmentNumber?: number | null
  installmentCount?: number | null
  snapshotPaymentMode?: string | null
  description?: string
}): string {
  if (o.kind === 'Matricula') return 'Inscripción'
  if (o.kind === 'Custom') return o.description?.trim() ? o.description : 'Cuota custom'
  if (o.snapshotPaymentMode === 'single') return 'Pago único'
  if (o.installmentNumber != null && o.installmentCount != null && o.installmentCount > 0) {
    return `Cuota ${o.installmentNumber}/${o.installmentCount}`
  }
  if (o.installmentNumber != null) return `Cuota ${o.installmentNumber}`
  return 'Cuota'
}

export const obligationTypeBadge: Record<string, string> = {
  Inscripción: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  Cuota: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  'Pago único': 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  'Cuota custom': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
}

// Vencimiento en hora Argentina (UTC-3): una cuota vence el día X y es válida durante TODO
// el día X en Argentina; queda vencida recién al comenzar el día X+1 en Argentina.
const AR_OFFSET_MS = 3 * 60 * 60 * 1000

export function isObligationOverdue(dueDateUtc: string | null | undefined, now = Date.now()): boolean {
  if (!dueDateUtc) return false
  const due = new Date(new Date(dueDateUtc).getTime() - AR_OFFSET_MS)
  const today = new Date(now - AR_OFFSET_MS)
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return today.getTime() > due.getTime()
}

export const obligationStatusLabel: Record<string, string> = {
  Pending: 'Pendiente',
  Overdue: 'Vencida',
  Paid: 'Pagada',
  Cancelled: 'Cancelada',
}

export const obligationStatusBadge: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  Overdue: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  Paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  Cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}

export const enrollmentPaymentStatusLabel: Record<string, string> = {
  Pending: 'Pendiente',
  InReview: 'En revisión',
  Approved: 'Aprobado',
  Rejected: 'Rechazado',
}

export const enrollmentPaymentStatusBadge: Record<string, string> = {
  Pending: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  InReview: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

// Valores numéricos del enum backend PaymentMethod (None=0, Transfer=1, DebitCard=2, CreditCard=3, MercadoPago=4, Cash=5).
export const paymentMethodEnum: Record<string, number> = {
  None: 0,
  Transfer: 1,
  DebitCard: 2,
  CreditCard: 3,
  MercadoPago: 4,
  Cash: 5,
}

export const paymentMethodLabel: Record<string, string> = {
  Transfer: 'Transferencia',
  DebitCard: 'Tarjeta de débito',
  CreditCard: 'Tarjeta de crédito',
  MercadoPago: 'Mercado Pago',
  Cash: 'Efectivo',
}

export interface EducativaGraduate {
  commissionEnrollmentId: string
  userId: string
  fullName: string
  dni?: string | null
  age?: number | null
  trainingId: string
  trainingName: string
  trainingTypeId?: string | null
  trainingTypeName?: string | null
  commissionId: string
  commissionName: string
  country?: string | null
  province?: string | null
  graduationDate: string
  email: string
  phone?: string | null
  whatsAppNumber?: string | null
  certificateRequestId: string
  certificateName: string
  certificateDownloadUrl?: string | null
}

export interface EducativaGraduatePage {
  total: number
  page: number
  pageSize: number
  items: EducativaGraduate[]
}

export type PromotionType = 'TwoForOne' | 'Percentage' | 'FixedAmount' | 'FreeEnrollment'
export type PromotionDistribution = 'Each' | 'FirstOnly' | 'LastOnly'
export type PromotionGroupStatus = 'PendingParticipants' | 'Completed' | 'Applied'

export interface EducativaPromotion {
  id: string
  name: string
  description?: string | null
  type: PromotionType
  typeLabel: string
  discountPercent?: number | null
  discountAmount?: number | null
  startDate: string
  endDate?: string | null
  isActive: boolean
  participantCount: number
  distribution: PromotionDistribution
  distributionLabel: string
  trainingId?: string | null
  trainingName?: string | null
  createdAtUtc: string
  updatedAtUtc: string
}

export interface EducativaPromotionGroupParticipant {
  id: string
  userId?: string | null
  studentName?: string | null
  pendingReference?: string | null
  isPending: boolean
  commissionEnrollmentId?: string | null
  commissionName?: string | null
  trainingName?: string | null
  joinedAtUtc: string
}

export interface EducativaPromotionGroup {
  id: string
  promotionId: string
  promotionName: string
  promotionTypeLabel: string
  status: PromotionGroupStatus
  statusLabel: string
  linkCode: string
  startedByUserId: string
  startedByName: string
  startedAtUtc: string
  completedAtUtc?: string | null
  appliedAtUtc?: string | null
  participantCount: number
  participantsJoined: number
  participants: EducativaPromotionGroupParticipant[]
  snapshots: { commissionEnrollmentId: string; originalEnrollmentFee: number; discountAmount: number; finalEnrollmentFee: number; currency: string; appliedAtUtc: string }[]
}

export type CertificateRequestStatus = 'Solicitado' | 'PendientePago' | 'Pagado' | 'EnGestion' | 'Emitido' | 'Rechazado' | 'Cancelado' | 'EnRevision'
export type CertificateObligationStatus = 'Pending' | 'Paid' | 'Cancelled'
export type CertificatePaymentStatus = 'Pending' | 'InReview' | 'Approved' | 'Rejected'

export interface EducativaCertificateType {
  id: string
  trainingId: string
  trainingName: string
  name: string
  price: number
  currency: string
  isRequired: boolean
  isActive: boolean
  hasTemplate: boolean
  templateUrl?: string | null
}

export interface EducativaCertificateRequest {
  id: string
  commissionEnrollmentId: string
  studentName: string
  studentEmail: string
  trainingName: string
  commissionName: string
  certificateTypeName: string
  isRequired: boolean
  priceFrozen: number
  currency: string
  status: CertificateRequestStatus
  createdAtUtc: string
  updatedAtUtc: string
  emittedAtUtc: string | null
  obligationStatus: CertificateObligationStatus | null
  paymentStatus: CertificatePaymentStatus | null
  hasApprovedPayment: boolean
  latestPaymentId: string | null
  hasFinalDocument: boolean
  finalDocumentUrl?: string | null
  templateUrl?: string | null
}

export interface EducativaCertificatePayment {
  id: string
  certificateRequestId: string
  commissionEnrollmentId: string
  certificateName?: string | null
  studentName?: string | null
  paymentMethod: string
  status: CertificatePaymentStatus
  externalRequestId: string
  providerReference?: string | null
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

export interface EducativaLegajoCertificate {
  certificateRequestId: string
  trainingName: string
  commissionName: string
  certificateTypeName: string
  emittedAtUtc: string | null
  finalDocumentUrl?: string | null
}

export interface EducativaCertificateHistoryStep {
  fromStatus: string | null
  toStatus: string
  note: string | null
  changedByUserId: string | null
  changedAtUtc: string
}

export interface EducativaDashboard {
  activeStudents: number
  newEnrollments: number
  revenue: number
  debt: number
  overdueInstallments: number
  pendingReviewPayments: number
  pendingCertificates: number
  totalCommissions: number
  activeCommissions: number
  activeTrainings: number
  activeDocentes: number
  graduates: number
  classesInPeriod: number
  occupiedSlots: number
  capacitySlots: number
  occupancyPercent: number
}

export interface EducativaDashboardTrainingRow {
  trainingId: string
  trainingName: string
  trainingTypeName: string
  categoryName?: string | null
  isActive: boolean
  activeCommissions: number
  activeStudents: number
  createdAtUtc: string
}

export interface EducativaDashboardDocenteRow {
  userId: string
  fullName: string
  email: string
  commissionCount: number
  studentCount: number
}

export const certStatusLabel: Record<CertificateRequestStatus, string> = {
  Solicitado: 'Solicitado',
  PendientePago: 'Pendiente de pago',
  Pagado: 'Pagado',
  EnGestion: 'En gestión',
  Emitido: 'Emitido',
  Rechazado: 'Rechazado',
  Cancelado: 'Cancelado',
  EnRevision: 'En revisión',
}

export interface EducativaEnrollment {
  id: string
  commissionId: string
  userId: string
  studentName: string
  studentEmail: string
  status: EnrollmentStatus
  enrolledAtUtc: string
  completedAtUtc: string | null
  cancelledAtUtc: string | null
  snapshotCountryCode: string
  snapshotCurrency: string
  snapshotRequiresEnrollmentFee: boolean
  snapshotEnrollmentFeeOriginalAmount: number
  snapshotEnrollmentFee: number
  snapshotInstallmentCount: number
  snapshotInstallmentAmount: number
  snapshotTotalContractual: number
  snapshotSourceCountryConfigId: string
  totalPaid: number
  balanceDue: number
  matriculaAmount: number
  paidInstallments: number
  installmentCount: number
  nextDueDateUtc: string | null
  overdueCount: number
  createdAtUtc: string
  updatedAtUtc: string
}

export interface EducativaStudent {
  userId: string
  firstName: string
  lastName: string
  email: string
  fullName: string
}

export interface EducativaStudentListItem {
  userId: string
  firstName: string
  lastName: string
  email: string
  fullName: string
  dni?: string | null
  phone?: string | null
  whatsAppNumber?: string | null
  dateOfBirth?: string | null
  age?: number | null
  country?: string | null
  province?: string | null
  registrationCompleted: boolean
  isActive: boolean
}

export interface EducativaStudentDetailEnrollment {
  id: string
  commissionId: string
  trainingId: string
  trainingName: string
  categoryId?: string | null
  categoryName?: string | null
  commissionName: string
  commissionStartDate: string
  commissionEndDate: string
  status: EnrollmentStatus
  academicSituation: string
  enrolledAtUtc: string
  completedAtUtc?: string | null
  cancelledAtUtc?: string | null
  snapshotCountryCode: string
  snapshotCurrency: string
  snapshotTotalContractual: number
  matriculaAmount: number
  installmentCount: number
  snapshotInstallmentAmount: number
  paidInstallments: number
  totalPaid: number
  balanceDue: number
  overdueCount: number
  nextDueDateUtc?: string | null
  economicStatus: string
}

export interface EducativaStudentDetail {
  student: EducativaStudentListItem
  enrollments: EducativaStudentDetailEnrollment[]
}

export interface EducativaObligation {
  id: string
  commissionEnrollmentId: string
  kind: ObligationKind
  installmentNumber: number | null
  description: string
  amount: number
  currency: string
  dueDateUtc: string
  status: ObligationStatus
  paidAtUtc: string | null
  cancelledAtUtc: string | null
  createdAtUtc: string
  moraAmount: number
  totalToPay: number
  periodLabel?: string | null
  studentName?: string | null
}

export interface EducativaEnrollmentPayment {
  id: string
  commissionEnrollmentId: string
  enrollmentObligationId: string
  obligationDescription: string
  payerUserId: string
  studentName: string
  paymentMethod: string
  companyPaymentMethodId: string | null
  status: EnrollmentPaymentStatus
  externalRequestId: string
  providerReference: string | null
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
  receiptId: string | null
  receiptUrl: string | null
  latestProofUrl: string | null
}

export function fmtMoney(value: number, currency: string): string {
  const formatted = (value ?? 0).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${formatted} ${currency ?? ''}`.trim()
}

export function fmtPrice(value: number): string {
  if (!value || value <= 0) return 'Gratis'
  const formatted = (value ?? 0).toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return `$${formatted}`
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function fmtDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}