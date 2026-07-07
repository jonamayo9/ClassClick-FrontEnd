import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
export function money(value: number) { return ARS.format(value) }

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

export interface Course {
  id: string
  name: string
  isActive: boolean
}

export interface PaymentSettings {
  autoGenerateEnabled: boolean
  generationDayOfMonth: number | null
  generationHourUtc: number | null
  dueDayOfMonth: number | null
  currentMonthChargeWindowStartDay: number | null
  currentMonthChargeWindowEndDay: number | null
  newStudentRespectOriginalDueDateForLateFee: boolean | null
  newStudentLateFeeGraceDays: number | null
  lastAutoGenerationUtc: string | null
}

export interface CoursePricing {
  id: string
  courseId: string
  courseName: string
  classesPerWeek: number
  price: number
}

export interface LatePaymentConfig {
  id: string
  name: string
  courseId: string | null
  courseName: string | null
  dueDayOfMonth: number
  recurrenceType: number | string
  percentIncrease: number
  fixedIncrease: number
  isActive: boolean
}

export interface SiblingDiscount {
  id: string
  siblingCount: number
  discountPercent: number
}

export interface Scholarship {
  id: string
  name: string
  discountType: number | string
  discountValue: number
  isActive: boolean
}

export interface ScholarshipAssignment {
  id: string
  studentId: string
  studentFullName: string
  studentEmail: string
  studentDni: string
  scholarshipId: string
  scholarshipName: string
  discountType: number | string
  discountValue: number
  courseId: string | null
  courseName: string | null
  isGlobal: boolean
  isActive: boolean
  startDateUtc: string | null
  endDateUtc: string | null
  notes: string | null
}

export interface Student {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  dni: string
}

export interface PaymentMethodDetail {
  id: string
  paymentMethod: string | number
  paymentMethodName: string
  name: string
  displayName: string
  surchargeType: string
  surchargeValue: number
  enabledBySuperAdmin: boolean
  isEnabledByAdmin: boolean
  alias: string | null
  cbu: string | null
  holderName: string | null
  instructions: string | null
}

export interface MercadoPagoStatus {
  isConnected: boolean
  status: string
  mercadoPagoUserId: string | null
  connectedAtUtc: string | null
  lastError: string | null
  autoCollectionEnabledBySuperAdmin: boolean
}

export interface CompanySettings {
  name: string
  description: string
  whatsapp: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  stateOrProvince: string
  postalCode: string
  country: string
  logoUrl: string
  slug: string
  transferAlias: string | null
  transferCbu: string | null
  transferAccountHolder: string | null
  transferBankName: string | null
}

function unwrapData<T>(raw: T[] | { items?: T[]; data?: T[] }): T[] {
  if (Array.isArray(raw)) return raw
  if (Array.isArray((raw as { items?: T[] })?.items)) return (raw as { items: T[] }).items
  if (Array.isArray((raw as { data?: T[] })?.data)) return (raw as { data: T[] }).data
  return []
}

export const LATE_FEE_RECURRENCE = { ONE_TIME: 1, DAILY: 2, WEEKLY: 3 } as const

export function recurrenceLabel(value: unknown) {
  const text = String(value ?? '').toLowerCase()
  if (text === 'onetime' || Number(value) === LATE_FEE_RECURRENCE.ONE_TIME) return 'Única'
  if (text === 'daily' || Number(value) === LATE_FEE_RECURRENCE.DAILY) return 'Diaria'
  if (text === 'weekly' || Number(value) === LATE_FEE_RECURRENCE.WEEKLY) return 'Semanal'
  return '-'
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return '-' }
}

export function formatDateShort(value: string | null | undefined) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  } catch { return '-' }
}

/* ─── Hooks ─── */

export function useCourses() {
  return useQuery({
    queryKey: ['pricing-courses', slug()],
    queryFn: () => apiService.get<Course[]>(`/api/admin/${slug()}/courses`),
    enabled: !!slug(),
  })
}

export function useCompanySettings() {
  return useQuery({
    queryKey: ['pricing-company-settings', slug()],
    queryFn: () => apiService.get<CompanySettings>(`/api/admin/${slug()}/company-settings`),
    enabled: !!slug(),
  })
}

export function useUpdateCompanySettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiService.put(`/api/admin/${slug()}/company-settings`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-company-settings'] }),
  })
}

export function usePaymentSettings() {
  return useQuery({
    queryKey: ['pricing-payment-settings', slug()],
    queryFn: () => apiService.get<PaymentSettings>(`/api/admin/${slug()}/payment-settings`),
    enabled: !!slug(),
  })
}

export function useSavePaymentSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PaymentSettings) =>
      apiService.put(`/api/admin/${slug()}/payment-settings`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-payment-settings'] }),
  })
}

export function useCoursePricings() {
  return useQuery({
    queryKey: ['pricing-course-pricings', slug()],
    queryFn: () => apiService.get<CoursePricing[]>(`/api/admin/${slug()}/payments/course-pricing`),
    enabled: !!slug(),
  })
}

