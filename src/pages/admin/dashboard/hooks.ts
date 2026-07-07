import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { useState } from 'react'

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export function money(value: number) { return ARS.format(value) }

export function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

export interface CollectionItem {
  studentFullName: string
  courseName: string
  month: number
  year: number
  dueDateUtc: string
  basePrice: number
  siblingDiscountAmount: number
  lateChargeAmount: number
  finalAmount: number
  hasScholarship: boolean
  scholarshipDiscountAmount: number
  hasPromotion: boolean
  promotionAmount: number
  promotionDiscountAmount: number
  paymentMethod: string
  status: string
  paidAtUtc: string | null
  hasSiblingDiscount: boolean
  paymentMethodSurchargeAmount: number
}

export interface CollectionSummary {
  totalCollected: number
  totalPending: number
  totalOverdue: number
  paidChargesCount: number
  totalCollectedCash: number
  totalCollectedTransfer: number
  totalCollectedWithPromotion: number
  totalCollectedPure: number
}

export interface CollectionResponse {
  summary: CollectionSummary
  items: CollectionItem[]
}

export interface CourseOption {
  id: string
  name: string
  title?: string
}

export interface Filters {
  dateFromUtc: string
  dateToUtc: string
  paymentMethod: string
  chargeType: string
  status: string
  courseId: string
}

function today() { return new Date().toISOString().slice(0, 10) }

function currentMonthFirst() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const defaultFilters: Filters = {
  dateFromUtc: currentMonthFirst(),
  dateToUtc: today(),
  paymentMethod: '',
  chargeType: '',
  status: '',
  courseId: '',
}

export function useDashboardFilters() {
  const [draft, setDraft] = useState<Filters>(defaultFilters)
  const [applied, setApplied] = useState<Filters>(defaultFilters)

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const apply = () => setApplied({ ...draft })

  const clear = () => {
    setDraft(defaultFilters)
    setApplied(defaultFilters)
  }

  return { draft, applied, setFilter, apply, clear }
}

function buildQueryParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.courseId) params.set('courseId', filters.courseId)
  if (filters.dateFromUtc) params.set('dateFromUtc', `${filters.dateFromUtc}T00:00:00Z`)
  if (filters.dateToUtc) params.set('dateToUtc', `${filters.dateToUtc}T23:59:59Z`)
  if (filters.paymentMethod) params.set('paymentMethod', filters.paymentMethod)
  if (filters.chargeType) params.set('chargeType', filters.chargeType)
  if (filters.status) params.set('status', filters.status)
  return params
}

export function useCollections(filters: Filters) {
  return useQuery({
    queryKey: ['admin-collections', slug(), filters],
    queryFn: () => {
      const params = buildQueryParams(filters)
      const qs = params.toString()
      const url = qs
        ? `/api/admin/${slug()}/reports/collections?${qs}`
        : `/api/admin/${slug()}/reports/collections`
      return apiService.get<CollectionResponse>(url)
    },
    enabled: !!slug(),
  })
}

export function useCourseOptions() {
  return useQuery({
    queryKey: ['dashboard-course-options', slug()],
    queryFn: () => apiService.get<CourseOption[] | { items?: CourseOption[] }>(`/api/admin/${slug()}/dashboard/courses/options`),
    enabled: !!slug(),
    select: (data) => {
      if (Array.isArray(data)) return data
      if (Array.isArray((data as { items?: CourseOption[] })?.items)) return (data as { items: CourseOption[] }).items
      return []
    },
  })
}

export function useNotifyPending() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (filters: Filters) => {
      const params = buildQueryParams(filters)
      const qs = params.toString()
      const url = qs
        ? `/api/admin/${slug()}/dashboard/collections/notify-pending?${qs}`
        : `/api/admin/${slug()}/dashboard/collections/notify-pending`
      return apiService.post<{ message?: string }>(url)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-collections'] })
    },
  })
}
