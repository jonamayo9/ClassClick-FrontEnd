import { useQuery, useMutation } from '@tanstack/react-query'
import { apiService } from '@/lib/api'

export interface PublicStoreInfo {
  publicStoreEnabled: boolean
  title?: string | null
  description?: string | null
  instructions?: string | null
  pickupEnabled: boolean
  homeDeliveryEnabled: boolean
  pickupAddress: { addressFormatted?: string | null; city?: string | null; instructions?: string | null } | null
  paymentMethods: { transferEnabled: boolean; transferCanPay: boolean; mercadoPagoEnabled: boolean; mercadoPagoConnected: boolean }
  currency: string
}

export interface PublicProduct {
  id: string
  name: string
  description?: string | null
  price: number
  requiresDeposit: boolean
  depositAmount?: number | null
  allowsFullPayment: boolean
  hasVariants: boolean
  isAvailable: boolean
  images: { imageUrl: string; isMain: boolean }[]
  variants: { id: string; name: string; tracksStock: boolean; availableQuantity?: number | null; isAvailable: boolean }[]
}

export interface CheckoutItem {
  productId: string
  variantId?: string | null
  quantity: number
  personalizationText?: string | null
}

export interface PublicDeliveryQuote {
  isAvailable: boolean
  deliveryFee?: number | null
  zoneId?: string | null
  zoneLabel?: string | null
  currency?: string | null
  message?: string | null
}

export interface PublicCheckoutPreview {
  productsTotal: number
  deliveryFee: number
  fullTotal: number
  minimumInitialPayment: number
  allowsFullCheckout: boolean
  deliveryAvailable: boolean
  deliveryMessage?: string | null
  deliveryZoneLabel?: string | null
  currency: string
  options: { concept: string; amount: number; available: boolean }[]
  methods: { transferEnabled: boolean; transferCanPay: boolean; mercadoPagoEnabled: boolean; mercadoPagoConnected: boolean }
}

export interface PublicOrder {
  publicToken: string
  status: number
  paymentStatus: number
  paymentOption: number
  productsTotal: number
  deliveryFee: number
  fullTotal: number
  paid: number
  balance: number
  totalRefunded: number
  netRetained: number
  balanceDue: number
  refundState: string
  currency: string
  deliveryMethod?: string | null
  deliveryStatus?: number
  deliveryAddressFormatted?: string | null
  deliveryZoneLabel?: string | null
  deliveryInstructions?: string | null
  hasPendingPaymentProof: boolean
  createdAtUtc: string
  items: { productName: string; variantName?: string | null; quantity: number; unitPrice: number; subtotal: number }[]
  payments: { concept: string; method: string; amount: number; status: string; refundState: string; refundedAmount?: number | null; refundNote?: string | null; refundedAtUtc?: string | null }[]
}

export interface TransferData {
  cbu?: string | null
  alias?: string | null
  holder?: string | null
  bankName?: string | null
  instructions?: string | null
  amount: number
  currency: string
  canPay: boolean
}

export function usePublicStoreInfo(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-store', slug, 'info'],
    queryFn: () => apiService.get<PublicStoreInfo>(`/api/public/clothing/${slug}/store`),
    enabled: !!slug,
    retry: false,
  })
}

export function usePublicProducts(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-store', slug, 'products'],
    queryFn: () => apiService.get<PublicProduct[]>(`/api/public/clothing/${slug}/products`),
    enabled: !!slug,
    retry: false,
  })
}

export function usePublicDeliveryQuote(slug: string | undefined) {
  return useMutation({
    mutationFn: (body: { province: string; locality: string; postalCode: string }) =>
      apiService.post(`/api/public/clothing/${slug}/delivery/quote`, body),
  })
}

export function usePublicCheckoutPreview(slug: string | undefined) {
  return useMutation({
    mutationFn: (body: { items: CheckoutItem[]; deliveryMethod?: string; province?: string; locality?: string; postalCode?: string }) =>
      apiService.post(`/api/public/clothing/${slug}/checkout/preview`, body),
  })
}

export function usePublicCreateOrder(slug: string | undefined) {
  return useMutation({
    mutationFn: (body: {
      firstName: string
      lastName: string
      email: string
      phone?: string
      paymentOption: number
      items: CheckoutItem[]
      deliveryMethod?: string
      province?: string
      locality?: string
      postalCode?: string
      street?: string
      streetNumber?: string
      floor?: string
      references?: string
      deliveryInstructions?: string
      expectedDeliveryFee?: number
      expectedZoneId?: string
    }) => apiService.post(`/api/public/clothing/${slug}/orders`, body),
  })
}

export function usePublicOrder(slug: string | undefined, token: string | undefined) {
  return useQuery({
    queryKey: ['public-store', slug, 'order', token],
    queryFn: () => apiService.get<PublicOrder>(`/api/public/clothing/${slug}/orders/${token}`),
    enabled: !!slug && !!token,
    retry: false,
    refetchInterval: (query) => {
      const o = query.state.data as PublicOrder | undefined
      if (!o) return 30000
      // Rechazado / Entregado / Cancelado / Vencido: no tiene sentido seguir consultando.
      if ([3, 4, 5, 6].includes(o.status)) return false
      return 30000
    },
  })
}

export function usePublicTransferData(slug: string | undefined, token: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['public-store', slug, 'order', token, 'transfer'],
    queryFn: () => apiService.get<TransferData>(`/api/public/clothing/${slug}/orders/${token}/transfer-data`),
    enabled: !!slug && !!token && enabled,
    retry: false,
  })
}

export function usePublicUploadProof(slug: string | undefined, token: string | undefined) {
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return apiService.postForm(`/api/public/clothing/${slug}/orders/${token}/payment-proof`, fd)
    },
  })
}

export function usePublicMercadoPagoCheckout(slug: string | undefined, token: string | undefined) {
  return useMutation({
    mutationFn: (concept: string) =>
      apiService.post(`/api/public/clothing/${slug}/orders/${token}/mercadopago/checkout`, { concept }),
  })
}