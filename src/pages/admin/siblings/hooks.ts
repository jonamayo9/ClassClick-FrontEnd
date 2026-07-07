import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'

function useCompanySlug() {
  return useAuth((state) => state.activeCompanySlug) ?? ''
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es-AR')
}

export function formatDateShort(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const requestStatusLabels: Record<number, string> = {
  1: 'Pendiente', 2: 'Documentación solicitada', 3: 'En revisión',
  4: 'Aprobada', 5: 'Rechazada', 6: 'Cancelada',
}

const requestStatusAliases: Record<string, number> = {
  '1': 1,
  pending: 1,
  '2': 2,
  documentsrequested: 2,
  documentrequested: 2,
  documentationrequested: 2,
  '3': 3,
  underreview: 3,
  inreview: 3,
  '4': 4,
  approved: 4,
  '5': 5,
  rejected: 5,
  '6': 6,
  cancelled: 6,
  canceled: 6,
}

export function getRequestStatusCode(status: unknown): number | null {
  const normalized = String(status ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '')

  return requestStatusAliases[normalized] ?? null
}

export function getRequestStatusLabel(status: unknown) {
  const code = getRequestStatusCode(status)
  return code ? requestStatusLabels[code] : 'Desconocido'
}

export function isRequestActionable(status: unknown) {
  const code = getRequestStatusCode(status)
  return code === 1 || code === 2 || code === 3
}

export const requestStatusColors: Record<number, string> = {
  1: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  2: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  3: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  4: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  5: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  6: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

export function getRequestStatusBadgeClass(status: unknown) {
  const code = getRequestStatusCode(status)
  return code
    ? requestStatusColors[code]
    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
}

export interface SearchStudent {
  studentId: string
  fullName: string
  email: string
  dni: string | null
  isActive: boolean
}

export interface FamilyMember {
  studentId: string
  fullName: string
  dni: string | null
  email: string | null
  isActive: boolean
}

export interface FamilyGroup {
  familyGroupId: string
  shareCharges: boolean
  members: FamilyMember[]
}

export interface SiblingRequest {
  id: string
  requestedByStudentId: string
  requestedByStudentFullName: string
  requestedByDni: string | null
  targetStudentId: string
  targetStudentFullName: string
  targetDni: string | null
  status: number | string
  createdAtUtc: string | null
  reviewedAtUtc: string | null
  note: string | null
  documentsRequestNote: string | null
  adminReviewNote: string | null
}

export interface RequestDocument {
  id: string
  fileName: string
  isPdf: boolean
  isImage: boolean
  uploadedAtUtc: string | null
}

export interface RequestDetail extends SiblingRequest {
  documentsRequestNote: string | null
  adminReviewNote: string | null
}

export function useSearchStudents(query: string, excludeStudentId?: string | null) {
  const companySlug = useCompanySlug()
  return useQuery({
    queryKey: ['siblings-search', companySlug, query, excludeStudentId],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('q', query)
      if (excludeStudentId) params.set('excludeStudentId', excludeStudentId)
      return apiService.get<SearchStudent[]>(
        `/api/admin/${companySlug}/students/sibling-links/search-students?${params.toString()}`
      )
    },
    enabled: !!companySlug && query.length >= 2,
    select: (data) => (Array.isArray(data) ? data : []),
  })
}

export function useFamilyGroups(studentId?: string | null) {
  const companySlug = useCompanySlug()
  return useQuery({
    queryKey: ['siblings-family-groups', companySlug, studentId],
    queryFn: () => {
      const url = studentId
        ? `/api/admin/${companySlug}/students/sibling-links/family-groups?studentId=${encodeURIComponent(studentId)}`
        : `/api/admin/${companySlug}/students/sibling-links/family-groups`
      return apiService.get<{ groups: FamilyGroup[] }>(url)
    },
    enabled: !!companySlug,
    select: (data) => data?.groups ?? [],
  })
}

export function useSiblingRequests(statusFilter?: string) {
  const companySlug = useCompanySlug()
  return useQuery({
    queryKey: ['siblings-requests', companySlug, statusFilter],
    queryFn: () => {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''
      return apiService.get<SiblingRequest[]>(
        `/api/admin/${companySlug}/students/sibling-links/requests${qs}`
      )
    },
    enabled: !!companySlug,
    select: (data) => (Array.isArray(data) ? data : []),
  })
}

export function useRequestDetail(requestId: string | null) {
  const companySlug = useCompanySlug()
  return useQuery({
    queryKey: ['siblings-request-detail', companySlug, requestId],
    queryFn: () => apiService.get<RequestDetail>(
      `/api/admin/${companySlug}/students/sibling-links/requests/${requestId}`
    ),
    enabled: !!companySlug && !!requestId,
  })
}

export function useRequestDocuments(requestId: string | null) {
  const companySlug = useCompanySlug()
  return useQuery({
    queryKey: ['siblings-request-documents', companySlug, requestId],
    queryFn: () => apiService.get<RequestDocument[]>(
      `/api/admin/${companySlug}/students/sibling-links/requests/${requestId}/documents`
    ),
    enabled: !!companySlug && !!requestId,
    select: (data) => (Array.isArray(data) ? data : []),
  })
}

export function useViewDocument() {
  const companySlug = useCompanySlug()
  return useMutation({
    mutationFn: ({ requestId, documentId }: { requestId: string; documentId: string }) =>
      apiService.get<{ url: string }>(
        `/api/admin/${companySlug}/students/sibling-links/requests/${requestId}/documents/${documentId}/view`
      ),
  })
}

export function useLinkStudents() {
  const companySlug = useCompanySlug()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { studentId: string; siblingStudentId: string }) =>
      apiService.post(`/api/admin/${companySlug}/students/sibling-links/link`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['siblings-family-groups'] })
      qc.invalidateQueries({ queryKey: ['siblings-requests'] })
    },
  })
}

