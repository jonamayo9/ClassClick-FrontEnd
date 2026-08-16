import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import api from '@/lib/api'
import { useAuth } from '@/stores/auth'

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

export type EventStatus = 'Draft' | 'Published' | 'Finished' | 'Cancelled'

export interface ClassClickEvent {
  id: string
  title: string
  description?: string
  imageUrl?: string
  imageFileName?: string
  imageContentType?: string
  location?: string
  /** Fecha/hora local (yyyy-MM-ddTHH:mm), lista para el DateTimePicker. */
  startsAt: string
  hasStartTime: boolean
  endsAt?: string
  hasEndTime: boolean
  status: EventStatus
  requiresTicket: boolean
  ticketPrice?: number
  capacity?: number
  maxTicketsPerStudent?: number
  salesStartAt?: string
  salesEndAt?: string
  allowDoorSales: boolean
  showOnStudentHome: boolean
  publicSalesEnabled: boolean
  publicSlug?: string
  purchaseTerms?: string | null
  applyTransferSurcharge: boolean
  /** Datos bancarios propios del evento para transferencias (opcionales). No salen de CompanyPaymentMethod. */
  transferAlias?: string | null
  transferCbu?: string | null
  transferAccountHolder?: string | null
  transferBankName?: string | null
  cancellationReason?: string | null
  publishedAtUtc?: string
  cancelledAtUtc?: string
  finishedAtUtc?: string
  createdAtUtc: string
}

export function useEvents() {
  return useQuery({
    queryKey: ['events', slug()],
    queryFn: () => apiService.get<ClassClickEvent[]>(`/api/admin/${slug()}/events`),
    enabled: !!slug(),
    select: (data) => (Array.isArray(data) ? data : []),
  })
}

export interface EventOption {
  id: string
  title: string
  startsAt: string
  status: EventStatus
}

/** Opciones livianas de eventos para selectores (filtro de pagos). Todos los estados, más recientes primero. */
export function useEventOptions() {
  return useQuery({
    queryKey: ['event-options', slug()],
    queryFn: () => apiService.get<EventOption[]>(`/api/admin/${slug()}/events/options`),
    enabled: !!slug(),
    select: (data) => (Array.isArray(data) ? data : []),
  })
}

export function useAdminEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['event', slug(), id],
    queryFn: () => apiService.get<ClassClickEvent>(`/api/admin/${slug()}/events/${id}`),
    enabled: !!id && !!slug(),
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiService.postForm(`/api/admin/${slug()}/events`, formData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }) },
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      api.put(`/api/admin/${slug()}/events/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }) },
  })
}

export function usePublishEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiService.post(`/api/admin/${slug()}/events/${id}/publish`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }) },
  })
}

export function useCancelEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiService.post(`/api/admin/${slug()}/events/${id}/cancel`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }) },
  })
}

export function useFinishEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiService.post(`/api/admin/${slug()}/events/${id}/finish`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }) },
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiService.del(`/api/admin/${slug()}/events/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }) },
  })
}

/* ─── Control de ingreso (check-in) ─── */

export interface CheckInResolve {
  studentId: string | null
  attendeeName: string
  attendeeType: string
  eventId: string
  eventTitle: string
  confirmedQuantity: number
  usedQuantity: number
  availableQuantity: number
  pendingQuantity: number
  canCheckIn: boolean
}

export interface CheckInConsume {
  consumedQuantity: number
  confirmedQuantity: number
  usedQuantity: number
  availableQuantity: number
  alreadyProcessed: boolean
}

export interface DoorSaleResult {
  purchaseId: string
  quantity: number
  unitPrice: number
  totalAmount: number
  paymentId?: string
  paymentMethod: string
  paymentAmount?: number
  isFree: boolean
  availableQuantity: number
  alreadyProcessed: boolean
}

export interface CheckInRecent {
  studentName: string
  quantity: number
  usedAtUtc: string
  usedByUserName?: string
}

export function useCheckInResolve(eventId: string | undefined) {
  return useMutation({
    mutationFn: (token: string) =>
      apiService.post<CheckInResolve>(`/api/admin/${slug()}/events/${eventId}/check-in/resolve`, { token }),
  })
}

export function useCheckInConsume(eventId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ token, quantity, requestId }: { token: string; quantity: number; requestId: string }) =>
      apiService.post<CheckInConsume>(`/api/admin/${slug()}/events/${eventId}/check-in/consume`, { token, quantity, requestId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event-checkin-recent'] }) },
  })
}

export function useDoorSale(eventId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ accessToken, quantity, paymentMethod, requestId }: { accessToken: string; quantity: number; paymentMethod: string; requestId: string }) =>
      apiService.post<DoorSaleResult>(`/api/admin/${slug()}/events/${eventId}/door-sale`, { accessToken, quantity, paymentMethod, requestId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }) },
  })
}

