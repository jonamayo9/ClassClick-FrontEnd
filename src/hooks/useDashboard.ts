import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import type { AdminDashboardDto, DonutSegment, EvolutionPoint, AlertItem, UpcomingPage, ChargeDistribution, StudentDistribution, DocumentDistribution, AttendanceDistribution } from '@/types/dashboard'

function queryParams(dateFrom?: string, dateTo?: string, chargeTypeId?: string, page?: number): string {
  const p = new URLSearchParams()
  if (dateFrom) p.set('dateFrom', dateFrom)
  if (dateTo) p.set('dateTo', dateTo)
  if (chargeTypeId) p.set('chargeTypeId', chargeTypeId)
  if (page && page > 1) p.set('page', String(page))
  const qs = p.toString()
  return qs ? '?' + qs : ''
}

export function useChargeTypeOptions(slug: string) {
  return useQuery({
    queryKey: ['dashboard-charge-types', slug],
    queryFn: () => apiService.get<Array<{ id: string; name: string; amount: number }>>(`/api/admin/${slug}/charge-types`),
    enabled: !!slug,
  })
}

export function useDashboardKpis(slug: string, dateFrom?: string, dateTo?: string, chargeTypeId?: string) {
  return useQuery({
    queryKey: ['dashboard-kpis', slug, dateFrom, dateTo, chargeTypeId],
    queryFn: () => apiService.get<AdminDashboardDto>(`/api/admin/${slug}/dashboard${queryParams(dateFrom, dateTo, chargeTypeId)}`),
    enabled: !!slug,
  })
}

export function useStudentDistribution(slug: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['dashboard-distribution-students', slug, dateFrom, dateTo],
    queryFn: () => apiService.get<StudentDistribution>(`/api/admin/${slug}/dashboard/distribution/students${queryParams(dateFrom, dateTo)}`),
    enabled: !!slug,
  })
}

export function useChargeDistribution(slug: string, dateFrom?: string, dateTo?: string, chargeTypeId?: string) {
  return useQuery({
    queryKey: ['dashboard-distribution-charges', slug, dateFrom, dateTo, chargeTypeId],
    queryFn: () => apiService.get<ChargeDistribution>(`/api/admin/${slug}/dashboard/distribution/charges${queryParams(dateFrom, dateTo, chargeTypeId)}`),
    enabled: !!slug,
  })
}

export function useDocumentDistribution(slug: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['dashboard-distribution-documents', slug, dateFrom, dateTo],
    queryFn: () => apiService.get<DocumentDistribution>(`/api/admin/${slug}/dashboard/distribution/documents${queryParams(dateFrom, dateTo)}`),
    enabled: !!slug,
  })
}

export function useAttendanceDistribution(slug: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['dashboard-distribution-attendance', slug, dateFrom, dateTo],
    queryFn: () => apiService.get<AttendanceDistribution>(`/api/admin/${slug}/dashboard/distribution/attendance${queryParams(dateFrom, dateTo)}`),
    enabled: !!slug,
  })
}

export function useIncomeEvolution(slug: string, dateFrom?: string, dateTo?: string, chargeTypeId?: string) {
  return useQuery({
    queryKey: ['dashboard-evolution-income', slug, dateFrom, dateTo, chargeTypeId],
    queryFn: () => apiService.get<EvolutionPoint[]>(`/api/admin/${slug}/dashboard/evolution/income${queryParams(dateFrom, dateTo, chargeTypeId)}`),
    enabled: !!slug,
  })
}

export function useStudentEvolution(slug: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['dashboard-evolution-students', slug, dateFrom, dateTo],
    queryFn: () => apiService.get<EvolutionPoint[]>(`/api/admin/${slug}/dashboard/evolution/students${queryParams(dateFrom, dateTo)}`),
    enabled: !!slug,
  })
}

export function useDashboardAlerts(slug: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['dashboard-alerts', slug, dateFrom, dateTo],
    queryFn: () => apiService.get<AlertItem[]>(`/api/admin/${slug}/dashboard/alerts${queryParams(dateFrom, dateTo)}`),
    enabled: !!slug,
  })
}

export function useUpcomingItems(slug: string, dateFrom?: string, dateTo?: string, chargeTypeId?: string, page?: number) {
  return useQuery({
    queryKey: ['dashboard-upcoming', slug, dateFrom, dateTo, chargeTypeId, page],
    queryFn: () => apiService.get<UpcomingPage>(`/api/admin/${slug}/dashboard/upcoming${queryParams(dateFrom, dateTo, chargeTypeId, page)}`),
    enabled: !!slug,
  })
}
