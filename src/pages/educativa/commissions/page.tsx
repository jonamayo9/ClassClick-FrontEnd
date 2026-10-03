import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { apiService, getApiError } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DatePicker, TimePicker } from '@/components/ui/date-picker'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { Pagination } from '@/components/ui/pagination'
import { ActionMenu } from '@/components/ui/action-menu'
import { fmtDate, PagedResult, EducativaCommission, EducativaTraining, EducativaDocente, scheduleSummary, normalizeDayOfWeek } from '../types'

interface CompensationPayload {
  compensationType: string
  value: number
}

interface ScheduleRow {
  dayOfWeek: string
  startTime: string
  endTime: string
}

interface ScheduleWire {
  dayOfWeek: number
  startTime: string
  endTime: string
}

interface CommissionForm {
  trainingId: string
  trainingCountryConfigId: string
  name: string
  startDate: string
  endDate: string
  capacity: number | null
  docenteUserId?: string | null
  compensation?: CompensationPayload | null
  schedules: ScheduleRow[]
}

interface CommissionPayload extends Omit<CommissionForm, 'schedules'> {
  schedules: ScheduleWire[]
  isActive?: boolean
}

const DAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

const AVAILABILITY_LABEL: Record<string, string> = {
  sin_limite: 'Sin límite',
  con_lugares: 'Con lugares',
  completa: 'Completa',
}

function temporalBadge(status: string) {
  switch (status) {
    case 'ongoing': return <Badge variant="success">En curso</Badge>
    case 'ends_today': return <Badge variant="warning">Finaliza hoy</Badge>
    case 'finished': return <Badge variant="default">Finalizada</Badge>
    case 'upcoming': return <Badge variant="info">Próxima</Badge>
    default: return null
  }
}

function scheduleError(rows: ScheduleRow[]): string | null {
  const complete: ScheduleRow[] = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const anySet = r.dayOfWeek !== '' || r.startTime !== '' || r.endTime !== ''
    if (!anySet) continue
    if (r.dayOfWeek === '' || !r.startTime || !r.endTime) {
      return `Completá día, hora desde y hora hasta en el horario ${i + 1}.`
    }
    if (r.startTime >= r.endTime) {
      return `El horario de fin debe ser posterior al de inicio (horario ${i + 1}).`
    }
    complete.push(r)
  }
  if (complete.length === 0) return 'Agregá al menos un día y horario de cursada.'
  for (let i = 0; i < complete.length; i++) {
    for (let j = i + 1; j < complete.length; j++) {
      const a = complete[i]
      const b = complete[j]
      if (a.dayOfWeek !== b.dayOfWeek) continue
      if (a.startTime === b.startTime && a.endTime === b.endTime) {
        return 'No podés repetir el mismo día y horario de cursada.'
      }
      if (a.startTime < b.endTime && b.startTime < a.endTime) {
        return 'Los horarios de cursada no pueden solaparse en el mismo día.'
      }
    }
  }
  return null
}

function CommissionActions({ c, slug, onEdit, onToggle }: {
  c: EducativaCommission
  slug: string
  onEdit: (c: EducativaCommission) => void
  onToggle: (c: EducativaCommission) => void
}) {
  const navigate = useNavigate()
  return (
    <ActionMenu actions={[
      { label: 'Ver alumnos', onClick: () => navigate(`/educativa/${slug}/commissions/${c.id}/enrollments`) },
      { label: 'Editar', onClick: () => onEdit(c) },
      { label: c.isActive ? 'Desactivar' : 'Activar', onClick: () => onToggle(c) },
    ]} />
  )
}

