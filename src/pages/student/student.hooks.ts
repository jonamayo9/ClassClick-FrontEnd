import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { hasModule } from '@/hooks/useModule'

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

export function formatDate(v: string | null | undefined): string {
  if (!v) return '-'
  return new Date(v).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export { formatDateOnly } from '@/lib/date'

export interface StudentProfile {
  fullName: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  whatsAppNumber?: string
  dni?: string
  profileImageUrl?: string
  memberNumber?: string
  isRegistrationCompleted?: boolean
  themePreference?: string
}

export interface StudentBilling {
  chargeId: string
  studentId?: string
  studentFullName?: string
  isOwnCharge?: boolean
  courseName: string
  month: number
  year: number
  classesPerWeek?: number
  basePrice: number
  finalAmount: number
  finalAmountPaid: number
  dueDateUtc: string
  chargeStatus: number | string
  paymentStatus: number | string
  hasScholarship?: boolean
  scholarshipName?: string
  scholarshipDiscountAmount?: number
  scholarshipDiscountValue?: number
  scholarshipDiscountType?: string | number
  siblingDiscountAmount?: number
  siblingDiscountPercent?: number
  lateChargeAmount?: number
  paymentMethodSurchargeAmount?: number
  paymentMethodNameSnapshot?: string
  paymentId?: string
  transferProofImageUrl?: string
  reviewNote?: string
  // Nuevos campos multi-cuota
  chargeTypeId?: string
  chargeTypeName?: string
  isFinanceable?: boolean
  maxFinancingInstallments?: number
  financingRequestId?: string
  financingInstallmentNumber?: number
  financingInstallmentCount?: number
  financingFrequency?: number
  isCustom?: boolean
  isRefund?: boolean
  detailItems?: { id: string; description: string; amount: number; sortOrder: number }[]
}

export interface PaymentMethod {
  companyPaymentMethodId: string
  paymentMethod: string | number
  paymentMethodName?: string
  name?: string
  displayName?: string
  surchargeType?: string
  surchargeValue?: number
  alias?: string
  cbu?: string
  holderName?: string
  notes?: string
  instructions?: string
}

export interface ProofView {
  url: string
  fileName: string
  isImage: boolean
  isPdf: boolean
}

export interface Announcement {
  id: string
  title: string
  text: string
  imageUrl?: string
  createdAtUtc: string
}

export interface Sponsor {
  id: string
  name: string
  displayOrder: number
  imageUrl?: string
  overlayText?: string
  description?: string
  websiteUrl?: string
  instagramUrl?: string
  whatsApp?: string
}

export function unwrap<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const d = data as { items?: T[]; data?: T[] }
  return d.items ?? d.data ?? []
}

export function useStudentProfile() {
  return useQuery({
    queryKey: ['student-profile', slug()],
    queryFn: () => apiService.get<StudentProfile>(`/api/student/${slug()}/me`),
    enabled: !!slug(),
  })
}

export function useProfilePhotoUrl() {
  return useQuery({
    queryKey: ['profile-photo-url', slug()],
    queryFn: () => apiService.get<{ url?: string }>(`/api/profile/photo/view`),
    enabled: !!slug(),
    retry: false,
  })
}

export function useStudentBilling() {
  return useQuery({
    queryKey: ['student-billing', slug()],
    queryFn: () => apiService.get<StudentBilling[]>(`/api/student/${slug()}/billing`),
    enabled: !!slug() && hasModule('payments'),
    select: (data) => unwrap<StudentBilling>(data),
  })
}

export function useStudentAnnouncements() {
  return useQuery({
    queryKey: ['student-announcements', slug()],
    queryFn: () => apiService.get<Announcement[]>(`/api/student/${slug()}/announcements`),
    enabled: !!slug() && hasModule('news'),
    select: (data) => unwrap<Announcement>(data),
  })
}

export function useStudentSponsors() {
  return useQuery({
    queryKey: ['student-sponsors', slug()],
    queryFn: () => apiService.get<Sponsor[]>(`/api/student/${slug()}/sponsors`),
    enabled: !!slug() && hasModule('sponsors'),
    select: (data) => unwrap<Sponsor>(data),
  })
}

export interface StudentCourse {
  id: string
  name: string
  description?: string
  teacherFullName?: string
  classesPerWeek?: number
  isActive?: boolean
  basePrice?: number
  finalPrice?: number
  siblingDiscountPercent?: number
  siblingDiscountAmount?: number
  schedules?: { dayOfWeek?: number; startTime?: string; endTime?: string }[]
}

export function useStudentCourses() {
  return useQuery({
    queryKey: ['student-courses', slug()],
    queryFn: () => apiService.get<StudentCourse[]>(`/api/student/${slug()}/courses`),
    enabled: !!slug(),
    select: (data) => unwrap<StudentCourse>(data),
  })
}

export interface StudentMatch {
  id: string
  matchDateUtc?: string
  opponentName?: string
  opponentLogoUrl?: string
  locationName?: string
  address?: string
  notes?: string
  hasTicketSale?: boolean
  ticketPrice?: number
  ticketInfo?: string
  googleMapsUrl?: string
  isGlobal?: boolean
  courseNames?: string[]
}

export function useStudentMatches() {
  return useQuery({
    queryKey: ['student-matches', slug()],
    queryFn: () => apiService.get<StudentMatch[]>(`/api/student/${slug()}/matches`),
    enabled: !!slug() && hasModule('matches'),
    select: (data) => unwrap<StudentMatch>(data),
  })
}

export function useCourseAttendance(courseId: string | null) {
  return useQuery({
    queryKey: ['course-attendance', slug(), courseId],
    queryFn: () => apiService.get<{ date: string; present: boolean }[]>(`/api/student/${slug()}/courses/${courseId}/attendance`),
    enabled: !!courseId && !!slug(),
    select: (data) => unwrap<{ date: string; present: boolean }>(data),
  })
}

export function useCourseDocuments(courseId: string | null) {
  return useQuery({
    queryKey: ['course-documents', slug(), courseId],
    queryFn: () => apiService.get<{ id: string; title: string; fileName: string; fileUrl?: string; uploadedAtUtc?: string }[]>(`/api/student/${slug()}/courses/${courseId}/documents`),
    enabled: !!courseId && !!slug(),
    select: (data) => unwrap<{ id: string; title: string; fileName: string; fileUrl?: string; uploadedAtUtc?: string }>(data),
  })
}

export function useStudentAttendanceSummary() {
  return useQuery({
    queryKey: ['student-attendance-summary', slug()],
    queryFn: () => apiService.get<{ courseId: string; courseName: string; present: number; absent: number; total: number }[]>(`/api/student/${slug()}/attendance/summary`),
    enabled: !!slug(),
    select: (data) => unwrap<{ courseId: string; courseName: string; present: number; absent: number; total: number }>(data),
  })
}
