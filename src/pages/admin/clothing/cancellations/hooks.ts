import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { slug, CancellationRequest, unwrapList } from '../hooks'

export function useCancellationRequests() {
  return useQuery({
    queryKey: ['clothing', 'cancellations', slug()],
    queryFn: () => apiService.get<CancellationRequest[]>(`/api/admin/${slug()}/clothing/cancellation-requests`),
    enabled: !!slug(),
    select: (data) => unwrapList<CancellationRequest>(data),
  })
}

export function useApproveCancellation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      apiService.post(`/api/admin/${slug()}/clothing/cancellation-requests/${id}/approve`, { note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'cancellations'] }),
  })
}

export function useRejectCancellation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      apiService.post(`/api/admin/${slug()}/clothing/cancellation-requests/${id}/reject`, { note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'cancellations'] }),
  })
}
