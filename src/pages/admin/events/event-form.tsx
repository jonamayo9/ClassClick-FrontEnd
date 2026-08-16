import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { DatePicker, TimePicker, DateTimePicker } from '@/components/ui/date-picker'
import { getApiError, apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import type { ClassClickEvent } from './hooks'

/** Modal de crear/editar evento, compartido entre el listado y el centro de gestión. */
export function EventFormModal({ open, event, submitting, onSubmit, toast, onClose }: {
  open: boolean
  event: ClassClickEvent | null
  submitting: boolean
  onSubmit: (fd: FormData) => Promise<unknown>
  toast: (msg: string, type?: 'success' | 'error') => void
  onClose: () => void
}) {
  const isEdit = !!event
  const slug = useAuth((s) => s.activeCompanySlug)

  const { data: companyMethods } = useQuery({
    queryKey: ['company-payment-methods', slug],
    queryFn: () => apiService.get<Array<{ paymentMethod: string | number; enabledBySuperAdmin: boolean; isEnabledByAdmin: boolean }>>(`/api/admin/${slug}/payment-methods`),
    enabled: !!slug,
  })

  // El enum PaymentMethod viaja como string ("Transfer") o número (1): aceptamos ambos.
  const transferMethod = companyMethods?.find((m) => {
    const raw = String(m.paymentMethod).toLowerCase()
    return raw === 'transfer' || raw === 'transferencia' || Number(m.paymentMethod) === 1
  })
  const transferEnabled = !!transferMethod?.enabledBySuperAdmin && !!transferMethod?.isEnabledByAdmin

  // La advertencia se basa en los DATOS BANCARIOS DEL EVENTO, no en los de la empresa.
  const missingBankFields = [
    !event?.transferAlias && 'Alias',
    !event?.transferAccountHolder && 'Titular',
    !event?.transferBankName && 'Banco',
  ].filter(Boolean) as string[]
  const transferConfigured = missingBankFields.length === 0

  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [location, setLocation] = useState(event?.location ?? '')
  const [eventDate, setEventDate] = useState(event?.startsAt ? event.startsAt.slice(0, 10) : '')
  const [startTime, setStartTime] = useState(event?.hasStartTime && event?.startsAt ? event.startsAt.slice(11, 16) : '')
  const [endDate, setEndDate] = useState(event?.endsAt ? event.endsAt.slice(0, 10) : '')
  const [endTime, setEndTime] = useState(event?.hasEndTime && event?.endsAt ? event.endsAt.slice(11, 16) : '')

  const [requiresTicket, setRequiresTicket] = useState(event?.requiresTicket ?? false)
  const [ticketPrice, setTicketPrice] = useState(event?.ticketPrice != null ? String(event.ticketPrice) : '')

  const [unlimited, setUnlimited] = useState(event?.capacity == null)
  const [capacity, setCapacity] = useState(event?.capacity != null ? String(event.capacity) : '')
  const [maxPerStudent, setMaxPerStudent] = useState(event?.maxTicketsPerStudent != null ? String(event.maxTicketsPerStudent) : '')

  const [limitSales, setLimitSales] = useState(!!event?.salesStartAt || !!event?.salesEndAt)
  const [salesStartAt, setSalesStartAt] = useState(event?.salesStartAt ?? '')
  const [salesEndAt, setSalesEndAt] = useState(event?.salesEndAt ?? '')

  const [showOnStudentHome, setShowOnStudentHome] = useState(event?.showOnStudentHome ?? true)
  const [allowDoorSales, setAllowDoorSales] = useState(event?.allowDoorSales ?? true)
  const [publicSalesEnabled, setPublicSalesEnabled] = useState(event?.publicSalesEnabled ?? false)
  const [purchaseTerms, setPurchaseTerms] = useState(event?.purchaseTerms ?? '')
  const [applyTransferSurcharge, setApplyTransferSurcharge] = useState(event?.applyTransferSurcharge ?? false)
  const [transferAlias, setTransferAlias] = useState(event?.transferAlias ?? '')
  const [transferCbu, setTransferCbu] = useState(event?.transferCbu ?? '')
  const [transferAccountHolder, setTransferAccountHolder] = useState(event?.transferAccountHolder ?? '')
  const [transferBankName, setTransferBankName] = useState(event?.transferBankName ?? '')

  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [error, setError] = useState('')

  function handleImage(files: FileList | null) {
    const file = files?.[0]
    setImage(file || null)
    if (file) {
      setPreview(URL.createObjectURL(file))
    } else {
      setPreview(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!title.trim()) { setError('El título es obligatorio.'); return }
    if (!eventDate) { setError('La fecha del evento es obligatoria.'); return }
    if (endTime && !startTime) { setError('Para indicar una hora de fin, primero configurá la hora de inicio.'); return }
    if (endDate) {
      const start = new Date(`${eventDate}T${startTime || '00:00'}`).getTime()
      const end = new Date(`${endDate}T${endTime || '00:00'}`).getTime()
      if (end <= start) { setError('La fecha de fin debe ser posterior al inicio.'); return }
    }
    if (requiresTicket) {
      const price = Number(ticketPrice)
      if (!ticketPrice || Number.isNaN(price) || price <= 0) { setError('Debés indicar un precio de entrada válido.'); return }
    }
    if (!unlimited) {
      const cap = Number(capacity)
      if (!capacity || Number.isNaN(cap) || cap <= 0) { setError('La cantidad máxima debe ser mayor a cero.'); return }
    }
    if (maxPerStudent) {
      const max = Number(maxPerStudent)
      if (Number.isNaN(max) || max <= 0) { setError('El máximo por alumno debe ser mayor a cero.'); return }
    }
    if (limitSales && salesStartAt && salesEndAt && new Date(salesEndAt).getTime() <= new Date(salesStartAt).getTime()) {
      setError('El fin del período de venta no puede ser anterior al inicio.'); return
    }
    if (image && image.size > 5 * 1024 * 1024) { setError('La imagen no puede superar los 5 MB.'); return }

    const fd = new FormData()
    const startsAt = `${eventDate}T${startTime || '00:00'}`
    const hasStartTime = !!startTime
    const endsAt = endDate ? `${endDate}T${endTime || '00:00'}` : ''
    const hasEndTime = !!endTime

    fd.append('title', title.trim())
    fd.append('description', description.trim())
    fd.append('location', location.trim())
    fd.append('startsAt', startsAt)
    fd.append('hasStartTime', hasStartTime ? 'true' : 'false')
    if (endsAt) {
      fd.append('endsAt', endsAt)
      fd.append('hasEndTime', hasEndTime ? 'true' : 'false')
    }
    fd.append('requiresTicket', requiresTicket ? 'true' : 'false')
    if (requiresTicket) fd.append('ticketPrice', ticketPrice)
    if (!unlimited) fd.append('capacity', capacity)
    if (maxPerStudent) fd.append('maxTicketsPerStudent', maxPerStudent)
    if (limitSales) {
      if (salesStartAt) fd.append('salesStartAt', salesStartAt)
      if (salesEndAt) fd.append('salesEndAt', salesEndAt)
    }
  fd.append('allowDoorSales', allowDoorSales ? 'true' : 'false')
  fd.append('showOnStudentHome', showOnStudentHome ? 'true' : 'false')
  fd.append('publicSalesEnabled', publicSalesEnabled ? 'true' : 'false')
  if (purchaseTerms.trim()) fd.append('purchaseTerms', purchaseTerms.trim())
  fd.append('applyTransferSurcharge', applyTransferSurcharge ? 'true' : 'false')
  if (transferAlias.trim()) fd.append('transferAlias', transferAlias.trim())
  if (transferCbu.trim()) fd.append('transferCbu', transferCbu.trim())
  if (transferAccountHolder.trim()) fd.append('transferAccountHolder', transferAccountHolder.trim())
  if (transferBankName.trim()) fd.append('transferBankName', transferBankName.trim())
    if (image) fd.append('image', image)
    if (isEdit) fd.append('removeImage', removeImage ? 'true' : 'false')

    try {
      await onSubmit(fd)
      toast(isEdit ? 'Evento actualizado.' : 'Evento creado como borrador.')
      onClose()
    } catch (err: unknown) {
      setError(getApiError(err) || 'No se pudo guardar el evento.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar evento' : 'Nuevo evento'}
      description={isEdit ? 'Modificá la información del evento.' : 'Se guardará como borrador. Publicá cuando esté listo.'}
      className="sm:max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 px-5 py-4 sm:px-6">
        {/* Información general */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Información general</h3>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Título *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Ej: Fiesta de fin de año" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Descripción</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000}
              placeholder="Contanos de qué se trata el evento..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Lugar *</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={300} placeholder="Ej: Estadio principal" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Imagen</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleImage(e.target.files)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:file:bg-slate-700 dark:file:text-slate-300" />
              <p className="mt-1 text-xs text-slate-400">JPG, PNG o WEBP. Máx 5 MB.</p>
            </div>
          </div>
          {isEdit && !image && !removeImage && event?.imageUrl && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <img src={event.imageUrl} alt={event.title} className="h-16 w-24 rounded-xl border border-slate-200 object-cover dark:border-slate-700" />
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                Quitar imagen actual
              </label>
            </div>
          )}
          {preview && (
            <img src={preview} alt="Preview" className="h-20 w-32 rounded-xl border border-slate-200 object-cover dark:border-slate-700" />
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Fecha del evento *</label>
              <DatePicker value={eventDate} onChange={setEventDate} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Hora de inicio</label>
              <TimePicker value={startTime} onChange={setStartTime} placeholder="Opcional" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Fecha de fin</label>
              <DatePicker value={endDate} onChange={setEndDate} defaultMonth={eventDate || undefined} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Hora de fin</label>
              <TimePicker value={endTime} onChange={setEndTime} placeholder="Opcional" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            La fecha es obligatoria. La hora es opcional: podés indicar solo el día del evento.
          </p>
        </section>

        {/* Entradas */}
        <section className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Entradas</h3>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
            <input type="checkbox" checked={requiresTicket} onChange={(e) => setRequiresTicket(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">¿Requiere entrada?</span>
          </label>
          {requiresTicket ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Precio por entrada (ARS) *</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <Input type="number" min="0" step="any" value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)}
                  placeholder="5000" className="pl-7" />
              </div>
              <p className="mt-1 text-xs text-slate-400">El precio se guarda por entrada. Ej: $5.000 por persona.</p>
            </div>
          ) : (
            <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
              Evento gratuito. Más adelante se podrá reservar entrada sin pago.
            </p>
          )}

          {requiresTicket && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Transferencia</p>

              {transferEnabled ? (
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={applyTransferSurcharge} onChange={(e) => setApplyTransferSurcharge(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Aplicar incremento por transferencia</span>
                </label>
              ) : (
                <p className="text-xs leading-4 text-slate-400">
                  La transferencia no está habilitada para esta institución. Cuando se habilite, podrás decidir si aplica el incremento.
                </p>
              )}

              {transferEnabled && (
                <p className="text-xs leading-4 text-slate-400">
                  Utiliza el incremento configurado para Transferencia en los medios de pago de la empresa. Solo aplica a compras online; la venta en puerta nunca lo cobra.
                </p>
              )}

              {transferEnabled && (
                <>
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Datos para transferir en este evento</p>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Alias</label>
                      <Input value={transferAlias} onChange={(e) => setTransferAlias(e.target.value)} maxLength={120} placeholder="Ej: final.club" className="bg-white dark:bg-slate-900" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">CBU / CVU</label>
                      <Input value={transferCbu} onChange={(e) => setTransferCbu(e.target.value)} maxLength={120} placeholder="Opcional" className="bg-white dark:bg-slate-900" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Titular</label>
                      <Input value={transferAccountHolder} onChange={(e) => setTransferAccountHolder(e.target.value)} maxLength={150} placeholder="Ej: Club de Leones" className="bg-white dark:bg-slate-900" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Banco</label>
                      <Input value={transferBankName} onChange={(e) => setTransferBankName(e.target.value)} maxLength={150} placeholder="Ej: Galicia" className="bg-white dark:bg-slate-900" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Son los datos que ven Student, Guest y Operator para este evento. Todos son opcionales: los vacíos no se muestran a los compradores.
                    </p>
                  </div>

                  <div className="text-xs">
                    {transferConfigured ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Transferencia configurada
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5" /> Transferencia habilitada pero faltan datos bancarios para este evento
                        </span>
                        <p className="pl-1 text-slate-500 dark:text-slate-400">Falta configurar:</p>
                        <ul className="pl-5 list-disc text-slate-500 dark:text-slate-400">
                          {missingBankFields.map((f) => <li key={f}>{f}</li>)}
                        </ul>
                        <p className="text-[11px] text-slate-400">Solo se muestra como aviso: no impide publicar ni vender. Los compradores verán únicamente los datos que existan.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        {/* Cupos */}
        <section className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Cupos</h3>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
            <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Cupo ilimitado</span>
          </label>
          {!unlimited && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Cantidad máxima</label>
                <Input type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Ej: 500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Máximo por alumno</label>
                <Input type="number" min="1" value={maxPerStudent} onChange={(e) => setMaxPerStudent(e.target.value)} placeholder="Opcional, ej: 4" />
              </div>
            </div>
          )}
        </section>

        {/* Período de venta */}
        <section className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Período de venta</h3>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
            <input type="checkbox" checked={limitSales} onChange={(e) => setLimitSales(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Limitar período de venta</span>
          </label>
          {limitSales && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Disponible desde</label>
                <DateTimePicker value={salesStartAt} onChange={setSalesStartAt} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Disponible hasta</label>
                <DateTimePicker value={salesEndAt} onChange={setSalesEndAt} defaultMonth={salesStartAt ? salesStartAt.slice(0, 7) : undefined} />
              </div>
            </div>
          )}
        </section>

        {/* Otras opciones */}
        <section className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Otras opciones</h3>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
            <input type="checkbox" checked={showOnStudentHome} onChange={(e) => setShowOnStudentHome(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Mostrar evento en el inicio del alumno</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
            <input type="checkbox" checked={allowDoorSales} onChange={(e) => setAllowDoorSales(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Permitir venta en puerta</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50/50 px-4 py-3 dark:border-violet-900/50 dark:bg-violet-950/20">
            <input type="checkbox" checked={publicSalesEnabled} onChange={(e) => setPublicSalesEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Permitir venta pública de entradas</span>
          </label>
          <p className="text-[11px] text-slate-400">
            Permite que personas sin cuenta de ClassClick compren entradas para este evento.
          </p>
          {publicSalesEnabled && isEdit && event?.publicSlug && (
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              URL pública: <span className="font-mono font-semibold text-violet-700 dark:text-violet-300">/e/{event.publicSlug}</span>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Condiciones de compra / ingreso (opcional)</label>
            <textarea value={purchaseTerms} onChange={(e) => setPurchaseTerms(e.target.value)} rows={3} maxLength={2000}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
              placeholder={'Ej: las entradas no tienen devolución.\nLos menores de 12 años ingresan acompañados.\nPresentarse 30 minutos antes del inicio.'} />
            <p className="mt-1 text-[11px] text-slate-400">
              Si se completa, los compradores (públicos y alumnos) deben aceptarlas antes de comprar. Se guarda la aceptación.
            </p>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button type="submit" loading={submitting} className="bg-violet-600 text-white hover:bg-violet-700">
            {isEdit ? 'Guardar cambios' : 'Guardar borrador'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