export interface DoorStudentSearchItem {
  studentId: string
  fullName: string
  dni?: string
  email?: string
}

export interface ManualDoorSaleResult {
  purchaseId: string
  quantity: number
  unitPrice: number
  baseAmount: number
  surchargeAmount: number
  totalAmount: number
  paymentId?: string
  paymentMethod: string
  paymentAmount?: number
  isFree: boolean
  availableQuantity: number
  alreadyProcessed: boolean
  attendeeId: string
  attendeeName: string
  attendeeType: string
  attendeeEmail?: string
  passToken?: string
  hasRecoveryEmail: boolean
}

export function useDoorStudentSearch(eventId: string | undefined, search: string) {
  return useQuery({
    queryKey: ['door-student-search', slug(), eventId, search],
    queryFn: () => {
      const params = new URLSearchParams({ search })
      return apiService.get<DoorStudentSearchItem[]>(`/api/admin/${slug()}/events/${eventId}/door-sale/student-search?${params}`)
    },
    enabled: !!eventId && !!slug() && search.trim().length >= 2,
    select: (data) => (Array.isArray(data) ? data : []),
  })
}

export function useManualDoorSale(eventId: string | undefined) {
  return useMutation({
    mutationFn: (body: {
      studentId?: string | null
      guest?: { fullName: string; email?: string; phone?: string } | null
      quantity: number
      paymentMethod: string
      requestId: string
    }) =>
      apiService.post<ManualDoorSaleResult>(`/api/admin/${slug()}/events/${eventId}/door-sale/manual`, body),
  })
}

export interface EventTransferMethod {
  configured: boolean
  alias?: string | null
  cbu?: string | null
  holderName?: string | null
  bankName?: string | null
}

export function useEventTransferMethod(eventId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['event-transfer-method', slug(), eventId],
    queryFn: () => apiService.get<EventTransferMethod>(`/api/admin/${slug()}/events/${eventId}/transfer-method`),
    enabled: !!eventId && !!slug() && enabled,
  })
}

export function useCheckInRecent(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-checkin-recent', slug(), eventId],
    queryFn: () => apiService.get<CheckInRecent[]>(`/api/admin/${slug()}/events/${eventId}/check-in/recent`),
    enabled: !!eventId && !!slug(),
    select: (data) => (Array.isArray(data) ? data : []),
    refetchInterval: 15000,
  })
}

/* ─── Reportes / Dashboard del evento ─── */

export interface EventReportSummary {
  confirmedQuantity: number
  usedQuantity: number
  availableQuantity: number
  pendingQuantity: number
  baseRevenue: number
  surchargeRevenue: number
  totalRevenue: number
  byOrigin: { origin: string; label: string; quantity: number; revenue: number }[]
  byPaymentMethod: { paymentMethod: string; label: string; quantity: number; revenue: number }[]
}

export interface EventReportTimeline {
  salesUnit: string
  checkInUnit: string
  sales: { label: string; quantity: number }[]
  checkIns: { label: string; quantity: number }[]
}

export interface EventReportSaleRow {
  purchaseId: string
  attendeeName: string
  quantity: number
  unitPrice: number
  baseAmount: number
  surchargeAmount: number
  totalAmount: number
  paymentMethod: string
  origin: string
  status: string
  createdAtUtc: string
}

export interface EventReportUsageRow {
  id: string
  attendeeName: string
  quantity: number
  usedAtUtc: string
  usedByUserName?: string
  origin: string
  adjustedQuantity?: number
  effectiveQuantity?: number
}

export interface EventReportPage<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface SalesFilter {
  page: number
  pageSize: number
  search?: string
  status?: string
  origin?: string
  paymentMethod?: string
}

export function useEventReportSummary(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-report-summary', slug(), eventId],
    queryFn: () => apiService.get<EventReportSummary>(`/api/admin/${slug()}/events/${eventId}/report/summary`),
    enabled: !!eventId && !!slug(),
    refetchInterval: 60000,
  })
}

export function useEventReportTimeline(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-report-timeline', slug(), eventId],
    queryFn: () => apiService.get<EventReportTimeline>(`/api/admin/${slug()}/events/${eventId}/report/timeline`),
    enabled: !!eventId && !!slug(),
  })
}

