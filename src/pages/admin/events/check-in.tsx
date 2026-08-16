import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Scanner } from '@yudiel/react-qr-scanner'
import { ScanLine, TicketPlus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { EventMethodIcon, EventMethodOption, EventTransferDetails } from '@/components/events/payment'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { getApiError } from '@/lib/api'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { formatEventDate, formatEventTime } from '@/pages/student/events/hooks'
import {
  useCheckInResolve, useCheckInConsume, useDoorSale, useCheckInRecent, useEventOperatorPermission,
  useDoorStudentSearch, useManualDoorSale, useEventTransferMethod,
} from './hooks'
import type { CheckInResolve, ManualDoorSaleResult, DoorStudentSearchItem } from './hooks'

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const money = (v?: number | null) => (v == null ? 'Gratis' : ARS.format(v))

function extractToken(raw: string): string | null {
  const trimmed = raw.trim()
  const m = trimmed.match(/^https?:\/\/[^/]+\/checkin\/e\/(.+)$/)
  if (m && m[1].length > 0) return m[1]
  if (!trimmed.includes(' ') && trimmed.length > 20) return trimmed
  return null
}

function useEvent(id: string | undefined) {
  const slug = useAuth((s) => s.activeCompanySlug)
  return useQuery({
    queryKey: ['admin-event', slug, id],
    queryFn: () => apiService.get<{ id: string; title: string; startsAt: string; hasStartTime: boolean; location?: string; status: string; requiresTicket: boolean; ticketPrice?: number; allowDoorSales: boolean }>(
      `/api/admin/${slug}/events/${id}`,
    ),
    enabled: !!id && !!slug,
  })
}

export default function EventCheckInPage({ backPath = '/admin/events' }: { backPath?: string }) {
  // Admin usa la ruta /admin/events/:id/check-in (param "id").
  // Operador usa la ruta /event-operator/events/:eventId/check-in (param "eventId").
  const { id, eventId } = useParams<{ id?: string; eventId?: string }>()
  const resolvedId = eventId ?? id
  const navigate = useNavigate()
  const { data: event, isLoading } = useEvent(resolvedId)

  const resolveMutation = useCheckInResolve(resolvedId)
  const consumeMutation = useCheckInConsume(resolvedId)
  const doorSaleMutation = useDoorSale(resolvedId)
  const { data: recent = [] } = useCheckInRecent(resolvedId)

  // Operadores con permiso: la venta en puerta se oculta si CanSellAtDoor es false.
  const { data: permission } = useEventOperatorPermission(resolvedId)
  const canSellAtDoor = !(permission?.isOperator && !permission.canSellAtDoor)

  const [mode, setMode] = useState<'scan' | 'manual'>('scan')

  const [paused, setPaused] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [resolved, setResolved] = useState<CheckInResolve | null>(null)
  const [consumeError, setConsumeError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ quantity: number; available: number; already: boolean } | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [doorOpen, setDoorOpen] = useState(false)
  const [doorQty, setDoorQty] = useState(1)
  const [doorMethod, setDoorMethod] = useState<'Cash' | 'Transfer'>('Cash')
  const [doorSuccess, setDoorSuccess] = useState<{ quantity: number; total: number; method: string; available: number } | null>(null)
  const [confirmTransfer, setConfirmTransfer] = useState(false)
  const [checkInNow, setCheckInNow] = useState<{ passToken: string; attendeeName: string; available: number } | null>(null)
  const [checkInNowQty, setCheckInNowQty] = useState(1)
  const [busy, setBusy] = useState(false)

  const lastTokenRef = useRef('')
  const lastTokenTimeRef = useRef(0)
  const processedRef = useRef(false)
  const consumeErrorRef = useRef<string | null>(null)

  const notPublished = event && event.status !== 'Published'

  useEffect(() => {
    if (!paused) {
      processedRef.current = false
      consumeErrorRef.current = null
    }
  }, [paused])

  const handleResolve = useCallback(async (token: string) => {
    setResolved(null)
    setConsumeError(null)
    setBusy(true)
    try {
      const result = await resolveMutation.mutateAsync(token)
      setResolved(result)
      setQuantity(Math.min(1, Math.max(1, result.availableQuantity)))
      setPaused(true)
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data
      setConsumeError(response?.message || getApiError(err) || 'Código no válido.')
      setPaused(false)
    } finally {
      setBusy(false)
    }
  }, [resolveMutation])

  const handleScan = useCallback((codes: { rawValue: string }[]) => {
    if (paused || processedRef.current) return
    const raw = codes?.[0]?.rawValue
    if (!raw) return
    const token = extractToken(raw)
    if (!token) return

    const now = Date.now()
    if (token === lastTokenRef.current && now - lastTokenTimeRef.current < 4000) return

    lastTokenRef.current = token
    lastTokenTimeRef.current = now
    processedRef.current = true
    handleResolve(token)
  }, [paused, handleResolve])

  function closeModal() {
    setResolved(null)
    setConsumeError(null)
    setPaused(false)
    setQuantity(1)
  }

  async function handleConsume() {
    if (!resolved || !resolvedId || busy) return
    setBusy(true)
    setConsumeError(null)
    const token = lastTokenRef.current
    try {
      const result = await consumeMutation.mutateAsync({
        token,
        quantity,
        requestId: crypto.randomUUID(),
      })
      setSuccess({ quantity: result.consumedQuantity, available: result.availableQuantity, already: result.alreadyProcessed })
      setResolved(null)
      setPaused(false)
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data
      setConsumeError(response?.message || 'No se pudo registrar el ingreso.')
      if (response?.code === 'not_enough_available_tickets') {
        // Re-resolve para mostrar el balance actualizado.
        try {
          const fresh = await resolveMutation.mutateAsync(token)
          setResolved(fresh)
          setQuantity(Math.max(1, fresh.availableQuantity))
        } catch {
          // si el token quedó inválido, cerrar
          closeModal()
        }
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleDoorSale() {
    if (!resolved || !resolvedId || busy) return
    if (doorMethod === 'Transfer' && !confirmTransfer) {
      setConfirmTransfer(true)
      return
    }
    setBusy(true)
    setConsumeError(null)
    try {
      const result = await doorSaleMutation.mutateAsync({
        accessToken: lastTokenRef.current,
        quantity: doorQty,
        paymentMethod: doorMethod,
        requestId: crypto.randomUUID(),
      })
      setDoorSuccess({ quantity: result.quantity, total: result.totalAmount, method: doorMethod, available: result.availableQuantity })
      setDoorOpen(false)
      setConfirmTransfer(false)
      // Actualizar el balance del alumno resuelto.
      setResolved((prev) => (prev ? { ...prev, availableQuantity: result.availableQuantity } : prev))
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data
      setConsumeError(response?.message || 'No se pudo registrar la venta.')
    } finally {
      setBusy(false)
    }
  }

  function openCheckInNow(result: ManualDoorSaleResult) {
    if (!result.passToken) return
    setCheckInNowQty(Math.min(1, Math.max(1, result.availableQuantity)))
    setCheckInNow({ passToken: result.passToken, attendeeName: result.attendeeName, available: result.availableQuantity })
  }

  async function handleCheckInNow() {
    if (!checkInNow || busy) return
    setBusy(true)
    setConsumeError(null)
    try {
      const result = await consumeMutation.mutateAsync({
        token: checkInNow.passToken,
        quantity: checkInNowQty,
        requestId: crypto.randomUUID(),
      })
      setSuccess({ quantity: result.consumedQuantity, available: result.availableQuantity, already: result.alreadyProcessed })
      setCheckInNow(null)
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data
      setConsumeError(response?.message || 'No se pudo registrar el ingreso.')
    } finally {
      setBusy(false)
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No encontramos el evento.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(backPath)}>Volver a eventos</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-10">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(backPath)} className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400">
          ← Volver
        </button>
      </div>

      <section className="rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-fuchsia-800 p-5 text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-200">Control de ingreso</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">{event.title}</h1>
        <p className="mt-1 text-sm text-fuchsia-200">
          {formatEventDate(event.startsAt)}{event.hasStartTime ? ` · ${formatEventTime(event.startsAt)}` : ''}
        </p>
        {event.location && <p className="text-sm text-fuchsia-200">{event.location}</p>}
      </section>

      {/* Sub-nav */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <TabButton active={mode === 'scan'} onClick={() => setMode('scan')} icon={<ScanLine className="h-4 w-4" />} label="Escanear" />
        {canSellAtDoor && (
          <TabButton active={mode === 'manual'} onClick={() => setMode('manual')} icon={<TicketPlus className="h-4 w-4" />} label="Venta manual" />
        )}
      </div>

      {notPublished && (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Este evento no admite ingresos ({event.status === 'Cancelled' ? 'cancelado' : 'finalizado'}).
          </p>
        </div>
      )}

      {!notPublished && mode === 'scan' && (
        <>
          {/* Scanner */}
          <div className="space-y-3">
            {consumeError && !resolved && (
              <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">{consumeError}</div>
            )}

            <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-black">
              {cameraError ? (
                <div className="flex h-72 items-center justify-center rounded-2xl bg-slate-100 p-6 text-center dark:bg-slate-800">
                  <div className="space-y-2">
                    <p className="text-sm text-slate-500">{cameraError}</p>
                    {canSellAtDoor && (
                      <Button variant="outline" size="sm" onClick={() => setMode('manual')}>Usar venta manual</Button>
                    )}
                  </div>
                </div>
              ) : (
                <Scanner
                  onScan={handleScan}
                  onError={(e) => {
                    const msg = e?.message ?? ''
                    if (msg.includes('NotAllowed') || msg.includes('Permission')) {
                      setCameraError('Necesitamos acceso a la cámara para escanear el QR. Habilitá el permiso desde el navegador.')
                    } else if (msg.includes('NotFound')) {
                      setCameraError('No encontramos una cámara disponible en este dispositivo.')
                    } else if (msg.includes('NotReadable')) {
                      setCameraError('La cámara está siendo utilizada por otra aplicación. Cerrala e intentá nuevamente.')
                    } else {
                      setCameraError('No pudimos abrir la cámara. Verificá los permisos e intentá nuevamente.')
                    }
                  }}
                  paused={paused}
                  constraints={{ facingMode: 'environment' }}
                  allowMultiple={false}
                  scanDelay={800}
                />
              )}
              {!cameraError && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-52 w-52 rounded-2xl border-2 border-white/60" />
                </div>
              )}
            </div>

            <p className="text-center text-xs text-slate-400">
              {busy ? 'Procesando...' : 'Alineá el QR del alumno dentro del recuadro'}
            </p>
          </div>

          {/* Últimos ingresos */}
          {recent.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Últimos ingresos</h2>
              <div className="mt-2 space-y-2">
                {recent.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{r.studentName}</span>
                    <span className="text-xs text-slate-400">
                      {r.quantity} {r.quantity === 1 ? 'entrada' : 'entradas'} · {new Date(r.usedAtUtc).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {!notPublished && mode === 'manual' && canSellAtDoor && (
        <ManualSaleTab event={event} eventId={resolvedId} onCheckInNow={openCheckInNow} />
      )}

      {/* Modal resolve */}
      <Modal open={!!resolved} onClose={closeModal} className="sm:max-w-md">
        {resolved && (
          <div className="space-y-4 p-5">
            <div className="text-center">
              <p className="text-xl font-black text-slate-900 dark:text-white">{resolved.attendeeName}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{resolved.eventTitle}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Confirmadas" value={resolved.confirmedQuantity} />
              <Stat label="Utilizadas" value={resolved.usedQuantity} tone="muted" />
              <Stat label="Disponibles" value={resolved.availableQuantity} tone="ok" />
            </div>
            {resolved.pendingQuantity > 0 && (
              <p className="text-center text-xs text-amber-600 dark:text-amber-400">{resolved.pendingQuantity} pendientes de aprobación</p>
            )}

            {consumeError && (
              <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">{consumeError}</div>
            )}

            {resolved.availableQuantity <= 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                No quedan entradas disponibles. Todas las entradas confirmadas ya fueron utilizadas.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-3">
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1 || busy}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 text-xl font-bold text-slate-700 disabled:opacity-30 dark:border-slate-600 dark:text-slate-200">−</button>
                  <div className="text-center">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">{quantity}</span>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">¿Cuántas ingresan?</p>
                  </div>
                  <button type="button" onClick={() => setQuantity((q) => Math.min(resolved.availableQuantity, q + 1))} disabled={quantity >= resolved.availableQuantity || busy}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 text-xl font-bold text-slate-700 disabled:opacity-30 dark:border-slate-600 dark:text-slate-200">+</button>
                </div>

                <Button className="w-full bg-violet-600 text-white hover:bg-violet-700" loading={busy} disabled={busy} onClick={handleConsume}>
                  REGISTRAR INGRESO
                </Button>

                <div className="space-y-2">
                  {canSellAtDoor && (
                    <Button variant="outline" className="w-full" onClick={() => setDoorOpen(true)}>
                      Vender entradas
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => handleResolve(lastTokenRef.current)}>
                    Actualizar disponibilidad
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Venta en puerta (modo escanear) */}
      <Modal open={doorOpen} onClose={() => setDoorOpen(false)} title="Vender entradas en puerta" className="sm:max-w-md">
        {resolved && (
          <div className="space-y-4 p-5">
            <p className="text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
              {resolved.attendeeName} · Disponibles ahora: {resolved.availableQuantity}
            </p>

            <div className="flex items-center justify-center gap-3">
              <button type="button" onClick={() => setDoorQty((q) => Math.max(1, q - 1))} disabled={doorQty <= 1 || busy}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 text-xl font-bold text-slate-700 disabled:opacity-30 dark:border-slate-600 dark:text-slate-200">−</button>
              <span className="text-3xl font-black text-slate-900 dark:text-white">{doorQty}</span>
              <button type="button" onClick={() => setDoorQty((q) => q + 1)} disabled={busy}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 text-xl font-bold text-slate-700 disabled:opacity-30 dark:border-slate-600 dark:text-slate-200">+</button>
            </div>

            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              {event.requiresTicket ? `Total: ${money((event.ticketPrice ?? 0) * doorQty)}` : 'Evento gratuito'}
            </p>

            {event.requiresTicket && (
              <div className="space-y-2">
                <EventMethodOption icon={<EventMethodIcon code="Cash" />} label="Efectivo" description="Cobro presencial" active={doorMethod === 'Cash'} onClick={() => setDoorMethod('Cash')} />
                <EventMethodOption icon={<EventMethodIcon code="Transfer" />} label="Transferencia" description="Verificás la transferencia en persona" active={doorMethod === 'Transfer'} onClick={() => setDoorMethod('Transfer')} />
                <p className="text-center text-[11px] text-slate-400">
                  Mercado Pago no está disponible en puerta. El alumno puede comprar desde su cuenta ClassClick.
                </p>
              </div>
            )}

            {consumeError && (
              <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">{consumeError}</div>
            )}

            <Button className="w-full bg-violet-600 text-white hover:bg-violet-700" loading={busy} disabled={busy} onClick={handleDoorSale}>
              {event.requiresTicket ? 'Confirmar venta' : 'Agregar lugares'}
            </Button>
          </div>
        )}
      </Modal>

      {/* Confirmación explícita transferencia (modo escanear) */}
      <ConfirmTransferModal
        open={confirmTransfer}
        onClose={() => setConfirmTransfer(false)}
        onConfirm={handleDoorSale}
        busy={busy}
      />

      {/* Registrar ingreso ahora (post venta manual) */}
      <Modal open={!!checkInNow} onClose={() => setCheckInNow(null)} title="Registrar ingreso ahora" className="sm:max-w-md">
        {checkInNow && (
          <div className="space-y-4 p-5">
            <p className="text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
              {checkInNow.attendeeName} · Entradas disponibles: {checkInNow.available}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button type="button" onClick={() => setCheckInNowQty((q) => Math.max(1, q - 1))} disabled={checkInNowQty <= 1 || busy}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 text-xl font-bold text-slate-700 disabled:opacity-30 dark:border-slate-600 dark:text-slate-200">−</button>
              <div className="text-center">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{checkInNowQty}</span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">¿Cuántas ingresan?</p>
              </div>
              <button type="button" onClick={() => setCheckInNowQty((q) => Math.min(checkInNow.available, q + 1))} disabled={checkInNowQty >= checkInNow.available || busy}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 text-xl font-bold text-slate-700 disabled:opacity-30 dark:border-slate-600 dark:text-slate-200">+</button>
            </div>
            {consumeError && (
              <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">{consumeError}</div>
            )}
            <Button className="w-full bg-violet-600 text-white hover:bg-violet-700" loading={busy} disabled={busy} onClick={handleCheckInNow}>
              REGISTRAR INGRESO
            </Button>
          </div>
        )}
      </Modal>

      {/* Éxito */}
      <Modal open={!!success} onClose={() => setSuccess(null)} className="sm:max-w-md">
        {success && (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <span className="text-5xl">✅</span>
            <p className="text-lg font-black text-slate-900 dark:text-white">Ingreso registrado</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {success.already ? 'Esta operación ya había sido registrada.' : `Ingresaron: ${success.quantity}`}
              <br />Disponibles: {success.available}
            </p>
            <div className="flex w-full gap-2">
              <Button className="flex-1 bg-violet-600 text-white hover:bg-violet-700" onClick={() => { setSuccess(null); setPaused(false) }}>
                Escanear siguiente
              </Button>
              <Button variant="outline" onClick={() => setSuccess(null)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Éxito venta */}
      <Modal open={!!doorSuccess} onClose={() => setDoorSuccess(null)} className="sm:max-w-md">
        {doorSuccess && (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <span className="text-5xl">💳</span>
            <p className="text-lg font-black text-slate-900 dark:text-white">Venta registrada</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {doorSuccess.quantity} entradas · {money(doorSuccess.total)}<br />
              Método: {doorSuccess.method === 'Cash' ? 'Efectivo' : 'Transferencia'}<br />
              Disponibles ahora: {doorSuccess.available}
            </p>
            <div className="flex w-full gap-2">
              <Button className="flex-1 bg-violet-600 text-white hover:bg-violet-700" onClick={() => { setDoorSuccess(null); setDoorOpen(true) }}>
                Registrar ingreso
              </Button>
              <Button variant="outline" onClick={() => setDoorSuccess(null)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} role="tab" aria-selected={active}
      className={`relative flex flex-1 items-center justify-center gap-2 pb-2.5 pt-2 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset ${
        active ? 'text-violet-700 dark:text-violet-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
      }`}>
      <span className={active ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}>{icon}</span>
      {label}
      <span aria-hidden="true" className={`absolute inset-x-4 bottom-0 h-0.5 rounded-full transition ${active ? 'bg-violet-600 dark:bg-violet-400' : 'bg-transparent'}`} />
    </button>
  )
}

function ManualSaleTab({ event, eventId, onCheckInNow }: {
  event: { requiresTicket: boolean; ticketPrice?: number; allowDoorSales: boolean }
  eventId?: string
  onCheckInNow: (result: ManualDoorSaleResult) => void
}) {
  const manualSale = useManualDoorSale(eventId)

  const [buyerType, setBuyerType] = useState<'student' | 'guest'>('student')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selected, setSelected] = useState<DoorStudentSearchItem | null>(null)
  const { data: results = [], isFetching: searching } = useDoorStudentSearch(eventId, debounced)

  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [method, setMethod] = useState<'Cash' | 'Transfer'>('Cash')
  const [transferConfirmed, setTransferConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<ManualDoorSaleResult | null>(null)

  const { data: transferMethod } = useEventTransferMethod(eventId, method === 'Transfer' && event.requiresTicket)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setSelected(null)
  }, [debounced])

  function resetForm() {
    setSuccess(null)
    setSelected(null)
    setSearch('')
    setGuestName('')
    setGuestEmail('')
    setGuestPhone('')
    setQuantity(1)
    setMethod('Cash')
    setTransferConfirmed(false)
    setError('')
  }

  const unitPrice = event.requiresTicket ? (event.ticketPrice ?? 0) : 0
  const base = Number((unitPrice * quantity).toFixed(2))

  function canSubmit(): boolean {
    if (!event.allowDoorSales) return false
    if (buyerType === 'student' && !selected) return false
    if (buyerType === 'guest' && !guestName.trim()) return false
    if (quantity <= 0) return false
    if (event.requiresTicket && method === 'Transfer' && !transferConfirmed) return false
    return true
  }

  async function submit() {
    if (!eventId || manualSale.isPending) return
    setError('')
    try {
      const result = await manualSale.mutateAsync({
        studentId: buyerType === 'student' ? selected?.studentId : null,
        guest: buyerType === 'guest' ? {
          fullName: guestName.trim(),
          email: guestEmail.trim() || undefined,
          phone: guestPhone.trim() || undefined,
        } : null,
        quantity,
        paymentMethod: event.requiresTicket ? method : 'Cash',
        requestId: crypto.randomUUID(),
      })
      setSuccess(result)
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data
      setError(response?.message || getApiError(err) || 'No se pudo registrar la venta.')
    }
  }

  if (success) {
    const methodLabel = success.isFree ? 'Gratuito' : success.paymentMethod === 'Cash' ? 'Efectivo' : 'Transferencia'
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm dark:border-emerald-900/50 dark:bg-slate-900">
        <span className="text-4xl">✅</span>
        <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">VENTA REGISTRADA</p>
        <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">{success.attendeeName}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {success.quantity} {success.quantity === 1 ? 'entrada' : 'entradas'} · {money(success.totalAmount)}
          {!success.isFree && <><br />Método: {methodLabel}</>}
        </p>

        {success.attendeeType === 'Guest' && !success.hasRecoveryEmail && (
          <p className="mx-auto mt-3 max-w-xs rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
            Esta persona no tiene un medio de recuperación digital (sin email). Si no ingresa ahora, registrá el ingreso antes de que termine el evento.
          </p>
        )}

        <div className="mt-5 space-y-2">
          {success.availableQuantity > 0 && success.passToken && (
            <Button className="w-full bg-violet-600 text-white hover:bg-violet-700" onClick={() => { onCheckInNow(success) }}>
              Registrar ingreso ahora
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={resetForm}>Nueva venta</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Venta en puerta</p>

        {/* Tipo de persona */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setBuyerType('student')}
            className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${buyerType === 'student' ? 'border-violet-500 bg-violet-50 text-violet-700 dark:border-violet-400 dark:bg-violet-950/30 dark:text-violet-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'}`}>
            Alumno
          </button>
          <button type="button" onClick={() => setBuyerType('guest')}
            className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${buyerType === 'guest' ? 'border-violet-500 bg-violet-50 text-violet-700 dark:border-violet-400 dark:bg-violet-950/30 dark:text-violet-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'}`}>
            Externo
          </button>
        </div>

        {buyerType === 'student' ? (
          <div className="mt-3">
            <label htmlFor="manual-student-search" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Buscar alumno</label>
            <Input id="manual-student-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, DNI o email..." />
            {selected ? (
              <button type="button" onClick={() => setSelected(null)}
                className="mt-2 flex w-full items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-left dark:border-violet-900/50 dark:bg-violet-950/20">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selected.fullName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selected.dni ? `DNI ${selected.dni}` : ''}{selected.email ? ` · ${selected.email}` : ''}</p>
                </div>
                <span className="text-xs font-bold text-violet-600 dark:text-violet-300">Cambiar</span>
              </button>
            ) : debounced.length >= 2 && (
              <div className="mt-2 space-y-1.5">
                {searching ? (
                  <div className="flex items-center justify-center py-4"><Spinner className="h-5 w-5 text-violet-600" /></div>
                ) : results.length === 0 ? (
                  <p className="py-3 text-center text-xs text-slate-400">Sin resultados.</p>
                ) : (
                  results.map((r) => (
                    <button key={r.studentId} type="button" onClick={() => setSelected(r)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{r.fullName}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{r.dni ? `DNI ${r.dni}` : ''}{r.email ? ` · ${r.email}` : ''}</p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-violet-600 dark:text-violet-300">Seleccionar</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="manual-guest-name" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Nombre y apellido *</label>
              <Input id="manual-guest-name" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Juan Pérez" />
            </div>
            <div>
              <label htmlFor="manual-guest-email" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Email <span className="font-normal text-slate-400">(opcional)</span></label>
              <Input id="manual-guest-email" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="juan@mail.com" />
            </div>
            <div>
              <label htmlFor="manual-guest-phone" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Teléfono</label>
              <Input id="manual-guest-phone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="Opcional" />
            </div>
            <p className="text-[11px] leading-4 text-slate-400">En venta presencial el email es opcional. Si lo cargás, la persona podrá recuperar su acceso digitalmente.</p>
          </div>
        )}
      </div>

      {/* Cantidad */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cantidad</p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 text-xl font-bold text-slate-700 disabled:opacity-30 dark:border-slate-600 dark:text-slate-200">−</button>
          <span className="w-12 text-center text-3xl font-black text-slate-900 dark:text-white">{quantity}</span>
          <button type="button" onClick={() => setQuantity((q) => q + 1)} disabled={quantity >= 20}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 text-xl font-bold text-slate-700 disabled:opacity-30 dark:border-slate-600 dark:text-slate-200">+</button>
        </div>

        {event.requiresTicket ? (
          <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span>{money(unitPrice)} × {quantity}</span>
              <span className="font-semibold">Base {money(base)}</span>
            </div>
            <div className="flex items-center justify-between pt-1 text-base font-black text-slate-900 dark:text-white">
              <span>TOTAL</span>
              <span>{money(base)}</span>
            </div>
          </div>
        ) : (
          <p className="mt-4 border-t border-slate-100 pt-4 text-center text-sm font-bold text-emerald-700 dark:border-slate-800 dark:text-emerald-400">
            Entrada gratuita · {quantity} {quantity === 1 ? 'lugar' : 'lugares'}
          </p>
        )}

        {/* Medio de pago */}
        {event.requiresTicket && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Medio de pago</p>
            <EventMethodOption icon={<EventMethodIcon code="Cash" />} label="Efectivo" description="Cobro presencial" active={method === 'Cash'} onClick={() => setMethod('Cash')} />
            <EventMethodOption icon={<EventMethodIcon code="Transfer" />} label="Transferencia" description="Verificás la transferencia en persona" active={method === 'Transfer'} onClick={() => setMethod('Transfer')} />
            {method === 'Transfer' && (
              <>
                <EventTransferDetails
                  alias={transferMethod?.alias}
                  cbu={transferMethod?.cbu}
                  holderName={transferMethod?.holderName}
                  bankName={transferMethod?.bankName}
                  amount={base}
                  onCopied={() => {}}
                />
                <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <input type="checkbox" checked={transferConfirmed} onChange={(e) => setTransferConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                  <span>Confirmo que la transferencia fue verificada.</span>
                </label>
              </>
            )}
            <p className="text-[11px] text-slate-400">Mercado Pago no está disponible en puerta. La venta en puerta no tiene recargo.</p>
          </div>
        )}

        {!event.allowDoorSales && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-center text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">
            La venta en puerta está deshabilitada para este evento.
          </p>
        )}

        {error && <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">{error}</div>}

        <Button className="mt-4 w-full bg-violet-600 text-white hover:bg-violet-700" loading={manualSale.isPending} disabled={!canSubmit() || manualSale.isPending} onClick={submit}>
          {event.requiresTicket ? 'CONFIRMAR VENTA' : 'RESERVAR ENTRADAS'}
        </Button>
      </div>
    </div>
  )
}

function Stat({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'muted' | 'ok' }) {
  const color = tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'muted' ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'
  return (
    <div className="rounded-xl bg-slate-50 py-3 dark:bg-slate-800">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
    </div>
  )
}

function ConfirmTransferModal({ open, onClose, onConfirm, busy }: { open: boolean; onClose: () => void; onConfirm: () => void; busy: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title="Confirmar transferencia" className="sm:max-w-md">
      <div className="space-y-4 p-5">
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
          Confirmá que <span className="font-bold">verificaste la transferencia</span>. Esta operación marcará el pago como recibido.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button className="bg-violet-600 text-white hover:bg-violet-700" loading={busy} disabled={busy} onClick={onConfirm}>
            Confirmar transferencia
          </Button>
        </div>
      </div>
    </Modal>
  )
}
