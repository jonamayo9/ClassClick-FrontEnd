import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Select } from '@/components/ui/select'
import { ActionMenu } from '@/components/ui/action-menu'
import { Pagination } from '@/components/ui/pagination'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { CoursePanel, CourseThumb } from './course-panel'
import {
  BookOpen, CheckCircle2, GraduationCap, Users, Plus, Search, RotateCcw,
  Pencil, Clock, UserRound, Eye, ExternalLink,
} from 'lucide-react'

export interface CourseScheduleItem {
  day: string
  startTime: string
  endTime: string
}

export interface Course {
  id: string
  name: string
  description: string | null
  teacherId?: string
  teacherName?: string
  isActive: boolean
  isPubliclyVisible?: boolean
  publicCoverImageUrl?: string | null
  studentCount?: number
  teacherCount?: number
  classesPerWeekOptions?: number[]
  schedule?: CourseScheduleItem[]
  createdAtUtc?: string
}

interface CourseListResponse {
  items: Course[]
  totalCount: number
  page: number
  pageSize: number
}

interface CoursesSummary {
  totalCourses: number
  activeCourses: number
  assignedTeachers: number
  enrolledStudents: number
  totalStudents: number
}

interface Teacher {
  id: string
  firstName: string
  lastName: string
}

interface CourseStudent {
  studentId: string
  fullName: string
  email: string
  isAssigned: boolean
  classesPerWeek: number | null
}

interface ImportResult {
  totalRows: number
  created: number
  updated: number
  skipped: number
  errors?: string[]
}

type CoursesTab = 'courses' | 'assignments'

const STUDENTS_PAGE_SIZE = 12

const DAY_LABELS: Record<string, string> = {
  Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles',
  Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado', Sunday: 'Domingo',
}
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DAY_SHORT: Record<string, string> = {
  Monday: 'Lun', Tuesday: 'Mar', Wednesday: 'Mié',
  Thursday: 'Jue', Friday: 'Vie', Saturday: 'Sáb', Sunday: 'Dom',
}

function useSlug() {
  return useAuth((s) => s.activeCompanySlug ?? '')
}

function formatClasses(value: number | null | undefined) {
  if (!value) return 'Sin definir'
  return `${value} ${value === 1 ? 'clase' : 'clases'} / semana`
}

function formatTime(t?: string) {
  return t ? t.slice(0, 5) : ''
}

function scheduleDetail(schedule?: CourseScheduleItem[]) {
  if (!schedule || schedule.length === 0) return ''
  return schedule
    .map((s) => `${DAY_SHORT[s.day] ?? s.day} ${formatTime(s.startTime)}`)
    .join(' · ')
}

type KpiTone = 'blue' | 'green' | 'violet' | 'cyan'

