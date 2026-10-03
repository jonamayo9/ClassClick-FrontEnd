import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService, getApiError } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { Pagination } from '@/components/ui/pagination'
import { PagedResult, EducativaTraining, EducativaTrainingType, EducativaTrainingCategory } from '../types'

const PAYMENT_MODE_LABEL: Record<string, string> = {
  single: 'Pago único',
  monthly: 'Mensual recurrente',
  fixed_installments: 'Cantidad fija de cuotas',
}

const DURATION_UNIT_LABEL: Record<string, string> = {
  days: 'Días',
  weeks: 'Semanas',
  months: 'Meses',
  years: 'Años',
}

interface EconomyForm {
  requiresEnrollmentFee: boolean
  enrollmentFee: number
  paymentMode: string
  installmentCount: number | '' | null
  installmentAmount: number
  installmentDueDayOfMonth: number | '' | null
  installmentFrequencyMonths: number | '' | null
  allowsFinancing: boolean
  financingMaxInstallments: number | null
  allowsDiscountedEnrollment: boolean
  allowedEnrollmentDiscountPercentages: number[]
}

interface FormState {
  trainingTypeId: string
  categoryId: string
  name: string
  description: string
  durationValue: number | null
  durationUnit: string | null
  economy: EconomyForm
}

const DEFAULT_ECONOMY: EconomyForm = {
  requiresEnrollmentFee: false, enrollmentFee: 0, paymentMode: '',
  installmentCount: '', installmentAmount: 0, installmentDueDayOfMonth: '', installmentFrequencyMonths: '',
  allowsFinancing: false, financingMaxInstallments: null, allowsDiscountedEnrollment: false,
  allowedEnrollmentDiscountPercentages: [],
}

const EMPTY_FORM: FormState = {
  trainingTypeId: '', categoryId: '', name: '', description: '',
  durationValue: null, durationUnit: null,
  economy: DEFAULT_ECONOMY,
}

function durationMonthsOf(t: { durationUnit?: string | null; durationValue?: number | null } | null | undefined): number | null {
  if (!t) return null
  return t.durationUnit === 'months' && t.durationValue ? Number(t.durationValue) : null
}

function derivedInstallments(durationMonths: number | null, paymentMode: string, frequency: number | '' | null): number | null {
  if (paymentMode === 'single') return 1
  if (durationMonths == null) return null
  const freq = Number(frequency)
  if (!freq || freq < 1) return null
  return Math.max(1, Math.ceil(durationMonths / freq))
}

function arConfigOf(t: EducativaTraining | null | undefined) {
  return (t?.countries ?? []).find((c) => c.countryCode === 'AR')
}

