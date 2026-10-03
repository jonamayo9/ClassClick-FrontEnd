import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { apiService, getApiError } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { SelectField } from '@/components/ui/select-field'
import { SearchableCombobox, MultiSelect } from '@/components/ui/combobox'
import { Switch } from '@/components/ui/switch'
import { TimePicker } from '@/components/ui/date-picker'
import {
  fmtMoney,
  obligationKindLabel,
  EducativaTraining,
  EducativaTrainingCountryConfig,
  EducativaCommission,
  EducativaEnrollment,
} from '../types'

type ObligationTypeKey = 'Matricula' | 'Cuota' | 'Single'

interface DerivedType {
  key: ObligationTypeKey
  label: string
  amount: number
  currency: string
  count: number | null
  dueDay: number | null
  frequencyMonths: number | null
  detail: string
}

// Deriva los tipos de obligación que GENERA cada formación a partir de su configuración
// económica real (TrainingCountryConfig). Las claves son enums reales del backend y el
// label sale de la traducción (obligationKindLabel). La DISPONIBILIDAD de tipos para el
// filtro viene del backend (/cuotas/obligation-types), nunca de un catálogo hardcodeado.
function deriveTypes(config: EducativaTrainingCountryConfig): DerivedType[] {
  const types: DerivedType[] = []
  if (config.requiresEnrollmentFee && config.enrollmentFee > 0) {
    types.push({
      key: 'Matricula',
      label: obligationKindLabel.Matricula,
      amount: config.enrollmentFee,
      currency: config.currency,
      count: 1,
      dueDay: null,
      frequencyMonths: null,
      detail: 'Vence al inscribirse',
    })
  }
  if (config.paymentMode === 'single') {
    types.push({
      key: 'Single',
      label: obligationKindLabel.Single,
      amount: config.installmentAmount,
      currency: config.currency,
      count: 1,
      dueDay: config.installmentDueDayOfMonth,
      frequencyMonths: config.installmentFrequencyMonths,
      detail: config.installmentDueDayOfMonth != null ? `Vence el día ${config.installmentDueDayOfMonth}` : 'Al inscribirse',
    })
  } else if (config.installmentCount != null && config.installmentCount > 0) {
    types.push({
      key: 'Cuota',
      label: obligationKindLabel.Cuota,
      amount: config.installmentAmount,
      currency: config.currency,
      count: config.installmentCount,
      dueDay: config.installmentDueDayOfMonth,
      frequencyMonths: config.installmentFrequencyMonths,
      detail: [
        config.installmentDueDayOfMonth != null ? `Vence el día ${config.installmentDueDayOfMonth}` : 'Vencimiento variable',
        config.installmentFrequencyMonths != null ? `cada ${config.installmentFrequencyMonths} mes(es)` : null,
      ].filter(Boolean).join(' '),
    })
  }
  return types
}

interface ObligationTypeOption {
  value: string
  label: string
}

