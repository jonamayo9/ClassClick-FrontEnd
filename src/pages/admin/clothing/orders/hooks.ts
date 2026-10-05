import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { slug, Order, PaymentProof, CancellationRequest, unwrapList } from '../hooks'

export function useOrders(params: { period?: string; from?: string; to?: string; status?: string; paymentStatus?: string; deliveryMethod?: string }) {
  const qs = new URLSearchParams()
  if (params.period) qs.set('period', params.period)
  if (params.from) qs.set('from', params.from)
  if (params.to) qs.set('to', params.to)
  if (params.status) qs.set('status', params.status)
  if (params.paymentStatus) qs.set('paymentStatus', params.paymentStatus)
  if (params.deliveryMethod) qs.set('deliveryMethod', params.deliveryMethod)

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

/** Historial de solicitudes de cancelación de un pedido (consultable desde "Pedidos de la tienda"). */
export function useOrderCancellationRequests(orderId: string | null) {
  return useQuery({
    queryKey: ['clothing', 'cancellations', 'by-order', slug(), orderId],
    queryFn: () => apiService.get<CancellationRequest[]>(`/api/admin/${slug()}/clothing/cancellation-requests/by-order/${orderId}`),
    enabled: !!orderId && !!slug(),
    select: (data) => unwrapList<CancellationRequest>(data),
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clothing', 'orders'] }); qc.invalidateQueries({ queryKey: ['clothing', 'order'] }) },
  })
}

export function usePrepareOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) =>
      apiService.post(`/api/admin/${slug()}/clothing/orders/${orderId}/prepare`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clothing', 'orders'] }); qc.invalidateQueries({ queryKey: ['clothing', 'order'] }) },
  })
}

export function useReadyOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) =>
      apiService.post(`/api/admin/${slug()}/clothing/orders/${orderId}/ready`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clothing', 'orders'] }); qc.invalidateQueries({ queryKey: ['clothing', 'order'] }) },
  })
}

export function useDispatchOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) =>
      apiService.post(`/api/admin/${slug()}/clothing/orders/${orderId}/dispatch`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clothing', 'orders'] }); qc.invalidateQueries({ queryKey: ['clothing', 'order'] }) },
  })
}

export function useOrderDetail(orderId: string | null) {
  return useQuery({
    queryKey: ['clothing', 'order', slug(), orderId],
    queryFn: () => apiService.get<Order>(`/api/admin/${slug()}/clothing/orders/${orderId}`),
    enabled: !!orderId && !!slug(),
  })
}

export function useRefundMercadoPago() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, paymentId, note, amount }: { orderId: string; paymentId: string; note?: string; amount?: number }) =>
      apiService.post(`/api/admin/${slug()}/clothing/orders/${orderId}/payments/${paymentId}/refund`, { note, amount }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clothing', 'orders'] }); qc.invalidateQueries({ queryKey: ['clothing', 'order'] }) },
  })
}

export function useMarkManualRefund() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, paymentId, note, amount }: { orderId: string; paymentId: string; note: string; amount?: number }) =>
      apiService.post(`/api/admin/${slug()}/clothing/orders/${orderId}/payments/${paymentId}/refund/manual`, { note, amount }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clothing', 'orders'] }); qc.invalidateQueries({ queryKey: ['clothing', 'order'] }) },
  })
}

export function useReturnItemStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, itemId, quantity }: { orderId: string; itemId: string; quantity: number }) =>
      apiService.post(`/api/admin/${slug()}/clothing/orders/${orderId}/items/${itemId}/return`, { quantity }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clothing', 'orders'] }); qc.invalidateQueries({ queryKey: ['clothing', 'order'] }); qc.invalidateQueries({ queryKey: ['clothing', 'products'] }) },
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

export function useCancelOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      apiService.post(`/api/admin/${slug()}/clothing/orders/${orderId}/cancel`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clothing', 'orders'] })
      qc.invalidateQueries({ queryKey: ['clothing', 'order'] })
    },
  })
}
