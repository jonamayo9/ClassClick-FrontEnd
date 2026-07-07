import React, { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Trash2 } from 'lucide-react'

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
function useSlug() { return useAuth((s) => s.activeCompanySlug ?? '') }

function ChargeSettingsPageInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const slug = useSlug()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const [tab, setTab] = useState<'charges' | 'financing' | 'invoice'>(
    requestedTab === 'financing' || requestedTab === 'invoice' ? requestedTab : 'charges',
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-white sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Configuración de cuotas</h1>
        <p className="mt-1 text-sm text-slate-300">Gestioná tipos de cuota, financiación y diseño de comprobantes</p>
      </div>
      <div className="flex gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
        {(['charges', 'financing', 'invoice'] as const).map((t) => (
          <button key={t} onClick={() => {
            setTab(t)
            setSearchParams(t === 'charges' ? {} : { tab: t })
          }}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === t ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
            {t === 'charges' ? 'Tipos de cuota' : t === 'financing' ? 'Financiación' : 'Comprobante'}
          </button>
        ))}
      </div>
      {tab === 'charges' && <ChargesList slug={slug} toast={toast} qc={qc} />}
      {tab === 'financing' && <FinancingTab slug={slug} toast={toast} qc={qc} />}
      {tab === 'invoice' && <InvoiceTab slug={slug} toast={toast} qc={qc} />}
    </div>
  )
}

/* ---------- LISTA DE CUOTAS ---------- */
interface ChargeTypeItem { id: string; description: string; amount: number; sortOrder: number }
interface ChargeType { id: string; name: string; amount: number; dueDays: number | null; isActive: boolean; appliesLateFees: boolean; appliesDiscounts: boolean; isFinanceable: boolean; maxFinancingInstallments: number | null; isRecurring: boolean; recurrenceIntervalDays: number | null; recurrenceDayOfMonth: number | null; autoGenerateEnabled: boolean; generationDayOfMonth: number | null; generationWindowStartDay: number | null; generationWindowEndDay: number | null; items: ChargeTypeItem[] }
function isMonthlyTypeName(name: string) { return name.trim().toLowerCase() === 'mensual' }

