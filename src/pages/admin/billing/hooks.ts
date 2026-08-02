import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'

function slug() {
  return useAuth.getState().activeCompanySlug ?? ''
}

export interface AdminBillingPlan {
  isConfigured: boolean
  isEnabled: boolean
  autoGenerate: boolean
  dueDay: number
  monthlyAmount: number
  currency: string
  planName: string | null
  billingMode: number
  nextPeriod: string | null
  transferEnabled: boolean
  transferAlias: string | null
  transferCbu: string | null
  transferHolder: string | null
  transferSurchargeType: number
  transferSurchargeValue: number
  mpEnabled: boolean
  mpConnected: boolean
  mpSurchargeType: number
  mpSurchargeValue: number
  mpAvailable: boolean
}

export interface AdminBillingInvoice {
  id: string
  periodYear: number
  periodMonth: number
  period: string
  invoiceNumber: string
  planName: string | null
  description: string | null
  status: string | number
  statusValue: number
  basePrice: number
  includedUsers: number
  billableUsers: number
  extraUsers: number
  extraChargeMode: number
  extraUserPrice: number
  extraFixedAmount: number
  baseAmount: number
  extraAmount: number
  amount: number
  totalAmount: number
  originalAmount: number
  lateFeePercentage: number
  lateFeeAmount: number
  amountWithLateFee: number
  daysOverdue: number
  currency: string
  issuedAtUtc: string
  dueDateUtc: string
  paidAtUtc: string | null
  paymentMethod: string | number | null
  paymentMethodValue: number | null
  paymentReference: string | null
  notes: string | null
  hasPaymentProof: boolean
  paymentProofStatus: string | null
  paymentProofSubmittedAtUtc: string | null
  isAutomatic: boolean
  createdAtUtc: string
}

export interface AdminBillingOverview {
  plan: AdminBillingPlan
  currentInvoice: AdminBillingInvoice | null
  history: AdminBillingInvoice[]
  historyTotal: number
}

export interface AdminBillingUsageDetail {
  invoiceNumber: string
  period: string
  periodYear: number
  periodMonth: number
  basePrice: number
  includedUsers: number
  billableUsers: number
  extraUsers: number
  extraChargeMode: number
  extraUserPrice: number
  extraFixedAmount: number
  baseAmount: number
  extraAmount: number
  totalAmount: number
  movements: {
    userId: string
    firstName: string | null
    lastName: string | null
    email: string | null
    role: string
    eventType: number
    occurredAtUtc: string
  }[]
}

export interface BillingPaymentOption {
  paymentMethod: string
  displayName: string
  enabled: boolean
  surchargeType: number
  surchargeValue: number
  surchargeAmount: number
  totalAmount: number
  alias: string | null
  cbu: string | null
  holder: string | null
  requiresProof: boolean
}

export interface BillingPaymentOptions {
  invoiceId: string
  period: string
  originalAmount: number
  lateFeePercentage: number
  lateFeeAmount: number
  amountWithLateFee: number
  options: BillingPaymentOption[]
}

export function useAdminBillingOverview(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['admin-billing', slug(), page, pageSize],
    queryFn: () => apiService.get<AdminBillingOverview>(`/api/admin/${slug()}/billing?page=${page}&pageSize=${pageSize}`),
    enabled: !!slug(),
  })
}

export function useAdminBillingUsageDetail(invoiceId: string | null) {
  return useQuery({
    queryKey: ['admin-billing-usage-detail', slug(), invoiceId],
    queryFn: () => apiService.get<AdminBillingUsageDetail>(`/api/admin/${slug()}/billing/invoices/${invoiceId}/usage-detail`),
    enabled: !!slug() && !!invoiceId,
  })
}

export function useBillingPaymentOptions(invoiceId: string | null) {
  return useQuery({
    queryKey: ['admin-billing-payment-options', slug(), invoiceId],
    queryFn: () => apiService.get<BillingPaymentOptions>(`/api/admin/${slug()}/billing/invoices/${invoiceId}/payment-options`),
    enabled: !!slug() && !!invoiceId,
  })
}

export function useUploadBillingProof() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, file }: { invoiceId: string; file: File }) => {
      const fd = new FormData()
      fd.append('File', file)
      return apiService.post(`/api/admin/${slug()}/billing/invoices/${invoiceId}/proof`, fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-billing'] })
      qc.invalidateQueries({ queryKey: ['admin-billing-summary'] })
      qc.invalidateQueries({ queryKey: ['admin-billing-payment-options'] })
      qc.invalidateQueries({ queryKey: ['admin-billing-usage-detail'] })
    },
  })
}

export function useBillingProofView() {
  return useMutation({
    mutationFn: (invoiceId: string) =>
      apiService.get<{ url: string }>(`/api/admin/${slug()}/billing/invoices/${invoiceId}/proof/view`),
  })
}
