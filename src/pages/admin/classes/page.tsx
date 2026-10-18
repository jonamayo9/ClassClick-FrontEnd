import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { apiService, getApiError } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Select } from '@/components/ui/select'
import { ActionMenu } from '@/components/ui/action-menu'
import { Pagination } from '@/components/ui/pagination'
import { TimePicker } from '@/components/ui/date-picker'
import {
  BookOpen, CalendarDays, CheckCircle2, Clock, Pencil, Plus, Power, PowerOff,
  RotateCcw, Search, Trash2, UserRound,
} from 'lucide-react'

interface ClassItem {
  id: string
  courseId?: string
  courseName?: string
  teacherId?: string
  teacherName?: string
  dayOfWeek?: string
  startTime?: string
  endTime?: string
  isActive: boolean
}

interface ClassListResponse {
  items: ClassItem[]
  totalCount: number
  page: number
  pageSize: number
}

interface ClassesSummary {
  totalClasses: number
  activeClasses: number
  inactiveClasses: number
  coursesWithClasses: number
}

interface Course { id: string; name: string }
interface Teacher { id: string; firstName: string; lastName: string; role?: string }

interface ClassFormState {
  courseId: string
  teacherId: string
  dayOfWeek: string
  startTime: string
  endTime: string
}

const DAY_LABELS: Record<string, string> = {
  Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles',
  Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado', Sunday: 'Domingo',
}
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const EMPTY_FORM: ClassFormState = { courseId: '', teacherId: '', dayOfWeek: 'Monday', startTime: '', endTime: '' }

function useSlug() { return useAuth((s) => s.activeCompanySlug ?? '') }

function formatTime(t?: string): string {
  return t ? t.slice(0, 5) : ''
}

function dayLabel(day?: string): string {
  return day ? (DAY_LABELS[day] ?? day) : '—'
}

function validateForm(form: ClassFormState): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.courseId) errors.courseId = 'Seleccioná un curso.'
  if (!form.teacherId) errors.teacherId = 'Seleccioná un profesor.'
  if (!form.startTime) errors.startTime = 'El horario de inicio es obligatorio.'
  if (!form.endTime) errors.endTime = 'El horario de fin es obligatorio.'
  if (form.startTime && form.endTime && form.endTime <= form.startTime) {
    errors.endTime = 'El fin debe ser posterior al inicio.'
  }
  return errors
}

type KpiTone = 'blue' | 'green' | 'slate' | 'cyan'

