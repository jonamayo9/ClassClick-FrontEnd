import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { slug } from '../hooks'

export interface DeliveryZone {
  id: string
  locality?: string | null
  postalCode?: string | null
  price: number
  currency: string
  isActive: boolean
}

export interface DeliveryZoneBody {
  locality?: string | null
  postalCode?: string | null
  price: number
  currency?: string
}

export function useDeliveryZones() {
  return useQuery({
    queryKey: ['clothing', 'delivery-zones', slug()],
    queryFn: () => apiService.get<DeliveryZone[]>(`/api/admin/${slug()}/clothing/delivery-zones`),
    enabled: !!slug(),
  })
}

export function useCreateDeliveryZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: DeliveryZoneBody) =>
      apiService.post(`/api/admin/${slug()}/clothing/delivery-zones`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'delivery-zones'] }),
  })
}

export function useUpdateDeliveryZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DeliveryZoneBody }) =>
      apiService.put(`/api/admin/${slug()}/clothing/delivery-zones/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'delivery-zones'] }),
  })
}

export function useToggleDeliveryZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiService.post(`/api/admin/${slug()}/clothing/delivery-zones/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'delivery-zones'] }),
  })
}

export function useDeleteDeliveryZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiService.del(`/api/admin/${slug()}/clothing/delivery-zones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'delivery-zones'] }),
  })
}