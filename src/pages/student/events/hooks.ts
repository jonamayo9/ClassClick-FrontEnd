import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { hasModule } from '@/hooks/useModule'

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

export type EventAvailability = 'Available' | 'SalesNotStarted' | 'SalesEnded' | 'EventEnded' | 'SoldOut'

export interface StudentEvent {
  id: string
  title: string
  description?: string
  imageUrl?: string
  location?: string
  startsAtUtc: string
  endsAtUtc?: string
  hasStartTime: boolean
  hasEndTime: boolean
  requiresTicket: boolean
  ticketPrice?: number
  capacity?: number
  maxTicketsPerStudent?: number
  salesStartAtUtc?: string
  salesEndAtUtc?: string
  showOnStudentHome: boolean
  availability: EventAvailability
  canPurchase: boolean
  purchaseTerms?: string | null
  applyTransferSurcharge: boolean
  /** Datos bancarios propios del evento para transferencias (opcionales). No salen de CompanyPaymentMethod. */
  transferAlias?: string | null
  transferCbu?: string | null
  transferAccountHolder?: string | null
  transferBankName?: string | null
  remainingTickets?: number | null
  remainingForStudent?: number | null
}

export function useStudentEvents() {
  return useQuery({
    queryKey: ['student-events', slug()],
    queryFn: () => apiService.get<StudentEvent[]>(`/api/student/${slug()}/events`),
    enabled: !!slug() && hasModule('events'),
    select: (data) => (Array.isArray(data) ? data : []),
  })
}

export function useStudentFeaturedEvents() {
  return useQuery({
    queryKey: ['student-events-featured', slug()],
    queryFn: () => apiService.get<StudentEvent[]>(`/api/student/${slug()}/events/featured`),
    enabled: !!slug() && hasModule('events'),
    select: (data) => (Array.isArray(data) ? data : []),
  })
}

export function useStudentEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['student-event', slug(), id],
    queryFn: () => apiService.get<StudentEvent>(`/api/student/${slug()}/events/${id}`),
    // Pasando id = undefined se deshabilita (usado en el detalle historial, donde el evento no está publicado).
    enabled: !!id && !!slug() && hasModule('events'),
  })
}

/* ─── Formatters ─── */

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export function money(value?: number | null): string {
  if (value == null) return 'Gratis'
  return ARS.format(value)
}