export function EducativaFormacionesPage() {
  const { companySlug } = useParams<{ companySlug: string }>()
  const slug = companySlug ?? ''
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [page, setPage] = useState(1)

  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [catFormOpen, setCatFormOpen] = useState(false)
  const [catEditing, setCatEditing] = useState<EducativaTrainingCategory | null>(null)
  const [catName, setCatName] = useState('')
  const [catSaving, setCatSaving] = useState(false)
  const [catError, setCatError] = useState('')
  const [catDeleting, setCatDeleting] = useState<EducativaTrainingCategory | null>(null)

  const [editing, setEditing] = useState<EducativaTraining | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [deleting, setDeleting] = useState<EducativaTraining | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [discountInput, setDiscountInput] = useState('')

  const [filtersOpen, setFiltersOpen] = useState(false)

  const typesQuery = useQuery({
    queryKey: ['educativa-training-types', slug],
    queryFn: () => apiService.get<EducativaTrainingType[]>(`/api/educativa/${slug}/training-types`),
    enabled: !!slug,
    retry: false,
  })
  const trainingTypes = typesQuery.data ?? []

  const categoriesQuery = useQuery({
    queryKey: ['educativa-training-categories', slug],
    queryFn: () => apiService.get<EducativaTrainingCategory[]>(`/api/educativa/${slug}/training-categories`),
    enabled: !!slug,
    retry: false,
  })
  const categories = categoriesQuery.data ?? []
  const invalidateCategories = () => qc.invalidateQueries({ queryKey: ['educativa-training-categories', slug] })

  const params = new URLSearchParams({ page: String(page), pageSize: '20' })
  if (search) params.set('search', search)
  if (typeFilter) params.set('trainingTypeId', typeFilter)
  if (categoryFilter) params.set('categoryId', categoryFilter)
  if (activeFilter) params.set('isActive', activeFilter)

  const query = useQuery({
    queryKey: ['educativa-trainings', slug, search, typeFilter, categoryFilter, activeFilter, page],
    queryFn: () => apiService.get<PagedResult<EducativaTraining>>(`/api/educativa/${slug}/trainings?${params}`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['educativa-trainings', slug] })

  function resetForm() {
    setForm(EMPTY_FORM)
    setDiscountInput('')
    setError('')
  }

  function loadEconomyIntoForm(economy: EducativaTraining['countries'][number] | undefined) {
    setForm((prev) => ({
      ...prev,
      economy: economy
        ? {
            requiresEnrollmentFee: economy.requiresEnrollmentFee,
            enrollmentFee: economy.enrollmentFee,
            paymentMode: economy.paymentMode,
            installmentCount: economy.installmentCount,
            installmentAmount: economy.installmentAmount,
            installmentDueDayOfMonth: economy.installmentDueDayOfMonth,
            installmentFrequencyMonths: economy.installmentFrequencyMonths,
            allowsFinancing: economy.allowsFinancing,
            financingMaxInstallments: economy.financingMaxInstallments,
            allowsDiscountedEnrollment: economy.allowsDiscountedEnrollment,
            allowedEnrollmentDiscountPercentages: [...(economy.allowedEnrollmentDiscounts ?? [])],
          }
        : DEFAULT_ECONOMY,
    }))
  }

  const openCreate = () => {
    setEditing(null)
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (t: EducativaTraining) => {
    setEditing(t)
    setForm({
      trainingTypeId: t.trainingTypeId, categoryId: t.categoryId ?? '', name: t.name, description: t.description ?? '',
      durationValue: t.durationValue ?? null, durationUnit: t.durationUnit ?? null,
      economy: DEFAULT_ECONOMY,
    })
    setDiscountInput('')
    setError('')
    loadEconomyIntoForm(arConfigOf(t))
    setModalOpen(true)
  }

  async function save() {
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    if (!form.trainingTypeId) { setError('Seleccioná un Tipo de Formación.'); return }
    if (!editing && !form.categoryId) { setError('Seleccioná una Categoría.'); return }
    if (!form.durationValue || !form.durationUnit) { setError('Indicá la duración (valor y unidad).'); return }

    const isSingle = form.economy.paymentMode === 'single'
    const durationMonths = durationMonthsOf(form)
    const econ = form.economy

    if (!econ.paymentMode) { setError('Configuración económica: elegí la modalidad de pago.'); return }
    if (econ.requiresEnrollmentFee && (!econ.enrollmentFee || econ.enrollmentFee <= 0)) { setError('Configuración económica: el precio de inscripción debe ser mayor a 0.'); return }
    if (!econ.installmentAmount || econ.installmentAmount <= 0) { setError('Configuración económica: indicá el importe a cobrar.'); return }
    if (!isSingle) {
      if (econ.installmentDueDayOfMonth === '' || Number(econ.installmentDueDayOfMonth) < 1 || Number(econ.installmentDueDayOfMonth) > 31) { setError('Configuración económica: indicá un día de vencimiento válido (1-31).'); return }
      if (econ.installmentFrequencyMonths === '' || Number(econ.installmentFrequencyMonths) < 1) { setError('Configuración económica: indicá la frecuencia en meses.'); return }
      const derived = derivedInstallments(durationMonths, econ.paymentMode, econ.installmentFrequencyMonths)
      if (!derived && (!econ.installmentCount || Number(econ.installmentCount) < 1)) { setError('Configuración económica: indicá la cantidad de cuotas.'); return }
    }

    setSaving(true)
    setError('')
    try {
      const derived = durationMonths != null && !isSingle
        ? derivedInstallments(durationMonths, econ.paymentMode, econ.installmentFrequencyMonths)
        : null
      const payload = {
        trainingTypeId: form.trainingTypeId,
        categoryId: form.categoryId || null,
        name: form.name.trim(),
        description: form.description,
        durationValue: form.durationValue,
        durationUnit: form.durationUnit,
        isActive: editing?.isActive ?? true,
        economy: {
          requiresEnrollmentFee: econ.requiresEnrollmentFee,
          enrollmentFee: econ.requiresEnrollmentFee ? Number(econ.enrollmentFee) || 0 : 0,
          paymentMode: econ.paymentMode,
          installmentCount: isSingle ? 1 : (derived ?? Number(econ.installmentCount)),
          installmentAmount: Number(econ.installmentAmount),
          installmentDueDayOfMonth: isSingle ? null : Number(econ.installmentDueDayOfMonth),
          installmentFrequencyMonths: isSingle ? null : (econ.paymentMode === 'monthly' ? 1 : Number(econ.installmentFrequencyMonths)),
          allowsFinancing: econ.allowsFinancing,
          financingMaxInstallments: econ.allowsFinancing ? Number(econ.financingMaxInstallments) || null : null,
          allowsDiscountedEnrollment: econ.requiresEnrollmentFee ? econ.allowsDiscountedEnrollment : false,
          allowedEnrollmentDiscountPercentages: econ.requiresEnrollmentFee && econ.allowsDiscountedEnrollment ? econ.allowedEnrollmentDiscountPercentages : [],
        },
      }
      if (editing) {
        await apiService.put(`/api/educativa/${slug}/trainings/${editing.id}`, payload)
      } else {
        await apiService.post(`/api/educativa/${slug}/trainings`, payload)
      }
      setModalOpen(false)
      invalidate()
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function toggle(t: EducativaTraining) {
    try {
      await apiService.put(`/api/educativa/${slug}/trainings/${t.id}`, {
        trainingTypeId: t.trainingTypeId, name: t.name, description: t.description,
        durationValue: t.durationValue ?? null, durationUnit: t.durationUnit ?? null,
        isActive: !t.isActive,
      })
      invalidate()
    } catch { /* ignore */ }
  }

  async function deactivate() {
    if (!deleting) return
    setSaving(true)
    try {
      await apiService.del(`/api/educativa/${slug}/trainings/${deleting.id}`)
      setDeleting(null)
      invalidate()
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  function openCategoryCreate() {
    setCatEditing(null)
    setCatName('')
    setCatError('')
    setCatFormOpen(true)
  }

  function openCategoryEdit(c: EducativaTrainingCategory) {
    setCatEditing(c)
    setCatName(c.name)
    setCatError('')
    setCatFormOpen(true)
  }

  async function saveCategory() {
    if (!catName.trim()) { setCatError('El nombre es obligatorio.'); return }
    setCatSaving(true)
    setCatError('')
    try {
      if (catEditing) {
        await apiService.put(`/api/educativa/${slug}/training-categories/${catEditing.id}`, {
          name: catName.trim(), isActive: catEditing.isActive,
        })
      } else {
        await apiService.post(`/api/educativa/${slug}/training-categories`, { name: catName.trim() })
      }
      setCatFormOpen(false)
      setCatEditing(null)
      setCatName('')
      invalidateCategories()
    } catch (err) {
      setCatError(getApiError(err))
    } finally {
      setCatSaving(false)
    }
  }

  async function toggleCategory(c: EducativaTrainingCategory) {
    try {
      await apiService.put(`/api/educativa/${slug}/training-categories/${c.id}`, {
        name: c.name, isActive: !c.isActive,
      })
      invalidateCategories()
    } catch (err) {
      setCatError(getApiError(err))
    }
  }

  async function deactivateCategory() {
    if (!catDeleting) return
    setCatSaving(true)
    try {
      await apiService.del(`/api/educativa/${slug}/training-categories/${catDeleting.id}`)
      setCatDeleting(null)
      invalidateCategories()
    } catch (err) {
      setCatError(getApiError(err))
    } finally { setCatSaving(false) }
  }

  function addDiscount() {
    const value = Number(discountInput)
    if (!value || value <= 0 || value > 100) return
    setForm((prev) => ({
      ...prev,
      economy: {
        ...prev.economy,
        allowedEnrollmentDiscountPercentages: Array.from(new Set([...prev.economy.allowedEnrollmentDiscountPercentages, value])),
      },
    }))
    setDiscountInput('')
  }

  function removeDiscount(p: number) {
    setForm((prev) => ({
      ...prev,
      economy: {
        ...prev.economy,
        allowedEnrollmentDiscountPercentages: prev.economy.allowedEnrollmentDiscountPercentages.filter((x) => x !== p),
      },
    }))
  }

  const secondaryActiveCount = [typeFilter, categoryFilter, activeFilter].filter(Boolean).length

  function resetFilters() {
    setTypeFilter('')
    setCategoryFilter('')
    setActiveFilter('')
    setPage(1)
  }

  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0

  const econ = form.economy
  const isSingle = econ.paymentMode === 'single'
  const durationMonths = durationMonthsOf(form)
  const derivedCount = derivedInstallments(durationMonths, econ.paymentMode, econ.installmentFrequencyMonths)
  const showDerivedCount = derivedCount != null && !isSingle

  function priceLabel(ar: EducativaTraining['countries'][number] | undefined) {
    if (!ar) return '—'
    return ar.paymentMode === 'single'
      ? `$ ${ar.installmentAmount} (pago único)`
      : `$ ${ar.installmentAmount} × ${ar.installmentCount ?? 1}`
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Educativa · Académico</p>
            <h1 className="mt-1 text-xl font-black sm:text-2xl">Formaciones</h1>
            <p className="mt-1 text-sm text-blue-200">Carreras y cursos con duración, modalidad y configuración económica.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50" onClick={() => { setCatError(''); setCategoriesOpen(true) }}>Categorías</Button>
            <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50" onClick={openCreate}>+ Nueva formación</Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Buscar formación…" value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); setSearch(searchInput) } }} />
        <Button variant="outline" onClick={() => { setPage(1); setSearch(searchInput) }}>Buscar</Button>
        <Button variant="outline" size="sm" className="inline-flex items-center gap-1.5" onClick={() => setFiltersOpen((v) => !v)}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtros{secondaryActiveCount > 0 ? ` (${secondaryActiveCount})` : ''}
        </Button>
      </div>

      {filtersOpen && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="grid gap-2 sm:grid-cols-2">
            <Select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}>
              <option value="">Todos los tipos</option>
              {trainingTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <Select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}>
              <option value="">Todas las categorías</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.isActive ? '' : ' (inactiva)'}</option>)}
            </Select>
            <Select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }}>
              <option value="">Todos los estados</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </Select>
          </div>
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={resetFilters}>Limpiar filtros</Button>
          </div>
        </div>
      )}

      {query.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner /></div>}
      {query.isError && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">No se pudieron cargar las formaciones.</p>}
      {!query.isLoading && !query.isError && items.length === 0 && (
        <Card><EmptyState icon="📚" title="Sin formaciones" description="Creá una formación para armar comisiones." /></Card>
      )}

      {!query.isLoading && !query.isError && items.length > 0 && (
        <>
          <Card className="overflow-x-auto scrollbar-hide p-0">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Duración</th>
                  <th className="px-4 py-3">Modalidad</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Matrícula</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {items.map((t) => {
                  const ar = arConfigOf(t)
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{t.name}</td>
                      <td className="px-4 py-3 text-slate-500">{t.trainingTypeName}</td>
                      <td className="px-4 py-3 text-slate-500">{t.categoryName ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{t.durationLabel ?? (t.durationValue && t.durationUnit ? `${t.durationValue} ${DURATION_UNIT_LABEL[t.durationUnit] ?? t.durationUnit}` : '—')}</td>
                      <td className="px-4 py-3 text-slate-500">{ar ? (PAYMENT_MODE_LABEL[ar.paymentMode] ?? ar.paymentMode) : '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{priceLabel(ar)}</td>
                      <td className="px-4 py-3 text-slate-500">{ar?.requiresEnrollmentFee ? `$ ${ar.enrollmentFee}` : 'No requiere'}</td>
                      <td className="px-4 py-3">{t.isActive ? <Badge variant="success">Activa</Badge> : <Badge variant="default">Inactiva</Badge>}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(t)}>Editar</Button>
                          <Button variant={t.isActive ? 'danger' : 'outline'} size="sm" onClick={() => (t.isActive ? setDeleting(t) : toggle(t))}>
                            {t.isActive ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
          <Pagination page={page} pageSize={20} totalCount={total} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar formación' : 'Nueva formación'} className="sm:max-w-2xl">
        <div className="space-y-4 px-5 py-4 sm:px-6">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Nombre *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Tipo de Formación *</label>
              <Select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                value={form.trainingTypeId} onChange={(e) => setForm({ ...form, trainingTypeId: e.target.value })}>
                <option value="">Seleccionar…</option>
                {trainingTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Categoría {editing ? '' : '*'}</label>
              <Select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">Seleccionar…</option>
                {(editing ? categories : categories.filter((c) => c.isActive)).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.isActive ? '' : ' (inactiva)'}</option>
                ))}
              </Select>
              {!editing && (
                <p className="mt-1 text-[11px] text-slate-400">Solo se muestran categorías activas.</p>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Descripción</label>
              <Input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Duración *</label>
              <Input type="number" value={form.durationValue ?? ''} placeholder="Ej: 6"
                onChange={(e) => setForm({ ...form, durationValue: e.target.value === '' ? null : Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Unidad *</label>
              <Select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                value={form.durationUnit ?? ''} onChange={(e) => setForm({ ...form, durationUnit: e.target.value || null })}>
                <option value="">Seleccionar…</option>
                <option value="days">Días</option>
                <option value="weeks">Semanas</option>
                <option value="months">Meses</option>
                <option value="years">Años</option>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Configuración económica</h3>
            <p className="mt-0.5 text-xs text-slate-400">Argentina (ARS).</p>

            <div className="mt-3 grid gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">¿Requiere inscripción?</label>
                <Select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  value={econ.requiresEnrollmentFee ? 'si' : 'no'}
                  onChange={(e) => setForm({ ...form, economy: { ...econ, requiresEnrollmentFee: e.target.value === 'si', allowsDiscountedEnrollment: e.target.value === 'si' ? econ.allowsDiscountedEnrollment : false } })}>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </Select>
              </div>

              {econ.requiresEnrollmentFee && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Precio de inscripción *</label>
                    <Input type="number" value={econ.enrollmentFee} placeholder="Ej: 25000"
                      onChange={(e) => setForm({ ...form, economy: { ...econ, enrollmentFee: Number(e.target.value) || 0 } })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">¿Permite descuento en la inscripción?</label>
                    <Select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      value={econ.allowsDiscountedEnrollment ? 'si' : 'no'}
                      onChange={(e) => setForm({ ...form, economy: { ...econ, allowsDiscountedEnrollment: e.target.value === 'si' } })}>
                      <option value="si">Sí</option>
                      <option value="no">No</option>
                    </Select>
                  </div>
                  {econ.allowsDiscountedEnrollment && (
                    <div className="rounded-xl border border-slate-200 p-3 sm:col-span-2 dark:border-slate-700">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Descuentos permitidos (%)</label>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {econ.allowedEnrollmentDiscountPercentages.map((p) => (
                          <span key={p} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                            {p}%
                            <button type="button" onClick={() => removeDiscount(p)} className="text-blue-400 hover:text-red-500">×</button>
                          </span>
                        ))}
                        <div className="flex gap-1">
                          <Input className="w-20" type="number" placeholder="Ej: 15" value={discountInput}
                            onChange={(e) => setDiscountInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') addDiscount() }} />
                          <Button variant="outline" size="sm" onClick={addDiscount}>+</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Modalidad de pago *</label>
                  <Select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    value={econ.paymentMode}
                    onChange={(e) => setForm({
                      ...form,
                      economy: {
                        ...econ,
                        paymentMode: e.target.value,
                        installmentCount: e.target.value === 'single' ? 1 : econ.installmentCount,
                        installmentFrequencyMonths: e.target.value === 'monthly' ? 1 : econ.installmentFrequencyMonths,
                      },
                    })}>
                    <option value="">Seleccionar modalidad…</option>
                    <option value="single">Pago único</option>
                    <option value="monthly">Mensual</option>
                    <option value="fixed_installments">Cuotas fijas</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">{isSingle ? 'Precio total *' : 'Precio por cuota *'}</label>
                  <Input type="number" value={econ.installmentAmount} onChange={(e) => setForm({ ...form, economy: { ...econ, installmentAmount: Number(e.target.value) || 0 } })} />
                </div>

                {!isSingle && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Cant. cuotas</label>
                    {showDerivedCount ? (
                      <>
                        <Input type="number" value={derivedCount ?? ''} disabled />
                        <p className="mt-1 text-[11px] text-slate-400">Derivada de la duración ({durationMonths} meses)</p>
                      </>
                    ) : (
                      <Input type="number" value={econ.installmentCount ?? ''} onChange={(e) => setForm({ ...form, economy: { ...econ, installmentCount: e.target.value === '' ? '' : Number(e.target.value) } })} />
                    )}
                  </div>
                )}
                {!isSingle && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Día de vencimiento</label>
                    <Input type="number" value={econ.installmentDueDayOfMonth ?? ''} onChange={(e) => setForm({ ...form, economy: { ...econ, installmentDueDayOfMonth: e.target.value === '' ? '' : Number(e.target.value) } })} />
                  </div>
                )}
                {econ.paymentMode === 'fixed_installments' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Frecuencia (meses)</label>
                    <Input type="number" value={econ.installmentFrequencyMonths ?? ''} onChange={(e) => setForm({ ...form, economy: { ...econ, installmentFrequencyMonths: e.target.value === '' ? '' : Number(e.target.value) } })} />
                  </div>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={econ.allowsFinancing}
                  onChange={(e) => setForm({ ...form, economy: { ...econ, allowsFinancing: e.target.checked } })} />
                Permitir financiación en más cuotas
              </label>
              {econ.allowsFinancing && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Cuotas máx. de financiación</label>
                  <Input type="number" value={econ.financingMaxInstallments ?? ''}
                    onChange={(e) => setForm({ ...form, economy: { ...econ, financingMaxInstallments: Number(e.target.value) || null } })} />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={save}>{editing ? 'Guardar' : 'Crear formación'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)} title="Desactivar formación"
        message={`¿Desactivar "${deleting?.name}"? Las comisiones existentes se mantienen.`}
        confirmText="Desactivar" variant="danger" loading={saving} onConfirm={deactivate} />

      <Modal open={categoriesOpen} onClose={() => setCategoriesOpen(false)} title="Categorías de Formación"
        description="Administrá las categorías. Las inactivas se conservan para las formaciones que las usan." className="sm:max-w-2xl">
        <div className="space-y-4 px-5 py-4 sm:px-6">
          {catError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">{catError}</p>}

          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={openCategoryCreate}>+ Nueva categoría</Button>
          </div>

          {catFormOpen && (
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Nombre *</label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveCategory() }} />
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="outline" size="sm"
                  onClick={() => { setCatFormOpen(false); setCatEditing(null); setCatName(''); setCatError('') }}>Cancelar</Button>
                <Button variant="primary" size="sm" loading={catSaving} onClick={saveCategory}>
                  {catEditing ? 'Guardar' : 'Crear categoría'}
                </Button>
              </div>
            </div>
          )}

          {categoriesQuery.isLoading && <div className="flex justify-center py-8 text-slate-400"><Spinner /></div>}
          {!categoriesQuery.isLoading && categories.length === 0 && (
            <EmptyState icon="🏷️" title="Sin categorías" description="Creá la primera categoría de formación." />
          )}
          {!categoriesQuery.isLoading && categories.length > 0 && (
            <div className="overflow-x-auto scrollbar-hide rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Formaciones</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {categories.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{c.name}</td>
                      <td className="px-4 py-3 text-slate-500">{c.trainingCount}</td>
                      <td className="px-4 py-3">{c.isActive ? <Badge variant="success">Activa</Badge> : <Badge variant="default">Inactiva</Badge>}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openCategoryEdit(c)}>Editar</Button>
                          <Button variant={c.isActive ? 'danger' : 'outline'} size="sm" onClick={() => (c.isActive ? setCatDeleting(c) : toggleCategory(c))}>
                            {c.isActive ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal open={!!catDeleting} onClose={() => setCatDeleting(null)} title="Desactivar categoría"
        message={`¿Desactivar "${catDeleting?.name}"? Las formaciones que la usan la mantienen visible.`}
        confirmText="Desactivar" variant="danger" loading={catSaving} onConfirm={deactivateCategory} />
    </div>
  )
}