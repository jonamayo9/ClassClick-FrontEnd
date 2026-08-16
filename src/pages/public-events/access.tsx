import { useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { Ticket, CalendarDays, MapPin } from 'lucide-react'
import { EventMethodIcon, EventTransferDetails } from '@/components/events/payment'
import { computeMethodSurcharge } from '@/lib/event-payment-helpers'
import { apiService, getApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { imgUrl } from '@/lib/media'

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const money = (v?: number | null) => (v == null ? 'Gratis' : ARS.format(v))

export interface PublicPaymentMethod {
  id: string
  code: 'MercadoPago' | 'Transfer'
  label: string
  surchargeType: 0 | 1 | 2
  surchargeValue: number
  instructions?: string
  alias?: string
  cbu?: string
  holderName?: string
  bankName?: string
  mercadoPagoConnected?: boolean
}

export interface PublicAccessPurchase {
  purchaseId: string
  quantity: number
  unitPrice: number
  totalAmount: number
  status: string
  origin: string
  createdAtUtc: string
}

export interface PublicAccessData {
  eventTitle: string
  startsAtUtc: string
  hasStartTime: boolean
  location?: string
  attendeeName: string
  attendeeEmail?: string
  requiresTicket: boolean
  eventStatus: string
  publicSlug?: string
  cancellationReason?: string | null
  confirmedQuantity: number
  pendingQuantity: number
  usedQuantity: number
  availableQuantity: number
  canViewQr: boolean
  applyTransferSurcharge: boolean
  purchases: PublicAccessPurchase[]
  availablePaymentMethods?: PublicPaymentMethod[]
  organizerName: string
  organizerLogoUrl?: string | null
}

const STATUS_LABEL: Record<string, string> = {
  PendingPayment: 'Pago pendiente',
  PendingReview: 'En revisión',
  Paid: 'Pagada',
  Confirmed: 'Confirmada',
  Expired: 'Reserva vencida',
  Rejected: 'Pago rechazado',
  Cancelled: 'Cancelada',
}

function formatDate(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export default function PublicEventAccessPage() {
  const { token } = useParams<{ token: string }>()
  const [qrOpen, setQrOpen] = useState(false)
  const [qr, setQr] = useState<{ value: string; available: number } | null>(null)
  const [qrError, setQrError] = useState('')
  const [qrLoading, setQrLoading] = useState(false)
  const [mpLoadingId, setMpLoadingId] = useState<string | null>(null)
  const [mpError, setMpError] = useState('')
  const [proofFor, setProofFor] = useState<string | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofError, setProofError] = useState('')
  const [proofUploading, setProofUploading] = useState(false)
  const [proofDoneFor, setProofDoneFor] = useState<string | null>(null)
  const [buyMoreOpen, setBuyMoreOpen] = useState(false)
  const [buyMoreQty, setBuyMoreQty] = useState(1)
  const [buyMoreError, setBuyMoreError] = useState('')
  const [buyMoreBusy, setBuyMoreBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const queryClient = useQueryClient()

  const { data: access, isLoading, isError } = useQuery({
    queryKey: ['public-event-access', token],
    queryFn: () => apiService.get<PublicAccessData>(`/api/public/event-access/${token}`),
    enabled: !!token,
  })

  const startMp = useMutation({
    mutationFn: (purchaseId: string) =>
      apiService.post<{ initPoint?: string }>(`/api/public/event-access/${token}/purchases/${purchaseId}/mercadopago/checkout`),
    onSuccess: (result) => {
      setMpLoadingId(null)
      if (result.initPoint) {
        window.location.href = result.initPoint
      } else {
        setMpError('No se pudo iniciar el pago. Intentá nuevamente.')
      }
    },
    onError: (err: unknown) => {
      setMpLoadingId(null)
      setMpError(getApiError(err))
    },
  })

  async function payWithMercadoPago(purchaseId: string) {
    setMpError('')
    setMpLoadingId(purchaseId)
    startMp.mutate(purchaseId)
  }

  async function buyMore() {
    if (!token || buyMoreBusy) return
    setBuyMoreError('')
    setBuyMoreBusy(true)
    try {
      await apiService.post(`/api/public/event-access/${token}/purchases`, {
        quantity: buyMoreQty,
        requestId: crypto.randomUUID(),
        termsAccepted: true,
      })
      setBuyMoreOpen(false)
      setBuyMoreQty(1)
      queryClient.invalidateQueries({ queryKey: ['public-event-access', token] })
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data
      setBuyMoreError(response?.message || getApiError(err) || 'No se pudo completar la reserva.')
    } finally {
      setBuyMoreBusy(false)
    }
  }

  async function submitProof(purchaseId: string, methodId: string) {
    if (!proofFile) {
      setProofError('Seleccioná el comprobante de la transferencia.')
      return
    }
    setProofError('')
    setProofUploading(true)
    try {
      const form = new FormData()
      form.append('companyPaymentMethodId', methodId)
      form.append('file', proofFile)
      await apiService.postForm(`/api/public/event-access/${token}/purchases/${purchaseId}/proof`, form)
      setProofFile(null)
      setProofFor(null)
      setProofDoneFor(purchaseId)
      if (fileRef.current) fileRef.current.value = ''
      queryClient.invalidateQueries({ queryKey: ['public-event-access', token] })
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data
      setProofError(response?.message || getApiError(err) || 'No se pudo enviar el comprobante.')
    } finally {
      setProofUploading(false)
    }
  }

  async function openQr() {
    if (!token) return
    setQrError('')
    setQr(null)
    setQrLoading(true)
    try {
      const result = await apiService.get<{ qrValue: string; availableQuantity: number }>(`/api/public/event-access/${token}/qr`)
      setQr({ value: result.qrValue, available: result.availableQuantity })
      setQrOpen(true)
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data
      setQrError(response?.message || getApiError(err) || 'No se pudo generar tu código de acceso.')
    } finally {
      setQrLoading(false)
    }
  }

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>

  if (isError || !access) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
        <span className="text-4xl">🔒</span>
        <h1 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Enlace no válido</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">El enlace de acceso no es válido o ya no está disponible.</p>
      </div>
    )
  }

  const eventCancelled = access.eventStatus === 'Cancelled'
  const canOperate = access.eventStatus === 'Published'
  const logo = access.organizerLogoUrl ? imgUrl(access.organizerLogoUrl) : null

  const pendingPayment = access.purchases.filter((p) => p.status === 'PendingPayment')
  const inReview = access.purchases.filter((p) => p.status === 'PendingReview')
  const rejected = access.purchases.filter((p) => p.status === 'Rejected')
  const expired = access.purchases.filter((p) => p.status === 'Expired')

  const primaryState: 'confirmed' | 'pending' | 'review' | 'rejected' | 'expired' | 'cancelled' | 'none' =
    eventCancelled ? 'cancelled'
      : access.confirmedQuantity > 0 && access.canViewQr ? 'confirmed'
        : inReview.length > 0 ? 'review'
          : pendingPayment.length > 0 ? 'pending'
            : rejected.length > 0 ? 'rejected'
              : expired.length > 0 ? 'expired'
                : access.confirmedQuantity > 0 ? 'confirmed'
                  : 'none'

  const dateLine = formatDate(access.startsAtUtc) + (access.hasStartTime ? ` · ${formatTime(access.startsAtUtc)}` : '')

  return (
    <div className="min-h-screen bg-slate-50 pb-16 dark:bg-slate-950">
      {/* Header branding */}
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {logo ? (
              <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                <Ticket className="h-5 w-5" />
              </span>
            )}
            <span className="truncate text-sm font-black tracking-tight text-slate-900 dark:text-white">
              {access.organizerName || 'Evento'}
            </span>
          </div>
          <span className="hidden shrink-0 text-[11px] font-medium text-slate-400 dark:text-slate-500 sm:block">
            Gestionado con ClassClick
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-6">
        {/* Evento */}
        <div className="flex items-start gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">{access.eventTitle}</h1>
            <div className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-400">
              <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0 text-slate-400" /><span>{dateLine}</span></p>
              {access.location && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-slate-400" /><span>{access.location}</span></p>}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-violet-50 px-4 py-3 dark:bg-violet-950/20">
          <p className="text-sm font-bold text-violet-800 dark:text-violet-200">Hola, {access.attendeeName}</p>
          {access.attendeeEmail && <p className="text-xs text-violet-600 dark:text-violet-400">{access.attendeeEmail}</p>}
        </div>

        {/* Estado principal */}
        <div className="mt-4">
          {primaryState === 'cancelled' && (
            <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm dark:border-red-900/50 dark:bg-slate-900">
              <span className="text-3xl">🚫</span>
              <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">EVENTO CANCELADO</p>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                La institución canceló este evento. Las entradas ya no son válidas para el ingreso.
              </p>
              {access.cancellationReason && (
                <div className="mx-auto mt-3 max-w-sm rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                  <p className="text-[11px] font-bold uppercase tracking-widest">Motivo</p>
                  <p className="mt-0.5">{access.cancellationReason}</p>
                </div>
              )}
            </div>
          )}

          {primaryState === 'confirmed' && (
            <div className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm dark:border-emerald-900/50 dark:bg-slate-900">
              <span className="text-3xl">🎉</span>
              <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">ENTRADAS CONFIRMADAS</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {access.availableQuantity} {access.availableQuantity === 1 ? 'entrada disponible' : 'entradas disponibles'}
              </p>
              {qrLoading ? (
                <div className="mt-4 flex justify-center py-3"><Spinner className="h-7 w-7 text-violet-600" /></div>
              ) : (
                <Button className="mt-4 w-full bg-violet-600 text-white hover:bg-violet-700" disabled={!access.canViewQr || !canOperate} onClick={openQr}>
                  VER MIS ENTRADAS
                </Button>
              )}
              {!canOperate && (
                <p className="mt-2 text-xs text-slate-400">El QR estará disponible en el ingreso del evento.</p>
              )}
            </div>
          )}

          {primaryState === 'review' && (
            <div className="rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm dark:border-amber-900/50 dark:bg-slate-900">
              <span className="text-3xl">⏳</span>
              <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">COMPROBANTE EN REVISIÓN</p>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                Recibimos tu comprobante. La institución está revisando el pago.
              </p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                {inReview.reduce((a, p) => a + p.quantity, 0)} {inReview.reduce((a, p) => a + p.quantity, 0) === 1 ? 'entrada' : 'entradas'} · Total {money(inReview.reduce((a, p) => a + p.totalAmount, 0))}
              </p>
            </div>
          )}

          {primaryState === 'pending' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="text-center">
                <span className="text-3xl">💳</span>
                <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">PAGO PENDIENTE</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {pendingPayment.reduce((a, p) => a + p.quantity, 0)} {pendingPayment.reduce((a, p) => a + p.quantity, 0) === 1 ? 'entrada reservada' : 'entradas reservadas'} · Total {money(pendingPayment.reduce((a, p) => a + p.totalAmount, 0))}
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {pendingPayment.map((p) => (
                  <div key={p.purchaseId} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Elegí cómo pagar</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {p.quantity} {p.quantity === 1 ? 'entrada' : 'entradas'} · {money(p.totalAmount)}
                    </p>
                    <div className="mt-3 space-y-2">
                      {access.availablePaymentMethods?.map((method) => (
                        <PaymentMethodOption
                          key={method.id}
                          method={method}
                          total={p.totalAmount}
                          applyTransferSurcharge={access.applyTransferSurcharge}
                          mpLoading={mpLoadingId === p.purchaseId}
                          mpError={mpLoadingId === p.purchaseId ? '' : mpError}
                          proofFor={proofFor}
                          proofDoneFor={proofDoneFor}
                          proofFile={proofFile}
                          proofError={proofError}
                          proofUploading={proofUploading}
                          fileRef={fileRef}
                          onPayMp={() => payWithMercadoPago(p.purchaseId)}
                          onSelectProof={() => { setProofError(''); setProofFile(null); setProofFor(p.purchaseId) }}
                          onCancelProof={() => { setProofFor(null); setProofFile(null); setProofError('') }}
                          onPickFile={(f) => setProofFile(f)}
                          onSubmitProof={() => submitProof(p.purchaseId, method.id)}
                        />
                      ))}
                      {(access.availablePaymentMethods?.length ?? 0) === 0 && (
                        <p className="text-xs text-slate-400">La institución no habilitó medios de pago para venta pública.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {primaryState === 'rejected' && (
            <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm dark:border-red-900/50 dark:bg-slate-900">
              <span className="text-3xl">✖️</span>
              <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">PAGO RECHAZADO</p>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                La institución rechazó el comprobante enviado.
              </p>
              {canOperate && access.publicSlug && (
                <Link to={`/e/${access.publicSlug}`} className="mt-4 inline-flex items-center justify-center rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-700">
                  Realizar una nueva reserva
                </Link>
              )}
            </div>
          )}

          {primaryState === 'expired' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <span className="text-3xl">⏰</span>
              <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">RESERVA VENCIDA</p>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                El tiempo disponible para completar el pago terminó.
              </p>
              {canOperate && access.publicSlug && (
                <Link to={`/e/${access.publicSlug}`} className="mt-4 inline-flex items-center justify-center rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-700">
                  Reservar nuevamente
                </Link>
              )}
            </div>
          )}

          {primaryState === 'none' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Todavía no tenés entradas confirmadas para este evento.</p>
            </div>
          )}
        </div>

        {/* Historial de compras */}
        {access.purchases.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Tus compras</p>
            <div className="mt-2 space-y-2">
              {access.purchases.map((p) => (
                <div key={p.purchaseId} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{p.quantity} {p.quantity === 1 ? 'entrada' : 'entradas'}</p>
                    <p className="text-xs text-slate-400">{p.origin === 'PublicOnline' ? 'Venta pública' : p.origin} · {money(p.totalAmount)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusPill(p.status)}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resumen */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <MiniStat label="Confirmadas" value={access.confirmedQuantity} />
          <MiniStat label="Pendientes" value={access.pendingQuantity} />
          <MiniStat label="Disponibles" value={access.availableQuantity} tone="ok" />
        </div>

        {/* Comprar más (secundario) */}
        {canOperate && (
          <div className="mt-6">
            {!buyMoreOpen ? (
              <Button variant="outline" className="w-full" onClick={() => setBuyMoreOpen(true)}>Comprar más entradas</Button>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Comprar más entradas</p>
                <div className="mt-2 flex items-center gap-3">
                  <button type="button" onClick={() => setBuyMoreQty((q) => Math.max(1, q - 1))} disabled={buyMoreQty <= 1 || buyMoreBusy}
                    aria-label="Restar"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-lg font-bold text-slate-700 disabled:opacity-30 dark:border-slate-600 dark:text-slate-200">−</button>
                  <span className="w-12 text-center text-xl font-black text-slate-900 dark:text-white">{buyMoreQty}</span>
                  <button type="button" onClick={() => setBuyMoreQty((q) => Math.min(20, q + 1))} disabled={buyMoreQty >= 20 || buyMoreBusy}
                    aria-label="Sumar"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-lg font-bold text-slate-700 disabled:opacity-30 dark:border-slate-600 dark:text-slate-200">+</button>
                  <Button className="ml-auto bg-violet-600 text-white hover:bg-violet-700" loading={buyMoreBusy} onClick={buyMore}>Reservar</Button>
                </div>
                {buyMoreError && <p className="mt-2 text-xs text-red-600">{buyMoreError}</p>}
              </div>
            )}
          </div>
        )}
      </main>

      {/* QR */}
      <Modal open={qrOpen} onClose={() => { setQrOpen(false); setQr(null) }} className="sm:max-w-md">
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          {qrError && (
            <div className="w-full space-y-3">
              <span className="text-4xl">⚠️</span>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">No se pudo generar tu código</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{qrError}</p>
              <Button variant="outline" className="w-full" onClick={() => setQrOpen(false)}>Cerrar</Button>
            </div>
          )}
          {qr && (
            <>
              <p className="text-4xl font-black text-violet-700 dark:text-violet-300">{qr.available}</p>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">entradas disponibles</p>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700">
                <QRCodeSVG value={qr.value} size={260} level="M" bgColor="#FFFFFF" fgColor="#000000" />
              </div>
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                Mostrá este código en el ingreso del evento. Es personal e intransferible.
              </p>
              <Button variant="outline" className="w-full" onClick={() => { setQrOpen(false); setQr(null) }}>Cerrar</Button>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}

function statusPill(status: string): string {
  switch (status) {
    case 'Paid':
    case 'Confirmed':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    case 'PendingReview':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    case 'PendingPayment':
      return 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
    case 'Rejected':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  }
}

function MiniStat({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'ok' }) {
  const color = tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
  return (
    <div className="rounded-xl bg-white py-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
    </div>
  )
}

function withSurcharge(total: number, method: PublicPaymentMethod, applyTransferSurcharge: boolean): number {
  return total + computeMethodSurcharge(total, { code: method.code, surchargeType: method.surchargeType, surchargeValue: method.surchargeValue }, applyTransferSurcharge)
}

function PaymentMethodOption(props: {
  method: PublicPaymentMethod
  total: number
  applyTransferSurcharge: boolean
  mpLoading: boolean
  mpError: string
  proofFor: string | null
  proofDoneFor: string | null
  proofFile: File | null
  proofError: string
  proofUploading: boolean
  fileRef: RefObject<HTMLInputElement | null>
  onPayMp: () => void
  onSelectProof: () => void
  onCancelProof: () => void
  onPickFile: (f: File | null) => void
  onSubmitProof: () => void
}) {
  const { method, total, applyTransferSurcharge, mpLoading, mpError, proofFor, proofDoneFor, proofFile, proofError, proofUploading, fileRef } = props
  const finalTotal = withSurcharge(total, method, applyTransferSurcharge)
  const showSurcharge = finalTotal !== total

  if (method.code === 'MercadoPago') {
    return (
      <div className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <EventMethodIcon code="MercadoPago" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{method.label}</p>
              <p className="text-xs text-slate-400">{money(finalTotal)}{showSurcharge && <span> ({money(total)} + recargo)</span>}</p>
            </div>
          </div>
          <Button className="shrink-0 bg-sky-500 text-white hover:bg-sky-600" disabled={mpLoading} onClick={props.onPayMp}>
            {mpLoading ? <Spinner className="h-4 w-4 text-white" /> : 'Pagar con Mercado Pago'}
          </Button>
        </div>
        {mpLoading && mpError && <p className="mt-1 text-xs text-red-600">{mpError}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <EventMethodIcon code="Transfer" />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{method.label}</p>
            <p className="text-xs text-slate-400">{money(finalTotal)}{showSurcharge && <span> ({money(total)} + recargo)</span>}</p>
          </div>
        </div>
        {proofDoneFor && (
          <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            Comprobante enviado
          </span>
        )}
        {!proofDoneFor && (
          <Button variant="outline" className="shrink-0" onClick={props.onSelectProof}>Pagar por transferencia</Button>
        )}
      </div>

      {method.instructions && <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{method.instructions}</p>}

      {proofFor && !proofDoneFor && (
        <div className="mt-2">
          <EventTransferDetails
            alias={method.alias}
            cbu={method.cbu}
            holderName={method.holderName}
            bankName={method.bankName}
            amount={finalTotal}
            onCopied={() => {}}
          />
        </div>
      )}

      {proofFor && !proofDoneFor && (
        <div className="mt-2 rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-600">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,application/pdf"
            className="block w-full text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
            onChange={(e) => props.onPickFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-[11px] text-slate-400">Subí el comprobante de la transferencia (máx. 5 MB, imagen o PDF).</p>
          {proofError && <p className="mt-1 text-xs text-red-600">{proofError}</p>}
          <div className="mt-2 flex gap-2">
            <Button className="bg-violet-600 text-white hover:bg-violet-700" disabled={proofUploading || !proofFile} onClick={props.onSubmitProof}>
              {proofUploading ? <Spinner className="h-4 w-4 text-white" /> : 'Enviar comprobante'}
            </Button>
            <Button variant="ghost" disabled={proofUploading} onClick={props.onCancelProof}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  )
}