export function useEventReportSales(eventId: string | undefined, filter: SalesFilter) {
  return useQuery({
    queryKey: ['event-report-sales', slug(), eventId, filter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(filter.page),
        pageSize: String(filter.pageSize),
      })
      if (filter.search) params.set('search', filter.search)
      if (filter.status) params.set('status', filter.status)
      if (filter.origin) params.set('origin', filter.origin)
      if (filter.paymentMethod) params.set('paymentMethod', filter.paymentMethod)
      return apiService.get<EventReportPage<EventReportSaleRow>>(`/api/admin/${slug()}/events/${eventId}/report/sales?${params}`)
    },
    enabled: !!eventId && !!slug(),
  })
}

export function useEventReportCheckIns(eventId: string | undefined, page: number, pageSize: number, search?: string) {
  return useQuery({
    queryKey: ['event-report-checkins', slug(), eventId, page, pageSize, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (search) params.set('search', search)
      return apiService.get<EventReportPage<EventReportUsageRow>>(`/api/admin/${slug()}/events/${eventId}/report/check-ins?${params}`)
    },
    enabled: !!eventId && !!slug(),
  })
}

/* ─── Operadores de eventos ─── */

export interface EventOperatorAssignment {
  eventId: string
  eventTitle: string
  startsAtUtc: string
  hasStartTime: boolean
  location?: string
  status: EventStatus
  canCheckIn: boolean
  canSellAtDoor: boolean
}

export interface EventOperator {
  userId: string
  firstName: string
  lastName: string
  email: string
  isActive: boolean
  assignments: EventOperatorAssignment[]
}

export interface OperatorAssignmentInput {
  eventId: string
  canCheckIn: boolean
  canSellAtDoor: boolean
}

/** Evento asignado al operador autenticado (endpoint my-events). */
export interface OperatorMyEvent {
  eventId: string
  title: string
  startsAtUtc: string
  hasStartTime: boolean
  location?: string
  status: EventStatus
  canCheckIn: boolean
  canSellAtDoor: boolean
}

export function useEventOperators() {
  return useQuery({
    queryKey: ['event-operators', slug()],
    queryFn: () => apiService.get<EventOperator[]>(`/api/admin/${slug()}/event-operators`),
    enabled: !!slug(),
    select: (data) => (Array.isArray(data) ? data : []),
  })
}

export function useCreateEventOperator() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { firstName: string; lastName: string; email: string; password: string; assignments: OperatorAssignmentInput[] }) =>
      apiService.post<EventOperator>(`/api/admin/${slug()}/event-operators`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event-operators'] }) },
  })
}

export function useUpdateEventOperatorAssignments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, assignments }: { userId: string; assignments: OperatorAssignmentInput[] }) =>
      apiService.put<EventOperator>(`/api/admin/${slug()}/event-operators/${userId}/assignments`, { assignments }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event-operators'] }) },
  })
}

export function useToggleEventOperator() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      apiService.put<EventOperator>(`/api/admin/${slug()}/event-operators/${userId}/toggle-active`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event-operators'] }) },
  })
}

/** Eventos asignados al operador autenticado (Home del operador). */
export function useOperatorMyEvents() {
  return useQuery({
    queryKey: ['operator-my-events', slug()],
    queryFn: () => apiService.get<OperatorMyEvent[]>(`/api/admin/${slug()}/event-operator/my-events`),
    enabled: !!slug(),
    select: (data) => (Array.isArray(data) ? data : []),
  })
}

/** Permiso del usuario autenticado sobre un evento (gate de la UI de check-in). */
export function useEventOperatorPermission(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-operator-permission', slug(), eventId],
    queryFn: () => apiService.get<{ isOperator: boolean; canCheckIn: boolean; canSellAtDoor: boolean }>(
      `/api/admin/${slug()}/event-operator/events/${eventId}`,
    ),
    enabled: !!eventId && !!slug(),
  })
}

/* ─── Operaciones del evento (reenvío de acceso + corrección auditada de check-in) ─── */

export function useResendEventAccess(eventId: string | undefined) {
  return useMutation({
    mutationFn: (purchaseId: string) =>
      apiService.post<{ message: string; email?: string }>(`/api/admin/${slug()}/events/${eventId}/purchases/${purchaseId}/resend-access`),
  })
}

export function useAdjustEventUsage(eventId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ usageId, correctQuantity, reason }: { usageId: string; correctQuantity: number; reason: string }) =>
      apiService.post(`/api/admin/${slug()}/events/${eventId}/operations/check-ins/${usageId}/adjust`, { correctQuantity, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-report-summary'] })
      qc.invalidateQueries({ queryKey: ['event-report-checkins'] })
    },
  })
}

export async function downloadEventReport(eventId: string, format: 'xlsx' | 'pdf') {
  const blob = await apiService.getBlob(`/api/admin/${slug()}/events/${eventId}/report/export?format=${format}`)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `evento-reporte.${format === 'xlsx' ? 'xlsx' : 'pdf'}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