export function formatEventDate(v?: string | null): string {
  if (!v) return ''
  return new Date(v).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatEventTime(v?: string | null): string {
  if (!v) return ''
  return new Date(v).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export function formatEventDateTime(v?: string | null, hasTime = true): string {
  if (!v) return ''
  return `${formatEventDate(v)}${hasTime ? ` · ${formatEventTime(v)}` : ''}`
}

/** Ej: "23 Ago · 20:00" (con hora) o "23 Ago" (solo fecha, sin año actual). */
export function formatEventShort(v?: string | null, hasTime = true): string {
  if (!v) return ''
  const d = new Date(v)
  const date = d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
  if (!hasTime) return date
  const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

export const AVAILABILITY_LABEL: Record<EventAvailability, string> = {
  Available: 'Venta abierta',
  SalesNotStarted: 'Próximamente',
  SalesEnded: 'Venta finalizada',
  EventEnded: 'Evento finalizado',
  SoldOut: 'Entradas agotadas',
}

/* ─── Días restantes (calendario Argentina) ─── */

const ARGENTINA_TZ = 'America/Argentina/Buenos_Aires'

/** Fecha calendario (YYYY-MM-DD) en timezone Argentina de un instante UTC. */
export function argentinaDateKey(utcIso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(utcIso))
}

/**
 * Días calendario en Argentina desde hoy hasta la fecha local del evento.
 * 0 = hoy · 1 = mañana · negativo = ya pasó. Evita off-by-one por DST/hora.
 */
export function daysUntilArgentina(utcIso: string): number {
  const today = argentinaDateKey(new Date().toISOString())
  const target = argentinaDateKey(utcIso)
  const startOfToday = Date.UTC(
    Number(today.slice(0, 4)),
    Number(today.slice(5, 7)) - 1,
    Number(today.slice(8, 10)),
  )
  const startOfEvent = Date.UTC(
    Number(target.slice(0, 4)),
    Number(target.slice(5, 7)) - 1,
    Number(target.slice(8, 10)),
  )
  return Math.round((startOfEvent - startOfToday) / 86_400_000)
}

/** Headline del recordatorio de Home según días restantes. */
export function buildEventReminderHeadline(eventTitle: string, startsAtUtc: string, hasStartTime: boolean, days: number): string {
  if (days === 0) {
    return hasStartTime
      ? `¡Hoy es ${eventTitle}! · ${formatEventTime(startsAtUtc)}`
      : `¡Hoy es ${eventTitle}!`
  }
  if (days === 1) return `Falta 1 día para ${eventTitle}`
  return `Faltan ${days} días para ${eventTitle}`
}

/** Cantidad de entradas disponibles (AvailableQuantity real del balance). */
export function buildAvailableTicketsText(available: number): string {
  return `Ya tenés ${available} entrada${available === 1 ? '' : 's'} disponible${available === 1 ? '' : 's'}.`
}

/* ─── Compras / reservas ─── */

export type EventPurchaseStatus =
  | 'PendingPayment'
  | 'PendingReview'
  | 'Paid'
  | 'Confirmed'
  | 'Expired'
  | 'Rejected'
  | 'Cancelled'

export interface EventPurchase {
  id: string
  eventId: string
  eventTitle: string
  quantity: number
  unitPrice: number
  totalAmount: number
  status: EventPurchaseStatus
  origin: string
  expiresAtUtc?: string
  paymentId?: string
  paymentMethodName?: string
  createdAtUtc: string
  confirmedAtUtc?: string
}

export interface PaymentMethodOption {
  companyPaymentMethodId: string
  paymentMethod: string
  paymentMethodName: string
  surchargeType?: number
  surchargeValue: number
  instructions?: string
  alias?: string
  cbu?: string
  holderName?: string
  bankName?: string
  mercadoPagoIsConnected: boolean
}

export interface CreateEventPurchaseResult {
  purchase: EventPurchase
  availablePaymentMethods: PaymentMethodOption[]
}

export interface StudentEventPurchasesGroup {
  eventId: string
  eventTitle: string
  imageUrl?: string
  startsAtUtc: string
  confirmedQuantity: number
  pendingQuantity: number
  purchases: EventPurchase[]
}

export function useCreateEventPurchase(eventId: string | undefined) {
  return useMutation({
    mutationFn: ({ quantity, termsAccepted }: { quantity: number; termsAccepted: boolean }) =>
      apiService.post<CreateEventPurchaseResult>(`/api/student/${slug()}/events/${eventId}/purchases`, { quantity, termsAccepted }),
  })
}

export function useStudentEventPurchases(eventId?: string) {
  return useQuery({
    queryKey: ['student-event-purchases', slug(), eventId],
    queryFn: () => apiService.get<StudentEventPurchasesGroup[]>(
      `/api/student/${slug()}/event-purchases${eventId ? `?eventId=${eventId}` : ''}`,
    ),
    enabled: !!slug() && hasModule('events'),
    select: (data) => (Array.isArray(data) ? data : []),
  })
}

export function useStudentEventPurchase(purchaseId: string | undefined) {
  return useQuery({
    queryKey: ['student-event-purchase', slug(), purchaseId],
    queryFn: () => apiService.get<EventPurchase>(`/api/student/${slug()}/event-purchases/${purchaseId}`),
    enabled: !!purchaseId && !!slug() && hasModule('events'),
  })
}

export function useSubmitEventProof() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ purchaseId, companyPaymentMethodId, file }: { purchaseId: string; companyPaymentMethodId: string; file: File }) => {
      const fd = new FormData()
      fd.append('companyPaymentMethodId', companyPaymentMethodId)
      fd.append('file', file)
      return apiService.postForm(`/api/student/${slug()}/event-purchases/${purchaseId}/proof`, fd)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student-event-purchases'] }) },
  })
}

