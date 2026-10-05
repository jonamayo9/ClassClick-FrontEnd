import { useState } from 'react'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { BackButton } from '@/components/ui/back-button'
import { PageHero } from '@/components/ui/page-hero'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import {
  useDeliveryZones,
  useCreateDeliveryZone,
  useUpdateDeliveryZone,
  useToggleDeliveryZone,
  useDeleteDeliveryZone,
  type DeliveryZone,
} from './hooks'
import { money } from '@/lib/currency'

function ZoneForm({
  initial,
  onCancel,
  onSave,
  saving,
}: {
  initial?: DeliveryZone
  onCancel: () => void
  onSave: (body: { locality?: string | null; postalCode?: string | null; price: number }) => void
  saving: boolean
}) {
  const [locality, setLocality] = useState(initial?.locality ?? '')
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? '')
  const [price, setPrice] = useState(initial ? String(initial.price) : '')
  const [error, setError] = useState('')

  function submit() {
    setError('')
    const priceVal = Number(price)
    if (!locality.trim() && !postalCode.trim()) return setError('Definí al menos una localidad o un código postal.')
    if (Number.isNaN(priceVal) || priceVal < 0) return setError('El precio no puede ser negativo.')
    onSave({
      locality: locality.trim() || null,
      postalCode: postalCode.trim() || null,
      price: priceVal,
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Localidad</label>
          <Input value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="Adrogué" maxLength={200} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Código postal</label>
          <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="1828" maxLength={50} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Precio de envío</label>
        <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="3000" inputMode="decimal" />
      </div>
      <p className="text-xs text-slate-400">
        Al menos un campo (localidad o código postal). Si una dirección coincide con varias reglas, gana el código postal específico.
      </p>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button loading={saving} onClick={submit} className="bg-violet-600 text-white hover:bg-violet-700">Guardar</Button>
      </div>
    </div>
  )
}

function DeliveryZonesInner() {
  const { data: zones, isLoading } = useDeliveryZones()
  const createMutation = useCreateDeliveryZone()
  const updateMutation = useUpdateDeliveryZone()
  const toggleMutation = useToggleDeliveryZone()
  const deleteMutation = useDeleteDeliveryZone()
  const toast = useToast()

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<DeliveryZone | null>(null)

  async function handleSave(body: { locality?: string | null; postalCode?: string | null; price: number }) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, body })
        toast('Zona actualizada.')
      } else {
        await createMutation.mutateAsync(body)
        toast('Zona creada.')
      }
      setShowCreate(false)
      setEditing(null)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(msg ?? 'No se pudo guardar la zona.')
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      <BackButton to="/admin/clothing" label="Volver a Indumentaria" />
      <PageHero
        label="Envíos"
        title="Zonas de entrega"
        description="Precio de envío por localidad y/o código postal. El comprador nunca elige la tarifa; el backend la determina automáticamente."
      />

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Zonas</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Una dirección sin zona configurada queda fuera de cobertura.
            </p>
          </div>
          <Button size="sm" className="bg-violet-600 text-white hover:bg-violet-700" onClick={() => { setEditing(null); setShowCreate(true) }}>
            Nueva zona
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-violet-600" /></div>
        ) : !zones?.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
            Todavía no hay zonas. Creá la primera para habilitar envíos a domicilio.
          </div>
        ) : (
          <div className="space-y-2">
            {zones.map((z) => (
              <div key={z.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {z.locality || 'Toda localidad'}
                    {z.postalCode ? ` (CP ${z.postalCode})` : ''}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="font-bold text-violet-700 dark:text-violet-400">{money(z.price, z.currency)}</span>
                  {!z.isActive && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      Inactiva
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(z); setShowCreate(true) }}>
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleMutation.mutate(z.id)}>
                    {z.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(z.id)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showCreate && (
        <Modal
          open={showCreate}
          onClose={() => { setShowCreate(false); setEditing(null) }}
          title={editing ? 'Editar zona' : 'Nueva zona'}
        >
          <ZoneForm
            initial={editing ?? undefined}
            onCancel={() => { setShowCreate(false); setEditing(null) }}
            onSave={handleSave}
            saving={createMutation.isPending || updateMutation.isPending}
          />
        </Modal>
      )}
    </div>
  )
}

export default function DeliveryZonesPage() {
  return (
    <ToastProvider>
      <DeliveryZonesInner />
    </ToastProvider>
  )
}