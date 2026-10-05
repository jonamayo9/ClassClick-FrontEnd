import { useState, useEffect } from 'react'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { BackButton } from '@/components/ui/back-button'
import { PageHero } from '@/components/ui/page-hero'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Spinner } from '@/components/ui/spinner'
import { useClothingSettings, useUpdateClothingFinancialSettings, useUpdateClothingStoreSettings, useMercadoPagoConnectUrl, useDisconnectMercadoPago } from './hooks'
import { slug } from '../hooks'

function ReadOnlyValue({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium break-words text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, maxLength }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} />
    </div>
  )
}

function SettingsPageInner() {
  const { data: settings, isLoading } = useClothingSettings()
  const updateMutation = useUpdateClothingFinancialSettings()
  const connectUrlMutation = useMercadoPagoConnectUrl()
  const disconnectMutation = useDisconnectMercadoPago()
  const toast = useToast()

  const [transferEnabled, setTransferEnabled] = useState(false)
  const [useCompany, setUseCompany] = useState<'company' | 'own'>('company')
  const [cbu, setCbu] = useState('')
  const [alias, setAlias] = useState('')
  const [holder, setHolder] = useState('')
  const [bank, setBank] = useState('')
  const [instructions, setInstructions] = useState('')
  const [mpEnabled, setMpEnabled] = useState(false)
  const [mpSource, setMpSource] = useState<'company' | 'own'>('company')
  const [reservationHours, setReservationHours] = useState('72')
  const [error, setError] = useState('')

  // ── Tienda Pública ──
  const storeUpdate = useUpdateClothingStoreSettings()
  const [publicStoreEnabled, setPublicStoreEnabled] = useState(false)
  const [publicStoreTitle, setPublicStoreTitle] = useState('')
  const [publicStoreDescription, setPublicStoreDescription] = useState('')
  const [publicStoreInstructions, setPublicStoreInstructions] = useState('')
  const [pickupEnabled, setPickupEnabled] = useState(false)
  const [homeDeliveryEnabled, setHomeDeliveryEnabled] = useState(false)
  const [originFormatted, setOriginFormatted] = useState('')
  const [originStreet, setOriginStreet] = useState('')
  const [originStreetNumber, setOriginStreetNumber] = useState('')
  const [originCity, setOriginCity] = useState('')
  const [originState, setOriginState] = useState('')
  const [originPostalCode, setOriginPostalCode] = useState('')
  const [originCountry, setOriginCountry] = useState('')
  const [storeError, setStoreError] = useState('')

  useEffect(() => {
    if (!settings) return
    setTransferEnabled(settings.transferEnabled)
    setUseCompany(settings.useCompanyTransferData ? 'company' : 'own')
    setCbu(settings.transferCbu ?? '')
    setAlias(settings.transferAlias ?? '')
    setHolder(settings.transferHolder ?? '')
    setBank(settings.transferBankName ?? '')
    setInstructions(settings.transferInstructions ?? '')
    setMpEnabled(settings.mercadoPagoEnabled)
    setMpSource(settings.useCompanyMercadoPagoAccount ? 'company' : 'own')
    setReservationHours(String(settings.reservationHours ?? 72))

    // Tienda Pública
    setPublicStoreEnabled(settings.publicStoreEnabled ?? false)
    setPublicStoreTitle(settings.publicStoreTitle ?? '')
    setPublicStoreDescription(settings.publicStoreDescription ?? '')
    setPublicStoreInstructions(settings.publicStoreInstructions ?? '')
    setPickupEnabled(settings.pickupEnabled ?? false)
    setHomeDeliveryEnabled(settings.homeDeliveryEnabled ?? false)
    setOriginFormatted(settings.originAddressFormatted ?? '')
    setOriginStreet(settings.originStreet ?? '')
    setOriginStreetNumber(settings.originStreetNumber ?? '')
    setOriginCity(settings.originCity ?? '')
    setOriginState(settings.originState ?? '')
    setOriginPostalCode(settings.originPostalCode ?? '')
    setOriginCountry(settings.originCountry ?? '')
  }, [settings])

  async function handleSave() {
    setError('')
    if (transferEnabled && useCompany === 'company' && !settings?.companyTransferData.canPay) {
      setError('Configurá un CBU/CVU o Alias en los datos generales de la empresa, o utilizá datos propios de Indumentaria.')
      return
    }
    if (transferEnabled && useCompany === 'own' && !(cbu.trim() || alias.trim())) {
      setError('Configurá un CBU/CVU o Alias para habilitar transferencias en Indumentaria.')
      return
    }
    if (mpEnabled) {
      const requiredConnected = mpSource === 'company' ? settings?.mercadoPagoGeneralConnected : settings?.mercadoPagoClothingConnected
      if (!requiredConnected) {
        setError(
          mpSource === 'company'
            ? 'Conectá la cuenta de Mercado Pago de la empresa para habilitar Mercado Pago.'
            : 'Conectá una cuenta de Mercado Pago para Indumentaria para habilitarlo.',
        )
        return
      }
    }
    try {
      await updateMutation.mutateAsync({
        transferEnabled,
        useCompanyTransferData: useCompany === 'company',
        transferCbu: cbu.trim() || null,
        transferAlias: alias.trim() || null,
        transferHolder: holder.trim() || null,
        transferBankName: bank.trim() || null,
        transferInstructions: instructions.trim() || null,
        mercadoPagoEnabled: mpEnabled,
        useCompanyMercadoPagoAccount: mpSource === 'company',
        reservationHours: Number(reservationHours) || undefined,
      })
      toast('Configuración guardada.')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo guardar la configuración.')
    }
  }

  async function handleSaveStore() {
    setStoreError('')
    if (publicStoreEnabled && !pickupEnabled && !homeDeliveryEnabled) {
      setStoreError('Habilitá al menos Retiro o Envío a domicilio.')
      return
    }
    if (publicStoreEnabled && homeDeliveryEnabled && !originFormatted.trim() && !originStreet.trim()) {
      setStoreError('Configurá el domicilio del club/institución antes de habilitar envíos.')
      return
    }
    try {
      await storeUpdate.mutateAsync({
        publicStoreEnabled,
        publicStoreTitle: publicStoreTitle.trim() || null,
        publicStoreDescription: publicStoreDescription.trim() || null,
        publicStoreInstructions: publicStoreInstructions.trim() || null,
        pickupEnabled,
        homeDeliveryEnabled,
        originAddressFormatted: originFormatted.trim() || null,
        originStreet: originStreet.trim() || null,
        originStreetNumber: originStreetNumber.trim() || null,
        originCity: originCity.trim() || null,
        originState: originState.trim() || null,
        originPostalCode: originPostalCode.trim() || null,
        originCountry: originCountry.trim() || null,
      })
      toast('Tienda pública guardada.')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setStoreError(msg ?? 'No se pudo guardar la tienda pública.')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <BackButton to="/admin/clothing" label="Volver a Indumentaria" />
      <PageHero
        label="Configuración"
        title="Configuración de Indumentaria"
        description="Medios de pago de la tienda: transferencia y Mercado Pago."
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="h-6 w-6 text-violet-600" />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* ── Transferencia ─────────────────────────────────────────── */}
          <Card className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Transferencia</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  El alumno transferirá y subirá un comprobante.
                </p>
              </div>
              <Switch checked={transferEnabled} onCheckedChange={setTransferEnabled} />
            </div>

            {transferEnabled && (
              <>
                <SegmentedControl
                  options={[
                    { value: 'company', label: 'Usar datos de la empresa' },
                    { value: 'own', label: 'Usar datos propios' },
                  ]}
                  value={useCompany}
                  onChange={(v) => setUseCompany(v as 'company' | 'own')}
                />

                {useCompany === 'company' ? (
                  <div className="space-y-3">
                    {!settings?.companyTransferData.canPay && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                        Los datos generales de la empresa no tienen CBU/CVU ni Alias. Configuralos o usá datos propios.
                      </div>
                    )}
                    <ReadOnlyValue label="CBU/CVU" value={settings?.companyTransferData.cbu} />
                    <ReadOnlyValue label="Alias" value={settings?.companyTransferData.alias} />
                    <ReadOnlyValue label="Titular" value={settings?.companyTransferData.holder} />
                    <ReadOnlyValue label="Banco / Billetera" value={settings?.companyTransferData.bankName} />
                    <p className="text-xs text-slate-400">
                      Estos datos se configuran en la empresa y no se duplican acá.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Field label="CBU/CVU" value={cbu} onChange={setCbu} placeholder="0000003100001234567890" maxLength={80} />
                    <Field label="Alias" value={alias} onChange={setAlias} placeholder="club.indumentaria.mp" maxLength={120} />
                    <Field label="Titular" value={holder} onChange={setHolder} placeholder="Club Deportivo Ejemplo" maxLength={200} />
                    <Field label="Banco / Billetera" value={bank} onChange={setBank} placeholder="Mercado Pago" maxLength={150} />
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Instrucciones adicionales</label>
                      <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} maxLength={1000} />
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* ── Mercado Pago (preparación) ─────────────────────────────── */}
          <Card className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Mercado Pago</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Pagos online con Mercado Pago.
                </p>
              </div>
              <Switch checked={mpEnabled} onCheckedChange={setMpEnabled} />
            </div>

            {mpEnabled && (
              <>
                <SegmentedControl
                  options={[
                    { value: 'company', label: 'Usar cuenta de la empresa' },
                    { value: 'own', label: 'Usar cuenta propia' },
                  ]}
                  value={mpSource}
                  onChange={(v) => setMpSource(v as 'company' | 'own')}
                />

                {mpSource === 'company' ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Cuenta de la empresa</p>
                      <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">
                        {settings?.mercadoPagoGeneralConnected ? 'Conectada' : 'No conectada'}
                      </p>
                    </div>
                    <p className="text-xs text-slate-400">
                      Indumentaria utilizará la cuenta de Mercado Pago conectada en la empresa.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Cuenta propia de Indumentaria</p>
                      <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">
                        {settings?.mercadoPagoClothingConnected ? 'Cuenta conectada' : 'No conectada'}
                      </p>
                    </div>
                    {settings?.mercadoPagoClothingConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnectMutation.mutate('clothing')}
                        disabled={disconnectMutation.isPending}
                      >
                        Desconectar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-violet-600 text-white hover:bg-violet-700"
                        onClick={() => connectUrlMutation.mutate('clothing')}
                        loading={connectUrlMutation.isPending}
                      >
                        Conectar Mercado Pago
                      </Button>
                    )}
                    <p className="text-xs text-slate-400">
                      Esta cuenta se usa exclusivamente para compras de Indumentaria. La conexión de la empresa no se modifica.
                    </p>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* ── Tiempo de reserva ─────────────────────────────────── */}
          <Card className="p-5 sm:p-6 space-y-4 lg:col-span-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Tiempo de reserva del pedido</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Si el pedido no recibe un pago válido dentro de este plazo, los productos reservados vuelven a estar disponibles.
              </p>
            </div>
            <div className="max-w-xs">
              <Field label="Duración (horas)" value={reservationHours} onChange={setReservationHours} placeholder="72" maxLength={4} />
            </div>
            <p className="text-xs text-slate-400">
              Los pedidos con adelanto aprobado no vencen automáticamente por esta regla.
            </p>
          </Card>

          {/* ── Tienda Pública (Etapa 12) ─────────────────────────── */}
          <Card className="p-5 sm:p-6 space-y-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Tienda Pública</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Compras sin login en <span className="font-medium text-slate-700 dark:text-slate-300">/tienda/{slug()}</span>
                </p>
              </div>
              <Switch checked={publicStoreEnabled} onCheckedChange={setPublicStoreEnabled} />
            </div>

            {publicStoreEnabled && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Título de la tienda" value={publicStoreTitle} onChange={setPublicStoreTitle} placeholder="Tienda del Club" maxLength={160} />
                  <Field label="Instrucciones de retiro" value={publicStoreInstructions} onChange={setPublicStoreInstructions} placeholder="Retirá de lunes a viernes de 9 a 18 hs" maxLength={2000} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Descripción</label>
                  <Textarea value={publicStoreDescription} onChange={(e) => setPublicStoreDescription(e.target.value)} rows={2} maxLength={2000} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Retiro en la institución</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Costo $0</p>
                    </div>
                    <Switch checked={pickupEnabled} onCheckedChange={setPickupEnabled} />
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Envío a domicilio</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Según tarifas configuradas</p>
                    </div>
                    <Switch checked={homeDeliveryEnabled} onCheckedChange={setHomeDeliveryEnabled} />
                  </div>
                </div>

                {/* Origen de despacho / retiro */}
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Domicilio del club / institución</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Es el domicilio desde donde salen los envíos y donde se retira.
                    </p>
                  </div>

                  <Field label="Dirección (calle y número)" value={originStreet} onChange={setOriginStreet} placeholder="Av. Siempre Viva 742" maxLength={200} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Ciudad" value={originCity} onChange={setOriginCity} placeholder="Adrogué" maxLength={150} />
                    <Field label="Provincia" value={originState} onChange={setOriginState} placeholder="Buenos Aires" maxLength={150} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Código postal" value={originPostalCode} onChange={setOriginPostalCode} placeholder="1846" maxLength={50} />
                    <Field label="País" value={originCountry} onChange={setOriginCountry} placeholder="Argentina" maxLength={100} />
                    <Field label="Dirección completa" value={originFormatted} onChange={setOriginFormatted} placeholder="Av. Siempre Viva 742, Adrogué, Buenos Aires" maxLength={500} />
                  </div>
                </div>

                {storeError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    {storeError}
                  </div>
                )}

                <Button
                  loading={storeUpdate.isPending}
                  onClick={handleSaveStore}
                  className="bg-violet-600 text-white hover:bg-violet-700"
                >
                  Guardar tienda pública
                </Button>
              </>
            )}
          </Card>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 lg:col-span-2">
              {error}
            </div>
          )}

          <div className="lg:col-span-2">
            <Button loading={updateMutation.isPending} onClick={handleSave} className="bg-violet-600 text-white hover:bg-violet-700">
              Guardar cambios
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <ToastProvider>
      <SettingsPageInner />
    </ToastProvider>
  )
}