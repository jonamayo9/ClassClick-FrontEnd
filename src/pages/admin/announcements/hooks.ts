import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import api from '@/lib/api'
import { useAuth } from '@/stores/auth'
import type { QueryClient } from '@tanstack/react-query'

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

export interface Announcement {
  id: string
  title?: string
  text?: string
  imageUrl?: string
  imageFileName?: string
  imageContentType?: string
  isActive: boolean
  isGlobal: boolean
  courseIds?: string[]
  courseNames?: string[]
  createdAtUtc?: string
}

export interface CourseOption {
  id: string
  name: string
}

export interface AnnouncementListResponse {
  items: Announcement[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AnnouncementsSummary {
  total: number
  active: number
  inactive: number
  withImage: number
}

export interface AnnouncementFilters {
  search: string
  status: string
  scope: string
  courseId: string
  page: number
  pageSize: number
}

function invalidateAnnouncements(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['admin-announcements'] })
}

export function useAnnouncements(filters: AnnouncementFilters) {
  return useQuery({
    queryKey: [
      'admin-announcements', 'paged', slug(),
      filters.search, filters.status, filters.scope, filters.courseId, filters.page, filters.pageSize,
    ],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters.search) params.set('search', filters.search)
      if (filters.status) params.set('status', filters.status)
      if (filters.scope) params.set('scope', filters.scope)
      if (filters.courseId) params.set('courseId', filters.courseId)
      params.set('page', String(filters.page))
      params.set('pageSize', String(filters.pageSize))
      return apiService.get<AnnouncementListResponse>(
        `/api/admin/${slug()}/announcements/paged?${params.toString()}`,
      )
    },
    enabled: !!slug(),
    placeholderData: (prev) => prev,
  })
}

export function useAnnouncementsSummary() {
  return useQuery({
    queryKey: ['admin-announcements', 'summary', slug()],
    queryFn: () => apiService.get<AnnouncementsSummary>(`/api/admin/${slug()}/announcements/summary`),
    enabled: !!slug(),
  })
}

export function useCourses() {
  return useQuery({
    queryKey: ['admin-announcements', 'courses', slug()],
    queryFn: () => apiService.get<CourseOption[]>(`/api/admin/${slug()}/courses`),
    enabled: !!slug(),
    select: (data) => (Array.isArray(data) ? data : []),
  })
}

export function useCreateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiService.postForm(`/api/admin/${slug()}/announcements`, formData),
    onSuccess: () => invalidateAnnouncements(qc),
  })
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      api.put(`/api/admin/${slug()}/announcements/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data),
    onSuccess: () => invalidateAnnouncements(qc),
  })
}

export function useToggleAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiService.patch(`/api/admin/${slug()}/announcements/${id}/active`, { isActive }),
    onSuccess: () => invalidateAnnouncements(qc),
  })
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiService.del(`/api/admin/${slug()}/announcements/${id}`),
    onSuccess: () => invalidateAnnouncements(qc),
  })
}
