import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { apiService, getApiError } from '@/lib/api'

interface ClassClickBillingSettings {
  transferEnabled: boolean
  transferAlias: string | null
  transferCbu: string | null
  transferHolder: string | null
  transferSurchargeType: number
  transferSurchargeValue: number
  mercadoPagoEnabled: boolean
  mercadoPagoConnected: boolean
  mercadoPagoSurchargeType: number
  mercadoPagoSurchargeValue: number
  updatedAtUtc: string | null
}

const SurchargeType = { None: 0, Percentage: 1, Fixed: 2 } as const

function BillingSettingsInner() {
  const toast = useToast()
  const qc = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['classclick-billing-settings'],
    queryFn: () => apiService.get<ClassClickBillingSettings>('/api/superadmin/billing/classclick-settings'),
  })

  const [form, setForm] = useState({
    transferEnabled: false,
    transferAlias: '',
    transferCbu: '',
    transferHolder: '',
    transferSurchargeType: 0,
    transferSurchargeValue: 0,
  })

  // Sincroniza el formulario con lo que devuelve el backend.
  const [loaded, setLoaded] = useState(false)
  if (!loaded && settings) {
    setForm({
      transferEnabled: settings.transferEnabled,
      transferAlias: settings.transferAlias ?? '',
      transferCbu: settings.transferCbu ?? '',
      transferHolder: settings.transferHolder ?? '',
      transferSurchargeType: settings.transferSurchargeType,
      transferSurchargeValue: settings.transferSurchargeValue,
    })
    setLoaded(true)
  }

  const save = useMutation({
    mutationFn: () =>
      apiService.put('/api/superadmin/billing/classclick-settings', {
        transferEnabled: form.transferEnabled,
        transferAlias: form.transferAlias || null,
        transferCbu: form.transferCbu || null,
        transferHolder: form.transferHolder || null,
        transferSurchargeType: Number(form.transferSurchargeType) || 0,
        transferSurchargeValue: Number(form.transferSurchargeValue) || 0,
      }),
    onSuccess: () => {
      toast('Configuración de ClassClick guardada.')
      qc.invalidateQueries({ queryKey: ['classclick-billing-settings'] })
    },
    onError: (err) => toast(getApiError(err), 'error'),
  })

  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-slate-600" /></div>
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Configuración de ClassClick</h1>
        <p className="mt-1 text-sm text-slate-400">Cobros y facturación de la plataforma hacia las empresas</p>
      </div>

      <Card className="p-5 space-y-5">
        <div>
          <h2 className="text-sm font-bold mb-1">Transferencia bancaria</h2>
          <p className="text-xs text-slate-400 mb-3">Datos globales de la cuenta de ClassClick. Todas las empresas pagan a esta cuenta.</p>

          <label className="mb-3 flex items-center gap-2 text-xs font-medium">
            <input type="checkbox" checked={form.transferEnabled} onChange={(e) => setForm({ ...form, transferEnabled: e.target.checked })} className="rounded border-slate-300 text-slate-800 focus:ring-slate-500" />
            Transferencia habilitada
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Alias</label>
              <Input value={form.transferAlias} onChange={(e) => setForm({ ...form, transferAlias: e.target.value })} placeholder="classclick.mp" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">CBU / CVU</label>
              <Input value={form.transferCbu} onChange={(e) => setForm({ ...form, transferCbu: e.target.value })} placeholder="0000003100012345678901" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Titular</label>
              <Input value={form.transferHolder} onChange={(e) => setForm({ ...form, transferHolder: e.target.value })} placeholder="ClassClick S.A." />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Recargo por transferencia</label>
              <Select value={String(form.transferSurchargeType)} onChange={(e) => setForm({ ...form, transferSurchargeType: Number(e.target.value) })}>
                <option value="0">Sin recargo</option>
                <option value="1">Porcentaje</option>
                <option value="2">Monto fijo</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Valor del recargo</label>
              <Input type="number" min={0} step="0.01" value={form.transferSurchargeValue} onChange={(e) => setForm({ ...form, transferSurchargeValue: Number(e.target.value) })} />
            </div>
          </div>

          {!form.transferEnabled && (form.transferAlias || form.transferCbu || form.transferHolder) && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Tenés datos cargados pero la transferencia está deshabilitada. Activá "Transferencia habilitada" para que las empresas puedan pagar por este medio.
            </p>
          )}
          {form.transferEnabled && (!form.transferAlias || !form.transferCbu || !form.transferHolder) && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              La transferencia está habilitada pero faltan Alias, CBU/CVU o Titular. Sin esos tres datos no se mostrará como disponible.
            </p>
          )}
        </div>

        <div className="border-t border-slate-200 pt-5 dark:border-slate-700">
          <h2 className="text-sm font-bold mb-1">Mercado Pago global</h2>
          <div className="flex items-center gap-2">
            <Badge variant="warning">Próximamente</Badge>
            <span className="text-xs text-slate-400">Checkout Pro de ClassClick (no implementado en esta etapa).</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Recargo Mercado Pago</label>
              <Select disabled value="0">
                <option value="0">Sin recargo</option>
                <option value="1">Porcentaje</option>
                <option value="2">Monto fijo</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Valor del recargo</label>
              <Input disabled placeholder="0" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
          <Button loading={save.isPending} onClick={() => save.mutate()} className="bg-slate-800 text-white hover:bg-slate-700">
            Guardar
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default function BillingSettingsPage() {
  return <ToastProvider><BillingSettingsInner /></ToastProvider>
}
