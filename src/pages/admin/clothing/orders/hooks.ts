import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { slug, Order, PaymentProof, unwrapList } from '../hooks'

export function useOrders(params: { period?: string; from?: string; to?: string; status?: string; paymentStatus?: string }) {
  const qs = new URLSearchParams()
  if (params.period) qs.set('period', params.period)
  if (params.from) qs.set('from', params.from)
  if (params.to) qs.set('to', params.to)
  if (params.status) qs.set('status', params.status)
  if (params.paymentStatus) qs.set('paymentStatus', params.paymentStatus)

  return useQuery({
    queryKey: ['clothing', 'orders', slug(), params],
    queryFn: () => apiService.get<Order[]>(`/api/admin/${slug()}/clothing/orders?${qs}`),
    enabled: !!slug(),
    select: (data) => unwrapList<Order>(data),
  })
}

export function useOrderProofs(orderId: string | null) {
  return useQuery({
    queryKey: ['clothing', 'payment-proofs', 'by-order', slug(), orderId],
    queryFn: () => apiService.get<PaymentProof[]>(`/api/admin/${slug()}/clothing/payment-proofs/by-order/${orderId}`),
    enabled: !!orderId && !!slug(),
    select: (data) => unwrapList<PaymentProof>(data),
  })
}

export function useApproveProof() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ proofId, reviewNote }: { proofId: string; reviewNote: string }) =>
      apiService.post(`/api/admin/${slug()}/clothing/payment-proofs/${proofId}/approve`, { reviewNote }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clothing', 'orders'] }); qc.invalidateQueries({ queryKey: ['clothing', 'payment-proofs'] }) },
  })
}

export function useRejectProof() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ proofId, reviewNote }: { proofId: string; reviewNote: string }) =>
      apiService.post(`/api/admin/${slug()}/clothing/payment-proofs/${proofId}/reject`, { reviewNote }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clothing', 'orders'] }); qc.invalidateQueries({ queryKey: ['clothing', 'payment-proofs'] }) },
  })
}

export function useDeliverOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) =>
      apiService.post(`/api/admin/${slug()}/clothing/orders/${orderId}/deliver`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'orders'] }),
  })
}

export function useRejectOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      apiService.post(`/api/admin/${slug()}/clothing/orders/${orderId}/reject`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'orders'] }),
  })
}
