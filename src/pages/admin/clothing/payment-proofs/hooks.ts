import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { slug, PaymentProof, unwrapList } from '../hooks'

export function usePaymentProofs() {
  return useQuery({
    queryKey: ['clothing', 'payment-proofs', slug()],
    queryFn: () => apiService.get<PaymentProof[]>(`/api/admin/${slug()}/clothing/payment-proofs`),
    enabled: !!slug(),
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
