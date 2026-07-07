import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import api from '@/lib/api'
import { useAuth } from '@/stores/auth'

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

export interface Announcement {
  id: string
  title?: string
  text?: string
  imageUrl?: string
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

export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements', slug()],
    queryFn: () => apiService.get<Announcement[]>(`/api/admin/${slug()}/announcements`),
    enabled: !!slug(),
    select: (data) => (Array.isArray(data) ? data : []),
  })
}

export function useCourses() {
  return useQuery({
    queryKey: ['announcements-courses', slug()],
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }) },
  })
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      api.put(`/api/admin/${slug()}/announcements/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }) },
  })
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiService.del(`/api/admin/${slug()}/announcements/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }) },
  })
}