const kpiTones: Record<KpiTone, { icon: string; text: string }> = {
  blue: { icon: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400', text: 'text-blue-600 dark:text-blue-400' },
  green: { icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400', text: 'text-emerald-600 dark:text-emerald-400' },
  slate: { icon: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', text: 'text-slate-500 dark:text-slate-400' },
  cyan: { icon: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400', text: 'text-cyan-600 dark:text-cyan-400' },
}

function ClassesPageInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const slug = useSlug()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [teacherFilter, setTeacherFilter] = useState('')
  const [dayFilter, setDayFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const searchTimer = useRef<number | undefined>(undefined)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<ClassFormState>(EMPTY_FORM)
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})
  const [editClass, setEditClass] = useState<ClassItem | null>(null)
  const [editForm, setEditForm] = useState<ClassFormState>(EMPTY_FORM)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [deleteClass, setDeleteClass] = useState<ClassItem | null>(null)
  const [deactivateClass, setDeactivateClass] = useState<ClassItem | null>(null)

  const debouncedSearch = (value: string) => {
    clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => { setSearch(value); setPage(1) }, 300)
  }

  useEffect(() => () => clearTimeout(searchTimer.current), [])

  const summaryQuery = useQuery({
    queryKey: ['admin-classes', 'summary', slug],
    queryFn: () => apiService.get<ClassesSummary>(`/api/admin/${slug}/classes/summary`),
    enabled: !!slug,
  })

  const listQuery = useQuery({
    queryKey: ['admin-classes', 'paged', slug, search, courseFilter, teacherFilter, dayFilter, statusFilter, page, pageSize],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (courseFilter) params.set('courseId', courseFilter)
      if (teacherFilter) params.set('teacherId', teacherFilter)
      if (dayFilter) params.set('day', dayFilter)
      if (statusFilter) params.set('status', statusFilter)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      return apiService.get<ClassListResponse>(`/api/admin/${slug}/classes/paged?${params}`)
    },
    enabled: !!slug,
    placeholderData: (prev) => prev,
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['admin-courses', slug],
    queryFn: () => apiService.get<Course[]>(`/api/admin/${slug}/courses`),
    enabled: !!slug,
    select: (d: unknown) => { if (Array.isArray(d)) return d as Course[]; const r = d as { items?: Course[]; data?: Course[] }; return r.items ?? r.data ?? [] },
  })

  const { data: teachers = [] } = useQuery({
    queryKey: ['admin-teachers', slug],
    queryFn: () => apiService.get<Teacher[]>(`/api/admin/${slug}/teachers`),
    enabled: !!slug,
    select: (d: unknown) => { if (Array.isArray(d)) return d as Teacher[]; const r = d as { items?: Teacher[]; data?: Teacher[] }; return r.items ?? r.data ?? [] },
  })

  const classes = listQuery.data?.items ?? []
  const totalCount = listQuery.data?.totalCount ?? 0
  const summary = summaryQuery.data
  const teacherOptions = teachers.filter((t) => (t.role ?? 'Teacher') === 'Teacher')
  const hasFilters = !!search || !!courseFilter || !!teacherFilter || !!dayFilter || !!statusFilter

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ['admin-classes'] })
    qc.invalidateQueries({ queryKey: ['admin-courses'] })
    qc.invalidateQueries({ queryKey: ['admin-courses-paged'] })
    qc.invalidateQueries({ queryKey: ['admin-courses-summary'] })
  }

  const createMutation = useMutation({
    mutationFn: (form: ClassFormState) => apiService.post(`/api/admin/${slug}/classes`, form),
    onSuccess: () => {
      invalidateAll()
      setCreateOpen(false)
      setCreateForm(EMPTY_FORM)
      setCreateErrors({})
      toast('Clase creada.')
    },
    onError: (e) => toast(getApiError(e), 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: ClassFormState }) =>
      apiService.put(`/api/admin/${slug}/classes/${id}`, form),
    onSuccess: () => {
      invalidateAll()
      setEditClass(null)
      setEditErrors({})
      toast('Clase actualizada.')
    },
    onError: (e) => toast(getApiError(e), 'error'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiService.patch(`/api/admin/${slug}/classes/${id}/active`, { isActive }),
    onSuccess: () => { invalidateAll(); setDeactivateClass(null); toast('Estado actualizado.') },
    onError: (e) => { setDeactivateClass(null); toast(getApiError(e), 'error') },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.del(`/api/admin/${slug}/classes/${id}`),
    onSuccess: () => { invalidateAll(); setDeleteClass(null); toast('Clase eliminada.') },
    onError: (e) => { setDeleteClass(null); toast(getApiError(e), 'error') },
  })

  function openCreate() {
    setCreateForm(EMPTY_FORM)
    setCreateErrors({})
    setCreateOpen(true)
  }

  function openEdit(c: ClassItem) {
    setEditForm({
      courseId: c.courseId ?? '',
      teacherId: c.teacherId ?? '',
      dayOfWeek: c.dayOfWeek ?? 'Monday',
      startTime: formatTime(c.startTime),
      endTime: formatTime(c.endTime),
    })
    setEditErrors({})
    setEditClass(c)
  }

  function submitCreate(e: React.FormEvent) {
    e.preventDefault()
    const errors = validateForm(createForm)
    setCreateErrors(errors)
    if (Object.keys(errors).length > 0) return
    createMutation.mutate(createForm)
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editClass) return
    const errors = validateForm(editForm)
    setEditErrors(errors)
    if (Object.keys(errors).length > 0) return
    updateMutation.mutate({ id: editClass.id, form: editForm })
  }

  function handleToggle(c: ClassItem) {
    if (c.isActive) setDeactivateClass(c)
    else toggleMutation.mutate({ id: c.id, isActive: true })
  }

  function clearFilters() {
    clearTimeout(searchTimer.current)
    setSearchInput('')
    setSearch('')
    setCourseFilter('')
    setTeacherFilter('')
    setDayFilter('')
    setStatusFilter('')
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-white sm:text-[26px]">Clases</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-[13px]">Administrá los días y horarios de las clases de tus cursos.</p>
        </div>
        <div className="hidden shrink-0 sm:flex">
          <Button className="h-10 bg-blue-600 text-white hover:bg-blue-500" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nueva clase
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3.5">
        <KpiCard icon={CalendarDays} tone="blue" value={summary?.totalClasses ?? 0} label="Total clases" />
        <KpiCard icon={CheckCircle2} tone="green" value={summary?.activeClasses ?? 0} label="Clases activas" />
        <KpiCard icon={PowerOff} tone="slate" value={summary?.inactiveClasses ?? 0} label="Clases inactivas" />
        <KpiCard icon={BookOpen} tone="cyan" value={summary?.coursesWithClasses ?? 0} label="Cursos con clases" />
      </div>

      <div className="sm:hidden">
        <Button className="h-11 w-full bg-blue-600 text-white hover:bg-blue-500" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nueva clase
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div className="relative min-w-0 lg:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); debouncedSearch(e.target.value) }}
              placeholder="Buscar por curso o profesor..."
              autoComplete="off"
              className="pl-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:w-[40rem]">
            <Select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1) }} aria-label="Filtro por curso">
              <option value="">Todos los cursos</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select value={teacherFilter} onChange={(e) => { setTeacherFilter(e.target.value); setPage(1) }} aria-label="Filtro por profesor">
              <option value="">Todos los profesores</option>
              {teacherOptions.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
            </Select>
            <Select value={dayFilter} onChange={(e) => { setDayFilter(e.target.value); setPage(1) }} aria-label="Filtro por día">
              <option value="">Todos los días</option>
              {DAYS.map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
            </Select>
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} aria-label="Filtro por estado">
              <option value="">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </Select>
          </div>
          <Button variant="outline" className="h-11 shrink-0" onClick={clearFilters} disabled={!hasFilters}>
            <RotateCcw className="h-4 w-4" /> Limpiar
          </Button>
        </div>

        <div className="mt-3.5 border-t border-slate-100 pt-3.5 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {totalCount} {totalCount === 1 ? 'clase' : 'clases'} {hasFilters ? 'encontradas' : 'en total'}
          </span>
        </div>
      </Card>

      {/* Listing */}
      <Card className="p-4 sm:p-6">
        {listQuery.isLoading ? (
          <ClassesSkeleton />
        ) : listQuery.isError ? (
          <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            No se pudieron cargar las clases. Intentá nuevamente.
          </div>
        ) : classes.length === 0 ? (
          <EmptyState
            icon="📅"
            title={hasFilters ? 'Sin resultados' : 'Todavía no hay clases'}
            description={hasFilters ? 'Probá ajustar o limpiar los filtros.' : 'Creá tu primera clase para empezar a registrar horarios.'}
            action={hasFilters ? { label: 'Limpiar filtros', onClick: clearFilters } : { label: 'Nueva clase', onClick: openCreate }}
          />
        ) : (
          <ClassTable
            classes={classes}
            onEdit={openEdit}
            onToggle={handleToggle}
            onDelete={(c) => setDeleteClass(c)}
          />
        )}

        {!listQuery.isLoading && !listQuery.isError && classes.length > 0 && (
          <div className="mt-4">
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={setPage}
              showPageNumbers
              pageSizeOptions={[10, 20, 50]}
              onPageSizeChange={(n) => { setPageSize(n); setPage(1) }}
            />
          </div>
        )}
      </Card>

      {/* Create Modal */}
      {createOpen && (
        <Modal
          open
          onClose={() => { setCreateOpen(false); setCreateErrors({}) }}
          title="Nueva clase"
          description="Cargá el curso, el profesor y el horario."
          className="sm:max-w-lg"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => { setCreateOpen(false); setCreateErrors({}) }}>Cancelar</Button>
              <Button type="submit" form="create-class-form" loading={createMutation.isPending} className="bg-blue-600 text-white hover:bg-blue-500">
                Crear clase
              </Button>
            </div>
          }
        >
          <form id="create-class-form" onSubmit={submitCreate} autoComplete="off" className="space-y-4 px-5 py-5 sm:px-6">
            <ClassFormFields
              form={createForm}
              errors={createErrors}
              courses={courses}
              teachers={teacherOptions}
              onChange={setCreateForm}
            />
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editClass && (
        <Modal
          open
          onClose={() => { setEditClass(null); setEditErrors({}) }}
          title="Editar clase"
          description={editClass.courseName ? `Curso: ${editClass.courseName}` : undefined}
          className="sm:max-w-lg"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => { setEditClass(null); setEditErrors({}) }}>Cancelar</Button>
              <Button type="submit" form="edit-class-form" loading={updateMutation.isPending} className="bg-blue-600 text-white hover:bg-blue-500">
                Guardar cambios
              </Button>
            </div>
          }
        >
          <form id="edit-class-form" onSubmit={submitEdit} autoComplete="off" className="space-y-4 px-5 py-5 sm:px-6">
            <ClassFormFields
              form={editForm}
              errors={editErrors}
              courses={courses}
              teachers={teacherOptions}
              onChange={setEditForm}
            />
          </form>
        </Modal>
      )}

      {/* Deactivate confirmation */}
      <ConfirmModal
        open={!!deactivateClass}
        onClose={() => setDeactivateClass(null)}
        title="Desactivar clase"
        message={deactivateClass
          ? `¿Desactivar la clase de ${deactivateClass.courseName || 'sin curso'} del ${dayLabel(deactivateClass.dayOfWeek)} ${formatTime(deactivateClass.startTime)}–${formatTime(deactivateClass.endTime)}? Las asistencias ya registradas no se modifican.`
          : ''}
        confirmText="Desactivar"
        variant="danger"
        loading={toggleMutation.isPending}
        onConfirm={() => { if (deactivateClass) toggleMutation.mutate({ id: deactivateClass.id, isActive: false }) }}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteClass}
        onClose={() => setDeleteClass(null)}
        title="Eliminar clase"
        message={deleteClass
          ? `¿Eliminar la clase de ${deleteClass.courseName || 'sin curso'} del ${dayLabel(deleteClass.dayOfWeek)} ${formatTime(deleteClass.startTime)}–${formatTime(deleteClass.endTime)}? Si tiene asistencias registradas no se podrá eliminar.`
          : ''}
        confirmText="Eliminar"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteClass) deleteMutation.mutate(deleteClass.id) }}
      />
    </div>
  )
}