export function useStartEventMercadoPagoCheckout() {
  return useMutation({
    mutationFn: (purchaseId: string) =>
      apiService.post<{ paymentAttemptId: string; initPoint?: string; expiresAtUtc: string }>(
        `/api/student/${slug()}/event-purchases/${purchaseId}/mercadopago/checkout`,
      ),
  })
}

export function useValidateEventMercadoPago() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (purchaseId: string) =>
      apiService.post(`/api/student/${slug()}/event-purchases/${purchaseId}/mercadopago/validate-status`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student-event-purchases'] }) },
  })
}

export const PURCHASE_STATUS_LABEL: Record<EventPurchaseStatus, string> = {
  PendingPayment: 'Pendiente de pago',
  PendingReview: 'En revisión',
  Paid: 'Pagada',
  Confirmed: 'Confirmada',
  Expired: 'Vencida',
  Rejected: 'Rechazada',
  Cancelled: 'Cancelada',
}

/* ─── Mis entradas + QR ─── */

export type EventTicketScope = 'current' | 'history'

export type EventStatus = 'Draft' | 'Published' | 'Finished' | 'Cancelled'

export interface StudentMyTickets {
  eventId: string
  eventTitle: string
  imageUrl?: string
  startsAtUtc: string
  hasStartTime: boolean
  location?: string
  confirmedQuantity: number
  pendingQuantity: number
  usedQuantity: number
  availableQuantity: number
  canViewQr: boolean
  isCancelled: boolean
  isFinished: boolean
  /** True si la fecha funcional del evento ya terminó aunque el Status siga Published (misma regla que EventEnded). */
  isEventEnded: boolean
  status: EventStatus
}

export interface StudentMyTicketsDetail extends StudentMyTickets {
  endsAtUtc?: string
  hasEndTime: boolean
  description?: string
  requiresTicket: boolean
  ticketPrice?: number
  purchases: EventPurchase[]
}

/**
 * Clasifica un item de "Mis entradas" como "anterior": Finalizado, Cancelado o
 * con fecha funcional vencida (EventEnded derivado). Reutiliza los flags del backend,
 * no duplica reglas de fecha en el frontend.
 */
export function isPastEvent(item: Pick<StudentMyTickets, 'isCancelled' | 'isFinished' | 'isEventEnded'>): boolean {
  return item.isCancelled || item.isFinished || item.isEventEnded
}

export interface EventAccessPass {
  eventId: string
  eventTitle: string
  startsAtUtc: string
  location?: string
  confirmedQuantity: number
  pendingQuantity: number
  usedQuantity: number
  availableQuantity: number
  qrValue: string
}

export function useStudentMyTickets() {
  return useQuery({
    queryKey: ['student-my-tickets', slug()],
    queryFn: () => apiService.get<StudentMyTickets[]>(`/api/student/${slug()}/events/my-tickets`),
    enabled: !!slug() && hasModule('events'),
    select: (data) => (Array.isArray(data) ? data : []),
  })
}

export function useStudentMyTicketsDetail(eventId: string | undefined) {
  return useQuery({
    queryKey: ['student-my-tickets-detail', slug(), eventId],
    queryFn: () => apiService.get<StudentMyTicketsDetail>(`/api/student/${slug()}/events/${eventId}/my-tickets`),
    enabled: !!eventId && !!slug() && hasModule('events'),
  })
}

export function useEventAccessPass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (eventId: string) =>
      apiService.post<EventAccessPass>(`/api/student/${slug()}/events/${eventId}/access-pass`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student-my-tickets'] }) },
  })
}
