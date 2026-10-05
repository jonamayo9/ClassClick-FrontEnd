import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { slug, Category, unwrapList } from '../hooks'

/** El backend devuelve un árbol (raíces con children anidados). Lo aplanamos a una
 *  lista plana (raíces + subcategorías) porque el resto del frontend filtra por parentId. */
function flattenCategories(tree: Category[]): Category[] {
  const flat: Category[] = []
  const walk = (nodes: Category[]) => {
    for (const node of nodes) {
      flat.push({ ...node, children: undefined })
      if (node.children?.length) walk(node.children)
    }
  }
  walk(tree)
  return flat
}

export function useCategories() {
  return useQuery({
    queryKey: ['clothing', 'categories', slug()],
    queryFn: () => apiService.get<Category[]>(`/api/admin/${slug()}/clothing/categories`),
    enabled: !!slug(),
    select: (data) => flattenCategories(unwrapList<Category>(data)),
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
