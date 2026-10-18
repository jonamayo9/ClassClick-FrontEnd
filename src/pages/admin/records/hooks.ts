import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export { formatDateOnly } from '@/lib/date'

export function normalizeStatus(status: number | string | undefined): string {
  const s = Number(status)
  if (s === 1) return 'Pendiente'
  if (s === 2) return 'En revisión'
  if (s === 3) return 'Aprobado'
  if (s === 4) return 'Rechazado'
  if (s === 5) return 'Vencido'
  // Handle string values (PascalCase from JsonStringEnumConverter)
  const str = String(status ?? '').toLowerCase().trim()
  if (str === 'pending') return 'Pendiente'
  if (str === 'submitted' || str === 'uploaded') return 'En revisión'
  if (str === 'approved') return 'Aprobado'
  if (str === 'rejected') return 'Rechazado'
  if (str === 'expired') return 'Vencido'
  return String(status ?? '')
}

export function getStatusLabel(status: number | string | undefined) {
  return normalizeStatus(status)
}

export const statusColors: Record<string, string> = {
  'Pendiente': 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  'En revisión': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  'Aprobado': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  'Rechazado': 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  'Vencido': 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
}

export function getStatusBadgeClass(status: number | string | undefined) {
  return statusColors[normalizeStatus(status)] ?? 'bg-slate-100 text-slate-700'
}

export interface Student {
  studentId: string
  fullName: string
  email: string
  courseId: string
  courseName: string
  isActive: boolean
  pendingCount: number
  submittedCount: number
  approvedCount: number
  rejectedCount: number
  expiredCount: number
  dni: string | null
  memberNumber: string | null
}

export interface StudentDetail {
  studentId: string
  fullName: string
  email: string
  dni: string | null
  memberNumber: string | null
  courseName: string | null
  isActive: boolean
  hasHealthInsurance: boolean
  healthInsuranceName: string | null
  healthInsuranceMemberNumber: string | null
  healthInsurancePlan: string | null
  profileImageUrl: string | null
  documents: StudentDocument[]
}

export interface StudentFile {
  id: string
  fileName: string
  mimeType: string
  uploadedAtUtc: string
}

export interface StudentDocument {
  assignmentId: string
  documentTypeName: string
  status: number
  assignedAtUtc: string | null
  dueDateUtc: string | null
  submittedAtUtc: string | null
  reviewedAtUtc: string | null
  expirationDateUtc: string | null
  currentFileId: string | null
  currentFileName: string | null
  currentFileMimeType: string | null
  requestNote: string | null
  reviewNote: string | null
  files: StudentFile[]
  historicalFiles?: StudentFile[]
}

export interface Course {
  id: string
  name: string
}

export interface DocumentType {
  id: string
  name: string
  isActive: boolean
  isRequired?: boolean
  hasExpiration?: boolean
}

export function useCourses() {
  // "Curso" es un concepto del vertical Deportivo. En Educativa no se consultan cursos
  // (evita depender de /api/admin/.../courses, exclusivo de Deportivo) ni se usa el filtro.
  const company = useAuth.getState().companies.find((c) => (c.slug ?? c.companySlug) === slug())
  const isEducativa = company?.vertical === 'Educativa'
  return useQuery({
    queryKey: ['records-courses', slug()],
    queryFn: () => apiService.get<Course[]>(`/api/admin/${slug()}/courses`),
    enabled: !!slug() && !isEducativa,
    select: (data) => (Array.isArray(data) ? data : []),
  })
}

export function useDocumentTypes() {
  return useQuery({
    queryKey: ['records-document-types', slug()],
    queryFn: () => apiService.get<DocumentType[]>(`/api/admin/${slug()}/document-types`),
    enabled: !!slug(),
    select: (data) => {
      const items = Array.isArray(data) ? data : []
      return items.filter((x) => x.isActive)
    },
  })
}

export interface RecordsStudentFilters {
  search: string
  courseId: string
  isActive: string       // '' | 'true' | 'false'
  documentStatus: string // '' | 'ontime' | 'pending' | 'expiring' | 'expired' | 'rejected' | 'none'
  page?: number
  pageSize?: number
}