function CommissionsInner() {
  const { companySlug } = useParams<{ companySlug: string }>()
  const slug = companySlug ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [trainingFilter, setTrainingFilter] = useState('')
  const [docenteFilter, setDocenteFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('')
  const [temporalFilter, setTemporalFilter] = useState('')
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [editing, setEditing] = useState<EducativaCommission | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<CommissionForm>({
    trainingId: '', trainingCountryConfigId: '', name: '', startDate: '', endDate: '',
    capacity: null, docenteUserId: null, compensation: null,
    schedules: [{ dayOfWeek: '', startTime: '', endTime: '' }],
  })
  const [deleting, setDeleting] = useState<EducativaCommission | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const trainingsQuery = useQuery({
    queryKey: ['educativa-trainings', slug],
    queryFn: () => apiService.get<EducativaTraining[]>(`/api/educativa/${slug}/trainings`),
    enabled: !!slug,
    retry: false,
  })
  const trainings = trainingsQuery.data ?? []

  const docentesQuery = useQuery({
    queryKey: ['educativa-docentes', slug],
    queryFn: () => apiService.get<EducativaDocente[]>(`/api/educativa/${slug}/docentes`),
    enabled: !!slug,
    retry: false,
  })
  const docentes = docentesQuery.data ?? []

  const trainingDetailQuery = useQuery({
    queryKey: ['educativa-training', slug, form.trainingId],
    queryFn: () => apiService.get<EducativaTraining>(`/api/educativa/${slug}/trainings/${form.trainingId}`),
    enabled: !!slug && !!form.trainingId && (modalOpen || !editing),
    retry: false,
  })
  const countries = trainingDetailQuery.data?.countries ?? []

  // Argentina se resuelve automáticamente: al elegir la formación, se toma la config AR.
  useEffect(() => {
    if (editing || !countries.length) return
    if (form.trainingCountryConfigId) return
    const ar = countries.find((c) => c.countryCode === 'AR')
    if (ar) setForm((prev) => ({ ...prev, trainingCountryConfigId: ar.id }))
  }, [countries, editing, form.trainingCountryConfigId])

  const arConfig = countries.find((c) => c.countryCode === 'AR')

  const params = new URLSearchParams({ page: String(page), pageSize: '15' })
  if (search) params.set('search', search)
  if (trainingFilter) params.set('trainingId', trainingFilter)
  if (docenteFilter) params.set('docenteId', docenteFilter)
  if (activeFilter) params.set('isActive', activeFilter)
  if (availabilityFilter) params.set('availability', availabilityFilter)
  if (temporalFilter) params.set('temporalStatus', temporalFilter)

  const query = useQuery({
    queryKey: ['educativa-commissions', slug, search, trainingFilter, docenteFilter, activeFilter, availabilityFilter, temporalFilter, page],
    queryFn: () => apiService.get<PagedResult<EducativaCommission>>(`/api/educativa/${slug}/commissions?${params}`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['educativa-commissions', slug] })

  const emptySchedules = (): ScheduleRow[] => [{ dayOfWeek: '', startTime: '', endTime: '' }]

  const openCreate = () => {
    setEditing(null)
    setForm({
      trainingId: '', trainingCountryConfigId: '', name: '', startDate: '', endDate: '',
      capacity: null, docenteUserId: null, compensation: null, schedules: emptySchedules(),
    })
    setError('')
    setModalOpen(true)
  }

  const openEdit = (c: EducativaCommission) => {
    setEditing(c)
    const schedules: ScheduleRow[] = (c.schedules ?? []).filter((s) => s.isActive).length > 0
      ? (c.schedules ?? []).filter((s) => s.isActive).map((s) => ({
        dayOfWeek: String(normalizeDayOfWeek(s.dayOfWeek)),
        startTime: s.startTime.slice(0, 5),
        endTime: s.endTime.slice(0, 5),
      }))
      : emptySchedules()
    setForm({
      trainingId: c.trainingId, trainingCountryConfigId: c.trainingCountryConfigId, name: c.name,
      startDate: c.startDate, endDate: c.endDate, capacity: c.capacity,
      docenteUserId: c.docenteUserId ?? null,
      compensation: c.compensation?.compensationType ? { compensationType: c.compensation.compensationType, value: c.compensation.value ?? 0 } : null,
      schedules,
    })
    setError('')
    setModalOpen(true)
  }

  const addScheduleRow = () => setForm((prev) => ({ ...prev, schedules: [...prev.schedules, { dayOfWeek: '', startTime: '', endTime: '' }] }))
  const removeScheduleRow = (idx: number) => setForm((prev) => ({ ...prev, schedules: prev.schedules.filter((_, i) => i !== idx) }))
  const updateScheduleRow = (idx: number, patch: Partial<ScheduleRow>) =>
    setForm((prev) => ({ ...prev, schedules: prev.schedules.map((row, i) => (i === idx ? { ...row, ...patch } : row)) }))

  async function save() {
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    if (!form.trainingId) { setError('Seleccioná una Formación.'); return }
    if (!form.trainingCountryConfigId) { setError('Seleccioná la configuración económica.'); return }
    if (!form.startDate || !form.endDate) { setError('Indicá fecha de inicio y fin.'); return }
    if (form.endDate < form.startDate) { setError('La fecha de fin no puede ser anterior al inicio.'); return }
    const sErr = scheduleError(form.schedules)
    if (sErr) { setError(sErr); return }
    setSaving(true)
    setError('')
    try {
      const schedules: ScheduleWire[] = form.schedules
        .filter((s) => s.dayOfWeek !== '' && s.startTime && s.endTime)
        .map((s) => ({ dayOfWeek: Number(s.dayOfWeek), startTime: s.startTime, endTime: s.endTime }))
      const payload: CommissionPayload = {
        ...form,
        name: form.name.trim(),
        capacity: form.capacity == null ? null : Number(form.capacity) || 1,
        schedules,
      }
      if (editing) {
        await apiService.put(`/api/educativa/${slug}/commissions/${editing.id}`, { ...payload, isActive: editing.isActive })
      } else {
        await apiService.post(`/api/educativa/${slug}/commissions`, payload)
      }
      setModalOpen(false)
      invalidate()
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function toggle(c: EducativaCommission) {
    try {
      await apiService.put(`/api/educativa/${slug}/commissions/${c.id}`, {
        name: c.name, startDate: c.startDate, endDate: c.endDate, capacity: c.capacity,
        isActive: !c.isActive, docenteUserId: c.docenteUserId ?? null,
      })
      invalidate()
    } catch { /* ignore */ }
  }

  async function deactivate() {
    if (!deleting) return
    setSaving(true)
    try {
      await apiService.del(`/api/educativa/${slug}/commissions/${deleting.id}`)
      setDeleting(null)
      invalidate()
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  async function exportExcel() {
    setExporting(true)
    try {
      const p = new URLSearchParams()
      if (search) p.set('search', search)
      if (trainingFilter) p.set('trainingId', trainingFilter)
      if (docenteFilter) p.set('docenteId', docenteFilter)
      if (activeFilter) p.set('isActive', activeFilter)
      if (availabilityFilter) p.set('availability', availabilityFilter)
      if (temporalFilter) p.set('temporalStatus', temporalFilter)
      const blob = await apiService.getBlob(`/api/educativa/${slug}/commissions/export?${p}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'comisiones-educativa.xlsx'; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast(getApiError(err) || 'Error al exportar.', 'error')
    } finally {
      setExporting(false)
    }
  }

  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const secondaryActiveCount = [trainingFilter, docenteFilter, activeFilter, availabilityFilter, temporalFilter].filter(Boolean).length

  const resetFilters = () => {
    setSearch(''); setSearchInput(''); setTrainingFilter(''); setDocenteFilter(''); setActiveFilter(''); setAvailabilityFilter(''); setTemporalFilter(''); setPage(1)
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Académico</p>
            <h1 className="mt-1 text-xl font-black sm:text-2xl">Comisiones</h1>
            <p className="mt-1 text-sm text-blue-200">Cursadas con horarios recurrentes, cupo, docente y compensación.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50" onClick={openCreate}>
              <svg className="mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v14M5 12h14" />
              </svg>
              Nueva comisión
            </Button>
            <Button size="sm" className="bg-white/15 text-white hover:bg-white/25" loading={exporting} onClick={exportExcel}>Exportar</Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <MiniStat label="Total" value={String(total)} />
          <MiniStat label="Activas" value={String(items.filter((c) => c.isActive).length)} />
          <MiniStat label="Cupo" value={items.reduce((a, c) => a + (c.capacity ?? 0), 0) === 0 ? 'Sin límite' : `${items.reduce((a, c) => a + c.activeEnrollments, 0)}/${items.reduce((a, c) => a + (c.capacity ?? 0), 0)}`} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-[180px]" placeholder="Buscar comisión…" value={searchInput}
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
          <div className="grid gap-2 sm:grid-cols-3">
            <Select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              value={trainingFilter} onChange={(e) => { setTrainingFilter(e.target.value); setPage(1) }}>
              <option value="">Todas las formaciones</option>
              {trainings.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <Select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              value={docenteFilter} onChange={(e) => { setDocenteFilter(e.target.value); setPage(1) }}>
              <option value="">Todos los docentes</option>
              {docentes.map((d) => <option key={d.userId} value={d.userId}>{d.fullName}</option>)}
            </Select>
            <Select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }}>
              <option value="">Todos los estados</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </Select>
            <Select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              value={availabilityFilter} onChange={(e) => { setAvailabilityFilter(e.target.value); setPage(1) }}>
              <option value="">Toda disponibilidad</option>
              <option value="con_lugares">Con lugares</option>
              <option value="completa">Completa</option>
              <option value="sin_limite">Sin límite</option>
            </Select>
            <Select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              value={temporalFilter} onChange={(e) => { setTemporalFilter(e.target.value); setPage(1) }}>
              <option value="">Toda situación</option>
              <option value="upcoming">Próxima</option>
              <option value="ongoing">En curso</option>
              <option value="ends_today">Finaliza hoy</option>
              <option value="finished">Finalizada</option>
            </Select>
          </div>
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={resetFilters}>Limpiar filtros</Button>
          </div>
        </div>
      )}

      {query.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner /></div>}
      {query.isError && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">No se pudieron cargar las comisiones.</p>}
      {!query.isLoading && !query.isError && items.length === 0 && (
        <Card><EmptyState icon="🎓" title="Sin comisiones" description="Creá una comisión para inscribir alumnos." /></Card>
      )}

      {!query.isLoading && !query.isError && items.length > 0 && (
        <>
          <div className="hidden overflow-x-auto md:block">
            <Card className="p-0">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="px-4 py-3">Comisión</th>
                    <th className="px-4 py-3">Formación</th>
                    <th className="px-4 py-3">Docente</th>
                    <th className="px-4 py-3">Cursada</th>
                    <th className="px-4 py-3">Inicio</th>
                    <th className="px-4 py-3">Fin</th>
                    <th className="px-4 py-3">Cupo</th>
                    <th className="px-4 py-3">Ocupación</th>
                    <th className="px-4 py-3">Situación</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((c) => (
                    <tr key={c.id} className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</p>
                        <p className="text-xs text-slate-400">{c.currency} · {c.countryCode}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.trainingName}</td>
                      <td className="px-4 py-3 text-slate-500">{c.docenteName || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{scheduleSummary(c.schedules) || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">{fmtDate(c.startDate)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">{fmtDate(c.endDate)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.capacity ?? 'Sin límite'}</td>
                      <td className="px-4 py-3 text-slate-500">{c.activeEnrollments}/{c.capacity ?? 'sin límite'}</td>
                      <td className="px-4 py-3">{temporalBadge(c.temporalStatus)}</td>
                      <td className="px-4 py-3">{c.isActive ? <Badge variant="success">Activa</Badge> : <Badge variant="default">Inactiva</Badge>}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <CommissionActions c={c} slug={slug} onEdit={openEdit} onToggle={toggle} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="space-y-3 md:hidden">
            {items.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800 dark:text-slate-200">{c.name}</p>
                    <p className="truncate text-xs text-slate-400">{c.trainingName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {c.isActive ? <Badge variant="success">Activa</Badge> : <Badge variant="default">Inactiva</Badge>}
                    <CommissionActions c={c} slug={slug} onEdit={openEdit} onToggle={toggle} />
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>Cursada: <span className="text-slate-700 dark:text-slate-200">{scheduleSummary(c.schedules) || '—'}</span></span>
                  <span>Docente: {c.docenteName || '—'}</span>
                  <span>{fmtDate(c.startDate)} → {fmtDate(c.endDate)}</span>
                  <span>Ocupación: {c.activeEnrollments}/{c.capacity ?? 'sin límite'}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {temporalBadge(c.temporalStatus)}
                  <span className="text-xs text-slate-400">{AVAILABILITY_LABEL[c.availability] ?? c.availability}</span>
                </div>
              </div>
            ))}
          </div>

          <Pagination page={page} pageSize={15} totalCount={total} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar comisión' : 'Nueva comisión'} className="sm:max-w-2xl">
        <div className="space-y-4 px-5 py-4 sm:px-6">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">{error}</p>}
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Nombre *</label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Formación *</label>
              <Select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                value={form.trainingId}
                disabled={!!editing}
                onChange={(e) => setForm({ ...form, trainingId: e.target.value, trainingCountryConfigId: '' })}>
                <option value="">Seleccionar…</option>
                {trainings.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Configuración económica</label>
              {arConfig ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                  Argentina (ARS) · matrícula {arConfig.enrollmentFee} · {arConfig.installmentCount ?? 1} {arConfig.paymentMode === 'single' ? 'pago único' : 'cuotas'} de {arConfig.installmentAmount}
                </p>
              ) : (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                  Sin configuración económica. Configurala en la formación.
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Inicio *</label>
              <DatePicker value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Fin *</label>
              <DatePicker value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Cupo</label>
              <div className="flex gap-2">
                <Input type="number" value={form.capacity ?? ''} placeholder="Sin límite"
                  onChange={(e) => setForm({ ...form, capacity: e.target.value === '' ? null : Number(e.target.value) })} />
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => setForm({ ...form, capacity: null })}>Sin límite</Button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Docente</label>
              <Select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                value={form.docenteUserId ?? ''}
                onChange={(e) => setForm({ ...form, docenteUserId: e.target.value || null })}>
                <option value="">Sin docente</option>
                {docentes.map((d) => <option key={d.userId} value={d.userId}>{d.fullName}</option>)}
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Días y horarios de cursada *</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Uno o varios horarios recurrentes. Son la fuente del módulo Clases.</p>
            <div className="mt-3 space-y-2">
              {form.schedules.map((row, idx) => (
                <div key={idx} className="grid grid-cols-2 items-start gap-2 sm:grid-cols-[1fr_1.2fr_1.2fr_auto]">
                  <Select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    value={row.dayOfWeek}
                    onChange={(e) => updateScheduleRow(idx, { dayOfWeek: e.target.value })}>
                    <option value="">Día…</option>
                    {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </Select>
                  <TimePicker value={row.startTime} placeholder="Desde" onChange={(v) => updateScheduleRow(idx, { startTime: v })} />
                  <TimePicker value={row.endTime} placeholder="Hasta" onChange={(v) => updateScheduleRow(idx, { endTime: v })} />
                  <button type="button" onClick={() => removeScheduleRow(idx)}
                    className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                    aria-label="Quitar horario">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={addScheduleRow}>+ Agregar día/horario</Button>
          </div>

          <CompensationFields form={form} onChange={(c) => setForm({ ...form, compensation: c })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={save}>Guardar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)} title="Desactivar comisión"
        message={`¿Desactivar "${deleting?.name}"? No se elimina el historial.`}
        confirmText="Desactivar" variant="danger" loading={saving} onConfirm={deactivate} />
    </div>
  )
}

function CompensationFields({ form, onChange }: {
  form: CommissionForm
  onChange: (compensation: CompensationPayload | null) => void
}) {
  const enabled = !!form.compensation?.compensationType
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={enabled}
          onChange={(e) => onChange(e.target.checked ? { compensationType: 'PercentagePerStudent', value: 0 } : null)} />
        Configurar compensación del docente por alumno
      </label>
      {enabled && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Modalidad</label>
            <Select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              value={form.compensation?.compensationType}
              onChange={(e) => onChange({ compensationType: e.target.value, value: form.compensation?.value ?? 0 })}>
              <option value="PercentagePerStudent">Porcentaje por alumno</option>
              <option value="FixedAmountPerStudent">Importe fijo por alumno</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
              {form.compensation?.compensationType === 'PercentagePerStudent' ? 'Porcentaje (%)' : 'Importe fijo'}
            </label>
            <Input type="number" value={form.compensation?.value ?? 0}
              onChange={(e) => onChange({ compensationType: form.compensation?.compensationType ?? 'PercentagePerStudent', value: Number(e.target.value) || 0 })} />
          </div>
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white/15 p-3 backdrop-blur-sm">
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs text-blue-200">{label}</div>
    </div>
  )
}

export function EducativaCommissionsPage() {
  return (
    <ToastProvider>
      <CommissionsInner />
    </ToastProvider>
  )
}