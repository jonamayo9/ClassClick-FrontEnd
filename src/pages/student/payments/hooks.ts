import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { StudentBilling, PaymentMethod, ProofView, unwrap as u } from '../student.hooks'

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

export interface TransferInfo {
  alias?: string
  cbu?: string
  accountHolder?: string
  bankName?: string
  notes?: string
}

export interface FinancingConfig {
  isEnabled: boolean
  allowWeekly: boolean
  allowBiweekly: boolean
  allowMonthly: boolean
  weeklyInterestRate: number
  biweeklyInterestRate: number
  monthlyInterestRate: number
  interestRate2: number
  interestRate3: number
  interestRate4: number
  interestRate6: number
  installmentRates: { installmentCount: number; interestRate: number }[]
}

export interface FinancingRequest {
  id: string
  studentId: string
  chargeId: string
  chargeTypeName: string
  originalAmount: number
  requestedInstallments: number
  frequency: number
  frequencyName: string
  interestRate: number
  calculatedInterest: number
  totalWithInterest: number
  installmentAmount: number
  status: number
  adminReviewNote?: string
  createdAtUtc: string
  reviewedAtUtc?: string
}

export function useBilling() {
  return useQuery({
    queryKey: ['student-billing', slug()],
    queryFn: () => apiService.get<StudentBilling[]>(`/api/student/${slug()}/billing`),
    enabled: !!slug(),
    select: (d: unknown) => u<StudentBilling>(d),
    refetchInterval: 30_000,
    refetchOnWindowFocus: 'always',
  })
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['student-payment-methods', slug()],
    queryFn: () => apiService.get<PaymentMethod[]>(`/api/student/${slug()}/payment-methods`),
    enabled: !!slug(),
    select: (d: unknown) => u<PaymentMethod>(d),
  })
}

export function useTransferInfo() {
  return useQuery({
    queryKey: ['student-transfer-info', slug()],
    queryFn: () => apiService.get<TransferInfo>(`/api/student/${slug()}/payment-transfer-info`),
    enabled: !!slug(),
  })
}

export function useFinancingConfig() {
  return useQuery({
    queryKey: ['student-financing-config', slug()],
    queryFn: () => apiService.get<FinancingConfig>(
      `/api/student/${slug()}/charges/financing-config`,
    ),
    enabled: !!slug(),
  })
}

export function useFinancingRequests() {
  return useQuery({
    queryKey: ['student-financing-requests', slug()],
    queryFn: () => apiService.get<FinancingRequest[]>(
      `/api/student/${slug()}/charges/financing-requests`,
    ),
    enabled: !!slug(),
    select: (data: unknown) => u<FinancingRequest>(data),
    refetchInterval: 30_000,
    refetchOnWindowFocus: 'always',
  })
}

export function useRequestFinancing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      chargeId,
      installments,
      frequency,
    }: {
      chargeId: string
      installments: number
      frequency: number
    }) => apiService.post(
      `/api/student/${slug()}/charges/${chargeId}/request-financing`,
      { installments, frequency },
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-financing-requests'] })
      qc.invalidateQueries({ queryKey: ['student-billing'] })
    },
  })
}

export function useSubmitProof() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      chargeId,
      companyPaymentMethodId,
      file,
    }: {
      chargeId: string
      companyPaymentMethodId: string
      file: File
    }) => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('companyPaymentMethodId', companyPaymentMethodId)
      return apiService.postForm(`/api/student/${slug()}/charges/${chargeId}/proof`, fd)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-billing'] }),
  })
}

export function useProofView(paymentId: string | null) {
  return useQuery({
    queryKey: ['student-proof-view', slug(), paymentId],
    queryFn: async () => {
      try {
        return await apiService.get<ProofView>(`/api/student/${slug()}/payments/${paymentId}/proof/view`)
      } catch { return null }
    },
    enabled: !!paymentId && !!slug(),
    retry: false,
  })
}