export function useStudents(filters: RecordsStudentFilters) {
  return useQuery({
    queryKey: ['records-students', slug(), filters],
    queryFn: async (): Promise<PagedResult<Student>> => {
      const params = new URLSearchParams()
      if (filters.search) params.set('search', filters.search)
      if (filters.courseId) params.set('courseId', filters.courseId)
      if (filters.isActive) params.set('isActive', filters.isActive)
      if (filters.documentStatus) params.set('documentStatus', filters.documentStatus)
      if (filters.page) params.set('page', String(filters.page))
      if (filters.pageSize) params.set('pageSize', String(filters.pageSize))
      const qs = params.toString()
      const url = qs
        ? `/api/admin/${slug()}/student-files/students?${qs}`
        : `/api/admin/${slug()}/student-files/students`
      const data = await apiService.get<Student[] | PagedResult<Student>>(url)
      if (Array.isArray(data)) return { items: data, totalCount: data.length }
      return { items: data.items ?? [], totalCount: data.totalCount ?? (data.items?.length ?? 0) }
    },
    enabled: !!slug(),
    placeholderData: (prev) => prev,
  })
}

/** Lista completa (sin paginar) para selectores como "solicitar a alumnos". */
export function useStudentsAll(enabled = true) {
  return useQuery({
    queryKey: ['records-students-all', slug()],
    queryFn: async () => {
      const data = await apiService.get<Student[]>(`/api/admin/${slug()}/student-files/students`)
      return Array.isArray(data) ? data : []
    },
    enabled: !!slug() && enabled,
  })
}

export interface RecordsSummary {
  totalStudents: number
  upToDate: number
  pending: number
  expired: number
  expiring: number
}

export function useRecordsSummary() {
  return useQuery({
    queryKey: ['records-summary', slug()],
    queryFn: () => apiService.get<RecordsSummary>(`/api/admin/${slug()}/student-files/students/summary`),
    enabled: !!slug(),
  })
}

export interface StudentCourse {
  courseId: string
  courseName: string
  teacherName: string | null
  isActive: boolean
  classesPerWeek: number
  enrolledAtUtc: string
}

export function useStudentCourses(studentId: string | null) {
  return useQuery({
    queryKey: ['records-student-courses', slug(), studentId],
    queryFn: () => apiService.get<StudentCourse[]>(`/api/admin/${slug()}/students/${studentId}/courses`),
    enabled: !!slug() && !!studentId,
  })
}

export interface RecordEconomicSummary {
  totalDebt: number
  totalPaid: number
  pendingCharges: number
  overdueCharges: number
  currency: string | null
  groups: { label: string; debt: number; paid: number; overdue: number; nextDueDate: string | null; currency: string | null }[]
}

/** Situación económica (Deportiva): account-status del alumno. */
export function useStudentEconomic(studentId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['records-student-economic', slug(), studentId],
    queryFn: async (): Promise<RecordEconomicSummary> => {
      const account = await apiService.get<{
        totalDebt: number; totalPaid: number; pendingCharges: number; overdueCharges: number
        charges: { courseId: string; courseName: string; finalAmount: number; status: string | number }[]
      }>(`/api/admin/${slug()}/monthly-charges/student/${studentId}/account-status`)

      const byCourse = new Map<string, { label: string; debt: number; paid: number; overdue: number }>()
      for (const c of account.charges ?? []) {
        const isPaid = String(c.status).toLowerCase() === 'paid'
        const g = byCourse.get(c.courseId) ?? { label: c.courseName || 'Curso', debt: 0, paid: 0, overdue: 0 }
        if (!isPaid) g.debt += Number(c.finalAmount ?? 0)
        if (isPaid) g.paid += Number(c.finalAmount ?? 0)
        byCourse.set(c.courseId, g)
      }

      return {
        totalDebt: Number(account.totalDebt ?? 0),
        totalPaid: Number(account.totalPaid ?? 0),
        pendingCharges: Number(account.pendingCharges ?? 0),
        overdueCharges: Number(account.overdueCharges ?? 0),
        currency: 'ARS',
        groups: Array.from(byCourse.values()).map((g) => ({ ...g, nextDueDate: null, currency: 'ARS' })),
      }
    },
    enabled: !!slug() && !!studentId && enabled,
    retry: false,
  })
}

export interface StudentEnrollmentRecord {
  id: string
  trainingName: string
  categoryName: string
  commissionName: string
  status: string | number
  academicSituation: string
  enrolledAtUtc: string
  snapshotCurrency: string | null
  totalPaid: number | null
  balanceDue: number | null
  overdueCount: number | null
  nextDueDateUtc: string | null
}

export interface StudentLegajo {
  userId: string
  fullName: string
  dni: string | null
  email: string | null
  economicVisible: boolean
  enrollments: StudentEnrollmentRecord[]
}

/**
 * Legajo Educativa (endpoint propio con permiso `records`): devuelve SIEMPRE lo académico y
 * los datos económicos SOLO si el backend confirma el permiso de Cuotas (economicVisible).
 * No usa el endpoint `detail` para evitar exponer montos a usuarios sin permiso de Pagos.
 */
