import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { slug, Category, unwrapList } from '../hooks'

export function useCategories() {
  return useQuery({
    queryKey: ['clothing', 'categories', slug()],
    queryFn: () => apiService.get<Category[]>(`/api/admin/${slug()}/clothing/categories`),
    enabled: !!slug(),
    select: (data) => unwrapList<Category>(data),
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; parentId?: string | null }) =>
      apiService.post(`/api/admin/${slug()}/clothing/categories`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'categories'] }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name: string; parentId?: string | null; isActive: boolean }) =>
      apiService.put(`/api/admin/${slug()}/clothing/categories/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'categories'] }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiService.del(`/api/admin/${slug()}/clothing/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'categories'] }),
  })
}
