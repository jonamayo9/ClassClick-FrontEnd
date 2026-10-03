import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { apiService, getApiError } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Switch } from '@/components/ui/switch'
import { ArrowLeftRight, Banknote, CreditCard, Wallet } from 'lucide-react'
import { EducativaTraining } from '../types'

interface Method {
  id: string
  paymentMethod: string
  paymentMethodName?: string
  displayName?: string
  enabledBySuperAdmin: boolean
  isEnabledByAdmin: boolean
  mercadoPagoOnlinePaymentsEnabled?: boolean
  mercadoPagoOnlinePaymentsEnabledBySuperAdmin?: boolean
  surchargeType?: string
  surchargeValue?: number
  instructions?: string | null
  alias?: string | null
  cbu?: string | null
  holderName?: string | null
  bankName?: string | null
}

interface MoraPolicy {
  id?: string
  name?: string | null
  percentIncrease: number
  fixedIncrease: number
  graceDays: number
  recurrenceType: string
  isActive: boolean
}

interface MercadoPagoStatus {
  isConnected?: boolean
  mercadoPagoUserId?: string | null
  connectedAtUtc?: string | null
  lastError?: string | null
  autoCollectionEnabledBySuperAdmin?: boolean
  status?: string
}

const METHOD_LABELS: Record<string, string> = { Transfer: 'Transferencia', DebitCard: 'Tarjeta de débito', CreditCard: 'Tarjeta de crédito', MercadoPago: 'Mercado Pago', Cash: 'Efectivo' }
const RECURRENCE_LABELS: Record<string, string> = { OneTime: 'Única vez', Daily: 'Diaria', Weekly: 'Semanal' }
const PAYMENT_MODE_LABELS: Record<string, string> = { single: 'Pago único', monthly: 'Mensual', fixed_installments: 'Cuotas fijas' }

function ConfigPagosInner() {
  const { companySlug } = useParams<{ companySlug: string }>()
  const slug = companySlug ?? ''
  const { companies, activeCompanySlug } = useAuth()
  const activeCompany = companies?.find((c: any) => (c.slug ?? c.companySlug) === activeCompanySlug)

  const [tab, setTab] = useState<'summary' | 'lateFees' | 'payments'>('summary')

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black sm:text-2xl">Configuración de pagos</h1>
            <p className="mt-1 text-sm text-blue-200">Vencimientos, moras y medios de pago de la institución</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex min-w-max gap-1.5">
          {([
            ['summary', 'Resumen rápido'],
            ['lateFees', 'Vencimientos y moras'],
            ['payments', 'Medios de pago'],
          ] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold whitespace-nowrap transition ${
                tab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'summary' && <SummaryTab slug={slug} companyName={activeCompany?.name} />}
      {tab === 'lateFees' && <LateFeesTab slug={slug} />}
      {tab === 'payments' && <PaymentsTab slug={slug} />}
    </div>
  )
}

/* ── Resumen rápido ── */
function SummaryTab({ slug, companyName }: { slug: string; companyName?: string }) {
  const moraQuery = useQuery({
    queryKey: ['educativa-mora', slug],
    queryFn: () => apiService.get<MoraPolicy>(`/api/educativa/${slug}/payment-settings/mora`),
    enabled: !!slug,
    retry: false,
  })
  const methodsQuery = useQuery({
    queryKey: ['educativa-config-pagos', slug],
    queryFn: () => apiService.get<Method[]>(`/api/educativa/${slug}/payment-methods`),
    enabled: !!slug,
    retry: false,
  })
  const trainingsQuery = useQuery({
    queryKey: ['educativa-trainings', slug],
    queryFn: () => apiService.get<EducativaTraining[]>(`/api/educativa/${slug}/trainings`),
    enabled: !!slug,
    retry: false,
  })

  const mora = moraQuery.data
  const activeMethods = (methodsQuery.data ?? []).filter((m) => m.enabledBySuperAdmin && m.isEnabledByAdmin)
  const trainings = trainingsQuery.data ?? []
  const trainingsWithEconomy = trainings.filter((t) => t.countries.length > 0)
  const dueDays = trainingsWithEconomy.flatMap((t) => t.countries.map((c) => c.installmentDueDayOfMonth).filter((d): d is number => d != null))
  const defaultDueDay = dueDays.length ? Math.round(dueDays.reduce((a, b) => a + b, 0) / dueDays.length) : null

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Resumen rápido</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Estado general de la configuración de pagos.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatBox label="Empresa" value={companyName || '-'} />
          <StatBox label="Mora" value={mora?.isActive ? 'Activa' : 'Inactiva'}
            sub={mora?.isActive ? descripcionMora(mora) : 'Sin recargos por mora'} />
          <StatBox label="Vencimiento típico" value={defaultDueDay ? `Día ${defaultDueDay}` : 'Por formación'}
            sub={`${trainingsWithEconomy.length} formación(es) con economía`} />
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Medios de pago</p>
            <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{activeMethods.length} activos</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {activeMethods.length > 0 ? activeMethods.map((m) => METHOD_LABELS[m.paymentMethod] ?? m.paymentMethod).join(', ') : 'Sin medios activos'}
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link to={`/educativa/${slug}/formaciones`}><Button variant="outline" size="sm">Economía de formaciones</Button></Link>
        <Link to={`/educativa/${slug}/promociones`}><Button variant="outline" size="sm">Promociones</Button></Link>
        <Link to={`/educativa/${slug}/commissions`}><Button variant="outline" size="sm">Comisiones</Button></Link>
      </div>
    </div>
  )
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  )
}