export function useCreatePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { courseId: string; classesPerWeek: number; price: number }) =>
      apiService.post(`/api/admin/${slug()}/payments/course-pricing`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-course-pricings'] }),
  })
}

export function useDeletePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiService.del(`/api/admin/${slug()}/payments/course-pricing/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-course-pricings'] }),
  })
}

export function useLatePaymentConfigs() {
  return useQuery({
    queryKey: ['pricing-late-configs', slug()],
    queryFn: () => apiService.get<LatePaymentConfig[]>(`/api/admin/${slug()}/payments/late-payment-configs`),
    enabled: !!slug(),
  })
}

export function useCreateLateFee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Omit<LatePaymentConfig, 'id' | 'courseName'>) =>
      apiService.post(`/api/admin/${slug()}/payments/late-payment-configs`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-late-configs'] }),
  })
}

export function useUpdateLateFee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      apiService.put(`/api/admin/${slug()}/payments/late-payment-configs/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-late-configs'] }),
  })
}

export function useDeleteLateFee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiService.del(`/api/admin/${slug()}/payments/late-payment-configs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-late-configs'] }),
  })
}

export function useSiblingDiscounts() {
  return useQuery({
    queryKey: ['pricing-sibling-discounts', slug()],
    queryFn: () => apiService.get<SiblingDiscount[]>(`/api/admin/${slug()}/payments/sibling-discounts`),
    enabled: !!slug(),
  })
}

export function useCreateSiblingDiscount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { siblingCount: number; discountPercent: number }) =>
      apiService.post(`/api/admin/${slug()}/payments/sibling-discounts`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-sibling-discounts'] }),
  })
}

export function useDeleteSiblingDiscount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiService.del(`/api/admin/${slug()}/payments/sibling-discounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-sibling-discounts'] }),
  })
}

export function useScholarships() {
  return useQuery({
    queryKey: ['pricing-scholarships', slug()],
    queryFn: () => apiService.get<Scholarship[]>(`/api/admin/${slug()}/scholarships`),
    enabled: !!slug(),
  })
}

export function useCreateScholarship() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; discountType: number; discountValue: number; isActive: boolean }) =>
      apiService.post(`/api/admin/${slug()}/scholarships`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-scholarships'] }),
  })
}

export function useScholarshipAssignments() {
  return useQuery({
    queryKey: ['pricing-scholarship-assignments', slug()],
    queryFn: () => apiService.get<ScholarshipAssignment[]>(`/api/admin/${slug()}/scholarships/assignments`),
    enabled: !!slug(),
  })
}

export function useAssignScholarship() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      studentId: string; scholarshipId: string; courseId: string | null;
      startDateUtc: string; endDateUtc: string | null; notes: string | null
    }) => apiService.post(`/api/admin/${slug()}/scholarships/assign`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pricing-scholarship-assignments'] })
      qc.invalidateQueries({ queryKey: ['pricing-student-scholarships'] })
    },
  })
}

export function useStudentScholarships(studentId: string | null) {
  return useQuery({
    queryKey: ['pricing-student-scholarships', slug(), studentId],
    queryFn: () => apiService.get<ScholarshipAssignment[]>(
      `/api/admin/${slug()}/scholarships/students/${studentId}`,
    ),
    enabled: !!slug() && !!studentId,
  })
}

export function useDeactivateScholarship() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiService.put(`/api/admin/${slug()}/scholarships/student-scholarships/${id}/deactivate`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pricing-scholarship-assignments'] })
      qc.invalidateQueries({ queryKey: ['pricing-student-scholarships'] })
    },
  })
}

export function useAllStudents() {
  return useQuery({
    queryKey: ['pricing-all-students', slug()],
    queryFn: () =>
      apiService.get<Student[] | { items?: Student[] }>(
        `/api/admin/${slug()}/students?pageSize=1000`,
      ).then((r) => unwrapData(r as Student[] | { items?: Student[] })),
    enabled: !!slug(),
  })
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['pricing-payment-methods', slug()],
    queryFn: () => apiService.get<PaymentMethodDetail[]>(
      `/api/admin/${slug()}/payment-methods`,
    ),
    enabled: !!slug(),
  })
}

export function useSavePaymentMethods() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>[]) =>
      apiService.put(`/api/admin/${slug()}/payment-methods`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-payment-methods'] }),
  })
}

export function useMercadoPagoStatus() {
  return useQuery({
    queryKey: ['pricing-mp-status', slug()],
    queryFn: () => apiService.get<MercadoPagoStatus>(`/api/admin/${slug()}/mercadopago/status`),
    enabled: !!slug(),
    retry: false,
  })
}

export function useMercadoPagoConnectUrl() {
  return useMutation({
    mutationFn: () =>
      apiService.get<{ url: string }>(`/api/admin/${slug()}/mercadopago/connect-url`),
  })
}

export function useDisconnectMercadoPago() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiService.post(`/api/admin/${slug()}/mercadopago/disconnect`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-mp-status'] }),
  })
}
