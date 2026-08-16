import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { imgUrl } from '@/lib/media'
import { getApiError } from '@/lib/api'
import { EventMethodIcon, EventMethodOption, EventTransferDetails } from '@/components/events/payment'
import { computeMethodSurcharge } from '@/lib/event-payment-helpers'
import { usePaymentMethods } from '@/pages/student/payments/hooks'
import {
  useStudentEvent, AVAILABILITY_LABEL, formatEventDate, formatEventTime, formatEventDateTime, money,
  useCreateEventPurchase, useSubmitEventProof, useStartEventMercadoPagoCheckout,
  useStudentMyTicketsDetail, useEventAccessPass, PURCHASE_STATUS_LABEL, isPastEvent,
} from './hooks'
import type { EventPurchase, PaymentMethodOption, StudentMyTicketsDetail } from './hooks'

const UI_MAX_QUANTITY = 20

export default function StudentEventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: myTickets, isLoading: loadingTickets } = useStudentMyTicketsDetail(id)
  const isHistory = !!myTickets && isPastEvent(myTickets)
  const { data: event, isLoading, isError, refetch } = useStudentEvent(isHistory ? undefined : id)
  const { data: paymentMethodsRaw = [] } = usePaymentMethods()
  const accessPass = useEventAccessPass()

  const [quantity, setQuantity] = useState(1)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [flow, setFlow] = useState<null | { step: 'method' | 'transfer'; purchase: EventPurchase; methods: PaymentMethodOption[] }>(null)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodOption | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [notice, setNotice] = useState<null | { title: string; message: string }>(null)
  const [creating, setCreating] = useState(false)
  const [startingMp, setStartingMp] = useState(false)
  const [qr, setQr] = useState<{ value: string; available: number; title: string } | null>(null)
  const [qrError, setQrError] = useState('')

  const createPurchase = useCreateEventPurchase(id)
  const submitProof = useSubmitEventProof()
  const startMpCheckout = useStartEventMercadoPagoCheckout()

  const payMethods: PaymentMethodOption[] = paymentMethodsRaw.map((m) => {
    const raw = typeof m.paymentMethod === 'string' ? m.paymentMethod : String(m.paymentMethod)
    const lower = raw.toLowerCase()
    const isMp = lower === '4' || lower.includes('mercado')
    const isTransfer = lower === '1' || lower.includes('transfer')
    return {
      companyPaymentMethodId: m.companyPaymentMethodId,
      paymentMethod: isMp ? 'MercadoPago' : isTransfer ? 'Transfer' : raw,
      paymentMethodName: m.paymentMethodName || m.name || '',
      surchargeType: m.surchargeType != null ? Number(m.surchargeType) : undefined,
      surchargeValue: m.surchargeValue || 0,
      instructions: m.instructions,
      // Los datos bancarios de Transferencia para EVENTOS salen del evento, no de la empresa.
      alias: isTransfer ? event?.transferAlias ?? undefined : m.alias,
      cbu: isTransfer ? event?.transferCbu ?? undefined : m.cbu,
      holderName: isTransfer ? event?.transferAccountHolder ?? undefined : m.holderName,
      bankName: isTransfer ? event?.transferBankName ?? undefined : m.bankName,
      mercadoPagoIsConnected: !!m.mercadoPagoIsConnected,
    }
  })

  function surchargeFor(base: number, method: PaymentMethodOption | null): number {
    if (!method) return 0
    return computeMethodSurcharge(
      base,
      { code: method.paymentMethod, surchargeType: Number(method.surchargeType ?? 0), surchargeValue: method.surchargeValue },
      !!event?.applyTransferSurcharge,
    )
  }

  if (loadingTickets || (!isHistory && isLoading)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 pb-8">
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800 sm:h-72" />
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="h-4 w-1/2 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>
    )
  }

  // Historial: evento finalizado/cancelado/vencido por fecha → consulta read-only.
  if (isHistory) {
    if (!myTickets) return null
    return <StudentEventHistoryDetail myTickets={myTickets} onBack={() => navigate(-1)} />
  }

  if (isError || !event) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center pb-8 pt-16 text-center">
        <span className="text-5xl">🎟️</span>
        <h1 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Este evento ya no está disponible.</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Podés volver a la lista de eventos para ver las actividades vigentes.</p>
        <Button className="mt-5 bg-violet-600 text-white hover:bg-violet-700" onClick={() => navigate('/student/events')}>
          Volver a Eventos
        </Button>
      </div>
    )
  }

  const paid = event.requiresTicket
  const hasTickets = !!myTickets && myTickets.purchases.length > 0
  const canViewQr = !!myTickets?.canViewQr && myTickets.confirmedQuantity > 0

  const perStudent = event.remainingForStudent ?? event.maxTicketsPerStudent ?? UI_MAX_QUANTITY
  const perEvent = event.remainingTickets ?? UI_MAX_QUANTITY
  const maxQuantity = Math.max(1, Math.min(perStudent, perEvent))
  const total = paid && event.ticketPrice != null
    ? Number((quantity * event.ticketPrice).toFixed(2))
    : 0

  function changeQuantity(delta: number) {
    setQuantity((prev) => Math.min(maxQuantity, Math.max(1, prev + delta)))
  }

  // Solo se muestra el selector de compra si realmente se puede comprar:
  // canPurchase (backend) + cupo global + límite por alumno.
  const soldOut = event.availability === 'SoldOut' || (event.remainingTickets != null && event.remainingTickets <= 0)
  const studentLimitReached = event.remainingForStudent != null && event.remainingForStudent <= 0
  const showBuySection = event.canPurchase && !soldOut && !studentLimitReached

  let unavailable: { title: string; description: string } | null = null
  if (event.availability === 'EventEnded') {
    unavailable = { title: 'Evento finalizado', description: 'Este evento ya terminó. Ya no se pueden comprar entradas.' }
  } else if (event.availability === 'SalesNotStarted') {
    unavailable = {
      title: 'Venta todavía no disponible',
      description: event.salesStartAtUtc
        ? `Podrás comprar entradas a partir del ${formatEventDateTime(event.salesStartAtUtc)}.`
        : 'Podrás comprar entradas cuando la institución habilite la venta.',
    }
  } else if (event.availability === 'SalesEnded') {
    unavailable = { title: 'Venta finalizada', description: 'Ya no se pueden comprar entradas para este evento.' }
  } else if (soldOut) {
    unavailable = { title: 'Entradas agotadas', description: 'No quedan lugares disponibles para este evento.' }
  } else if (studentLimitReached) {
    unavailable = { title: 'Límite alcanzado', description: 'Alcanzaste el máximo de entradas permitido para este evento.' }
  }

  async function handleBuy() {
    if (creating || !id || !event) return
    if (event.purchaseTerms && !termsAccepted) {
      setNotice({ title: 'Aceptá las condiciones', message: 'Debés aceptar las condiciones del evento para continuar.' })
      return
    }
    setCreating(true)
    try {
      const result = await createPurchase.mutateAsync({ quantity, termsAccepted })
      if (!result?.purchase || result.purchase.status === 'Confirmed') {
        setNotice({
          title: 'Reserva confirmada',
          message: `${event.title} · ${result?.purchase?.quantity ?? quantity} lugares reservados.`,
        })
        refetch()
        return
      }
      setFlow({ step: 'method', purchase: result.purchase, methods: result.availablePaymentMethods })
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data
      const code = response?.code
      const message = response?.message || getApiError(err) || 'No se pudo realizar la reserva.'
      if (code === 'expired') {
        setNotice({ title: 'La reserva venció', message: 'Las entradas fueron liberadas. Podés intentar realizar una nueva compra.' })
      } else if (code === 'sold_out') {
        setNotice({ title: 'Entradas agotadas', message: 'Las entradas se agotaron mientras realizabas la reserva.' })
      } else if (code === 'not_enough_tickets') {
        setNotice({ title: 'No quedan suficientes entradas', message })
      } else if (code === 'student_limit_reached') {
        setNotice({ title: 'Límite alcanzado', message })
      } else {
        setNotice({ title: 'No se pudo realizar la reserva', message })
      }
      refetch()
    } finally {
      setCreating(false)
    }
  }

  function continuePayment(purchase: EventPurchase) {
    setFlow({ step: 'method', purchase, methods: payMethods })
  }

  async function handleSelectMethod(method: PaymentMethodOption) {
    if (!flow) return
    setSelectedMethod(method)
    if (method.paymentMethod === 'MercadoPago') {
      await handleMercadoPago(flow.purchase)
    } else {
      setFlow({ ...flow, step: 'transfer' })
    }
  }

  async function handleMercadoPago(purchase: EventPurchase) {
    if (startingMp) return
    setStartingMp(true)
    try {
      const result = await startMpCheckout.mutateAsync(purchase.id)
      if (result?.initPoint) {
        window.location.assign(result.initPoint)
        return
      }
      setNotice({ title: 'No fue posible iniciar el pago', message: 'Intentá nuevamente.' })
      setStartingMp(false)
    } catch (err: unknown) {
      setNotice({ title: 'No fue posible iniciar el pago', message: getApiError(err) || 'Intentá nuevamente.' })
      setStartingMp(false)
    }
  }

  async function handleSubmitProof() {
    if (!flow || !selectedMethod || !proofFile) return
    try {
      await submitProof.mutateAsync({
        purchaseId: flow.purchase.id,
        companyPaymentMethodId: selectedMethod.companyPaymentMethodId,
        file: proofFile,
      })
      setFlow(null)
      setSelectedMethod(null)
      setProofFile(null)
      setNotice({
        title: 'Comprobante enviado',
        message: 'Tu pago está pendiente de aprobación. Tus entradas están reservadas mientras revisamos el comprobante.',
      })
      refetch()
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data
      setNotice({ title: 'No se pudo enviar el comprobante', message: response?.message || getApiError(err) || 'Intentá nuevamente.' })
    }
  }

  async function handleShowQr() {
    if (!id || !event) return
    setQrError('')
    setQr(null)
    try {
      const result = await accessPass.mutateAsync(id)
      setQr({ value: result.qrValue, available: result.availableQuantity, title: event.title })
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data
      setQrError(response?.message || getApiError(err) || 'No se pudo generar tu código de acceso.')
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-8">
      {/* Hero image */}
      <div className="relative h-56 overflow-hidden rounded-2xl sm:h-72">
        {event.imageUrl ? (
          <>
            <img src={imgUrl(event.imageUrl) ?? ''} alt={event.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-100 to-fuchsia-100 text-7xl dark:from-violet-900 dark:to-fuchsia-900">🎪</div>
        )}
        <button
          onClick={() => navigate(-1)}
          aria-label="Volver"
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="absolute right-4 top-4">
          <Badge variant={event.availability === 'Available' ? 'success' : 'default'} className="bg-white/90 backdrop-blur-sm dark:bg-slate-900/90">
            {AVAILABILITY_LABEL[event.availability]}
          </Badge>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-5 px-1 pt-5 sm:px-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">{event.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {formatEventDate(event.startsAtUtc)}{event.hasStartTime ? ` · ${formatEventTime(event.startsAtUtc)}` : ''}
              {event.endsAtUtc && event.hasEndTime && ` a ${formatEventTime(event.endsAtUtc)}`}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {event.location}
              </span>
            )}
          </p>
        </div>

        {event.description && (
          <p className="whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-400">{event.description}</p>
        )}

        {/* ─── Tus entradas ─── */}
        {hasTickets && myTickets && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Tus entradas</h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {myTickets.confirmedQuantity > 0 && (
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{myTickets.confirmedQuantity} confirmadas</span>
                )}
                {myTickets.pendingQuantity > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">{myTickets.pendingQuantity} pendientes</span>
                )}
                {myTickets.usedQuantity > 0 && (
                  <span className="text-slate-500 dark:text-slate-400">{myTickets.usedQuantity} utilizadas</span>
                )}
                <span className="text-slate-500 dark:text-slate-400">· {myTickets.availableQuantity} disponibles</span>
              </div>

              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                {myTickets.purchases.map((p) => (
                  <MyPurchaseRow
                    key={p.id}
                    purchase={p}
                    canViewQr={canViewQr}
                    onShowQr={handleShowQr}
                    onContinuePayment={continuePayment}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── Comprar (más) entradas ─── */}
        {showBuySection ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{hasTickets ? 'Comprar más entradas' : 'Entrada'}</p>
              <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                {paid ? `${money(event.ticketPrice)} por persona` : 'Gratuita'}
              </p>

              {event.capacity != null && (
                <p className="mt-1 text-xs text-slate-400">
                  Cupo máximo: {event.capacity.toLocaleString('es-AR')}
                  {event.remainingTickets != null && ` · Quedan ${event.remainingTickets}`}
                </p>
              )}

              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {paid ? '¿Cuántas entradas querés?' : '¿Cuántos lugares querés reservar?'}
                </p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => changeQuantity(-1)}
                    disabled={quantity <= 1}
                    aria-label="Menos"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-lg font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-xl font-black text-slate-900 dark:text-white">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => changeQuantity(1)}
                    disabled={quantity >= maxQuantity}
                    aria-label="Más"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-lg font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    +
                  </button>
                </div>

                {event.maxTicketsPerStudent != null && (
                  <p className="mt-2 text-xs text-slate-400">
                    Máximo {event.maxTicketsPerStudent} {event.maxTicketsPerStudent === 1 ? 'entrada' : 'entradas'} por alumno
                    {event.remainingForStudent != null ? ` · Te quedan ${event.remainingForStudent}` : ''}.
                  </p>
                )}
              </div>

              {paid && (
                <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                  <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>{quantity} × {money(event.ticketPrice)}</span>
                    <span>{money(total)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-700">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">TOTAL</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">{money(total)}</span>
                  </div>
                </div>
              )}
            </section>

            {event.purchaseTerms && (
              <div className="mt-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">Condiciones del evento</p>
                  <p className="whitespace-pre-line">{event.purchaseTerms}</p>
                </div>
                <label className="mt-2 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                  <span>He leído y acepto las condiciones del evento.</span>
                </label>
              </div>
            )}

            <Button
              className="w-full bg-violet-600 text-white hover:bg-violet-700"
              loading={creating}
              onClick={handleBuy}
            >
              {hasTickets ? (paid ? 'Comprar más entradas' : 'Reservar más lugares') : paid ? 'Comprar entradas' : 'Reservar lugar'}
            </Button>
          </>
        ) : (
          <PurchaseUnavailableState
            title={unavailable?.title ?? 'Venta no disponible'}
            description={unavailable?.description ?? 'No se pueden comprar entradas para este evento.'}
          />
        )}

        <p className="pb-4 text-center text-xs text-slate-400">
          <Link to="/student/events" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">Ver todos los eventos</Link>
        </p>
      </div>

      {/* Paso 1: elegir medio de pago */}
      <Modal open={!!flow && flow.step === 'method'} onClose={() => setFlow(null)} title="Elegí cómo pagar" className="sm:max-w-md">
        <div className="space-y-4 p-5">
          <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
            <p className="font-bold text-slate-900 dark:text-white">{event.title}</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              {flow?.purchase.quantity} {flow?.purchase.quantity === 1 ? 'entrada' : 'entradas'} × {money(event.ticketPrice)}
            </p>
            <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
              TOTAL {money(flow?.purchase.totalAmount ?? total)}
            </p>
          </div>

          <div className="space-y-2">
            {(flow?.methods ?? []).map((method) => {
              const base = flow?.purchase.totalAmount ?? 0
              const sur = surchargeFor(base, method)
              const final = base + sur
              const isTransfer = method.paymentMethod === 'Transfer'
              const isMp = method.paymentMethod === 'MercadoPago'
              return (
                <div key={method.companyPaymentMethodId} className="space-y-1.5">
                  <EventMethodOption
                    icon={<EventMethodIcon code={method.paymentMethod} />}
                    label={isMp ? 'Mercado Pago' : 'Transferencia'}
                    description={sur > 0 ? `Recargo: +${money(sur)}` : isTransfer ? 'Transferí a la cuenta indicada' : undefined}
                    active={false}
                    onClick={() => handleSelectMethod(method)}
                  />
                  <p className="text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Total: {money(final)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </Modal>

      {/* Paso 2: transferencia + comprobante */}
      <Modal open={!!flow && flow.step === 'transfer'} onClose={() => setFlow(null)} title="Pagar por transferencia" className="sm:max-w-md">
        <div className="space-y-4 p-5">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Detalle</p>
              <div className="mt-2 space-y-1 border-b border-slate-200 pb-3 text-sm dark:border-slate-700">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>{flow?.purchase.quantity} {flow?.purchase.quantity === 1 ? 'entrada' : 'entradas'} · Base</span>
                  <span>{money(flow?.purchase.totalAmount ?? total)}</span>
                </div>
                {surchargeFor(flow?.purchase.totalAmount ?? total, selectedMethod) > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>Recargo por transferencia</span>
                    <span>+{money(surchargeFor(flow?.purchase.totalAmount ?? total, selectedMethod))}</span>
                  </div>
                )}
              </div>
            </div>

            {selectedMethod && (
              <EventTransferDetails
                alias={selectedMethod.alias}
                cbu={selectedMethod.cbu}
                holderName={selectedMethod.holderName}
                bankName={selectedMethod.bankName}
                amount={(flow?.purchase.totalAmount ?? total) + surchargeFor(flow?.purchase.totalAmount ?? total, selectedMethod)}
                onCopied={() => {}}
              />
            )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Comprobante</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:file:bg-slate-700 dark:file:text-slate-300"
            />
            <p className="mt-1 text-xs text-slate-400">JPG, PNG, WEBP o PDF. Máx 5 MB.</p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setFlow(null)} disabled={submitProof.isPending}>Cancelar</Button>
            <Button
              className="bg-violet-600 text-white hover:bg-violet-700"
              disabled={!proofFile}
              loading={submitProof.isPending}
              onClick={handleSubmitProof}
            >
              Enviar comprobante
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal QR */}
      <Modal open={!!qr || !!qrError} onClose={() => { setQr(null); setQrError('') }} className="sm:max-w-md">
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          {qrError && (
            <div className="w-full space-y-3">
              <span className="text-4xl">⚠️</span>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">No se pudo generar tu código</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{qrError}</p>
              <Button variant="outline" className="w-full" onClick={() => setQrError('')}>Cerrar</Button>
            </div>
          )}
          {qr && (
            <>
              <p className="text-lg font-black text-slate-900 dark:text-white">{qr.title}</p>
              <p className="text-4xl font-black text-violet-700 dark:text-violet-300">{qr.available}</p>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">entradas disponibles</p>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700">
                <QRCodeSVG value={qr.value} size={260} level="M" bgColor="#FFFFFF" fgColor="#000000" />
              </div>
              <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-left dark:border-violet-900/50 dark:bg-violet-950/20">
                <p className="flex items-center gap-2 text-xs font-bold text-violet-800 dark:text-violet-200">
                  <span>🔒</span> Tu código de acceso es personal.
                </p>
                <p className="mt-1 text-xs leading-5 text-violet-700 dark:text-violet-300">
                  No lo compartas con otras personas. Mostralo únicamente cuando la institución te lo solicite al momento del ingreso.
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setQr(null)}>Cerrar</Button>
            </>
          )}
        </div>
      </Modal>

      {/* Aviso / éxito */}
      <Modal open={!!notice} onClose={() => setNotice(null)} title={notice?.title} className="sm:max-w-md">
        <div className="space-y-4 p-5">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">{notice?.message}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setNotice(null)}>Cerrar</Button>
            <Button className="bg-violet-600 text-white hover:bg-violet-700" onClick={() => { setNotice(null); navigate('/student/events') }}>
              Ver mis entradas
            </Button>
          </div>
        </div>
      </Modal>

      {/* Redirigiendo a Mercado Pago */}
      {startingMp && (
        <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-3 bg-white/95 dark:bg-slate-950/95">
          <Spinner className="h-8 w-8 text-violet-600" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Te estamos redirigiendo a Mercado Pago...</p>
        </div>
      )}
    </div>
  )
}

function MyPurchaseRow({ purchase, canViewQr, readOnly = false, onShowQr, onContinuePayment }: {
  purchase: EventPurchase
  canViewQr: boolean
  readOnly?: boolean
  onShowQr: () => void
  onContinuePayment: (purchase: EventPurchase) => void
}) {
  const status = purchase.status
  const statusLabel = PURCHASE_STATUS_LABEL[status] ?? status

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {purchase.quantity} {purchase.quantity === 1 ? 'entrada' : 'entradas'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {statusLabel}
          {purchase.paymentMethodName ? ` · ${purchase.paymentMethodName}` : ''}
          {purchase.totalAmount > 0 ? ` · ${money(purchase.totalAmount)}` : ''}
        </p>

        {status === 'PendingReview' && (
          <p className="mt-1 text-[11px] leading-4 text-amber-700 dark:text-amber-400">
            Tu comprobante fue enviado correctamente. La institución está revisando el pago. Cuando sea aprobado, tus entradas quedarán disponibles.
          </p>
        )}
        {status === 'Expired' && (
          <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
            Esta reserva ya no ocupa cupo. Podés realizar una nueva compra.
          </p>
        )}
        {status === 'Rejected' && (
          <p className="mt-1 text-[11px] leading-4 text-red-600 dark:text-red-400">
            El pago fue rechazado. Podés realizar una nueva compra.
          </p>
        )}
        {status === 'Cancelled' && (
          <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">Compra cancelada.</p>
        )}
      </div>

      {!readOnly && (
        <div className="flex shrink-0 gap-2">
          {(status === 'Paid' || status === 'Confirmed') && canViewQr && (
            <Button size="sm" className="bg-violet-600 text-white hover:bg-violet-700" onClick={onShowQr}>Ver entradas</Button>
          )}
          {status === 'PendingPayment' && (
            <Button size="sm" variant="outline" onClick={() => onContinuePayment(purchase)}>Continuar pago</Button>
          )}
        </div>
      )}
    </div>
  )
}

/** Detalle read-only de un evento anterior (finalizado/cancelado/vencido por fecha): historial. */
function StudentEventHistoryDetail({ myTickets, onBack }: {
  myTickets: StudentMyTicketsDetail
  onBack: () => void
}) {
  const statusLabel = myTickets.isCancelled ? 'Evento cancelado' : 'Evento finalizado'

  return (
    <div className="mx-auto max-w-3xl pb-8">
      {/* Hero */}
      <div className="relative h-56 overflow-hidden rounded-2xl sm:h-72">
        {myTickets.imageUrl ? (
          <>
            <img src={imgUrl(myTickets.imageUrl) ?? ''} alt={myTickets.eventTitle} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-100 to-fuchsia-100 text-7xl dark:from-violet-900 dark:to-fuchsia-900">🎪</div>
        )}
        <button
          onClick={onBack}
          aria-label="Volver"
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="absolute right-4 top-4">
          <Badge variant={myTickets.isCancelled ? 'danger' : 'default'} className="bg-white/90 backdrop-blur-sm dark:bg-slate-900/90">
            {statusLabel}
          </Badge>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-5 px-1 pt-5 sm:px-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">{myTickets.eventTitle}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {formatEventDate(myTickets.startsAtUtc)}{myTickets.hasStartTime ? ` · ${formatEventTime(myTickets.startsAtUtc)}` : ''}
              {myTickets.endsAtUtc && myTickets.hasEndTime && ` a ${formatEventTime(myTickets.endsAtUtc)}`}
            </span>
            {myTickets.location && (
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {myTickets.location}
              </span>
            )}
          </p>
        </div>

        {myTickets.description && (
          <p className="whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-400">{myTickets.description}</p>
        )}

        {/* Tus entradas (historial) */}
        {myTickets.purchases.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Tus entradas</h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {myTickets.confirmedQuantity > 0 && (
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{myTickets.confirmedQuantity} confirmadas</span>
                )}
                {myTickets.pendingQuantity > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">{myTickets.pendingQuantity} pendientes</span>
                )}
                {myTickets.usedQuantity > 0 && (
                  <span className="text-slate-500 dark:text-slate-400">{myTickets.usedQuantity} utilizadas</span>
                )}
                <span className="text-slate-500 dark:text-slate-400">· {myTickets.availableQuantity} disponibles</span>
              </div>

              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                {myTickets.purchases.map((p) => (
                  <MyPurchaseRow
                    key={p.id}
                    purchase={p}
                    canViewQr={false}
                    readOnly
                    onShowQr={() => {}}
                    onContinuePayment={() => {}}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          Este evento ya {myTickets.isCancelled ? 'fue cancelado' : 'finalizó'}. Ya no se pueden comprar entradas ni generar códigos de acceso.
        </div>
      </div>
    </div>
  )
}

/** Estado informativo que reemplaza la sección de compra cuando no se puede comprar. */
function PurchaseUnavailableState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  )
}
