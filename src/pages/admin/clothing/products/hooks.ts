import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { slug, Product, unwrapList } from '../hooks'

export function useProducts() {
  return useQuery({
    queryKey: ['clothing', 'products', slug()],
    queryFn: () => apiService.get<Product[]>(`/api/admin/${slug()}/clothing/products`),
    enabled: !!slug(),
    select: (data) => unwrapList<Product>(data),
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiService.post(`/api/admin/${slug()}/clothing/products`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'products'] }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) =>
      apiService.put(`/api/admin/${slug()}/clothing/products/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'products'] }),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiService.del(`/api/admin/${slug()}/clothing/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'products'] }),
  })
}

export function useUploadImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, file }: { productId: string; file: File }) => {
      const fd = new FormData()
      fd.append('file', file)
      return apiService.postForm(`/api/admin/${slug()}/clothing/products/${productId}/images`, fd)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'products'] }),
  })
}

export function useDeleteImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, imageId }: { productId: string; imageId: string }) =>
      apiService.del(`/api/admin/${slug()}/clothing/products/${productId}/images/${imageId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'products'] }),
  })
}

export function useSetMainImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, imageId }: { productId: string; imageId: string }) =>
      apiService.post(`/api/admin/${slug()}/clothing/products/${productId}/images/${imageId}/main`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'products'] }),
  })
}