const kpiTones: Record<KpiTone, { icon: string; text: string }> = {
  blue: { icon: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400', text: 'text-blue-600 dark:text-blue-400' },
  green: { icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400', text: 'text-emerald-600 dark:text-emerald-400' },
  violet: { icon: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400', text: 'text-violet-600 dark:text-violet-400' },
  cyan: { icon: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400', text: 'text-cyan-600 dark:text-cyan-400' },
}

function CoursesPageInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const slug = useSlug()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<CoursesTab>('courses')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [teacherFilter, setTeacherFilter] = useState('')
  const [dayFilter, setDayFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const searchTimer = useRef<number | undefined>(undefined)

  const [panelCourseId, setPanelCourseId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editCourse, setEditCourse] = useState<Course | null>(null)
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ name: '', description: '', teacherId: '' })

  const debouncedSearch = (value: string) => {
    clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => { setSearch(value); setPage(1) }, 300)
  }

  useEffect(() => () => clearTimeout(searchTimer.current), [])

  const summaryQuery = useQuery({
    queryKey: ['admin-courses-summary', slug],
    queryFn: () => apiService.get<CoursesSummary>(`/api/admin/${slug}/courses/summary`),
    enabled: !!slug,
  })

  const listQuery = useQuery({
    queryKey: ['admin-courses-paged', slug, search, statusFilter, teacherFilter, dayFilter, page, pageSize],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (teacherFilter) params.set('teacherId', teacherFilter)
      if (dayFilter) params.set('day', dayFilter)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      return apiService.get<CourseListResponse>(`/api/admin/${slug}/courses/paged?${params}`)
    },
    enabled: !!slug,
    placeholderData: (prev) => prev,
  })

  const { data: allCourses = [] } = useQuery({
    queryKey: ['admin-courses', slug],
    queryFn: () => apiService.get<Course[]>(`/api/admin/${slug}/courses`),
    enabled: !!slug,
  })

  const { data: teachers = [] } = useQuery({
    queryKey: ['admin-teachers', slug],
    queryFn: () => apiService.get<Teacher[]>(`/api/admin/${slug}/teachers`),
    enabled: !!slug,
  })

  const courses = listQuery.data?.items ?? []
  const totalCount = listQuery.data?.totalCount ?? 0
  const summary = summaryQuery.data
  const percent = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
  const panelCourse = courses.find((c) => c.id === panelCourseId)
    ?? allCourses.find((c) => c.id === panelCourseId)
    ?? null

  const createMutation = useMutation({
    mutationFn: () => apiService.post(`/api/admin/${slug}/courses`, {
      name: form.name,
      description: form.description,
      teacherId: form.teacherId,
      isActive: true,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courses-paged'] })
      qc.invalidateQueries({ queryKey: ['admin-courses-summary'] })
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      setCreateOpen(false)
      resetForm()
      toast('Curso creado.')
    },
    onError: (e) => toast(getApiError(e), 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: () => apiService.put(`/api/admin/${slug}/courses/${editCourse!.id}`, {
      name: editCourse!.name,
      description: editCourse!.description,
      teacherId: editCourse!.teacherId,
      isActive: editCourse!.isActive,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courses-paged'] })
      qc.invalidateQueries({ queryKey: ['admin-courses-summary'] })
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      setEditCourse(null)
      toast('Curso actualizado.')
    },
    onError: (e) => toast(getApiError(e), 'error'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiService.patch(`/api/admin/${slug}/courses/${id}/active`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courses-paged'] })
      qc.invalidateQueries({ queryKey: ['admin-courses-summary'] })
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      toast('Estado actualizado.')
    },
    onError: (e) => toast(getApiError(e), 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.del(`/api/admin/${slug}/courses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courses-paged'] })
      qc.invalidateQueries({ queryKey: ['admin-courses-summary'] })
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      setDeleteCourse(null)
      setPanelCourseId(null)
      toast('Curso eliminado.')
    },
    onError: (e) => toast(getApiError(e), 'error'),
  })

  function resetForm() {
    setForm({ name: '', description: '', teacherId: '' })
    setErrors({})
  }

  function openCreate() {
    resetForm()
    setCreateOpen(true)
  }

  function validate() {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'El nombre es obligatorio.'
    if (!form.teacherId) next.teacherId = 'Seleccioná un profesor.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    createMutation.mutate()
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editCourse?.name.trim()) { toast('El nombre es obligatorio.', 'error'); return }
    if (!editCourse.teacherId) { toast('Seleccioná un profesor.', 'error'); return }
    updateMutation.mutate()
  }

  function clearFilters() {
    clearTimeout(searchTimer.current)
    setSearchInput('')
    setSearch('')
    setStatusFilter('')
    setTeacherFilter('')
    setDayFilter('')
    setPage(1)
  }

  const hasFilters = !!search || !!statusFilter || !!teacherFilter || !!dayFilter
  const teacherOptions = teachers
  const activeTabCourses = allCourses.length > 0 ? allCourses : courses

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-white sm:text-[26px]">Cursos</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-[13px]">Administrá cursos, profesores y alumnos asignados.</p>
        </div>
        <div className="hidden shrink-0 sm:flex">
          <Button className="h-10 bg-blue-600 text-white hover:bg-blue-500" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo curso
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3.5">
        <KpiCard icon={BookOpen} tone="blue" value={summary?.totalCourses ?? 0} label="Total cursos" />
        <KpiCard icon={CheckCircle2} tone="green" value={summary?.activeCourses ?? 0} label="Cursos activos"
          percent={summary ? percent(summary.activeCourses, summary.totalCourses) : undefined} />
        <KpiCard icon={GraduationCap} tone="violet" value={summary?.assignedTeachers ?? 0} label="Profesores asignados" />
        <KpiCard icon={Users} tone="cyan" value={summary?.enrolledStudents ?? 0} label="Alumnos inscriptos"
          percent={summary ? percent(summary.enrolledStudents, summary.totalStudents) : undefined} />
      </div>

      <div className="sm:hidden">
        <Button className="h-11 w-full bg-blue-600 text-white hover:bg-blue-500" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuevo curso
        </Button>
      </div>

      {/* Tabs */}
      <SegmentedControl
        options={[{ value: 'courses', label: 'Cursos' }, { value: 'assignments', label: 'Asignar alumnos' }]}
        value={activeTab}
        onChange={(v) => setActiveTab(v as CoursesTab)}
      />

      {activeTab === 'courses' ? (
        <>
          {/* Filters */}
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
              <div className="relative min-w-0 lg:flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); debouncedSearch(e.target.value) }}
                  placeholder="Buscar por nombre o descripción..."
                  autoComplete="off"
                  className="pl-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:w-[30rem]">
                <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} aria-label="Filtro por estado">
                  <option value="">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </Select>
                <Select value={teacherFilter} onChange={(e) => { setTeacherFilter(e.target.value); setPage(1) }} aria-label="Filtro por profesor">
                  <option value="">Todos los profesores</option>
                  {teacherOptions.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                </Select>
                <Select value={dayFilter} onChange={(e) => { setDayFilter(e.target.value); setPage(1) }} aria-label="Filtro por día">
                  <option value="">Todos los días</option>
                  {DAYS.map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                </Select>
              </div>
              <Button variant="outline" className="h-11 shrink-0" onClick={clearFilters} disabled={!hasFilters}>
                <RotateCcw className="h-4 w-4" /> Limpiar
              </Button>
            </div>

            <div className="mt-3.5 border-t border-slate-100 pt-3.5 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {totalCount} {totalCount === 1 ? 'curso' : 'cursos'} {hasFilters ? 'encontrados' : 'en total'}
              </span>
            </div>
          </Card>

          {/* Listing */}
          <Card className="p-4 sm:p-6">
            {listQuery.isLoading ? (
              <CoursesSkeleton />
            ) : listQuery.isError ? (
              <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                No se pudieron cargar los cursos. Intentá nuevamente.
              </div>
            ) : courses.length === 0 ? (
              <EmptyState
                icon="📚"
                title={hasFilters ? 'Sin resultados' : 'Todavía no hay cursos'}
                description={hasFilters ? 'Probá ajustar o limpiar los filtros.' : 'Creá tu primer curso para empezar.'}
                action={hasFilters ? { label: 'Limpiar filtros', onClick: clearFilters } : { label: 'Nuevo curso', onClick: openCreate }}
              />
            ) : (
              <CourseTable
                courses={courses}
                onOpen={(c) => setPanelCourseId(c.id)}
                onOpenFull={(c) => navigate(`/admin/courses/${c.id}`)}
                onEdit={(c) => setEditCourse({ ...c, description: c.description ?? '' })}
                onToggle={(c) => toggleMutation.mutate({ id: c.id, isActive: !c.isActive })}
                onDelete={(c) => setDeleteCourse(c)}
              />
            )}

            {!listQuery.isLoading && !listQuery.isError && courses.length > 0 && (
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
        </>
      ) : (
        <CourseAssignmentsPanel
          slug={slug}
          courses={activeTabCourses}
          onChanged={() => {
            qc.invalidateQueries({ queryKey: ['admin-courses-paged'] })
            qc.invalidateQueries({ queryKey: ['admin-courses-summary'] })
          }}
        />
      )}

      {/* Create Modal */}
      {createOpen && (
        <Modal
          open
          onClose={() => { setCreateOpen(false); resetForm() }}
          title="Nuevo curso"
          description="Cargá el curso y asignale un profesor."
          className="sm:max-w-lg"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm() }}>Cancelar</Button>
              <Button type="submit" form="create-course-form" loading={createMutation.isPending} className="bg-blue-600 text-white hover:bg-blue-500">
                Crear curso
              </Button>
            </div>
          }
        >
          <form id="create-course-form" onSubmit={handleCreate} autoComplete="off" className="space-y-4 px-5 py-5 sm:px-6">
            <Field label="Nombre *" error={errors.name}>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Descripción">
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label="Profesor *" error={errors.teacherId}>
              <TeacherSelect value={form.teacherId} teachers={teachers} onChange={(teacherId) => setForm({ ...form, teacherId })} />
            </Field>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editCourse && (
        <Modal
          open
          onClose={() => setEditCourse(null)}
          title="Editar curso"
          className="sm:max-w-lg"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setEditCourse(null)}>Cancelar</Button>
              <Button type="submit" form="edit-course-form" loading={updateMutation.isPending} className="bg-blue-600 text-white hover:bg-blue-500">
                Guardar cambios
              </Button>
            </div>
          }
        >
          <form id="edit-course-form" onSubmit={handleEditSubmit} autoComplete="off" className="space-y-4 px-5 py-5 sm:px-6">
            <Field label="Nombre *">
              <Input value={editCourse.name} onChange={(e) => setEditCourse({ ...editCourse, name: e.target.value })} />
            </Field>
            <Field label="Descripción">
              <Input value={editCourse.description ?? ''} onChange={(e) => setEditCourse({ ...editCourse, description: e.target.value })} />
            </Field>
            <Field label="Profesor *">
              <TeacherSelect value={editCourse.teacherId ?? ''} teachers={teachers} onChange={(teacherId) => setEditCourse({ ...editCourse, teacherId })} />
            </Field>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/40">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Curso activo</span>
              <SwitchInline checked={editCourse.isActive} onChange={(isActive) => setEditCourse({ ...editCourse, isActive })} />
            </div>
          </form>
        </Modal>
      )}

      <ConfirmModal
        open={!!deleteCourse}
        onClose={() => setDeleteCourse(null)}
        title="Eliminar curso"
        message={deleteCourse ? `¿Eliminar "${deleteCourse.name}"? Los alumnos quedarán sin esta asignación. Las cuotas y pagos ya generados no se modifican.` : ''}
        confirmText="Eliminar"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteCourse) deleteMutation.mutate(deleteCourse.id) }}
      />

      <CoursePanel
        open={!!panelCourseId}
        slug={slug}
        course={panelCourse}
        onClose={() => setPanelCourseId(null)}
        onEdit={(c) => setEditCourse({ ...c, description: c.description ?? '' })}
        onToggle={(c) => toggleMutation.mutate({ id: c.id, isActive: !c.isActive })}
        onDelete={(c) => setDeleteCourse(c)}
      />
    </div>
  )
}

function KpiCard({ icon: Icon, tone, value, label, percent }: {
  icon: React.ComponentType<{ className?: string }>
  tone: KpiTone
  value: number
  label: string
  percent?: number
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
        {percent != null && <p className={`mt-0.5 text-[11px] font-semibold leading-tight ${t.text}`}>{percent}% del total</p>}
      </div>
    </div>
  )
}

function CoursesSkeleton() {
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
      {active ? 'Activo' : 'Inactivo'}
    </span>
  )
}

function CourseTable({ courses, onOpen, onOpenFull, onEdit, onToggle, onDelete }: {
  courses: Course[]
  onOpen: (course: Course) => void
  onOpenFull: (course: Course) => void
  onEdit: (course: Course) => void
  onToggle: (course: Course) => void
  onDelete: (course: Course) => void
}) {
  return (
    <>
      {/* Desktop: listado compacto */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-[0.4px] text-slate-400 dark:border-slate-800">
              <th className="px-3 py-3 font-semibold">Curso</th>
              <th className="px-3 py-3 font-semibold">Días y horarios</th>
              <th className="px-3 py-3 font-semibold">Profesor</th>
              <th className="px-3 py-3 text-center font-semibold">Alumnos</th>
              <th className="px-3 py-3 text-center font-semibold">Estado</th>
              <th className="px-3 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {courses.map((course) => (
              <tr key={course.id} onClick={() => onOpen(course)}
                className="group cursor-pointer transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-3 py-2">
                  <div className="flex min-h-[56px] items-center gap-3">
                    <CourseThumb course={course} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900 transition group-hover:text-blue-600 dark:text-white">{course.name}</div>
                      {course.description && <div className="max-w-[260px] truncate text-xs text-slate-400">{course.description}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-[13px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {scheduleDetail(course.schedule) || <span className="text-slate-400">Sin horarios</span>}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-300">
                    <UserRound className="h-3.5 w-3.5 text-slate-400" /> {course.teacherName || 'Sin profesor'}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">
                    <Users className="h-3.5 w-3.5 text-slate-400" /> {course.studentCount ?? 0}
                  </span>
                </td>
                <td className="px-3 py-2 text-center"><StatusPill active={course.isActive} /></td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="outline" size="sm" className="h-8" onClick={() => onOpenFull(course)}>
                      <ExternalLink className="h-3.5 w-3.5" /> Ir al curso
                    </Button>
                    <IconButton label="Ver detalle" onClick={() => onOpen(course)}><Eye className="h-4 w-4" /></IconButton>
                    <IconButton label="Editar" onClick={() => onEdit(course)}><Pencil className="h-4 w-4" /></IconButton>
                    <ActionMenu actions={[
                      { label: 'Ir al curso', onClick: () => onOpenFull(course) },
                      { label: course.isActive ? 'Desactivar' : 'Activar', onClick: () => onToggle(course) },
                      { label: 'Eliminar', onClick: () => onDelete(course), danger: true },
                    ]} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: tarjetas compactas (sin scroll horizontal) */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {courses.map((course) => (
          <div
            key={course.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(course)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(course) } }}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/40"
          >
            <div className="flex items-start gap-3">
              <CourseThumb course={course} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{course.name}</p>
                <p className="truncate text-xs text-slate-400">
                  {course.description || scheduleDetail(course.schedule) || 'Sin horarios'}
                </p>
              </div>
              <StatusPill active={course.isActive} />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {scheduleDetail(course.schedule) || 'Sin horarios'}</span>
              <span className="inline-flex items-center gap-1"><UserRound className="h-3 w-3" /> {course.teacherName || 'Sin profesor'}</span>
              <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {course.studentCount ?? 0}</span>
            </div>
            <div className="mt-2.5 flex items-center gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm" className="h-8" onClick={() => onOpenFull(course)}>
                <ExternalLink className="h-3.5 w-3.5" /> Ir al curso
              </Button>
              <div className="ml-auto">
                <ActionMenu actions={[
                  { label: 'Ver detalle', onClick: () => onOpen(course) },
                  { label: 'Editar', onClick: () => onEdit(course) },
                  { label: course.isActive ? 'Desactivar' : 'Activar', onClick: () => onToggle(course) },
                  { label: 'Eliminar', onClick: () => onDelete(course), danger: true },
                ]} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200">
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

function TeacherSelect({ value, teachers, onChange }: { value: string; teachers: Teacher[]; onChange: (value: string) => void }) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
    >
      <option value="">Seleccionar profesor</option>
      {teachers.map((teacher) => (
        <option key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.lastName}</option>
      ))}
    </Select>
  )
}

function SwitchInline({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
    </button>
  )
}

/* ------------------------- Asignación masiva ------------------------- */

function ImportExcelHelp() {
  return (
    <details className="mt-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-600 shadow-sm open:border-blue-200 open:bg-blue-50/60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:open:border-blue-900/60 dark:open:bg-blue-950/20">
      <summary className="cursor-pointer list-none px-3 py-3 font-black text-slate-800 marker:hidden dark:text-slate-100">
        Ayuda para asignar por Excel
      </summary>
      <div className="space-y-3 border-t border-slate-200 px-3 pb-3 pt-3 leading-5 dark:border-slate-800">
        <div>
          El archivo debe ser <span className="font-bold">.xlsx</span> y la primera fila tiene que tener estas columnas exactas:
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-100 font-black uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-2 py-2">Correo</th>
                <th className="px-2 py-2">Curso</th>
                <th className="px-2 py-2">DiasPorSemana</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900">
              <tr>
                <td className="px-2 py-2">alumno@mail.com</td>
                <td className="px-2 py-2">Yoga</td>
                <td className="px-2 py-2">2</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="list-disc space-y-1 pl-4">
          <li>Usa una fila por cada asignación.</li>
          <li>Para poner un alumno en dos cursos, repetís el correo en dos filas con cursos distintos.</li>
          <li>El nombre del curso debe coincidir con el curso cargado.</li>
          <li>La frecuencia debe existir en los precios del curso.</li>
          <li>Si el alumno ya estaba en ese curso, se actualiza la frecuencia.</li>
        </ul>
      </div>
    </details>
  )
}

function CourseAssignmentsPanel({ slug, courses, onChanged }: { slug: string; courses: Course[]; onChanged: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const activeCourses = useMemo(
    () => [...courses].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name)),
    [courses],
  )

  const [courseId, setCourseId] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'available'>('all')
  const [studentPage, setStudentPage] = useState(1)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [classesByStudent, setClassesByStudent] = useState<Record<string, number | ''>>({})
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  useEffect(() => {
    if (!courseId && activeCourses.length > 0) setCourseId(activeCourses[0].id)
  }, [activeCourses, courseId])

  const selectedCourse = courses.find((course) => course.id === courseId) ?? null
  const classOptions = selectedCourse?.classesPerWeekOptions ?? []

  const studentsQuery = useQuery({
    queryKey: ['course-assignment-students', slug, courseId],
    queryFn: () => apiService.get<CourseStudent[]>(`/api/admin/${slug}/courses/${courseId}/available-students`),
    enabled: !!slug && !!courseId,
  })

  useEffect(() => {
    const students = studentsQuery.data ?? []
    const nextSelected: Record<string, boolean> = {}
    const nextClasses: Record<string, number | ''> = {}

    students.forEach((student) => {
      nextSelected[student.studentId] = student.isAssigned
      nextClasses[student.studentId] = student.classesPerWeek ?? ''
    })

    setSelected(nextSelected)
    setClassesByStudent(nextClasses)
  }, [studentsQuery.data])

  const saveMutation = useMutation({
    mutationFn: (students: { studentId: string; classesPerWeek: number }[]) =>
      apiService.post(`/api/admin/${slug}/courses/${courseId}/students`, { students }),
    onSuccess: () => {
      toast('Asignación guardada.')
      qc.invalidateQueries({ queryKey: ['course-assignment-students'] })
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      onChanged()
    },
    onError: (error: Error) => toast(error.message || 'No se pudo guardar la asignación.', 'error'),
  })

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiService.postForm<ImportResult>(`/api/admin/${slug}/courses/import-students-excel`, formData)
    },
    onSuccess: (result) => {
      setImportResult(result)
      toast('Importación finalizada.')
      qc.invalidateQueries({ queryKey: ['course-assignment-students'] })
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      onChanged()
    },
    onError: (error: Error) => toast(error.message || 'No se pudo importar el Excel.', 'error'),
  })

  const students = studentsQuery.data ?? []
  const filteredStudents = students.filter((student) => {
    const term = search.trim().toLowerCase()
    const matchesSearch = !term || student.fullName.toLowerCase().includes(term) || student.email.toLowerCase().includes(term)
    const isChecked = selected[student.studentId] ?? false
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'assigned' && isChecked) ||
      (statusFilter === 'available' && !isChecked)
    return matchesSearch && matchesStatus
  })
  const totalStudentPages = Math.max(1, Math.ceil(filteredStudents.length / STUDENTS_PAGE_SIZE))
  const currentStudentPage = Math.min(studentPage, totalStudentPages)
  const pageStart = (currentStudentPage - 1) * STUDENTS_PAGE_SIZE
  const pagedStudents = filteredStudents.slice(pageStart, pageStart + STUDENTS_PAGE_SIZE)

  useEffect(() => {
    setStudentPage(1)
  }, [courseId, search, statusFilter])

  useEffect(() => {
    if (studentPage > totalStudentPages) setStudentPage(totalStudentPages)
  }, [studentPage, totalStudentPages])

  const assignedCount = Object.values(selected).filter(Boolean).length
  const hasMissingClasses = Object.entries(selected).some(([studentId, isSelected]) => isSelected && !Number(classesByStudent[studentId] || 0))
  const canSave = !!courseId && !hasMissingClasses && (assignedCount === 0 || classOptions.length > 0)

  function toggleStudent(student: CourseStudent, checked: boolean) {
    setSelected((prev) => ({ ...prev, [student.studentId]: checked }))
    setClassesByStudent((prev) => {
      if (!checked) return prev
      if (Number(prev[student.studentId] || 0)) return prev
      return { ...prev, [student.studentId]: classOptions[0] ?? '' }
    })
  }

  function handleSave() {
    if (!canSave) return
    const payload = Object.entries(selected)
      .filter(([, isSelected]) => isSelected)
      .map(([studentId]) => ({
        studentId,
        classesPerWeek: Number(classesByStudent[studentId]),
      }))

    saveMutation.mutate(payload)
  }

  function handleImport(file: File | null | undefined) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast('El archivo debe ser .xlsx.', 'error')
      return
    }
    importMutation.mutate(file)
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 bg-gradient-to-br from-white via-blue-50/70 to-slate-50 px-4 py-4 dark:border-slate-800 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-950 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-black uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                Multi-curso
              </div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Asignar alumnos a curso</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                Cada curso mantiene su propia nómina. Un alumno puede quedar asignado en más de un curso.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:w-72">
              <Metric label="Asignados" value={assignedCount} />
              <Metric label="Disponibles" value={Math.max(0, students.length - assignedCount)} />
            </div>
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[320px_1fr]">
          <aside className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 dark:border-slate-800 dark:from-slate-950/60 dark:to-slate-900 xl:border-b-0 xl:border-r">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Field label="Curso">
                <Select
                  value={courseId}
                  onChange={(e) => {
                    setCourseId(e.target.value)
                    setImportResult(null)
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {activeCourses.length === 0 ? (
                    <option value="">No hay cursos</option>
                  ) : (
                    activeCourses.map((course) => (
                      <option key={course.id} value={course.id}>{course.name}{course.isActive ? '' : ' (Inactivo)'}</option>
                    ))
                  )}
                </Select>
              </Field>

              <Field label="Estado">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="all">Todos</option>
                  <option value="assigned">Asignados</option>
                  <option value="available">No asignados</option>
                </Select>
              </Field>
            </div>

            <div className="mt-3">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar alumno o email" />
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row xl:flex-col">
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} loading={importMutation.isPending} className="w-full">
                Importar Excel .xlsx
              </Button>
              <Button
                type="button"
                loading={saveMutation.isPending}
                disabled={!canSave}
                onClick={handleSave}
                className="w-full bg-blue-600 text-white hover:bg-blue-500"
              >
                Guardar asignación
              </Button>
              <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => {
                handleImport(e.target.files?.[0])
                e.currentTarget.value = ''
              }} />
            </div>

            <ImportExcelHelp />

            <div className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {hasMissingClasses ? 'Hay alumnos asignados sin frecuencia.' : `${filteredStudents.length} alumnos encontrados.`}
            </div>

            {selectedCourse && classOptions.length === 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                Este curso no tiene precios por frecuencia. Configuralos en Precios antes de asignar alumnos.
              </div>
            )}

            {importResult && (
              <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-xs leading-5 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                <div className="font-bold">Importación finalizada</div>
                <div className="mt-1">Total: {importResult.totalRows} - Nuevos: {importResult.created} - Actualizados: {importResult.updated} - Omitidos: {importResult.skipped}</div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {importResult.errors.slice(0, 8).map((error) => <li key={error}>{error}</li>)}
                  </ul>
                )}
              </div>
            )}
          </aside>

          <section className="min-w-0 bg-white dark:bg-slate-900">
            {studentsQuery.isLoading ? (
              <div className="flex min-h-80 items-center justify-center">
                <Spinner className="h-7 w-7 text-blue-600" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400">No hay alumnos para mostrar.</div>
            ) : (
              <>
                <div className="space-y-3 p-3 md:hidden">
                  {pagedStudents.map((student) => {
                    const isSelected = selected[student.studentId] ?? false
                    return (
                      <StudentAssignmentCard
                        key={student.studentId}
                        student={student}
                        isSelected={isSelected}
                        classOptions={classOptions}
                        classesValue={classesByStudent[student.studentId] ?? ''}
                        onToggle={(checked) => toggleStudent(student, checked)}
                        onClassChange={(value) => setClassesByStudent((prev) => ({ ...prev, [student.studentId]: value }))}
                      />
                    )
                  })}
                </div>

                <div className="hidden md:block">
                  <div className="max-h-[620px] overflow-auto">
                    <table className="min-w-full table-fixed text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                        <tr>
                          <th className="w-20 px-4 py-3">Sel.</th>
                          <th className="px-4 py-3">Alumno</th>
                          <th className="w-36 px-4 py-3">Estado</th>
                          <th className="w-60 px-4 py-3">Frecuencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {pagedStudents.map((student) => {
                          const isSelected = selected[student.studentId] ?? false
                          return (
                            <tr key={student.studentId} className={isSelected ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''}>
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => toggleStudent(student, e.target.checked)}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>
                              <td className="min-w-0 px-4 py-3">
                                <div className="truncate font-semibold text-slate-900 dark:text-white">{student.fullName}</div>
                                <div className="truncate text-xs text-slate-500 dark:text-slate-400">{student.email}</div>
                              </td>
                              <td className="px-4 py-3"><AssignmentBadge selected={isSelected} /></td>
                              <td className="px-4 py-3">
                                <FrequencySelect
                                  disabled={!isSelected || classOptions.length === 0}
                                  options={classOptions}
                                  value={classesByStudent[student.studentId] ?? ''}
                                  onChange={(value) => setClassesByStudent((prev) => ({ ...prev, [student.studentId]: value }))}
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <StudentsPagination
                  page={currentStudentPage}
                  totalPages={totalStudentPages}
                  total={filteredStudents.length}
                  pageStart={pageStart}
                  pageSize={STUDENTS_PAGE_SIZE}
                  onPrev={() => setStudentPage((page) => Math.max(1, page - 1))}
                  onNext={() => setStudentPage((page) => Math.min(totalStudentPages, page + 1))}
                />
              </>
            )}
          </section>
        </div>
      </Card>

      <div className="sticky bottom-3 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white">{assignedCount} asignados</div>
            <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{hasMissingClasses ? 'Falta frecuencia' : `Pág. ${currentStudentPage}/${totalStudentPages}`}</div>
          </div>
          <Button
            type="button"
            size="sm"
            loading={saveMutation.isPending}
            disabled={!canSave}
            onClick={handleSave}
            className="shrink-0 bg-blue-600 text-white hover:bg-blue-500"
          >
            Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-0.5 text-xl font-black text-slate-900 dark:text-white">{value}</div>
    </div>
  )
}

function StudentAssignmentCard({
  student,
  isSelected,
  classOptions,
  classesValue,
  onToggle,
  onClassChange,
}: {
  student: CourseStudent
  isSelected: boolean
  classOptions: number[]
  classesValue: number | ''
  onToggle: (checked: boolean) => void
  onClassChange: (value: number | '') => void
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition ${
      isSelected
        ? 'border-blue-200 bg-blue-50/80 dark:border-blue-900/60 dark:bg-blue-950/25'
        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
    }`}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-slate-900 dark:text-white">{student.fullName}</div>
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">{student.email}</div>
          </div>
          <AssignmentBadge selected={isSelected} />
        </div>

        <button
          type="button"
          onClick={() => onToggle(!isSelected)}
          className={`min-h-10 w-full rounded-xl border px-3 py-2 text-sm font-black transition ${
            isSelected
              ? 'border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/30'
              : 'border-blue-200 bg-blue-600 text-white hover:bg-blue-500 dark:border-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500'
          }`}
        >
          {isSelected ? 'Quitar de este curso' : 'Asignar a este curso'}
        </button>

        <div>
          <div className="mb-1 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Frecuencia</div>
          <FrequencySelect
            disabled={!isSelected || classOptions.length === 0}
            options={classOptions}
            value={classesValue}
            onChange={onClassChange}
          />
        </div>
      </div>
    </div>
  )
}

function StudentsPagination({
  page,
  totalPages,
  total,
  pageStart,
  pageSize,
  onPrev,
  onNext,
}: {
  page: number
  totalPages: number
  total: number
  pageStart: number
  pageSize: number
  onPrev: () => void
  onNext: () => void
}) {
  if (total <= pageSize) return null

  const from = pageStart + 1
  const to = Math.min(pageStart + pageSize, total)

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
        Mostrando {from}-{to} de {total} alumnos
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={onPrev}>Anterior</Button>
        <span className="min-w-20 text-center text-xs font-bold text-slate-600 dark:text-slate-300">
          {page} / {totalPages}
        </span>
        <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={onNext}>Siguiente</Button>
      </div>
    </div>
  )
}

function AssignmentBadge({ selected }: { selected: boolean }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
      selected
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
    }`}>
      {selected ? 'Asignado' : 'Libre'}
    </span>
  )
}

function FrequencySelect({
  disabled,
  options,
  value,
  onChange,
}: {
  disabled: boolean
  options: number[]
  value: number | ''
  onChange: (value: number | '') => void
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || '')}
      disabled={disabled}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-80 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-900"
    >
      <option value="">{disabled ? 'No aplica' : 'Seleccionar'}</option>
      {options.map((option) => (
        <option key={option} value={option}>{formatClasses(option)}</option>
      ))}
    </Select>
  )
}

export default function CoursesPage() {
  return <ToastProvider><CoursesPageInner /></ToastProvider>
}
