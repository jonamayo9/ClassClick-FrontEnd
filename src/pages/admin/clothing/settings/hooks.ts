import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { slug, ClothingSettings } from '../hooks'

export function useClothingSettings() {
  return useQuery({
    queryKey: ['clothing', 'settings', slug()],
    queryFn: () => apiService.get<ClothingSettings>(`/api/admin/${slug()}/clothing/settings`),
    enabled: !!slug(),
  })
}

export interface ClothingFinancialSettingsBody {
  transferEnabled: boolean
  useCompanyTransferData: boolean
  transferCbu?: string | null
  transferAlias?: string | null
  transferHolder?: string | null
  transferBankName?: string | null
  transferInstructions?: string | null
  mercadoPagoEnabled: boolean
  useCompanyMercadoPagoAccount: boolean
  reservationHours?: number
}

export function useUpdateClothingFinancialSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ClothingFinancialSettingsBody) =>
      apiService.put(`/api/admin/${slug()}/clothing/settings/financial`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'settings'] }),
  })
}

export interface ClothingStoreSettingsBody {
  publicStoreEnabled: boolean
  publicStoreTitle?: string | null
  publicStoreDescription?: string | null
  publicStoreInstructions?: string | null
  pickupEnabled: boolean
  homeDeliveryEnabled: boolean
  originAddressFormatted?: string | null
  originStreet?: string | null
  originStreetNumber?: string | null
  originCity?: string | null
  originState?: string | null
  originPostalCode?: string | null
  originCountry?: string | null
  originLatitude?: number | null
  originLongitude?: number | null
}

export function useUpdateClothingStoreSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ClothingStoreSettingsBody) =>
      apiService.put(`/api/admin/${slug()}/clothing/settings/store`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'settings'] }),
  })
}

export function useUpdateClothingSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { paymentAlias?: string; paymentAliasHolder?: string }) =>
      apiService.put(`/api/admin/${slug()}/clothing/settings/payment`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'settings'] }),
  })
}

export function useMercadoPagoConnectUrl() {
  return useMutation({
    mutationFn: (scope: 'general' | 'clothing') =>
      apiService.get<{ url: string }>(`/api/admin/${slug()}/mercadopago/connect-url?scope=${scope}`),
    onSuccess: (data) => {
      if (data?.url) window.location.href = data.url
    },
  })
}

export function useDisconnectMercadoPago() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (scope: 'general' | 'clothing') =>
      apiService.post(`/api/admin/${slug()}/mercadopago/disconnect?scope=${scope}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clothing', 'settings'] }),
  })
}