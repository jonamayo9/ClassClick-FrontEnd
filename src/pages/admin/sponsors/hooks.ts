import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import api from '@/lib/api'
import { useAuth } from '@/stores/auth'

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

export interface Sponsor {
  id: string
  name: string
  imageUrl: string
  overlayText?: string
  description?: string
  displayOrder: number
  isActive: boolean
  websiteUrl?: string
  instagramUrl?: string
  facebookUrl?: string
  whatsApp?: string
  createdAtUtc?: string
}

export function useSponsors() {
  return useQuery({
    queryKey: ['sponsors', slug()],
    queryFn: () => apiService.get<Sponsor[]>(`/api/admin/${slug()}/sponsors`),
    enabled: !!slug(),
    select: (data) => (Array.isArray(data) ? data : []),
  })
}

export function useCreateSponsor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiService.postForm(`/api/admin/${slug()}/sponsors`, formData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sponsors'] }) },
  })
}

export function useUpdateSponsor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      api.put(`/api/admin/${slug()}/sponsors/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sponsors'] }) },
  })
}

export function useDeleteSponsor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiService.del(`/api/admin/${slug()}/sponsors/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sponsors'] }) },
  })
}
