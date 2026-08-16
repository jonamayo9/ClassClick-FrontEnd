import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Ticket, CalendarDays, MapPin } from 'lucide-react'
import { apiService, getApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { imgUrl } from '@/lib/media'

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const money = (v?: number | null) => (v == null ? 'Gratis' : ARS.format(v))

export interface PublicEvent {
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
  availability: 'Available' | 'SalesNotStarted' | 'SalesEnded' | 'EventEnded' | 'SoldOut'
  canPurchase: boolean
  remainingTickets?: number | null
  maxTicketsPerBuyer?: number | null
  salesStartAtUtc?: string
  salesEndAtUtc?: string
  publicSalesEnabled: boolean
  status: string
  noPaymentMethodsReason?: string | null
  purchaseTerms?: string | null
  organizerName: string
  organizerLogoUrl?: string | null
}

function formatDate(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export default function PublicEventPage() {
  const { publicSlug } = useParams<{ publicSlug: string }>()
  const navigate = useNavigate()

  const { data: event, isLoading, isError } = useQuery({
    queryKey: ['public-event', publicSlug],
    queryFn: () => apiService.get<PublicEvent>(`/api/public/events/${publicSlug}`),
    enabled: !!publicSlug,
  })

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [recoverOpen, setRecoverOpen] = useState(false)
  const [recoverEmail, setRecoverEmail] = useState('')
  const [recoverSent, setRecoverSent] = useState(false)
  const [recoverError, setRecoverError] = useState('')
  const [recoverBusy, setRecoverBusy] = useState(false)

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>

  if (isError || !event) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
        <span className="text-4xl">🎪</span>
        <h1 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Evento no encontrado</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">El enlace no es válido o el evento ya no está disponible.</p>
      </div>
    )
  }

  const maxQty = event.maxTicketsPerBuyer ?? 20
  const total = event.requiresTicket ? Number(((event.ticketPrice ?? 0) * quantity).toFixed(2)) : 0
  const unavailable = !event.publicSalesEnabled || event.status !== 'Published' || !event.canPurchase

  const statusInfo = getStatusInfo(event)

  const heroImage = event.imageUrl ? imgUrl(event.imageUrl) : null
  const logo = event.organizerLogoUrl ? imgUrl(event.organizerLogoUrl) : null

  async function handleContinue() {
    if (busy || !event) return
    setError('')
    if (!fullName.trim()) { setError('Ingresá tu nombre y apellido.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Ingresá un email válido.'); return }
    if (event.purchaseTerms && !termsAccepted) { setError('Debés aceptar las condiciones del evento para continuar.'); return }

    setBusy(true)
    try {
      const result = await apiService.post<{ accessUrl: string }>(`/api/public/events/${publicSlug}/purchases`, {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        quantity,
        requestId: crypto.randomUUID(),
        termsAccepted,
      })
      navigate(result.accessUrl.replace(window.location.origin, ''))
    } catch (err: unknown) {
      setError(getApiError(err) || 'No se pudo completar la reserva.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRecover() {
    if (recoverBusy) return
    setRecoverError('')
    setRecoverSent(false)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoverEmail.trim())) {
      setRecoverError('Ingresá un email válido.')
      return
    }
    setRecoverBusy(true)
    try {
      await apiService.post(`/api/public/events/${publicSlug}/recover-access`, { email: recoverEmail.trim() })
      setRecoverSent(true)
      setRecoverEmail('')
    } catch {
      setRecoverError('No se pudo procesar la solicitud. Intentá nuevamente.')
    } finally {
      setRecoverBusy(false)
    }
  }

  const dateLine = formatDate(event.startsAtUtc) + (event.hasStartTime ? ` · ${formatTime(event.startsAtUtc)}` : '')

  return (
    <div className="min-h-screen bg-slate-50 pb-16 dark:bg-slate-950">
      {/* Header branding */}
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {logo ? (
              <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                <Ticket className="h-5 w-5" />
              </span>
            )}
            <span className="truncate text-sm font-black tracking-tight text-slate-900 dark:text-white">
              {event.organizerName || 'Evento'}
            </span>
          </div>
          <span className="hidden shrink-0 text-[11px] font-medium text-slate-400 dark:text-slate-500 sm:block">
            Gestionado con ClassClick
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6">
        {/* Hero */}
        <div className="relative h-48 overflow-hidden rounded-2xl sm:h-60 md:h-72 lg:h-80">
          {heroImage ? (
            <img src={heroImage} alt={event.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800">
              <div className="flex flex-col items-center gap-2 text-center text-white/90">
                <Ticket className="h-10 w-10 opacity-80" />
                <span className="max-w-md px-6 text-lg font-black tracking-tight sm:text-xl">{event.title}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
          {/* Columna izquierda: información */}
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">{event.title}</h1>

            <div className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{dateLine}</span>
              </p>
              {event.location && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>{event.location}</span>
                </p>
              )}
            </div>

            {event.status === 'Cancelled' && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                Este evento fue cancelado.
              </div>
            )}

            {event.description && (
              <section className="mt-6 max-w-2xl">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Sobre el evento</h2>
                <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-slate-700 dark:text-slate-300">{event.description}</p>
              </section>
            )}

            {event.purchaseTerms && (
              <section className="mt-6 max-w-2xl">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Condiciones del evento</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-400">{event.purchaseTerms}</p>
              </section>
            )}
          </div>

          {/* Columna derecha: compra */}
          <div className="lg:sticky lg:top-20">
            {unavailable ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <span className="text-2xl">{statusInfo.icon}</span>
                <p className="mt-2 text-sm font-black text-slate-900 dark:text-white">{statusInfo.title}</p>
                {statusInfo.description && <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{statusInfo.description}</p>}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Tu entrada</p>

                <div className="mt-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Entrada general</p>
                  <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                    {event.requiresTicket ? `${money(event.ticketPrice)} por persona` : 'Entrada gratuita'}
                  </p>
                </div>

                <div className="mt-4">
                  <label htmlFor="event-qty" className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">Cantidad</label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1 || busy}
                      aria-label="Restar una entrada"
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-lg font-bold text-slate-700 disabled:opacity-30 dark:border-slate-600 dark:text-slate-200">−</button>
                    <input id="event-qty" aria-label="Cantidad de entradas"
                      inputMode="numeric" value={quantity} onChange={(e) => setQuantity(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))}
                      className="w-14 text-center text-xl font-black text-slate-900 outline-none dark:text-white" />
                    <button type="button" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty || busy}
                      aria-label="Sumar una entrada"
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-lg font-bold text-slate-700 disabled:opacity-30 dark:border-slate-600 dark:text-slate-200">+</button>
                  </div>
                </div>

                {event.requiresTicket && (
                  <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span>Subtotal</span>
                      <span className="font-semibold">{money(total)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 text-base font-black text-slate-900 dark:text-white">
                      <span>TOTAL</span>
                      <span>{money(total)}</span>
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <div>
                    <label htmlFor="event-name" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Nombre y apellido *</label>
                    <Input id="event-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Pérez" />
                  </div>
                  <div>
                    <label htmlFor="event-email" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Email *</label>
                    <Input id="event-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@mail.com" />
                  </div>
                  <div>
                    <label htmlFor="event-phone" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Teléfono</label>
                    <Input id="event-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opcional" />
                  </div>
                </div>

                {event.purchaseTerms && (
                  <label className="mt-4 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                    <span>Leí y acepto las condiciones del evento.</span>
                  </label>
                )}

                {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

                <Button className="mt-4 w-full bg-violet-600 text-white hover:bg-violet-700" loading={busy} onClick={handleContinue}>
                  {event.requiresTicket ? 'CONTINUAR' : 'RESERVAR LUGAR'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Recuperación discreta */}
        <div className="mt-10 border-t border-slate-200 pt-6 text-center dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">¿Ya compraste entradas?</p>
          {!recoverOpen ? (
            <button type="button" onClick={() => setRecoverOpen(true)}
              className="mt-2 text-sm font-bold text-violet-600 hover:underline dark:text-violet-400">
              Recuperar acceso
            </button>
          ) : (
            <div className="mx-auto mt-3 max-w-sm space-y-2">
              <div className="flex gap-2">
                <Input type="email" value={recoverEmail} onChange={(e) => setRecoverEmail(e.target.value)} placeholder="Tu email" />
                <Button className="shrink-0 bg-violet-600 text-white hover:bg-violet-700" loading={recoverBusy} onClick={handleRecover}>
                  Enviar
                </Button>
              </div>
              {recoverError && <p className="text-xs text-red-600">{recoverError}</p>}
              {recoverSent && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Si encontramos una compra asociada a ese correo, te enviaremos un enlace para acceder a tus entradas.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function getStatusInfo(event: PublicEvent): { icon: string; title: string; description?: string } {
  if (event.status === 'Cancelled') return { icon: '🚫', title: 'Este evento fue cancelado.' }
  if (event.status === 'Finished' || event.availability === 'EventEnded') return { icon: '🏁', title: 'Este evento ya finalizó.' }
  if (event.availability === 'SalesNotStarted') {
    return {
      icon: '🕒',
      title: 'La venta todavía no comenzó',
      description: event.salesStartAtUtc
        ? `Las entradas estarán disponibles desde el ${formatDate(event.salesStartAtUtc)}${event.hasStartTime ? ` ${formatTime(event.salesStartAtUtc)}` : ''}.`
        : undefined,
    }
  }
  if (event.availability === 'SalesEnded') return { icon: '🔒', title: 'La venta de entradas finalizó.' }
  if (event.availability === 'SoldOut') return { icon: '😔', title: 'Entradas agotadas.' }
  if (event.noPaymentMethodsReason) return { icon: '🔒', title: 'La compra online no está disponible en este momento.' }
  if (!event.publicSalesEnabled) return { icon: '🔒', title: 'La venta pública está deshabilitada.' }
  return { icon: '🎟️', title: 'La compra no está disponible en este momento.' }
}
