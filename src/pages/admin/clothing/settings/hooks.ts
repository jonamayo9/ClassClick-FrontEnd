import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { slug, ClothingSettings } from '../hooks'

export function useClothingSettings() {
  return useQuery({
    queryKey: ['clothing', 'settings', slug()],
    queryFn: () => apiService.get<ClothingSettings>(`/api/admin/${slug()}/clothing/settings`),
    enabled: !!slug(),
  })
}

export function useUpdateClothingSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { paymentAlias?: string; paymentAliasHolder?: string }) =>
      apiService.put(`/api/admin/${slug()}/clothing/settings/payment`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'settings'] }),
  })
}
