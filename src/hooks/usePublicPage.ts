import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
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
