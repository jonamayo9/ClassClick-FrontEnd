import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { apiService, getApiError } from '@/lib/api'

interface Company { id: string; name: string; isActive: boolean }

const PRICE_INCREASE_COMPONENT = { FixedAmount: 1, Percentage: 2 } as const
const SCHEDULE_STATUS = { Scheduled: 1, Applied: 2, Cancelled: 3, Failed: 4 } as const

interface PriceIncreaseTarget {
  targetId: string
  companyId: string | null
  companyName: string
  billingMode: number
  status: number
  appliedAtUtc: string | null
  errorMessage: string | null
}

interface PriceIncrease {
  id: string
  effectiveAtUtc: string
  status: number
  baseIncreaseType: number
  baseIncreaseValue: number
  extraIncreaseType: number
  extraIncreaseValue: number
  createdByUserId: string | null
  createdAtUtc: string
  appliedAtUtc: string | null
  cancelledAtUtc: string | null
  errorMessage: string | null
  targetCompanyCount: number
  targets: PriceIncreaseTarget[]
}

interface HistoryItem {
  id: string
  companyId: string | null
  companyName: string
  billingMode: number
  effectiveAtUtc: string
  appliedAtUtc: string
  previousBasePrice: number
  newBasePrice: number
  baseIncreaseType: number
  baseIncreaseValue: number
  previousExtraUserPrice: number
  newExtraUserPrice: number
  extraIncreaseType: number
  extraIncreaseValue: number
  status: number
  note: string | null
}

interface PreviewCompany {
  companyId: string
  companyName: string
  billingMode: number
  currentBasePrice: number
  estimatedNewBasePrice: number
  currentExtraUserPrice: number
  estimatedNewExtraUserPrice: number
  extraNote: string | null
}

interface PreviewResult {
  anyPercentage: boolean
  companies: PreviewCompany[]
}

const FMT = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const NUM = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

// Fecha + hora en horario LOCAL del usuario (el backend guarda UTC).
function fmtDateTime(value: string | null | undefined) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtCount(n: number) {
  return `${n} empresa${n === 1 ? '' : 's'}`
}