export function useStudentLegajo(studentId: string | null) {
  return useQuery({
    queryKey: ['records-student-legajo', slug(), studentId],
    queryFn: () => apiService.get<StudentLegajo>(`/api/educativa/${slug()}/students/${studentId}/legajo`),
    enabled: !!slug() && !!studentId,
    retry: false,
  })
}

export function useStudentDetail(studentId: string | null) {
  return useQuery({
    queryKey: ['records-student-detail', slug(), studentId],
    queryFn: () => apiService.get<StudentDetail>(`/api/admin/${slug()}/student-files/students/${studentId}`),
    enabled: !!slug() && !!studentId,
  })
}

export function usePreviewFile() {
  return useMutation({
    mutationFn: (fileId: string) =>
      apiService.get<{ url: string; fileName?: string; contentType?: string }>(
        `/api/admin/${slug()}/student-files/files/${fileId}/view`
      ),
  })
}

export function useDownloadFile() {
  return useMutation({
    mutationFn: (fileId: string) =>
      apiService.get<{ url: string }>(`/api/admin/${slug()}/student-files/files/${fileId}/download`),
  })
}

export function useCreateDocumentRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      documentTypeId: string
      scope: number
      studentId: string | null
      courseId: string | null
      note: string | null
      isMandatory: boolean
      dueDateUtc: string | null
    }) => apiService.post(`/api/admin/${slug()}/student-files/requests`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['records-students'] })
    },
  })
}

export function useApproveDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assignmentId, reviewNote, expirationDateUtc }: {
      assignmentId: string; reviewNote: string | null; expirationDateUtc: string | null
    }) => apiService.post(`/api/admin/${slug()}/student-files/assignments/${assignmentId}/approve`, {
      reviewNote, expirationDateUtc,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['records-students'] })
      qc.invalidateQueries({ queryKey: ['records-student-detail'] })
    },
  })
}

export function useRejectDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assignmentId, reviewNote }: { assignmentId: string; reviewNote: string }) =>
      apiService.post(`/api/admin/${slug()}/student-files/assignments/${assignmentId}/reject`, { reviewNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['records-students'] })
      qc.invalidateQueries({ queryKey: ['records-student-detail'] })
    },
  })
}

export function useDeleteAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assignmentId: string) =>
      apiService.del(`/api/admin/${slug()}/student-files/assignments/${assignmentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['records-students'] })
      qc.invalidateQueries({ queryKey: ['records-student-detail'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['dashboard-alerts'] })
      qc.invalidateQueries({ queryKey: ['dashboard-distribution'] })
    },
  })
}

export interface AdminDocumentItem {
  assignmentId: string
  studentId: string
  studentName: string
  dni: string | null
  courseId: string | null
  courseName: string | null
  documentTypeName: string
  status: string
  submittedAtUtc: string | null
  dueDateUtc: string | null
  fileId: string | null
  fileName: string | null
  fileMimeType: string | null
  sourceFileCount: number
  maxFiles: number
  isHistorical?: boolean
  version?: number | null
}

export interface AssignmentViewResult {
  url?: string | null
  isCanonical: boolean
  files?: { id: string; fileName: string; mimeType: string }[]
}

export interface PagedResult<T> { items: T[]; totalCount: number }

export function useAllDocuments(filters: {
  search: string
  courseId: string
  documentTypeId: string
  status: string
  scope?: string
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: ['records-all-documents', slug(), filters],
    queryFn: async (): Promise<PagedResult<AdminDocumentItem>> => {
      const params = new URLSearchParams()
      if (filters.search) params.set('search', filters.search)
      if (filters.courseId) params.set('courseId', filters.courseId)
      if (filters.documentTypeId) params.set('documentTypeId', filters.documentTypeId)
      if (filters.status) params.set('status', filters.status)
      if (filters.scope) params.set('scope', filters.scope)
      if (filters.page) params.set('page', String(filters.page))
      if (filters.pageSize) params.set('pageSize', String(filters.pageSize))
      const qs = params.toString()
      const url = qs
        ? `/api/admin/${slug()}/student-files/documents?${qs}`
        : `/api/admin/${slug()}/student-files/documents`
      const data = await apiService.get<AdminDocumentItem[] | PagedResult<AdminDocumentItem>>(url)
      if (Array.isArray(data)) return { items: data, totalCount: data.length }
      return { items: data.items ?? [], totalCount: data.totalCount ?? (data.items?.length ?? 0) }
    },
    enabled: !!slug(),
    placeholderData: (prev) => prev,
  })
}