function ConfigCuotasInner() {
  const { companySlug } = useParams<{ companySlug: string }>()
  const slug = companySlug ?? ''
  const { companies, activeCompanySlug } = useAuth()
  const activeCompany = companies?.find((c: any) => (c.slug ?? c.companySlug) === activeCompanySlug)

  const [tab, setTab] = useState<'types' | 'invoice' | 'generation'>('types')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [customOpen, setCustomOpen] = useState(false)

  const trainingsQuery = useQuery({
    queryKey: ['educativa-trainings', slug],
    queryFn: () => apiService.get<EducativaTraining[]>(`/api/educativa/${slug}/trainings`),
    enabled: !!slug,
    retry: false,
  })
  const trainings = trainingsQuery.data ?? []

  // Disponibilidad de tipos de obligación REAL (backend es autoridad): nunca un array
  // hardcodeado. Value = enum real (Matricula | Cuota | Single | Custom); Label = traducción.
  const obligationTypesQuery = useQuery({
    queryKey: ['educativa-obligation-types', slug],
    queryFn: () => apiService.get<ObligationTypeOption[]>(`/api/educativa/${slug}/cuotas/obligation-types`),
    enabled: !!slug,
    retry: false,
  })
  const obligationTypeOptions = obligationTypesQuery.data ?? []

  const filtered = trainings.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter) {
      const hasType = t.countries.some((c) => deriveTypes(c).some((dt) => dt.key === typeFilter))
      if (!hasType) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black sm:text-2xl">Configuración de cuotas</h1>
            <p className="mt-1 text-sm text-blue-200">Tipos de obligación y comprobantes de inscripciones</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex min-w-max gap-1.5">
          {([
            ['types', 'Tipos de obligación'],
            ['generation', 'Generación automática'],
            ['invoice', 'Comprobante'],
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

      {trainingsQuery.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner /></div>}

      {!trainingsQuery.isLoading && tab === 'types' && (
        <div className="space-y-4">
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="text-base font-bold">Cuotas custom (manuales)</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Generá una obligación independiente por alumno con concepto, importe, período y vencimiento propios. No altera el plan contractual y no se regenera automáticamente.
              </p>
            </div>
            <Button className="shrink-0 bg-blue-600 text-white hover:bg-blue-500" onClick={() => setCustomOpen(true)}>
              + Generar cuota custom
            </Button>
          </Card>

          <div className="flex flex-wrap items-center gap-2">
            <Input className="max-w-[220px]" placeholder="Buscar formación..." value={search}
              onChange={(e) => setSearch(e.target.value)} />
            <SelectField value={typeFilter} onValueChange={(v) => setTypeFilter(v)}
              placeholder="Todos los tipos"
              className="w-full sm:w-44"
              aria-label="Tipo de obligación"
              options={[
                { value: '', label: 'Todos los tipos' },
                ...obligationTypeOptions.map((o) => ({ value: o.value, label: o.label })),
              ]} />
            <Link to={`/educativa/${slug}/formaciones`}><Button variant="outline" size="sm">Ir a formaciones</Button></Link>
          </div>

          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            Consulta de los tipos de obligación reales que genera cada formación. El esquema (matrícula, modalidad, cantidad e importe de cuotas) se define únicamente en Formación → Configuración económica.
          </p>

          {filtered.length === 0 ? (
            <EmptyState icon="📋" title="Sin tipos de obligación" description="No hay formaciones que coincidan con los filtros." />
          ) : (
            <div className="space-y-3">
              {filtered.map((t) => {
                const arConfig = t.countries.find((c) => c.countryCode === 'AR')
                const configs = arConfig ? [arConfig] : []
                return (
                  <Card key={t.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t.name}</p>
                        <p className="text-xs text-slate-400">{t.trainingTypeName ?? ''}{configs.length === 0 ? ' · Sin economía (AR)' : ''}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {configs.flatMap((c) => deriveTypes(c)).map((dt, i) => (
                          <span key={`${dt.key}-${i}`} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            dt.key === 'Matricula'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                              : dt.key === 'Single'
                                ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          }`}>
                            {dt.label}{dt.count != null && dt.count > 1 ? ` · ${dt.count}` : ''}
                          </span>
                        ))}
                        {configs.length === 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">Sin economía</span>}
                      </div>
                    </div>
                    {configs.length > 0 && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {configs.flatMap((c) => deriveTypes(c)).map((dt, i) => (
                          <div key={`${dt.key}-${i}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{dt.label}{dt.count != null && dt.count > 1 ? ` (${dt.count})` : ''}</span>
                              <span className="text-sm font-bold text-slate-900 dark:text-white">{fmtMoney(dt.amount, dt.currency)}</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{dt.detail}</p>
                            {dt.frequencyMonths != null && dt.key !== 'Cuota' && (
                              <p className="text-xs text-slate-400">Cada {dt.frequencyMonths} mes(es)</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {!trainingsQuery.isLoading && tab === 'generation' && (
        <GenerationTab slug={slug} />
      )}

      {!trainingsQuery.isLoading && tab === 'invoice' && (
        <InvoiceTab companyName={activeCompany?.name} logoUrl={activeCompany?.logoUrl} />
      )}

      <CustomObligationModal
        slug={slug}
        trainings={trainings}
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onCreated={() => {
          setCustomOpen(false)
        }}
      />
    </div>
  )
}

interface GenerationSettings {
  id?: string
  companyId?: string
  autoGenerateEnabled: boolean
  generationDayOfMonth: number | null
  generationHour: number | null
  generationWindowStartDay: number | null
  generationWindowEndDay: number | null
  lastAutoGenerationUtc?: string | null
  updatedAtUtc?: string
}

function GenerationSettingsRow({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'muted' }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'muted' ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>{value}</p>
    </div>
  )
}

function GenerationTab({ slug }: { slug: string }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<GenerationSettings>({
    autoGenerateEnabled: false,
    generationDayOfMonth: null,
    generationHour: 9,
    generationWindowStartDay: null,
    generationWindowEndDay: null,
  })
  const [error, setError] = useState('')

  const settingsQuery = useQuery({
    queryKey: ['educativa-payment-settings-generation', slug],
    queryFn: () => apiService.get<GenerationSettings>(`/api/educativa/${slug}/payment-settings/generation`),
    enabled: !!slug,
    retry: false,
  })

  useEffect(() => {
    if (!settingsQuery.data) return
    const d = settingsQuery.data
    setForm({
      autoGenerateEnabled: d.autoGenerateEnabled,
      generationDayOfMonth: d.generationDayOfMonth,
      generationHour: d.generationHour ?? 9,
      generationWindowStartDay: d.generationWindowStartDay,
      generationWindowEndDay: d.generationWindowEndDay,
      lastAutoGenerationUtc: d.lastAutoGenerationUtc,
      updatedAtUtc: d.updatedAtUtc,
    })
  }, [settingsQuery.data])

  const saveMut = useMutation({
    mutationFn: () =>
      apiService.put(`/api/educativa/${slug}/payment-settings/generation`, {
        autoGenerateEnabled: form.autoGenerateEnabled,
        generationDayOfMonth: form.autoGenerateEnabled ? form.generationDayOfMonth : null,
        generationHour: form.generationHour ?? 9,
        generationWindowStartDay: form.generationWindowStartDay,
        generationWindowEndDay: form.generationWindowEndDay,
      }),
    onSuccess: () => {
      toast('Configuración de generación guardada.')
      setEditing(false)
      qc.invalidateQueries({ queryKey: ['educativa-payment-settings-generation', slug] })
    },
    onError: (err) => setError(getApiError(err) || 'No se pudo guardar.'),
  })

  function validate(): boolean {
    setError('')
    const d = (v: number | null) => v != null && (v < 1 || v > 31)
    if (d(form.generationDayOfMonth)) { setError('El día de generación debe estar entre 1 y 31.'); return false }
    if (d(form.generationWindowStartDay)) { setError('El inicio de la ventana debe estar entre 1 y 31.'); return false }
    if (d(form.generationWindowEndDay)) { setError('El fin de la ventana debe estar entre 1 y 31.'); return false }
    if (form.generationWindowStartDay != null && form.generationWindowEndDay != null &&
        form.generationWindowStartDay > form.generationWindowEndDay) {
      setError('El inicio de la ventana no puede ser posterior al fin.'); return false
    }
    const h = form.generationHour
    if (h == null || h < 0 || h > 23) { setError('La hora de generación debe estar entre 0 y 23.'); return false }
    return true
  }

  function handleSave() {
    if (!validate()) return
    saveMut.mutate()
  }

  function handleCancel() {
    if (!settingsQuery.data) return
    const d = settingsQuery.data
    setForm({
      autoGenerateEnabled: d.autoGenerateEnabled,
      generationDayOfMonth: d.generationDayOfMonth,
      generationHour: d.generationHour ?? 9,
      generationWindowStartDay: d.generationWindowStartDay,
      generationWindowEndDay: d.generationWindowEndDay,
      lastAutoGenerationUtc: d.lastAutoGenerationUtc,
      updatedAtUtc: d.updatedAtUtc,
    })
    setError('')
    setEditing(false)
  }

  const hourValue = `${String(form.generationHour ?? 9).padStart(2, '0')}:00`

  const lastAutoLabel = settingsQuery.data?.lastAutoGenerationUtc
    ? new Date(settingsQuery.data.lastAutoGenerationUtc).toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : 'Nunca ejecutada'

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">Generación automática de cuotas</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Define CUÁNDO se materializan las obligaciones del plan contractual. Se genera <b>exactamente una cuota por período</b>; el vencimiento sale de la economía congelada de la Formación (día de vencimiento del período), nunca del día de generación. No se generan cuotas futuras.
          </p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Editar</Button>
        )}
      </div>

      {editing ? (
        <>
          <div className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Generar cuotas automáticamente (una por período)</span>
            <Switch checked={form.autoGenerateEnabled} onCheckedChange={(v) => setForm({ ...form, autoGenerateEnabled: v })} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Día de generación</label>
              <Input type="number" min={1} max={31} value={form.generationDayOfMonth ?? ''}
                onChange={(e) => setForm({ ...form, generationDayOfMonth: e.target.value === '' ? null : Number(e.target.value) })} />
              <p className="mt-1 text-xs text-slate-400">Día del mes del período en que se crea la cuota.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Hora de generación (Argentina)</label>
              <TimePicker value={hourValue}
                onChange={(v) => setForm({ ...form, generationHour: v ? Number(v.slice(0, 2)) : 9 })} />
              <p className="mt-1 text-xs text-slate-400">El job genera a partir de esta hora local de Argentina dentro de la ventana.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Ventana de reintento · desde día</label>
              <Input type="number" min={1} max={31} value={form.generationWindowStartDay ?? ''}
                onChange={(e) => setForm({ ...form, generationWindowStartDay: e.target.value === '' ? null : Number(e.target.value) })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Ventana de reintento · hasta día</label>
              <Input type="number" min={1} max={31} value={form.generationWindowEndDay ?? ''}
                onChange={(e) => setForm({ ...form, generationWindowEndDay: e.target.value === '' ? null : Number(e.target.value) })} />
              <p className="mt-1 text-xs text-slate-400">Reintento si no se generó el día principal. No genera cuotas futuras.</p>
            </div>
          </div>

          {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">{error}</p>}

          <div className="mt-4 flex gap-2">
            <Button onClick={handleSave} loading={saveMut.isPending}>Guardar</Button>
            <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
          </div>
        </>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <GenerationSettingsRow label="Estado" value={form.autoGenerateEnabled ? 'Activa' : 'Inactiva'} tone={form.autoGenerateEnabled ? 'ok' : 'muted'} />
          <GenerationSettingsRow label="Día de generación" value={form.generationDayOfMonth != null ? `Día ${form.generationDayOfMonth}` : '—'} />
          <GenerationSettingsRow label="Hora de generación (Argentina)" value={hourValue} />
          <GenerationSettingsRow label="Ventana de reintento" value={form.generationWindowStartDay != null && form.generationWindowEndDay != null ? `Desde día ${form.generationWindowStartDay} hasta día ${form.generationWindowEndDay}` : '—'} />
          <GenerationSettingsRow label="Última generación automática" value={lastAutoLabel} />
        </div>
      )}
    </Card>
  )
}

function InvoiceTab({ companyName, logoUrl }: { companyName?: string; logoUrl?: string }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-black">Comprobante de pago</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Al aprobar un pago, la plataforma genera automáticamente un recibo PDF con los datos de la inscripción y el desglose del importe.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li>· Empresa emisora y datos de la institución</li>
          <li>· Alumno y formación/comisión</li>
          <li>· Concepto (inscripción o cuota) y vencimiento</li>
          <li>· Desglose: capital, mora y total</li>
          <li>· Fecha de acreditación y medio de pago</li>
        </ul>
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
          El recibo se genera automáticamente al aprobar un pago con una plantilla fija. A diferencia de Deportivo (que permite editar logo, colores, campos y pie de comprobante), la personalización del recibo Educativa todavía no está disponible.
        </p>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3 font-bold text-sm">Vista previa del recibo</div>
        <div className="p-5">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-3 mb-4">
              {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 w-10 rounded-full object-cover" />}
              <div>
                <div className="font-black text-slate-900 dark:text-white">{companyName || 'Mi Empresa'}</div>
                <div className="text-xs text-slate-500">Recibo de pago - Educativa</div>
              </div>
            </div>
            <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex justify-between"><span>Alumno</span><span className="font-medium text-slate-900 dark:text-white">Alumno Ejemplo</span></div>
              <div className="flex justify-between"><span>Concepto</span><span className="font-medium text-slate-900 dark:text-white">Cuota 2/4</span></div>
              <div className="flex justify-between"><span>Capital</span><span className="font-medium text-slate-900 dark:text-white">$ 25.000,00</span></div>
              <div className="flex justify-between"><span>Mora</span><span className="font-medium text-red-600">$ 0,00</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900 dark:border-slate-700 dark:text-white">
                <span>Total</span><span>$ 25.000,00</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ─────────────────────────── Cuota custom (manual) ─────────────────────────── */

interface CustomObligationModalProps {
  slug: string
  trainings: EducativaTraining[]
  open: boolean
  onClose: () => void
  onCreated: () => void
}

function parsePeriod(value: string): { year: number; month: number } | null {
  const m = value.trim().match(/^(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const month = Number(m[1])
  const year = Number(m[2])
  if (month < 1 || month > 12) return null
  return { year, month }
}

function newUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function CustomObligationModal({ slug, trainings, open, onClose, onCreated }: CustomObligationModalProps) {
  const toast = useToast()
  const qc = useQueryClient()

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [trainingId, setTrainingId] = useState('')
  const [commissionId, setCommissionId] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const commissionsQuery = useQuery({
    queryKey: ['educativa-commissions', slug],
    queryFn: () => apiService.get<EducativaCommission[]>(`/api/educativa/${slug}/commissions`),
    enabled: !!slug && open,
    retry: false,
  })
  const commissions = commissionsQuery.data ?? []
  const filteredCommissions = commissions.filter((c) => !trainingId || c.trainingId === trainingId)

  const enrollmentsQuery = useQuery({
    queryKey: ['educativa-commission-enrollments', slug, commissionId],
    queryFn: () => apiService.get<EducativaEnrollment[]>(`/api/educativa/${slug}/commissions/${commissionId}/enrollments`),
    enabled: !!slug && !!commissionId && open,
    retry: false,
  })
  const activeStudents = (enrollmentsQuery.data ?? []).filter((e) => e.status === 'Active')

  const selectedCommission = filteredCommissions.find((c) => c.id === commissionId)
  const currency = selectedCommission?.currency ?? ''
  const amountNumber = Number(amount) || 0
  const studentCount = selectedIds.length
  const totalAmount = amountNumber * studentCount

  useEffect(() => {
    if (!open) return
    setDescription(''); setAmount(''); setPeriod(''); setDueDate('')
    setTrainingId(''); setCommissionId(''); setSelectedIds([]); setError('')
  }, [open])

  function handleTrainingChange(value: string) {
    setTrainingId(value)
    setCommissionId('')
    setSelectedIds([])
  }

  function handleCommissionChange(value: string) {
    setCommissionId(value)
    setSelectedIds([])
  }

  async function handleConfirm() {
    setError('')
    const periodParsed = parsePeriod(period)
    if (!description.trim()) { setError('Indicá el concepto/descripción.'); return }
    if (!(amountNumber > 0)) { setError('Indicá un importe mayor a cero.'); return }
    if (!periodParsed) { setError('Período contractual inválido. Usá el formato MM/YYYY.'); return }
    if (!dueDate) { setError('Indicá la fecha de vencimiento.'); return }
    if (!commissionId) { setError('Seleccioná la comisión.'); return }
    if (studentCount === 0) { setError('Seleccioná al menos un alumno.'); return }

    setSubmitting(true)
    try {
      const result = await apiService.post<{ created: number; skipped: number; requested: number }>(
        `/api/educativa/${slug}/cuotas/custom-obligations`,
        {
          description: description.trim(),
          amount: amountNumber,
          periodYear: periodParsed.year,
          periodMonth: periodParsed.month,
          dueDateUtc: new Date(`${dueDate}T12:00:00.000Z`).toISOString(),
          commissionId,
          commissionEnrollmentIds: selectedIds,
          idempotencyKey: newUuid(),
        },
      )
      toast(`Cuota custom generada para ${result.created} alumno(s).`)
      qc.invalidateQueries({ queryKey: ['educativa-obligation-types', slug] })
      onCreated()
    } catch (err) {
      setError(getApiError(err) || 'No se pudo generar la cuota custom.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generar cuota custom"
      description="Obligación manual independiente por alumno. No se numera como cuota contractual ni la regenera el job automático."
      className="sm:max-w-2xl"
    >
      <div className="space-y-4 px-5 py-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Concepto / Descripción</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Excursión educativa" maxLength={200} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Importe por alumno</label>
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Período contractual (MM/YYYY)</label>
            <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Ej: 10/2026" inputMode="numeric" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Fecha de vencimiento</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Formación</label>
            <SearchableCombobox
              value={trainingId}
              onValueChange={handleTrainingChange}
              options={[{ value: '', label: 'Todas las formaciones' }, ...trainings.map((t) => ({ value: t.id, label: t.name }))]}
              placeholder="Seleccionar formación..."
              searchPlaceholder="Buscar formación..."
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Comisión</label>
            <SearchableCombobox
              value={commissionId}
              onValueChange={handleCommissionChange}
              options={filteredCommissions.map((c) => ({ value: c.id, label: c.name }))}
              placeholder={filteredCommissions.length === 0 ? 'Sin comisiones' : 'Seleccionar comisión...'}
              searchPlaceholder="Buscar comisión..."
              disabled={filteredCommissions.length === 0}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
              Alumnos activos ({activeStudents.length})
            </label>
            <MultiSelect
              values={selectedIds}
              onValuesChange={setSelectedIds}
              options={activeStudents.map((s) => ({ value: s.id, label: s.studentName }))}
              placeholder="Seleccionar alumnos..."
              searchPlaceholder="Buscar alumno..."
            />
            <p className="mt-1 text-xs text-slate-400">Podés seleccionar uno, varios o todos los alumnos activos de la comisión.</p>
          </div>
        </div>

        {studentCount > 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900/60 dark:bg-blue-950/20">
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Alumnos afectados</div>
                <div className="mt-0.5 text-lg font-black text-slate-900 dark:text-white">{studentCount}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Importe por alumno</div>
                <div className="mt-0.5 text-lg font-black text-slate-900 dark:text-white">{fmtMoney(amountNumber, currency)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total a generar</div>
                <div className="mt-0.5 text-lg font-black text-blue-700 dark:text-blue-300">{fmtMoney(totalAmount, currency)}</div>
              </div>
            </div>
          </div>
        )}

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} loading={submitting} className="bg-blue-600 text-white hover:bg-blue-500">
            Confirmar y generar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function ConfigCuotasPage() {
  return (
    <ToastProvider>
      <ConfigCuotasInner />
    </ToastProvider>
  )
}