export function useUnlinkStudent() {
  const companySlug = useCompanySlug()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (studentId: string) =>
      apiService.post(`/api/admin/${companySlug}/students/sibling-links/student/unlink`, { studentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['siblings-family-groups'] })
      qc.invalidateQueries({ queryKey: ['siblings-requests'] })
    },
  })
}

export function useBreakFamilyGroup() {
  const companySlug = useCompanySlug()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (studentId: string) =>
      apiService.post(`/api/admin/${companySlug}/students/sibling-links/family-group/break`, { studentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['siblings-family-groups'] })
      qc.invalidateQueries({ queryKey: ['siblings-requests'] })
    },
  })
}

export function useUpdateFamilyGroupBilling() {
  const companySlug = useCompanySlug()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ familyGroupId, shareCharges }: { familyGroupId: string; shareCharges: boolean }) =>
      apiService.put(
        `/api/admin/${companySlug}/students/sibling-links/family-groups/${familyGroupId}/billing`,
        { shareCharges },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['siblings-family-groups'] })
      qc.invalidateQueries({ queryKey: ['student-billing'] })
    },
  })
}

export function useRequestDocumentsAction() {
  const companySlug = useCompanySlug()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, note }: { requestId: string; note: string }) =>
      apiService.post(`/api/admin/${companySlug}/students/sibling-links/requests/${requestId}/request-documents`, { note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['siblings-requests'] })
      qc.invalidateQueries({ queryKey: ['siblings-request-detail'] })
      qc.invalidateQueries({ queryKey: ['siblings-family-groups'] })
    },
  })
}

export function useApproveSiblingRequest() {
  const companySlug = useCompanySlug()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, note }: { requestId: string; note: string | null }) =>
      apiService.post(`/api/admin/${companySlug}/students/sibling-links/requests/${requestId}/approve`, { note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['siblings-requests'] })
      qc.invalidateQueries({ queryKey: ['siblings-request-detail'] })
      qc.invalidateQueries({ queryKey: ['siblings-family-groups'] })
    },
  })
}

export function useRejectSiblingRequest() {
  const companySlug = useCompanySlug()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, note }: { requestId: string; note: string | null }) =>
      apiService.post(`/api/admin/${companySlug}/students/sibling-links/requests/${requestId}/reject`, { note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['siblings-requests'] })
      qc.invalidateQueries({ queryKey: ['siblings-request-detail'] })
      qc.invalidateQueries({ queryKey: ['siblings-family-groups'] })
    },
  })
}
