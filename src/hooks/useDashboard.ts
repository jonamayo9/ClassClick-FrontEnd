import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import type { AdminDashboardDto, DonutSegment, EvolutionPoint, AlertItem, UpcomingItem } from '@/types/dashboard'

function queryParams(dateFrom?: string, dateTo?: string): string {
  const p = new URLSearchParams()
  if (dateFrom) p.set('dateFrom', dateFrom)
  if (dateTo) p.set('dateTo', dateTo)
  const qs = p.toString()
  return qs ? '?' + qs : ''
}

export function useDashboardKpis(slug: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['dashboard-kpis', slug, dateFrom, dateTo],
    queryFn: () => apiService.get<AdminDashboardDto>(`/api/admin/${slug}/dashboard${queryParams(dateFrom, dateTo)}`),
    enabled: !!slug,
  })
}

export function useStudentDistribution(slug: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['dashboard-distribution-students', slug, dateFrom, dateTo],
    queryFn: () => apiService.get<DonutSegment[]>(`/api/admin/${slug}/dashboard/distribution/students${queryParams(dateFrom, dateTo)}`),
    enabled: !!slug,
  })
}

export function useChargeDistribution(slug: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['dashboard-distribution-charges', slug, dateFrom, dateTo],
    queryFn: () => apiService.get<DonutSegment[]>(`/api/admin/${slug}/dashboard/distribution/charges${queryParams(dateFrom, dateTo)}`),
    enabled: !!slug,
  })
}

export function useDocumentDistribution(slug: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['dashboard-distribution-documents', slug, dateFrom, dateTo],
    queryFn: () => apiService.get<DonutSegment[]>(`/api/admin/${slug}/dashboard/distribution/documents${queryParams(dateFrom, dateTo)}`),
    enabled: !!slug,
  })
}

export function useAttendanceDistribution(slug: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['dashboard-distribution-attendance', slug, dateFrom, dateTo],
    queryFn: () => apiService.get<DonutSegment[]>(`/api/admin/${slug}/dashboard/distribution/attendance${queryParams(dateFrom, dateTo)}`),
    enabled: !!slug,
  })
}

export function useIncomeEvolution(slug: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['dashboard-evolution-income', slug, dateFrom, dateTo],
    queryFn: () => apiService.get<EvolutionPoint[]>(`/api/admin/${slug}/dashboard/evolution/income${queryParams(dateFrom, dateTo)}`),
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

export function useUpcomingItems(slug: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['dashboard-upcoming', slug, dateFrom, dateTo],
    queryFn: () => apiService.get<UpcomingItem[]>(`/api/admin/${slug}/dashboard/upcoming${queryParams(dateFrom, dateTo)}`),
    enabled: !!slug,
  })
}
