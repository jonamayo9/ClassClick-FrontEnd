import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import type { AdminDashboardDto, DonutSegment, EvolutionPoint, AlertItem, UpcomingItem } from '@/types/dashboard'

export function useDashboardKpis(slug: string) {
  return useQuery({
    queryKey: ['dashboard-kpis', slug],
    queryFn: () => apiService.get<AdminDashboardDto>(`/api/admin/${slug}/dashboard`),
    enabled: !!slug,
  })
}

export function useStudentDistribution(slug: string) {
  return useQuery({
    queryKey: ['dashboard-distribution-students', slug],
    queryFn: () => apiService.get<DonutSegment[]>(`/api/admin/${slug}/dashboard/distribution/students`),
    enabled: !!slug,
  })
}

export function useChargeDistribution(slug: string) {
  return useQuery({
    queryKey: ['dashboard-distribution-charges', slug],
    queryFn: () => apiService.get<DonutSegment[]>(`/api/admin/${slug}/dashboard/distribution/charges`),
    enabled: !!slug,
  })
}

export function useDocumentDistribution(slug: string) {
  return useQuery({
    queryKey: ['dashboard-distribution-documents', slug],
    queryFn: () => apiService.get<DonutSegment[]>(`/api/admin/${slug}/dashboard/distribution/documents`),
    enabled: !!slug,
  })
}

export function useAttendanceDistribution(slug: string) {
  return useQuery({
    queryKey: ['dashboard-distribution-attendance', slug],
    queryFn: () => apiService.get<DonutSegment[]>(`/api/admin/${slug}/dashboard/distribution/attendance`),
    enabled: !!slug,
  })
}

export function useIncomeEvolution(slug: string) {
  return useQuery({
    queryKey: ['dashboard-evolution-income', slug],
    queryFn: () => apiService.get<EvolutionPoint[]>(`/api/admin/${slug}/dashboard/evolution/income`),
    enabled: !!slug,
  })
}

export function useStudentEvolution(slug: string) {
  return useQuery({
    queryKey: ['dashboard-evolution-students', slug],
    queryFn: () => apiService.get<EvolutionPoint[]>(`/api/admin/${slug}/dashboard/evolution/students`),
    enabled: !!slug,
  })
}

export function useDashboardAlerts(slug: string) {
  return useQuery({
    queryKey: ['dashboard-alerts', slug],
    queryFn: () => apiService.get<AlertItem[]>(`/api/admin/${slug}/dashboard/alerts`),
    enabled: !!slug,
  })
}

export function useUpcomingItems(slug: string) {
  return useQuery({
    queryKey: ['dashboard-upcoming', slug],
    queryFn: () => apiService.get<UpcomingItem[]>(`/api/admin/${slug}/dashboard/upcoming`),
    enabled: !!slug,
  })
}