function ChargesList({ slug, toast, qc }: { slug: string; toast: ReturnType<typeof useToast>; qc: ReturnType<typeof useQueryClient> }) {
  const { data: chargeTypes = [], isLoading } = useQuery({
    queryKey: ['admin-charge-types', slug],
    queryFn: () => apiService.get<ChargeType[]>(`/api/admin/${slug}/charge-types`),
    enabled: !!slug,
  })

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', amount: '', dueDays: '', appliesLateFees: true, appliesDiscounts: true, isFinanceable: false, maxFinancingInstallments: '', isRecurring: false, recurrenceIntervalDays: '', recurrenceDayOfMonth: '', autoGenerateEnabled: false, generationDayOfMonth: '', generationWindowStartDay: '', generationWindowEndDay: '' })
  const [detailItems, setDetailItems] = useState<{ description: string; amount: string }[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<ChargeType | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const createMut = useMutation({
    mutationFn: () => {
      const items = detailItems.filter(i => i.description.trim()).map((i, idx) => ({ description: i.description.trim(), amount: parseFloat(i.amount) || 0, sortOrder: idx }))
      return apiService.post(`/api/admin/${slug}/charge-types`, {
        ...form, amount: Number(form.amount), dueDays: form.dueDays ? Number(form.dueDays) : null,
        recurrenceIntervalDays: form.recurrenceIntervalDays ? Number(form.recurrenceIntervalDays) : null,
        recurrenceDayOfMonth: form.recurrenceDayOfMonth ? Number(form.recurrenceDayOfMonth) : null,
        autoGenerateEnabled: form.autoGenerateEnabled,
        generationDayOfMonth: form.generationDayOfMonth ? Number(form.generationDayOfMonth) : null,
        generationWindowStartDay: form.generationWindowStartDay ? Number(form.generationWindowStartDay) : null,
        generationWindowEndDay: form.generationWindowEndDay ? Number(form.generationWindowEndDay) : null,
        isFinanceable: form.isFinanceable,
        maxFinancingInstallments: form.isFinanceable ? Number(form.maxFinancingInstallments) : null,
        items: items.length > 0 ? items : null,
      })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-charge-types'] }); resetForm(); toast('Tipo de cuota creado.') },
    onError: () => toast('Error al crear.', 'error'),
  })
  const updateMut = useMutation({
    mutationFn: () => {
      const items = detailItems.filter(i => i.description.trim()).map((i, idx) => ({ description: i.description.trim(), amount: parseFloat(i.amount) || 0, sortOrder: idx }))
      return apiService.put(`/api/admin/${slug}/charge-types/${editingId}`, {
        ...form, amount: Number(form.amount), dueDays: form.dueDays ? Number(form.dueDays) : null,
        recurrenceIntervalDays: form.recurrenceIntervalDays ? Number(form.recurrenceIntervalDays) : null,
        recurrenceDayOfMonth: form.recurrenceDayOfMonth ? Number(form.recurrenceDayOfMonth) : null,
        autoGenerateEnabled: form.autoGenerateEnabled,
        generationDayOfMonth: form.generationDayOfMonth ? Number(form.generationDayOfMonth) : null,
        generationWindowStartDay: form.generationWindowStartDay ? Number(form.generationWindowStartDay) : null,
        generationWindowEndDay: form.generationWindowEndDay ? Number(form.generationWindowEndDay) : null,
        isFinanceable: form.isFinanceable,
        maxFinancingInstallments: form.isFinanceable ? Number(form.maxFinancingInstallments) : null,
        isActive: true, items: items.length > 0 ? items : null,
      })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-charge-types'] }); resetForm(); toast('Tipo de cuota actualizado.') },
    onError: () => toast('Error al actualizar.', 'error'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiService.del(`/api/admin/${slug}/charge-types/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-charge-types'] }); setDeleteTarget(null); toast('Eliminado.') },
    onError: () => toast('Error al eliminar.', 'error'),
  })
  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiService.put(`/api/admin/${slug}/charge-types/${id}/toggle-active`, { isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-charge-types'] }); toast('Estado actualizado.') },
    onError: () => toast('Error al cambiar estado.', 'error'),
  })

  function resetForm() { setEditingId(null); setShowForm(false); setForm({ name: '', amount: '', dueDays: '', appliesLateFees: true, appliesDiscounts: true, isFinanceable: false, maxFinancingInstallments: '', isRecurring: false, recurrenceIntervalDays: '', recurrenceDayOfMonth: '', autoGenerateEnabled: false, generationDayOfMonth: '', generationWindowStartDay: '', generationWindowEndDay: '' }); setDetailItems([]); setErrors({}) }

  function openEdit(c: ChargeType) {
    setEditingId(c.id); setShowForm(true)
    setForm({ name: c.name, amount: String(c.amount), dueDays: c.dueDays ? String(c.dueDays) : '', appliesLateFees: c.appliesLateFees, appliesDiscounts: c.appliesDiscounts, isFinanceable: c.isFinanceable, maxFinancingInstallments: c.maxFinancingInstallments ? String(c.maxFinancingInstallments) : '', isRecurring: c.isRecurring, recurrenceIntervalDays: c.recurrenceIntervalDays ? String(c.recurrenceIntervalDays) : '', recurrenceDayOfMonth: c.recurrenceDayOfMonth ? String(c.recurrenceDayOfMonth) : '', autoGenerateEnabled: c.autoGenerateEnabled, generationDayOfMonth: c.generationDayOfMonth ? String(c.generationDayOfMonth) : '', generationWindowStartDay: c.generationWindowStartDay ? String(c.generationWindowStartDay) : '', generationWindowEndDay: c.generationWindowEndDay ? String(c.generationWindowEndDay) : '' })
    setDetailItems((c.items ?? []).map(i => ({ description: i.description, amount: String(i.amount) })))
    setErrors({})
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Requerido'
    const hasItems = detailItems.some(i => i.description.trim())
    if (!hasItems && (!form.amount || isNaN(Number(form.amount)))) e.amount = 'Monto inválido'
    if (form.isFinanceable && (Number(form.maxFinancingInstallments) < 2 || Number(form.maxFinancingInstallments) > 60)) {
      e.maxFinancingInstallments = 'Indicá un máximo entre 2 y 60'
    }
    const hasWindowStart = form.generationWindowStartDay !== ''
    const hasWindowEnd = form.generationWindowEndDay !== ''
    if (form.autoGenerateEnabled && hasWindowStart !== hasWindowEnd) {
      e.generationWindow = 'Completá ambos días del período de reintento'
    } else if (
      form.autoGenerateEnabled &&
      hasWindowStart &&
      Number(form.generationWindowStartDay) > Number(form.generationWindowEndDay)
    ) {
      e.generationWindow = 'El día inicial no puede ser posterior al día final'
    }
    setErrors(e); return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    if (editingId) updateMut.mutate()
    else createMut.mutate()
  }

  function addItem() { setDetailItems([...detailItems, { description: '', amount: '' }]) }
  function removeItem(idx: number) { setDetailItems(detailItems.filter((_, i) => i !== idx)) }
  function updateItem(idx: number, field: 'description' | 'amount', value: string) {
    const updated = [...detailItems]; updated[idx] = { ...updated[idx], [field]: value }; setDetailItems(updated)
  }

  const itemsTotal = detailItems.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0)
  const isMonthlyForm = isMonthlyTypeName(form.name)
  const dueDaysLabel = isMonthlyForm ? 'Dia de vencimiento mensual' : 'Vence en'
  const dueDaysHint = isMonthlyForm
    ? 'Para Mensual se interpreta como dia del mes. Si esta vacio, usa Config. pagos.'
    : 'Para Seguro, Materiales y otros tipos se interpreta como cantidad de dias desde la generacion.'
  const dueDaysPlaceholder = isMonthlyForm ? 'Ej: 10' : 'Ej: 10 dias'

  if (isLoading) return <div className="flex justify-center py-10"><Spinner className="h-6 w-6" /></div>

  return (
    <div className="space-y-4">
      {!showForm && (
        <div className="flex justify-end">
          <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', amount: '', dueDays: '', appliesLateFees: true, appliesDiscounts: true, isFinanceable: false, maxFinancingInstallments: '', isRecurring: false, recurrenceIntervalDays: '', recurrenceDayOfMonth: '', autoGenerateEnabled: false, generationDayOfMonth: '', generationWindowStartDay: '', generationWindowEndDay: '' }); setDetailItems([]) }}
            className="bg-slate-900 text-white hover:bg-slate-800">+ Nuevo tipo de cuota</Button>
        </div>
      )}

      {showForm && (
        <Card className="p-5">
          <h2 className="text-lg font-bold">{editingId ? 'Editar tipo de cuota' : 'Nuevo tipo de cuota'}</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Nombre *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" >Monto total {detailItems.some(i => i.description.trim()) ? '(calculado)' : '*'}</label>
                <Input type="number" step="0.01" value={detailItems.some(i => i.description.trim()) ? itemsTotal.toFixed(2) : form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  disabled={detailItems.some(i => i.description.trim())} />
                {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" >{dueDaysLabel}</label>
                <Input type="number" min="0" value={form.dueDays} onChange={(e) => setForm({ ...form, dueDays: e.target.value })} placeholder={dueDaysPlaceholder} />
                <p className="mt-1 text-xs text-slate-500">{dueDaysHint}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm font-medium" >
                <input type="checkbox" checked={form.appliesLateFees} onChange={(e) => setForm({ ...form, appliesLateFees: e.target.checked })} className="rounded border-slate-300" />Aplica mora
              </label>
              <label className="flex items-center gap-2 text-sm font-medium" >
                <input type="checkbox" checked={form.appliesDiscounts} onChange={(e) => setForm({ ...form, appliesDiscounts: e.target.checked })} className="rounded border-slate-300" />Aplica descuentos
              </label>
              <label className="flex items-center gap-2 text-sm font-medium" >
                <input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} className="rounded border-slate-300" />Recurrente
              </label>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                <input
                  type="checkbox"
                  checked={form.isFinanceable}
                  onChange={(e) => setForm({
                    ...form,
                    isFinanceable: e.target.checked,
                    maxFinancingInstallments: e.target.checked
                      ? form.maxFinancingInstallments || '6'
                      : '',
                  })}
                  className="rounded border-slate-300"
                />
                Permitir financiación
              </label>
              {form.isFinanceable && (
                <div className="mt-3 max-w-xs">
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Máximo de cuotas
                  </label>
                  <Input
                    type="number"
                    min="2"
                    max="60"
                    value={form.maxFinancingInstallments}
                    onChange={(e) => setForm({ ...form, maxFinancingInstallments: e.target.value })}
                    placeholder="Ej: 12"
                  />
                  {errors.maxFinancingInstallments && (
                    <p className="mt-1 text-xs text-red-500">{errors.maxFinancingInstallments}</p>
                  )}
                </div>
              )}
            </div>

            {form.isRecurring && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium" >Intervalo (días)</label>
                  <Input type="number" value={form.recurrenceIntervalDays} onChange={(e) => setForm({ ...form, recurrenceIntervalDays: e.target.value })} placeholder="Ej: 30" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium" >Día del mes</label>
                  <Input type="number" min="1" max="31" value={form.recurrenceDayOfMonth} onChange={(e) => setForm({ ...form, recurrenceDayOfMonth: e.target.value })} placeholder="Ej: 10" />
                </div>
              </div>
            )}

            <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <label className="flex items-center gap-2 text-sm font-medium" >
                <input type="checkbox" checked={form.autoGenerateEnabled} onChange={(e) => setForm({ ...form, autoGenerateEnabled: e.target.checked })} className="rounded border-slate-300" />Generación automática
              </label>

              {form.autoGenerateEnabled && (
                <div className="space-y-4 pl-6">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Día principal de generación</label>
                    <Input type="number" min="1" max="31" value={form.generationDayOfMonth} onChange={(e) => setForm({ ...form, generationDayOfMonth: e.target.value })} placeholder="Ej: 1" />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Ese día se generan las cuotas de todos los alumnos que todavía no la tengan.
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Período de reintento opcional</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Durante estos días el sistema revisa diariamente y genera sólo las cuotas faltantes, por ejemplo para alumnos agregados después del día principal. Nunca duplica una cuota existente.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Desde el día</label>
                        <Input type="number" min="1" max="31" value={form.generationWindowStartDay} onChange={(e) => setForm({ ...form, generationWindowStartDay: e.target.value })} placeholder="Ej: 1" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Hasta el día</label>
                        <Input type="number" min="1" max="31" value={form.generationWindowEndDay} onChange={(e) => setForm({ ...form, generationWindowEndDay: e.target.value })} placeholder="Ej: 5" />
                      </div>
                    </div>
                    {errors.generationWindow && (
                      <p className="mt-2 text-xs font-medium text-red-500">{errors.generationWindow}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium" >Items de detalle</label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>+ Agregar item</Button>
              </div>
              {detailItems.length > 0 && (
                <div className="space-y-2">
                  {detailItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[minmax(0,1fr)_minmax(86px,112px)_40px] items-center gap-2">
                      <input value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        placeholder="Descripción"
                        className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                      <input type="number" step="0.01" value={item.amount} onChange={(e) => updateItem(idx, 'amount', e.target.value)}
                        placeholder="Monto"
                        className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                      <button type="button" onClick={() => removeItem(idx)}
                        title="Eliminar ítem"
                        aria-label={`Eliminar ${item.description || 'ítem'}`}
                        className="flex h-11 w-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  <div className="text-right font-bold text-sm">Total: {ARS.format(itemsTotal)}</div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" loading={createMut.isPending || updateMut.isPending} className="bg-slate-900 text-white hover:bg-slate-800">{editingId ? 'Guardar' : 'Crear'}</Button>
              <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3 text-center">Mora</th><th className="px-4 py-3 text-center">Desc.</th>
                <th className="px-4 py-3 text-center">Fin.</th><th className="px-4 py-3 text-center">Rec.</th><th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {chargeTypes.length === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No hay tipos de cuota creados.</td></tr>
              : chargeTypes.map((c) => (
                <React.Fragment key={c.id}>
                <tr className="cursor-pointer bg-white text-slate-800 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800/80" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <svg className={`h-4 w-4 text-slate-400 transition-transform ${expandedId === c.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      {c.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{ARS.format(c.amount)}</td>
                  <td className="px-4 py-3 text-center">{c.appliesLateFees ? '✅' : '—'}</td>
                  <td className="px-4 py-3 text-center">{c.appliesDiscounts ? '✅' : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {c.isFinanceable
                      ? <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">Hasta {c.maxFinancingInstallments}</span>
                      : <span className="text-slate-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center">{c.isRecurring ? '✅' : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={(e) => { e.stopPropagation(); toggleMut.mutate({ id: c.id, isActive: !c.isActive }) }}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${c.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {c.isActive ? 'Activa' : 'Inactiva'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(c) }}>Editar</Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setDeleteTarget(c) }}>Eliminar</Button>
                    </div>
                  </td>
                </tr>
                {expandedId === c.id && (c.items ?? []).length > 0 && (
                  <tr key={`${c.id}-items`}>
                    <td colSpan={8} className="bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                      <div className="ml-6 space-y-1">
                        <div className="text-xs font-medium text-slate-500">
                          {isMonthlyTypeName(c.name)
                            ? `Vencimiento: ${c.dueDays ? `dia ${c.dueDays} del mes` : 'usa Config. pagos'}`
                            : `Vencimiento: ${c.dueDays ?? 10} dias desde la generacion`}
                        </div>
                        {(c.items ?? []).map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-300">{item.description}</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{ARS.format(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Eliminar tipo de cuota</h3>
            <p className="mt-2 text-sm text-slate-500">¿Eliminar &quot;{deleteTarget.name}&quot;?</p>
            <div className="mt-4 flex gap-3">
              <Button className="bg-red-600 text-white hover:bg-red-700" loading={deleteMut.isPending} onClick={() => deleteMut.mutate(deleteTarget.id)}>Eliminar</Button>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- FINANCIACIÓN ---------- */
function FinancingTab({ slug, toast, qc }: { slug: string; toast: ReturnType<typeof useToast>; qc: ReturnType<typeof useQueryClient> }) {
  return <FinancingConfig slug={slug} toast={toast} qc={qc} />
}

interface AdminFinancingConfig {
  isEnabled: boolean
  allowWeekly: boolean
  allowBiweekly: boolean
  allowMonthly: boolean
  weeklyInterestRate: number
  biweeklyInterestRate: number
  monthlyInterestRate: number
  interestRate2: number
  interestRate3: number
  interestRate4: number
  interestRate6: number
  installmentRates: { installmentCount: number; interestRate: number }[]
}

function FinancingConfig({ slug, toast, qc }: { slug: string; toast: ReturnType<typeof useToast>; qc: ReturnType<typeof useQueryClient> }) {
  const { data: cfg, isLoading } = useQuery({
    queryKey: ['financing-config', slug],
    queryFn: () => apiService.get<AdminFinancingConfig>(`/api/admin/${slug}/financing/config`),
    enabled: !!slug,
  })
  const [settings, setSettings] = useState<AdminFinancingConfig>({
    isEnabled: false,
    allowWeekly: true,
    allowBiweekly: true,
    allowMonthly: true,
    weeklyInterestRate: 0,
    biweeklyInterestRate: 0,
    monthlyInterestRate: 0,
    interestRate2: 0,
    interestRate3: 0,
    interestRate4: 0,
    interestRate6: 0,
    installmentRates: [
      { installmentCount: 2, interestRate: 0 },
      { installmentCount: 3, interestRate: 0 },
      { installmentCount: 4, interestRate: 0 },
      { installmentCount: 6, interestRate: 0 },
    ],
  })
  const [saveError, setSaveError] = useState<string | null>(null)
  useEffect(() => {
    if (!cfg) return
    const fallbackRates = [
      { installmentCount: 2, interestRate: Number(cfg.interestRate2 || 0) },
      { installmentCount: 3, interestRate: Number(cfg.interestRate3 || 0) },
      { installmentCount: 4, interestRate: Number(cfg.interestRate4 || 0) },
      { installmentCount: 6, interestRate: Number(cfg.interestRate6 || 0) },
    ]
    setSettings({
      ...cfg,
      installmentRates: (cfg.installmentRates?.length ? cfg.installmentRates : fallbackRates)
        .slice()
        .sort((a, b) => a.installmentCount - b.installmentCount),
    })
  }, [cfg])
  function getPreparedSettings(): AdminFinancingConfig | null {
    const rates = settings.installmentRates
      .map((item) => ({
        installmentCount: Number(item.installmentCount),
        interestRate: Number(item.interestRate) || 0,
      }))
      .filter((item) => item.installmentCount || item.interestRate)
      .sort((a, b) => a.installmentCount - b.installmentCount)

    const seen = new Set<number>()
    for (const item of rates) {
      if (!Number.isInteger(item.installmentCount) || item.installmentCount < 2 || item.installmentCount > 60) {
        setSaveError('Cada plan debe tener una cantidad entera entre 2 y 60 cuotas.')
        return null
      }
      if (item.interestRate < 0) {
        setSaveError('El interés adicional no puede ser negativo.')
        return null
      }
      if (seen.has(item.installmentCount)) {
        setSaveError(`Ya existe una configuración para ${item.installmentCount} cuotas.`)
        return null
      }
      seen.add(item.installmentCount)
    }

    if (settings.isEnabled && !settings.allowWeekly && !settings.allowBiweekly && !settings.allowMonthly) {
      setSaveError('Habilitá al menos una frecuencia: semanal, quincenal o mensual.')
      return null
    }

    if (settings.isEnabled && rates.length === 0) {
      setSaveError('Agregá al menos una cantidad de cuotas para poder financiar.')
      return null
    }

    setSaveError(null)
    return {
      ...settings,
      weeklyInterestRate: Number(settings.weeklyInterestRate) || 0,
      biweeklyInterestRate: Number(settings.biweeklyInterestRate) || 0,
      monthlyInterestRate: Number(settings.monthlyInterestRate) || 0,
      interestRate2: rates.find((item) => item.installmentCount === 2)?.interestRate ?? 0,
      interestRate3: rates.find((item) => item.installmentCount === 3)?.interestRate ?? 0,
      interestRate4: rates.find((item) => item.installmentCount === 4)?.interestRate ?? 0,
      interestRate6: rates.find((item) => item.installmentCount === 6)?.interestRate ?? 0,
      installmentRates: rates,
    }
  }

  const save = useMutation({
    mutationFn: (payload: AdminFinancingConfig) => apiService.put(`/api/admin/${slug}/financing/config`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financing-config'] }); toast('Configuración de financiación guardada.') },
    onError: (error: any) => toast(typeof error?.response?.data === 'string' ? error.response.data : 'Error al guardar.', 'error'),
  })
  function handleSave() {
    const payload = getPreparedSettings()
    if (!payload) return
    save.mutate(payload)
  }
  if (isLoading) return <div className="flex justify-center py-10"><Spinner className="h-6 w-6" /></div>

  const frequencySettings = [
    { key: 'allowWeekly', rateKey: 'weeklyInterestRate', title: 'Semanal', detail: 'Vencimientos cada 7 días' },
    { key: 'allowBiweekly', rateKey: 'biweeklyInterestRate', title: 'Quincenal', detail: 'Vencimientos cada 14 días' },
    { key: 'allowMonthly', rateKey: 'monthlyInterestRate', title: 'Mensual', detail: 'Vencimientos cada mes' },
  ] as const

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Configuración de financiación</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              El interés total combina la frecuencia elegida y la cantidad de cuotas.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
            <input type="checkbox" checked={settings.isEnabled} onChange={(event) => setSettings({ ...settings, isEnabled: event.target.checked })} />
            Financiación habilitada
          </label>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {frequencySettings.map((item) => (
            <div key={item.key} className={`rounded-xl border p-4 transition ${
              settings[item.key]
                ? 'border-blue-300 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-950/20'
                : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
            }`}>
              <label className="flex items-start gap-3">
                <input type="checkbox" checked={settings[item.key]} onChange={(event) => setSettings({ ...settings, [item.key]: event.target.checked })} className="mt-1" />
                <span>
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">{item.title}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{item.detail}</span>
                </span>
              </label>
              <label className="mt-4 block text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Interés por frecuencia (%)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                disabled={!settings[item.key]}
                value={settings[item.rateKey] === 0 ? '' : settings[item.rateKey]}
                onChange={(event) => setSettings({ ...settings, [item.rateKey]: Number(event.target.value) || 0 })}
                placeholder="0"
                className="mt-1"
              />
            </div>
          ))}
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Interés adicional por cantidad</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Evita que un plan largo use solamente la tasa mínima de frecuencia.
          </p>
          <div className="mt-3 space-y-2">
            {settings.installmentRates.map((plan, index) => (
              <div key={`${plan.installmentCount}-${index}`} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] sm:items-end">
                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Cantidad de cuotas</span>
                  <Input
                    type="number"
                    min="2"
                    max="60"
                    value={plan.installmentCount || ''}
                    onChange={(event) => {
                      const installmentRates = [...settings.installmentRates]
                      installmentRates[index] = { ...plan, installmentCount: Number(event.target.value) || 0 }
                      setSettings({ ...settings, installmentRates })
                    }}
                    placeholder="Ej: 12"
                    className="mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Interés adicional (%)</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={plan.interestRate === 0 ? '' : plan.interestRate}
                    onChange={(event) => {
                      const installmentRates = [...settings.installmentRates]
                      installmentRates[index] = { ...plan, interestRate: Number(event.target.value) || 0 }
                      setSettings({ ...settings, installmentRates })
                    }}
                    placeholder="0"
                    className="mt-1"
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Eliminar cantidad de cuotas"
                  className="h-10 w-10 justify-self-start px-0 text-red-600 dark:text-red-300 sm:justify-self-end"
                  onClick={() => setSettings({
                    ...settings,
                    installmentRates: settings.installmentRates.filter((_, itemIndex) => itemIndex !== index),
                  })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={settings.installmentRates.length >= 59}
            onClick={() => {
              const used = new Set(settings.installmentRates.map((item) => item.installmentCount))
              const installmentCount = Array.from({ length: 59 }, (_, index) => index + 2)
                .find((count) => !used.has(count))
              if (!installmentCount) return
              setSettings({
                ...settings,
                installmentRates: [
                  ...settings.installmentRates,
                  { installmentCount, interestRate: 0 },
                ],
              })
            }}
          >
            Agregar cantidad
          </Button>
          {saveError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              {saveError}
            </p>
          )}
        </div>

        <Button onClick={handleSave} loading={save.isPending} className="mt-5 bg-blue-600 text-white hover:bg-blue-500">
          Guardar configuración
        </Button>
      </Card>

    </div>
  )
}

/* ---------- COMPROBANTE ---------- */
interface S { logoUrl: string; logoX: number; logoY: number; logoWidth: number; logoHeight: number; showCompanyName: boolean; showItems: boolean; showTotal: boolean; showPaymentMethods: boolean; fontSize: string; primaryColor: string; footerText: string }
const D: S = { logoUrl: '', logoX: 20, logoY: 20, logoWidth: 100, logoHeight: 100, showCompanyName: true, showItems: true, showTotal: true, showPaymentMethods: true, fontSize: '14', primaryColor: '#1e40af', footerText: '' }

function InvoiceTab({ slug, toast, qc }: { slug: string; toast: ReturnType<typeof useToast>; qc: ReturnType<typeof useQueryClient> }) {
  const { data: template } = useQuery({ queryKey: ['invoice-template', slug], queryFn: () => apiService.get<S>(`/api/admin/${slug}/invoice-template`), enabled: !!slug })
  const { companies, activeCompanySlug } = useAuth()
  const activeCompany = companies?.find((c: any) => (c.slug ?? c.companySlug) === activeCompanySlug)
  const [s, setS] = useState<S>(D)

  useEffect(() => {
    if (!template) return
    const cleaned: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(template)) { if (v != null) cleaned[k] = v }
    setS({ ...D, ...cleaned } as S)
  }, [template])

  const upd = <K extends keyof S>(k: K, v: S[K]) => setS((p) => ({ ...p, [k]: v }))
  const save = useMutation({
    mutationFn: () => apiService.put(`/api/admin/${slug}/invoice-template`, s),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoice-template'] }); toast('Comprobante guardado') },
    onError: () => toast('Error al guardar', 'error'),
  })
  const logoUrl = activeCompany?.logoUrl || activeCompany?.LogoUrl || ''

  const imgRef = useRef<HTMLImageElement>(null)
  const posRef = useRef({ x: s.logoX, y: s.logoY })
  posRef.current = { x: s.logoX, y: s.logoY }

  useEffect(() => {
    const el = imgRef.current
    if (!el) return
    let dragging = false
    let sx = 0, sy = 0
    let ox = 0, oy = 0

    function onDown(e: PointerEvent) {
      e.preventDefault()
      dragging = true
      sx = e.clientX; sy = e.clientY
      const p = posRef.current; ox = p.x; oy = p.y
    }
    function onMove(e: PointerEvent) {
      if (!dragging) return
      setS((p) => ({ ...p, logoX: Math.max(0, ox + (e.clientX - sx)), logoY: Math.max(0, oy + (e.clientY - sy)) }))
    }
    function onUp() { dragging = false }

    el.addEventListener('pointerdown', onDown)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [logoUrl])

  const fs = `${s.fontSize}px`
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-bold">Editor</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1 block text-sm font-medium">Ancho logo</label><Input type="number" value={s.logoWidth} onChange={(e) => upd('logoWidth', parseFloat(e.target.value) || 50)} /></div>
          <div><label className="mb-1 block text-sm font-medium">Alto logo</label><Input type="number" value={s.logoHeight} onChange={(e) => upd('logoHeight', parseFloat(e.target.value) || 50)} /></div>
        </div>
        <div className="space-y-2">
          {([{ k: 'showCompanyName', l: 'Mostrar nombre empresa' }, { k: 'showItems', l: 'Mostrar items' }, { k: 'showTotal', l: 'Mostrar total' }, { k: 'showPaymentMethods', l: 'Mostrar métodos de pago' }] as const).map(({ k, l }) => (
            <label key={k} className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={s[k]} onChange={(e) => upd(k, e.target.checked)} className="rounded border-slate-300" />{l}</label>
          ))}
        </div>
        <div><label className="mb-1 block text-sm font-medium">Tamaño de fuente</label>
          <Select value={s.fontSize} onChange={(e) => upd('fontSize', e.target.value)}>{['12', '13', '14', '15', '16'].map((v) => <option key={v} value={v}>{v}px</option>)}</Select>
        </div>
        <div><label className="mb-1 block text-sm font-medium">Color primario</label>
          <div className="flex gap-2"><Input type="color" value={s.primaryColor} onChange={(e) => upd('primaryColor', e.target.value)} className="w-16 p-1" /><Input value={s.primaryColor} onChange={(e) => upd('primaryColor', e.target.value)} /></div>
        </div>
        <div><label className="mb-1 block text-sm font-medium">Texto del pie</label><Textarea value={s.footerText ?? ''} onChange={(e) => upd('footerText', e.target.value)} rows={2} /></div>
        <Button onClick={() => save.mutate()} loading={save.isPending} className="w-full bg-slate-900 text-white hover:bg-slate-800">Guardar comprobante</Button>
      </Card>
      <Card className="p-0 overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3 font-bold text-sm">Vista previa</div>
        <div className="relative min-h-[400px] p-5" style={{ fontSize: fs }}>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm" style={{ color: s.primaryColor }}>
            {logoUrl && (
              <img ref={imgRef} src={logoUrl} alt="Logo" draggable={false}
                className="cursor-grab rounded-full shadow-md select-none"
                style={{ touchAction: 'none', position: 'absolute', zIndex: 20, left: `${s.logoX}px`, top: `${s.logoY}px`, width: `${s.logoWidth}px`, height: `${s.logoHeight}px`, objectFit: 'cover', userSelect: 'none' }} />
            )}
            <div style={{ position: 'relative', zIndex: 10 }}>
              {s.showCompanyName && <div className="font-black mb-3">{activeCompany?.name || 'Mi Empresa'}</div>}
              {s.showItems && (
                <div className="mb-3 space-y-1">
                  <div className="flex justify-between border-b pb-1 font-semibold"><span>Descripción</span><span>Monto</span></div>
                  {[{ d: 'Cuota mensual', a: 15000 }, { d: 'Seguro', a: 2000 }, { d: 'Materiales', a: 3000 }].map((item, i) => (
                    <div key={i} className="flex justify-between text-slate-600"><span>{item.d}</span><span>{ARS.format(item.a)}</span></div>
                  ))}
                </div>
              )}
              {s.showTotal && <div className="mb-3 text-right font-black">Total: {ARS.format(20000)}</div>}
              {s.showPaymentMethods && <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">Transferencia</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">Efectivo</span>
              </div>}
            </div>
          </div>
          {(s.footerText ?? '') && <div className="mt-3 text-center text-slate-400">{s.footerText}</div>}
          <p className="mt-4 text-center text-slate-400">Arrastrá el logo para posicionarlo</p>
        </div>
      </Card>
    </div>
  )
}

export default function ChargeSettingsPage() {
  return <ToastProvider><ChargeSettingsPageInner /></ToastProvider>
}
