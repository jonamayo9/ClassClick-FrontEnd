import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { hasModule } from '@/hooks/useModule'
import type { PublicPageConfig, UpdatePublicPage } from '@/types/public-page'

export function usePublicPage(slug: string) {
  return useQuery({
    queryKey: ['public-page', slug],
    queryFn: () => apiService.get<PublicPageConfig>(`/api/admin/${slug}/public-page`),
    enabled: !!slug,
  })
}

export function useUpdatePublicPage(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpdatePublicPage) =>
      apiService.put(`/api/admin/${slug}/public-page`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['public-page', slug] }),
  })
}

export function usePublishPage(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiService.post(`/api/admin/${slug}/public-page/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['public-page', slug] }),
  })
}

export function useUnpublishPage(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiService.post(`/api/admin/${slug}/public-page/unpublish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['public-page', slug] }),
  })
}

export function useGalleryImages(slug: string) {
  return useQuery({
    queryKey: ['public-page-gallery', slug],
    queryFn: () => apiService.get<any[]>(`/api/admin/${slug}/public-page/images`),
    enabled: !!slug,
  })
}

export function useReorderImages(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (imageIds: string[]) =>
      apiService.put(`/api/admin/${slug}/public-page/images/order`, { imageIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['public-page-gallery', slug] }),
  })
}

export function useDeleteImage(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (imageId: string) =>
      apiService.del(`/api/admin/${slug}/public-page/images/${imageId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['public-page-gallery', slug] }),
  })
}

export function useLanding(companySlug: string) {
  return useQuery({
    queryKey: ['landing', companySlug],
    queryFn: () => apiService.get<any>(`/api/public/companies/${companySlug}/landing`),
    enabled: !!companySlug,
    retry: false,
  })
}

export function useUploadCourseCover(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ courseId, file }: { courseId: string; file: File }) => {
      const fd = new FormData()
      fd.append('file', file)
      return apiService.postForm<{ publicCoverImageUrl: string }>(
        `/api/admin/${slug}/public-page/courses/${courseId}/image`,
        fd,
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courses', slug] })
    },
  })
}

export function useDeleteCourseCover(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (courseId: string) =>
      apiService.del(`/api/admin/${slug}/public-page/courses/${courseId}/image`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courses', slug] })
    },
  })
}

export function usePublicSponsors(slug: string) {
  return useQuery({
    queryKey: ['public-page-sponsors', slug],
    queryFn: () => apiService.get<any[]>(`/api/admin/${slug}/sponsors`),
    enabled: !!slug && hasModule('sponsors'),
    select: (data) => (Array.isArray(data) ? data : []),
  })
}
