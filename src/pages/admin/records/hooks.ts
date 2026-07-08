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

export function normalizeStatus(status: number | string | undefined): string {
  const s = Number(status)
  if (s === 1) return 'Pendiente'
  if (s === 2) return 'En revisión'
  if (s === 3) return 'Aprobado'
  if (s === 4) return 'Rechazado'
  if (s === 5) return 'Vencido'
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
}

export interface Course {
  id: string
  name: string
}

export interface DocumentType {
  id: string
  name: string
  isActive: boolean
}

export function useCourses() {
  return useQuery({
    queryKey: ['records-courses', slug()],
    queryFn: () => apiService.get<Course[]>(`/api/admin/${slug()}/courses`),
    enabled: !!slug(),
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

export function useStudents(filters: {
  search: string; courseId: string; status: string; documentStatus: string
}) {
  return useQuery({
    queryKey: ['records-students', slug(), filters],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters.search) params.set('search', filters.search)
      if (filters.courseId) params.set('courseId', filters.courseId)
      if (filters.status) params.set('status', filters.status)
      if (filters.documentStatus) params.set('documentStatus', filters.documentStatus)
      const qs = params.toString()
      const url = qs
        ? `/api/admin/${slug()}/student-files/students?${qs}`
        : `/api/admin/${slug()}/student-files/students`
      return apiService.get<Student[]>(url)
    },
    enabled: !!slug(),
    select: (data) => (Array.isArray(data) ? data : []),
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