function toLocalInputValue(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// El backend serializa los enums como STRING (JsonStringEnumConverter); se aceptan también números.
function componentLabel(type: string | number, value: number) {
  const s = String(type)
  const isPercent = s === 'Percentage' || s === String(PRICE_INCREASE_COMPONENT.Percentage)
  return isPercent ? `+${NUM.format(value)}%` : `+${FMT.format(value)}`
}

function billingModeLabel(mode: string | number) {
  const s = String(mode)
  return s === 'UsageBased' || s === String(2) ? 'Usage' : 'Fijo'
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  Scheduled: 'warning',
  Applied: 'success',
  Cancelled: 'default',
  Failed: 'danger',
  '1': 'warning',
  '2': 'success',
  '3': 'default',
  '4': 'danger',
}

const STATUS_LABEL: Record<string, string> = {
  Scheduled: 'Pendiente',
  Applied: 'Aplicado',
  Cancelled: 'Cancelado',
  Failed: 'Error',
  '1': 'Pendiente',
  '2': 'Aplicado',
  '3': 'Cancelado',
  '4': 'Error',
}

const TARGET_STATUS_LABEL: Record<string, string> = {
  Pending: 'Pendiente',
  Applied: 'Aplicado',
  Skipped: 'Omitida',
  Failed: 'Error',
  '1': 'Pendiente',
  '2': 'Aplicado',
  '3': 'Omitida',
  '4': 'Error',
}

function scheduleStatusVariant(status: string | number) {
  return STATUS_VARIANT[String(status)] ?? 'default'
}

function scheduleStatusLabel(status: string | number) {
  return STATUS_LABEL[String(status)] ?? '—'
}

function targetStatusLabel(status: string | number) {
  return TARGET_STATUS_LABEL[String(status)] ?? String(status)
}

function PriceIncreasesInner() {
  const toast = useToast()
  const qc = useQueryClient()

  const { data: companies = [] } = useQuery({
    queryKey: ['superadmin-companies'],
    queryFn: () => apiService.get<Company[]>('/api/superadmin/companies'),
  })

  const [statusFilter, setStatusFilter] = useState('')
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['superadmin-price-increases', statusFilter],
    queryFn: () =>
      apiService.get<PriceIncrease[]>('/api/superadmin/price-increases' + (statusFilter ? `?status=${statusFilter}` : '')),
    // Mientras exista al menos una programación Pendiente, refresca cada 30s para
    // reflejar el "Aplicado" cuando el job la ejecute (sin hacer polling innecesario).
    refetchInterval: (query) => {
      const data = query.state.data as PriceIncrease[] | undefined
      const hasPending = (data ?? []).some((s) => String(s.status) === 'Scheduled' || String(s.status) === '1')
      return hasPending ? 30_000 : false
    },
  })

  const [editor, setEditor] = useState<PriceIncrease | 'new' | null>(null)
  const [detail, setDetail] = useState<PriceIncrease | null>(null)
  const [cancelTarget, setCancelTarget] = useState<PriceIncrease | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const [form, setForm] = useState({
    effectiveAtUtc: '',
    allCompanies: true,
    companyIds: [] as string[],
    baseType: PRICE_INCREASE_COMPONENT.Percentage as number,
    baseValue: '',
    extraType: PRICE_INCREASE_COMPONENT.Percentage as number,
    extraValue: '',
  })

  function openCreate() {
    setForm({
      effectiveAtUtc: new Date().toISOString().slice(0, 16),
      allCompanies: true,
      companyIds: [],
      baseType: PRICE_INCREASE_COMPONENT.Percentage,
      baseValue: '10',
      extraType: PRICE_INCREASE_COMPONENT.Percentage,
      extraValue: '10',
    })
    setPreview(null)
    setEditor('new')
  }

  function openEdit(item: PriceIncrease) {
    setForm({
      effectiveAtUtc: toLocalInputValue(item.effectiveAtUtc),
      allCompanies: false,
      companyIds: item.targets.map((t) => t.companyId).filter((x): x is string => !!x),
      baseType: item.baseIncreaseType,
      baseValue: String(item.baseIncreaseValue),
      extraType: item.extraIncreaseType,
      extraValue: String(item.extraIncreaseValue),
    })
    setPreview(null)
    setEditor(item)
  }

  function toggleCompany(id: string) {
    setForm((prev) => ({
      ...prev,
      companyIds: prev.companyIds.includes(id) ? prev.companyIds.filter((x) => x !== id) : [...prev.companyIds, id],
    }))
  }

  async function loadPreview() {
    const body = {
      effectiveAtUtc: new Date(form.effectiveAtUtc).toISOString(),
      allCompanies: form.allCompanies,
      companyIds: form.companyIds,
      baseIncreaseType: form.baseType,
      baseIncreaseValue: Number(form.baseValue || 0),
      extraIncreaseType: form.extraType,
      extraIncreaseValue: Number(form.extraValue || 0),
    }
    setPreviewLoading(true)
    try {
      const res = await apiService.post<PreviewResult>('/api/superadmin/price-increases/preview', body)
      setPreview(res)
    } catch (err) {
      toast(getApiError(err), 'error')
    } finally {
      setPreviewLoading(false)
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        effectiveAtUtc: new Date(form.effectiveAtUtc).toISOString(),
        allCompanies: form.allCompanies,
        companyIds: form.companyIds,
        baseIncreaseType: form.baseType,
        baseIncreaseValue: Number(form.baseValue || 0),
        extraIncreaseType: form.extraType,
        extraIncreaseValue: Number(form.extraValue || 0),
      }
      if (editor === 'new') return apiService.post('/api/superadmin/price-increases', body)
      return apiService.put(`/api/superadmin/price-increases/${(editor as PriceIncrease).id}`, body)
    },
    onSuccess: () => {
      toast(editor === 'new' ? 'Aumento programado.' : 'Aumento actualizado.')
      setEditor(null)
      setPreview(null)
      qc.invalidateQueries({ queryKey: ['superadmin-price-increases'] })
    },
    onError: (err) => toast(getApiError(err), 'error'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => apiService.post(`/api/superadmin/price-increases/${cancelTarget!.id}/cancel`),
    onSuccess: () => {
      toast('Programación cancelada.')
      setCancelTarget(null)
      qc.invalidateQueries({ queryKey: ['superadmin-price-increases'] })
    },
    onError: (err) => toast(getApiError(err), 'error'),
  })

  const baseValue = Number(form.baseValue || 0)
  const extraValue = Number(form.extraValue || 0)
  const canSave = form.effectiveAtUtc && baseValue >= 0 && extraValue >= 0 && (!form.allCompanies ? form.companyIds.length > 0 : true)

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white sm:p-6">
          <h1 className="text-xl font-black sm:text-2xl">Aumentos programados</h1>
          <p className="mt-1 text-sm text-slate-400">Aumentos de precios ClassClick → Empresas aplicados automáticamente.</p>
        </div>
        <Button size="sm" onClick={openCreate} className="bg-slate-800 text-white hover:bg-slate-700">+ Programar aumento</Button>
      </div>

      <Card className="p-4">
        <div className="min-w-[180px]">
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Estado</label>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos</option>
            <option value={String(SCHEDULE_STATUS.Scheduled)}>Programados</option>
            <option value={String(SCHEDULE_STATUS.Applied)}>Aplicados</option>
            <option value={String(SCHEDULE_STATUS.Cancelled)}>Cancelados</option>
            <option value={String(SCHEDULE_STATUS.Failed)}>Con errores</option>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-14"><Spinner className="h-8 w-8 text-slate-600" /></div>
      ) : schedules.length === 0 ? (
        <Card className="p-6"><EmptyState title="Sin programaciones" description="Programá un aumento futuro de precios para las empresas." /></Card>
      ) : (
        <div className="space-y-3">
          {schedules.map((item) => (
            <Card key={item.id} className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">Efectiva: {fmtDateTime(item.effectiveAtUtc)}</p>
                  <p className="text-xs text-slate-400">Creada: {fmtDateTime(item.createdAtUtc)} · {fmtCount(item.targetCompanyCount)}</p>
                </div>
                <Badge variant={scheduleStatusVariant(item.status)}>{scheduleStatusLabel(item.status)}</Badge>
              </div>
              <div className="grid gap-x-6 gap-y-1 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                <span>Base: {componentLabel(item.baseIncreaseType, item.baseIncreaseValue)}</span>
                <span>Extra por alumno: {componentLabel(item.extraIncreaseType, item.extraIncreaseValue)}</span>
              </div>
              {item.errorMessage && <p className="text-xs text-red-600 dark:text-red-400">{item.errorMessage}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setDetail(item)}>Ver</Button>
                {String(item.status) === 'Scheduled' || String(item.status) === String(SCHEDULE_STATUS.Scheduled) ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => openEdit(item)}>Editar</Button>
                    <Button size="sm" variant="danger" onClick={() => setCancelTarget(item)} className="bg-red-600 text-white hover:bg-red-700">Cancelar</Button>
                  </>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      {editor && (
        <Modal open onClose={() => setEditor(null)} title={editor === 'new' ? 'Programar aumento' : 'Editar aumento'} className="sm:max-w-2xl">
          <div className="px-5 py-4 sm:px-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Fecha de entrada en vigencia *</label>
              <input
                type="datetime-local"
                value={form.effectiveAtUtc}
                onChange={(e) => setForm({ ...form, effectiveAtUtc: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Empresas</label>
              <Select
                value={form.allCompanies ? 'all' : 'selected'}
                onChange={(e) => setForm({ ...form, allCompanies: e.target.value === 'all' })}
              >
                <option value="all">Todas las empresas</option>
                <option value="selected">Empresas específicas</option>
              </Select>
            </div>

            {!form.allCompanies && (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                {companies.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={form.companyIds.includes(c.id)}
                      onChange={() => toggleCompany(c.id)}
                      className="h-4 w-4 rounded border-slate-300 accent-violet-600"
                    />
                    <span className="truncate">{c.name}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Precio BASE</p>
                <Select value={String(form.baseType)} onChange={(e) => setForm({ ...form, baseType: Number(e.target.value) })}>
                  <option value={String(PRICE_INCREASE_COMPONENT.Percentage)}>Porcentaje</option>
                  <option value={String(PRICE_INCREASE_COMPONENT.FixedAmount)}>Monto fijo</option>
                </Select>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.baseValue}
                  onChange={(e) => setForm({ ...form, baseValue: e.target.value })}
                  placeholder={form.baseType === PRICE_INCREASE_COMPONENT.Percentage ? '20' : '5000'}
                />
              </div>
              <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Precio por alumno EXTRA</p>
                <Select value={String(form.extraType)} onChange={(e) => setForm({ ...form, extraType: Number(e.target.value) })}>
                  <option value={String(PRICE_INCREASE_COMPONENT.Percentage)}>Porcentaje</option>
                  <option value={String(PRICE_INCREASE_COMPONENT.FixedAmount)}>Monto fijo</option>
                </Select>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.extraValue}
                  onChange={(e) => setForm({ ...form, extraValue: e.target.value })}
                  placeholder={form.extraType === PRICE_INCREASE_COMPONENT.Percentage ? '10' : '200'}
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">Permitido: 0 o mayor (0 = sin incremento en ese componente). Los valores no pueden ser negativos.</p>

            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" loading={previewLoading} onClick={loadPreview}>Vista previa</Button>
              {preview?.anyPercentage && (
                <p className="text-xs text-slate-400">El porcentaje se aplicará sobre el valor vigente al momento de ejecución. El resultado mostrado es estimado.</p>
              )}
            </div>

            {preview && (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Resultado estimado (precios vigentes hoy)</p>
                {preview.companies.map((c) => (
                  <div key={c.companyId} className="border-b border-slate-100 pb-1.5 last:border-0 dark:border-slate-800">
                    <p className="text-xs font-semibold">{c.companyName}</p>
                    <p className="text-xs text-slate-500">
                      {billingModeLabel(c.billingMode)} · Base: {FMT.format(c.currentBasePrice)} → {FMT.format(c.estimatedNewBasePrice)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Extra: {FMT.format(c.currentExtraUserPrice)} → {FMT.format(c.estimatedNewExtraUserPrice)}
                    </p>
                    {c.extraNote && <p className="text-[10px] text-amber-600 dark:text-amber-400">{c.extraNote}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditor(null)} disabled={saveMutation.isPending}>Cancelar</Button>
              <Button size="sm" loading={saveMutation.isPending} disabled={!canSave} onClick={() => saveMutation.mutate()} className="bg-slate-800 text-white hover:bg-slate-700">
                Guardar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {detail && <ScheduleDetail schedule={detail} onClose={() => setDetail(null)} />}

      {cancelTarget && (
        <ConfirmModal
          open
          onClose={() => setCancelTarget(null)}
          title="¿Cancelar programación?"
          message={`Vas a cancelar el aumento con fecha efectiva ${fmtDateTime(cancelTarget.effectiveAtUtc)} para ${fmtCount(cancelTarget.targetCompanyCount)}. Esta acción no se puede deshacer.`}
          confirmText="Cancelar programación"
          loading={cancelMutation.isPending}
          onConfirm={() => cancelMutation.mutate()}
        />
      )}
    </div>
  )
}

function ScheduleDetail({ schedule, onClose }: { schedule: PriceIncrease; onClose: () => void }) {
  const { data: history = [] } = useQuery({
    queryKey: ['superadmin-price-increase-history', schedule.id],
    queryFn: () => apiService.get<HistoryItem[]>(`/api/superadmin/price-increases/${schedule.id}/history`),
  })

  return (
    <Modal open onClose={onClose} title={`Aumento — ${fmtDateTime(schedule.effectiveAtUtc)}`} className="sm:max-w-2xl">
      <div className="px-5 py-4 sm:px-6 space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 text-sm">
          <div className="flex justify-between gap-2 border-b border-slate-100 pb-1.5 dark:border-slate-800">
            <span className="text-xs text-slate-500">Base</span>
            <span className="text-right text-xs font-medium">{componentLabel(schedule.baseIncreaseType, schedule.baseIncreaseValue)}</span>
          </div>
          <div className="flex justify-between gap-2 border-b border-slate-100 pb-1.5 dark:border-slate-800">
            <span className="text-xs text-slate-500">Extra por alumno</span>
            <span className="text-right text-xs font-medium">{componentLabel(schedule.extraIncreaseType, schedule.extraIncreaseValue)}</span>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-bold">Empresas ({schedule.targets.length})</h3>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-700">
            {schedule.targets.map((t) => (
              <div key={t.targetId} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{t.companyName}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-slate-400">{billingModeLabel(t.billingMode)}</span>
                  <span className="text-slate-500">{targetStatusLabel(t.status)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {history.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-bold">Historial de aplicación</h3>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="font-semibold">{h.companyName} · {billingModeLabel(h.billingMode)}</p>
                  <p className="text-slate-500">Fecha programada: {fmtDateTime(h.effectiveAtUtc)}</p>
                  <p className="text-slate-500">Ejecutada: {fmtDateTime(h.appliedAtUtc)}</p>
                  <p className="text-slate-500">Base: {FMT.format(h.previousBasePrice)} → {FMT.format(h.newBasePrice)}</p>
                  <p className="text-slate-500">Extra: {FMT.format(h.previousExtraUserPrice)} → {FMT.format(h.newExtraUserPrice)}</p>
                  {h.note && <p className="text-amber-600 dark:text-amber-400">{h.note}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function SuperAdminPriceIncreasesPage() {
  return <ToastProvider><PriceIncreasesInner /></ToastProvider>
}