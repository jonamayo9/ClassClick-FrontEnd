import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { slug } from '../hooks'

export function useUpdateProductStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, tracksStock, stockQuantity }: { id: string; tracksStock: boolean; stockQuantity: number | null }) =>
      apiService.patch(`/api/admin/${slug()}/clothing/products/${id}/stock`, { tracksStock, stockQuantity }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'products'] }),
  })
}

export function useUpdateVariantStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, variantId, tracksStock, stockQuantity, isActive }: { productId: string; variantId: string; tracksStock: boolean; stockQuantity: number | null; isActive: boolean }) =>
      apiService.patch(`/api/admin/${slug()}/clothing/products/${productId}/variants/${variantId}/stock`, { tracksStock, stockQuantity, isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'products'] }),
  })
}