function KpiCard({ icon: Icon, tone, value, label }: {
  icon: React.ComponentType<{ className?: string }>
  tone: KpiTone
  value: number
  label: string
}) {
  const t = kpiTones[tone]
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-[42px] sm:w-[42px] ${t.icon}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight text-slate-900 dark:text-white sm:text-2xl">{value}</p>
        <p className="text-[11px] font-medium leading-tight text-slate-500 dark:text-slate-400 sm:text-xs">{label}</p>
      </div>
    </div>
  )
}

function ClassesSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      ))}
    </div>
  )
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
      active
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
        : 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400'
    }`}>
      {active ? 'Activa' : 'Inactiva'}
    </span>
  )
}

function ClassTable({ classes, onEdit, onToggle, onDelete }: {
  classes: ClassItem[]
  onEdit: (c: ClassItem) => void
  onToggle: (c: ClassItem) => void
  onDelete: (c: ClassItem) => void
}) {
  return (
    <>
      {/* Desktop: tabla compacta */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-[0.4px] text-slate-400 dark:border-slate-800">
              <th className="px-3 py-3 font-semibold">Curso</th>
              <th className="px-3 py-3 font-semibold">Día</th>
              <th className="px-3 py-3 font-semibold">Horario</th>
              <th className="px-3 py-3 font-semibold">Profesor</th>
              <th className="px-3 py-3 text-center font-semibold">Estado</th>
              <th className="px-3 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {classes.map((c) => (
              <tr key={c.id} className="group transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-3 py-2">
                  <div className="flex min-h-[56px] items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900 dark:text-white">{c.courseName || 'Sin curso'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-[13px] text-slate-600 dark:text-slate-300">{dayLabel(c.dayOfWeek)}</td>
                <td className="px-3 py-2 text-[13px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {formatTime(c.startTime)}–{formatTime(c.endTime)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-300">
                    <UserRound className="h-3.5 w-3.5 text-slate-400" /> {c.teacherName || 'Sin profesor'}
                  </span>
                </td>
                <td className="px-3 py-2 text-center"><StatusPill active={c.isActive} /></td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <IconButton label="Editar" onClick={() => onEdit(c)}><Pencil className="h-4 w-4" /></IconButton>
                    <IconButton label={c.isActive ? 'Desactivar' : 'Activar'} onClick={() => onToggle(c)}><Power className="h-4 w-4" /></IconButton>
                    <IconButton label="Eliminar" danger onClick={() => onDelete(c)}><Trash2 className="h-4 w-4" /></IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: registros compactos (sin scroll horizontal) */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {classes.map((c) => (
          <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{c.courseName || 'Sin curso'}</p>
                <p className="mt-0.5 truncate text-xs text-slate-400">{dayLabel(c.dayOfWeek)} · {formatTime(c.startTime)}–{formatTime(c.endTime)}</p>
              </div>
              <StatusPill active={c.isActive} />
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
              <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <UserRound className="h-3 w-3 shrink-0" /> <span className="truncate">{c.teacherName || 'Sin profesor'}</span>
              </span>
              <ActionMenu actions={[
                { label: 'Editar', onClick: () => onEdit(c) },
                { label: c.isActive ? 'Desactivar' : 'Activar', onClick: () => onToggle(c) },
                { label: 'Eliminar', onClick: () => onDelete(c), danger: true },
              ]} />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function IconButton({ label, onClick, danger, children }: {
  label: string
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
        danger
          ? 'text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function ClassFormFields({ form, errors, courses, teachers, onChange }: {
  form: ClassFormState
  errors: Record<string, string>
  courses: Course[]
  teachers: Teacher[]
  onChange: (form: ClassFormState) => void
}) {
  return (
    <>
      <Field label="Curso *" error={errors.courseId}>
        <Select value={form.courseId} onChange={(e) => onChange({ ...form, courseId: e.target.value })}>
          <option value="">Seleccionar curso</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="Profesor *" error={errors.teacherId}>
        <Select value={form.teacherId} onChange={(e) => onChange({ ...form, teacherId: e.target.value })}>
          <option value="">Seleccionar profesor</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
        </Select>
      </Field>
      <Field label="Día">
        <Select value={form.dayOfWeek} onChange={(e) => onChange({ ...form, dayOfWeek: e.target.value })}>
          {DAYS.map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Hora de inicio" error={errors.startTime}>
          <TimePicker value={form.startTime} onChange={(v) => onChange({ ...form, startTime: v })} />
        </Field>
        <Field label="Hora de fin" error={errors.endTime}>
          <TimePicker value={form.endTime} onChange={(v) => onChange({ ...form, endTime: v })} />
        </Field>
      </div>
    </>
  )
}

export default function ClassesPage() { return <ToastProvider><ClassesPageInner /></ToastProvider> }