function descripcionMora(m: MoraPolicy) {
  const parts: string[] = []
  if (m.percentIncrease > 0) parts.push(`${m.percentIncrease}%`)
  if (m.fixedIncrease > 0) parts.push(`$${m.fixedIncrease}`)
  const recargo = parts.length > 0 ? parts.join(' + ') : 'Sin recargo'
  return `${RECURRENCE_LABELS[m.recurrenceType] ?? m.recurrenceType} · ${recargo}${m.graceDays > 0 ? ` · ${m.graceDays} días de gracia` : ''}`
}

/* ── Vencimientos y moras ── */
function LateFeesTab({ slug }: { slug: string }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [form, setForm] = useState<MoraPolicy | null>(null)
  const [saving, setSaving] = useState(false)

  const moraQuery = useQuery({
    queryKey: ['educativa-mora', slug],
    queryFn: () => apiService.get<MoraPolicy>(`/api/educativa/${slug}/payment-settings/mora`),
    enabled: !!slug,
    retry: false,
  })

  useEffect(() => {
    if (moraQuery.data && !form) setForm(moraQuery.data)
  }, [moraQuery.data, form])

  const trainingsQuery = useQuery({
    queryKey: ['educativa-trainings', slug],
    queryFn: () => apiService.get<EducativaTraining[]>(`/api/educativa/${slug}/trainings`),
    enabled: !!slug,
    retry: false,
  })
  const trainings = trainingsQuery.data ?? []

  async function saveMora() {
    if (!form) return
    setSaving(true)
    try {
      await apiService.put(`/api/educativa/${slug}/payment-settings/mora`, {
        name: form.name ?? undefined,
        percentIncrease: Number(form.percentIncrease) || 0,
        fixedIncrease: Number(form.fixedIncrease) || 0,
        graceDays: Number(form.graceDays) || 0,
        recurrenceType: form.recurrenceType,
        isActive: form.isActive,
      })
      qc.invalidateQueries({ queryKey: ['educativa-mora', slug] })
      toast('Configuración de mora guardada.')
    } catch (err) {
      toast(getApiError(err) || 'Error al guardar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-black">Mora</h2>
        <p className="mb-4 text-sm text-slate-500">Recargos por obligaciones vencidas (EnrollmentMoraPolicy)</p>
        {moraQuery.isLoading && <div className="flex justify-center py-8 text-slate-400"><Spinner /></div>}
        {form && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre (opcional)</label>
              <Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Mora mensual" />
            </div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">% de recargo</label><Input type="number" value={form.percentIncrease} onChange={(e) => setForm({ ...form, percentIncrease: Number(e.target.value) })} /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Recargo fijo</label><Input type="number" value={form.fixedIncrease} onChange={(e) => setForm({ ...form, fixedIncrease: Number(e.target.value) })} /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Días de gracia</label><Input type="number" value={form.graceDays} onChange={(e) => setForm({ ...form, graceDays: Number(e.target.value) })} /></div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Recurrencia</label>
              <Select value={form.recurrenceType} onChange={(e) => setForm({ ...form, recurrenceType: e.target.value })}>
                {Object.entries(RECURRENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium sm:col-span-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              Mora activa
            </label>
            <div className="sm:col-span-2">
              <Button onClick={saveMora} loading={saving}>Guardar mora</Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-black">Vencimientos por formación</h2>
        <p className="mb-4 text-sm text-slate-500">Día de vencimiento, frecuencia y cantidad de cuotas de cada formación</p>
        {trainingsQuery.isLoading && <div className="flex justify-center py-8 text-slate-400"><Spinner /></div>}
        {!trainingsQuery.isLoading && trainings.length === 0 && <p className="text-sm text-slate-400">Sin formaciones.</p>}
        {!trainingsQuery.isLoading && trainings.length > 0 && (
          <div className="space-y-3">
            {trainings.map((t) => {
              const countries = t.countries.filter((c) => c.countryCode === 'AR')
              return (
                <div key={t.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t.name}</p>
                  {countries.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-400">Sin configuración económica.</p>
                  ) : (
                    <ul className="mt-1 space-y-1 text-xs text-slate-500">
                      {countries.map((c) => (
                        <li key={c.id}>
                          Modalidad <b>{PAYMENT_MODE_LABELS[c.paymentMode] ?? c.paymentMode}</b>
                          {c.installmentDueDayOfMonth != null && <> · vence día <b>{c.installmentDueDayOfMonth}</b></>}
                          {c.installmentFrequencyMonths != null && <> · cada <b>{c.installmentFrequencyMonths}</b> mes(es)</>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

/* ── Medios de pago ── */
const SURCHARGE_OPTIONS = [
  { value: 'None', label: 'Sin recargo' },
  { value: 'Percentage', label: 'Porcentaje' },
  { value: 'FixedAmount', label: 'Monto fijo' },
]

function isMercadoPagoMethod(m: Method) {
  return String(m.paymentMethod).toLowerCase() === 'mercadopago'
}

function isTransferMethod(m: Method) {
  return m.paymentMethod === 'Transfer'
}

function surchargeLabel(d: Method): string {
  const type = d.surchargeType ?? 'None'
  if (type === 'Percentage' && (d.surchargeValue ?? 0) > 0) return `Recargo: ${d.surchargeValue}%`
  if (type === 'FixedAmount' && (d.surchargeValue ?? 0) > 0) return `Recargo: $${d.surchargeValue}`
  return 'Recargo: Sin recargo'
}

function MethodIcon({ method }: { method: string }) {
  const code = String(method).toLowerCase()
  if (code === 'cash') return <Banknote className="h-5 w-5" aria-hidden="true" />
  if (code === 'transfer') return <ArrowLeftRight className="h-5 w-5" aria-hidden="true" />
  if (code === 'mercadopago') return <Wallet className="h-5 w-5" aria-hidden="true" />
  return <CreditCard className="h-5 w-5" aria-hidden="true" />
}

function PaymentsTab({ slug }: { slug: string }) {
  const toast = useToast()
  const qc = useQueryClient()

  const methodsQuery = useQuery({
    queryKey: ['educativa-config-pagos', slug],
    queryFn: () => apiService.get<Method[]>(`/api/educativa/${slug}/payment-methods`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })
  const methods = (methodsQuery.data ?? []).filter((m) => m.enabledBySuperAdmin)

  const mpQuery = useQuery({
    queryKey: ['educativa-mercadopago-status', slug],
    queryFn: () => apiService.get<MercadoPagoStatus>(`/api/educativa/${slug}/mercadopago/status`),
    enabled: !!slug,
    retry: false,
  })
  const mp = mpQuery.data

  const [editing, setEditing] = useState<Method | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function saveMethod(draft: Method) {
    const body = methods.map((m) => {
      const d = m.id === draft.id ? draft : m
      return {
        companyPaymentMethodId: m.id,
        isEnabledByAdmin: d.isEnabledByAdmin,
        mercadoPagoOnlinePaymentsEnabled: d.mercadoPagoOnlinePaymentsEnabled ?? false,
        surchargeType: d.surchargeType ?? 'None',
        surchargeValue: d.surchargeValue ?? 0,
        instructions: d.instructions || null,
        alias: d.alias || null,
        cbu: d.cbu || null,
        holderName: d.holderName || null,
        bankName: d.bankName || null,
      }
    })
    await apiService.put(`/api/educativa/${slug}/payment-methods`, body)
    qc.invalidateQueries({ queryKey: ['educativa-config-pagos', slug] })
  }

  async function toggleEnabled(m: Method) {
    setSavingId(m.id)
    try {
      await saveMethod({ ...m, isEnabledByAdmin: !m.isEnabledByAdmin })
      toast(m.isEnabledByAdmin ? 'Medio de pago desactivado.' : 'Medio de pago activado.')
    } catch (err) {
      toast(getApiError(err) || 'Error al guardar.', 'error')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black">Medios de pago</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Configurá los medios habilitados para tus alumnos.</p>
      </div>

      {methodsQuery.isLoading && (
        <div className="flex justify-center py-12 text-slate-400 dark:text-slate-500"><Spinner /></div>
      )}
      {!methodsQuery.isLoading && methods.length === 0 && (
        <Card className="p-6 text-sm text-slate-500 dark:text-slate-400">No hay medios de pago habilitados para esta institución.</Card>
      )}

      {!methodsQuery.isLoading && methods.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {methods.map((m) => (
            <MethodCard
              key={m.id}
              method={m}
              mp={mp}
              saving={savingId === m.id}
              onToggle={() => toggleEnabled(m)}
              onConfigure={() => setEditing(m)}
            />
          ))}
        </div>
      )}

      {editing && (
        <MethodModal
          slug={slug}
          method={editing}
          mp={mp}
          onClose={() => setEditing(null)}
          onSave={saveMethod}
        />
      )}
    </div>
  )
}

function MethodCard({ method, mp, saving, onToggle, onConfigure }: {
  method: Method
  mp?: MercadoPagoStatus
  saving: boolean
  onToggle: () => void
  onConfigure: () => void
}) {
  const isMp = isMercadoPagoMethod(method)
  const isTransfer = isTransferMethod(method)
  const active = method.isEnabledByAdmin

  const summary: string[] = []
  if (isTransfer) {
    if (method.alias) summary.push(`Alias: ${method.alias}`)
    if (method.cbu) summary.push(`CBU/CVU: ${method.cbu}`)
    if (method.holderName) summary.push(`Titular: ${method.holderName}`)
    if (method.bankName) summary.push(`Banco: ${method.bankName}`)
  } else if (isMp) {
    summary.push(mp?.isConnected ? 'Cuenta conectada' : 'No conectado')
    if (method.mercadoPagoOnlinePaymentsEnabledBySuperAdmin) {
      summary.push(`Pagos online: ${method.mercadoPagoOnlinePaymentsEnabled ? 'Sí' : 'No'}`)
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-slate-300">
          <MethodIcon method={method.paymentMethod} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {METHOD_LABELS[method.paymentMethod] ?? method.paymentMethod}
          </p>
          <div className="mt-1">
            <Badge variant={active ? 'success' : 'default'}>{active ? 'Activo' : 'Inactivo'}</Badge>
          </div>
        </div>
      </div>

      {summary.length > 0 && (
        <div className="mt-3 space-y-0.5 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
          {summary.map((line) => (
            <p key={line} className="truncate text-xs text-slate-600 dark:text-slate-400">{line}</p>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{surchargeLabel(method)}</span>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={active}
              disabled={saving}
              onCheckedChange={onToggle}
              aria-label={`Disponible para alumnos: ${METHOD_LABELS[method.paymentMethod] ?? method.paymentMethod}`}
            />
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Disponible para alumnos</span>
          </div>
          <Button size="sm" variant="outline" onClick={onConfigure}>
            {isMp && !mp?.isConnected ? 'Conectar o Configurar' : 'Configurar'}
          </Button>
        </div>
      </div>
    </Card>
  )
}

function MethodModal({ slug, method, mp, onClose, onSave }: {
  slug: string
  method: Method
  mp?: MercadoPagoStatus
  onClose: () => void
  onSave: (draft: Method) => Promise<void>
}) {
  const toast = useToast()
  const qc = useQueryClient()
  const [draft, setDraft] = useState<Method>({ ...method })
  const [saving, setSaving] = useState(false)
  const [mpConnecting, setMpConnecting] = useState(false)
  const [mpDisconnecting, setMpDisconnecting] = useState(false)
  const [showOtherAccountHelp, setShowOtherAccountHelp] = useState(false)

  const isTransfer = isTransferMethod(method)
  const isMp = isMercadoPagoMethod(method)
  const connected = mp?.isConnected ?? false
  const title = METHOD_LABELS[method.paymentMethod] ?? method.paymentMethod
  const surchargeActive = (draft.surchargeType ?? 'None') !== 'None'

  function update(patch: Partial<Method>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  async function connectMp() {
    setMpConnecting(true)
    try {
      const res = await apiService.get<{ url: string }>(`/api/educativa/${slug}/mercadopago/connect-url`)
      if (res.url) window.open(res.url, '_blank')
      qc.invalidateQueries({ queryKey: ['educativa-mercadopago-status', slug] })
    } catch {
      toast('Error al conectar Mercado Pago.', 'error')
    } finally {
      setMpConnecting(false)
    }
  }

  async function disconnectMp() {
    setMpDisconnecting(true)
    try {
      await apiService.post(`/api/educativa/${slug}/mercadopago/disconnect`, {})
      qc.invalidateQueries({ queryKey: ['educativa-mercadopago-status', slug] })
      toast('Mercado Pago desconectado.')
    } catch {
      toast('Error al desconectar.', 'error')
    } finally {
      setMpDisconnecting(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(draft)
      toast('Configuración guardada.')
      onClose()
    } catch (err) {
      toast(getApiError(err) || 'Error al guardar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Configurar ${title}`}
      description="Esta configuración se guarda al presionar Guardar."
      className="sm:max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" loading={saving} onClick={handleSave}>Guardar configuración</Button>
        </div>
      }
    >
      <div className="space-y-4 px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Activo para alumnos</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Los alumnos pueden usar este medio de pago.</p>
          </div>
          <Switch
            checked={draft.isEnabledByAdmin}
            onCheckedChange={(v) => update({ isEnabledByAdmin: v })}
            aria-label="Activo para alumnos"
          />
        </div>

        {isMp && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Conexión</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                  {connected ? 'Cuenta conectada' : 'No conectado'}
                </p>
                {connected && mp?.mercadoPagoUserId && (
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">Usuario MP: {mp.mercadoPagoUserId}</p>
                )}
                {connected && mp?.connectedAtUtc && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Conectado: {new Date(mp.connectedAtUtc).toLocaleDateString('es-AR')}</p>
                )}
              </div>
              {connected ? (
                <Button variant="outline" size="sm" className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                  loading={mpDisconnecting} onClick={disconnectMp}>Desconectar</Button>
              ) : (
                <Button size="sm" loading={mpConnecting} onClick={connectMp}>Conectar</Button>
              )}
            </div>
            {mp?.lastError && (
              <div className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{mp.lastError}</div>
            )}
            {!connected && (
              <>
                <button type="button" className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400"
                  onClick={() => setShowOtherAccountHelp((v) => !v)}>Quiero conectar otra cuenta</button>
                {showOtherAccountHelp && (
                  <p className="mt-1.5 text-xs text-blue-800 dark:text-blue-200">
                    Para vincular una cuenta diferente, cerrá sesión en Mercado Pago y luego continuá con la conexión.
                  </p>
                )}
              </>
            )}

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-700">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Permitir pagos online</p>
                {method.mercadoPagoOnlinePaymentsEnabledBySuperAdmin ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Habilitá el checkout online de Mercado Pago.</p>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-300">El SuperAdmin aún no habilitó los pagos online con Mercado Pago.</p>
                )}
              </div>
              <Switch
                checked={draft.mercadoPagoOnlinePaymentsEnabled ?? false}
                disabled={!method.mercadoPagoOnlinePaymentsEnabledBySuperAdmin}
                onCheckedChange={(v) => update({ mercadoPagoOnlinePaymentsEnabled: v })}
                aria-label="Permitir pagos online"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Tipo de recargo</label>
            <Select value={draft.surchargeType ?? 'None'} onChange={(e) => update({ surchargeType: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              {SURCHARGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          {surchargeActive && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Valor</label>
              <Input type="number" min={0} step="0.01" value={draft.surchargeValue ?? 0}
                onChange={(e) => update({ surchargeValue: e.target.value === '' ? 0 : Number(e.target.value) })} />
            </div>
          )}
        </div>

        {isTransfer && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Alias</label>
              <Input value={draft.alias ?? ''} onChange={(e) => update({ alias: e.target.value })} placeholder="Ej: jona.mayo" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">CBU / CVU</label>
              <Input value={draft.cbu ?? ''} onChange={(e) => update({ cbu: e.target.value })} placeholder="Ej: 0000003100000000000000" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Titular</label>
              <Input value={draft.holderName ?? ''} onChange={(e) => update({ holderName: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Banco</label>
              <Input value={draft.bankName ?? ''} onChange={(e) => update({ bankName: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Instrucciones</label>
              <Input value={draft.instructions ?? ''} onChange={(e) => update({ instructions: e.target.value })} placeholder="Ej: Enviá el comprobante por el chat de la comisión." />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function ConfigPagosPage() {
  return (
    <ToastProvider>
      <ConfigPagosInner />
    </ToastProvider>
  )
}