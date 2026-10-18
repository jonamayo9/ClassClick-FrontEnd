import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService, getApiError } from '@/lib/api'
import { imgUrl } from '@/lib/media'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Modal } from '@/components/ui/modal'
import { TimePicker } from '@/components/ui/date-picker'
import { useToast } from '@/components/ui/toast'
import type { Course } from './page'
import {
  BookOpen, CalendarDays, Clock, ExternalLink, GraduationCap, Pencil, Plus,
  Power, Search, Trash2, UserPlus, X,
} from 'lucide-react'

const DAY_LABELS: Record<string, string> = {
  Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles',
  Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado', Sunday: 'Domingo',
}
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function formatTime(t?: string) {
  return t ? t.slice(0, 5) : ''
}

function scheduleText(schedule?: Course['schedule']) {
  if (!schedule || schedule.length === 0) return 'Sin horarios definidos'
  const days = [...new Set(schedule.map((s) => DAY_LABELS[s.day] ?? s.day))]
  return days.join(' · ')
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

const avatarColors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500']
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return avatarColors[Math.abs(h) % avatarColors.length]
}

interface AvailableStudent {
  studentId: string
  fullName: string
  email: string
  isAssigned: boolean
  classesPerWeek: number | null
}

interface CourseClass {
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

interface TeacherOption {
  id: string
  firstName: string
  lastName: string
  role?: string
}

interface CoursePanelProps {
  open: boolean
  slug: string
  course: Course | null
  onClose: () => void
  onEdit: (course: Course) => void
  onToggle: (course: Course) => void
  onDelete: (course: Course) => void
}

type PanelTab = 'resumen' | 'alumnos' | 'profesores' | 'clases'

export function CoursePanel({ open, slug, course: rawCourse, onClose, onEdit, onToggle, onDelete }: CoursePanelProps) {
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [tab, setTab] = useState<PanelTab>('resumen')
  const [mounted, setMounted] = useState(open)
  const [search, setSearch] = useState('')
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignSearch, setAssignSearch] = useState('')
  const [assignTarget, setAssignTarget] = useState<AvailableStudent | null>(null)
  const [assignFreq, setAssignFreq] = useState<number | ''>('')
  const [removeTarget, setRemoveTarget] = useState<AvailableStudent | null>(null)
  const [fallbackCourse, setFallbackCourse] = useState<Course | null>(rawCourse)
  const [classModal, setClassModal] = useState<{ mode: 'create' | 'edit'; item?: CourseClass } | null>(null)
  const [classForm, setClassForm] = useState({ dayOfWeek: 'Monday', startTime: '', endTime: '', teacherId: '' })
  const [classErrors, setClassErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<CourseClass | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<CourseClass | null>(null)

  useEffect(() => {
    if (rawCourse) setFallbackCourse(rawCourse)
  }, [rawCourse])

  const course = rawCourse ?? fallbackCourse
  const courseId = course?.id ?? ''

  useEffect(() => {
    if (open) {
      setMounted(true)
      setSearch('')
      setTab('resumen')
    } else {
      const t = setTimeout(() => setMounted(false), 250)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!assignTarget) return
    const options = course?.classesPerWeekOptions ?? []
    setAssignFreq(options[0] ?? '')
  }, [assignTarget, course])

  const studentsQuery = useQuery({
    queryKey: ['admin-course-students', slug, courseId],
    queryFn: () => apiService.get<AvailableStudent[]>(`/api/admin/${slug}/courses/${courseId}/available-students`),
    enabled: open && !!slug && !!courseId,
  })

  const classesQuery = useQuery({
    queryKey: ['admin-classes', slug],
    queryFn: () => apiService.get<CourseClass[]>(`/api/admin/${slug}/classes`),
    enabled: open && !!slug && tab === 'clases',
  })

  const students = studentsQuery.data ?? []
  const enrolled = students.filter((s) => s.isAssigned)
  const available = students.filter((s) => !s.isAssigned)

  const filteredEnrolled = enrolled.filter((s) => {
    const term = search.trim().toLowerCase()
    return !term || s.fullName.toLowerCase().includes(term) || s.email.toLowerCase().includes(term)
  })

  const filteredAvailable = available.filter((s) => {
    const term = assignSearch.trim().toLowerCase()
    return !term || s.fullName.toLowerCase().includes(term) || s.email.toLowerCase().includes(term)
  })

  const courseClasses = (classesQuery.data ?? []).filter((c) => c.courseId === courseId)

  function refresh() {
    qc.invalidateQueries({ queryKey: ['admin-course-students'] })
    qc.invalidateQueries({ queryKey: ['admin-courses-paged'] })
    qc.invalidateQueries({ queryKey: ['admin-courses-summary'] })
    qc.invalidateQueries({ queryKey: ['admin-courses'] })
  }

  const assignMutation = useMutation({
    mutationFn: ({ student, classesPerWeek }: { student: AvailableStudent; classesPerWeek: number }) =>
      apiService.post(`/api/admin/${slug}/courses/${courseId}/students/add`, {
        students: [{ studentId: student.studentId, classesPerWeek }],
      }),
    onSuccess: () => {
      toast('Alumno asignado.')
      setAssignTarget(null)
      setAssignOpen(false)
      setAssignSearch('')
      refresh()
    },
    onError: (e) => toast(getApiError(e), 'error'),
  })

  const removeMutation = useMutation({
    mutationFn: (student: AvailableStudent) => {
      const remaining = enrolled
        .filter((s) => s.studentId !== student.studentId)
        .map((s) => ({ studentId: s.studentId, classesPerWeek: s.classesPerWeek ?? 1 }))
      return apiService.post(`/api/admin/${slug}/courses/${courseId}/students`, { students: remaining })
    },
    onSuccess: () => {
      toast('Alumno quitado del curso.')
      setRemoveTarget(null)
      refresh()
    },
    onError: (e) => toast(getApiError(e), 'error'),
  })

  const teachersQuery = useQuery({
    queryKey: ['admin-teachers', slug],
    queryFn: () => apiService.get<TeacherOption[]>(`/api/admin/${slug}/teachers`),
    enabled: open && !!slug,
  })
  const teacherOptions = (teachersQuery.data ?? []).filter((t) => (t.role ?? 'Teacher') === 'Teacher')

  function invalidateClasses() {
    qc.invalidateQueries({ queryKey: ['admin-classes'] })
    qc.invalidateQueries({ queryKey: ['admin-courses-paged'] })
    qc.invalidateQueries({ queryKey: ['admin-courses'] })
    qc.invalidateQueries({ queryKey: ['admin-courses-summary'] })
  }

  const classCreateMutation = useMutation({
    mutationFn: () => apiService.post(`/api/admin/${slug}/classes`, {
      courseId,
      teacherId: classForm.teacherId,
      dayOfWeek: classForm.dayOfWeek,
      startTime: classForm.startTime,
      endTime: classForm.endTime,
    }),
    onSuccess: () => { toast('Clase creada.'); closeClassModal(); invalidateClasses() },
    onError: (e) => toast(getApiError(e), 'error'),
  })

  const classUpdateMutation = useMutation({
    mutationFn: (id: string) => apiService.put(`/api/admin/${slug}/classes/${id}`, {
      courseId,
      teacherId: classForm.teacherId,
      dayOfWeek: classForm.dayOfWeek,
      startTime: classForm.startTime,
      endTime: classForm.endTime,
    }),
    onSuccess: () => { toast('Clase actualizada.'); closeClassModal(); invalidateClasses() },
    onError: (e) => toast(getApiError(e), 'error'),
  })

  const classToggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiService.patch(`/api/admin/${slug}/classes/${id}/active`, { isActive }),
    onSuccess: () => { toast('Estado de la clase actualizado.'); setDeactivateTarget(null); invalidateClasses() },
    onError: (e) => { setDeactivateTarget(null); toast(getApiError(e), 'error') },
  })

  const classDeleteMutation = useMutation({
    mutationFn: (id: string) => apiService.del(`/api/admin/${slug}/classes/${id}`),
    onSuccess: () => { toast('Clase eliminada.'); setDeleteTarget(null); invalidateClasses() },
    onError: (e) => { setDeleteTarget(null); toast(getApiError(e), 'error') },
  })

  function openCreateClass() {
    setClassForm({ dayOfWeek: 'Monday', startTime: '', endTime: '', teacherId: '' })
    setClassErrors({})
    setClassModal({ mode: 'create' })
  }

  function openEditClass(item: CourseClass) {
    setClassForm({
      dayOfWeek: item.dayOfWeek ?? 'Monday',
      startTime: formatTime(item.startTime),
      endTime: formatTime(item.endTime),
      teacherId: item.teacherId ?? '',
    })
    setClassErrors({})
    setClassModal({ mode: 'edit', item })
  }

  function closeClassModal() {
    setClassModal(null)
    setClassErrors({})
  }

  function submitClass(e: React.FormEvent) {
    e.preventDefault()
    if (!classModal) return
    const errs: Record<string, string> = {}
    if (!classForm.teacherId) errs.teacherId = 'Seleccioná un profesor.'
    if (!classForm.startTime) errs.startTime = 'El horario de inicio es obligatorio.'
    if (!classForm.endTime) errs.endTime = 'El horario de fin es obligatorio.'
    if (classForm.startTime && classForm.endTime && classForm.endTime <= classForm.startTime) {
      errs.endTime = 'El fin debe ser posterior al inicio.'
    }
    setClassErrors(errs)
    if (Object.keys(errs).length > 0) return
    if (classModal.mode === 'edit' && classModal.item) classUpdateMutation.mutate(classModal.item.id)
    else classCreateMutation.mutate()
  }

  function toggleClass(item: CourseClass) {
    if (item.isActive) setDeactivateTarget(item)
    else classToggleMutation.mutate({ id: item.id, isActive: true })
  }

  if (!mounted) return null

  const options = course?.classesPerWeekOptions ?? []
  const canAssign = !!assignTarget && assignFreq !== '' && Number(assignFreq) > 0

  return (
    <div className="fixed inset-0 z-[80]">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={course?.name ?? 'Detalle del curso'}
        className={`absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 sm:max-w-[540px] dark:bg-slate-900 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header fijo */}
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <CourseThumb course={course} size="lg" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[19px] font-bold text-slate-900 dark:text-white">{course?.name ?? 'Curso'}</p>
                  {course && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      course.isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400'
                    }`}>
                      {course.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{scheduleText(course?.schedule)}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {course && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => navigate(`/admin/courses/${course.id}`)}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Ir al curso
                </Button>
              )}
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {course && (
            <div className="mt-3 flex gap-5 overflow-x-auto scrollbar-hide">
              {PANEL_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`whitespace-nowrap border-b-2 pb-2 text-xs font-semibold transition ${
                    tab === t.key
                      ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {!course && <p className="py-12 text-center text-sm text-slate-400">Curso no encontrado.</p>}

          {course && tab === 'resumen' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Información general</p>
                <dl className="mt-3 space-y-2.5 text-sm">
                  <InfoRow label="Nombre" value={course.name} />
                  <InfoRow label="Descripción" value={course.description || 'Sin descripción'} />
                  <InfoRow label="Estado" value={course.isActive ? 'Activo' : 'Inactivo'} />
                  <InfoRow label="Días de clase" value={scheduleText(course.schedule)} />
                  {course.schedule && course.schedule.length > 0 && (
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Horarios</dt>
                      <dd className="mt-1 space-y-1">
                        {course.schedule.map((s, i) => (
                          <span key={`${s.day}-${i}`} className="mr-1 inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                            <CalendarDays className="h-3 w-3" />
                            {DAY_LABELS[s.day] ?? s.day} {formatTime(s.startTime)}–{formatTime(s.endTime)}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                  <InfoRow label="Profesor" value={course.teacherName || 'Sin profesor'} />
                  <InfoRow label="Profesores" value={String(course.teacherName ? 1 : 0)} />
                  <InfoRow label="Alumnos inscriptos" value={String(course.studentCount ?? 0)} />
                  <InfoRow label="Fecha de creación" value={formatDate(course.createdAtUtc)} />
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Acciones rápidas</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-11 justify-start" onClick={() => { setAssignOpen(true); setAssignSearch('') }}>
                    <UserPlus className="h-4 w-4" /> Asignar alumno
                  </Button>
                  <Button variant="outline" className="h-11 justify-start" onClick={() => onEdit(course)}>
                    <GraduationCap className="h-4 w-4" /> Gestionar profesor
                  </Button>
                  <Button variant="outline" className="h-11 justify-start" onClick={() => setTab('clases')}>
                    <CalendarDays className="h-4 w-4" /> Ver clases
                  </Button>
                  <Button variant="outline" className="h-11 justify-start" onClick={() => navigate(`/admin/courses/${course.id}`)}>
                    <ExternalLink className="h-4 w-4" /> Ir al curso completo
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Administración</p>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Power className="h-4 w-4 text-slate-400" />
                    {course.isActive ? 'Curso activo' : 'Curso inactivo'}
                  </div>
                  <Switch checked={course.isActive} onCheckedChange={() => onToggle(course)} aria-label="Activar o desactivar curso" />
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                    onClick={() => onDelete(course)}
                  >
                    <Trash2 className="h-4 w-4" /> Eliminar curso
                  </Button>
                  <p className="mt-2 text-[11px] leading-4 text-slate-400">
                    Eliminar un curso quita sus asignaciones. Las cuotas y pagos ya generados no se modifican.
                  </p>
                </div>
              </div>
            </div>
          )}

          {course && tab === 'alumnos' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Alumnos <span className="font-medium text-slate-400">({enrolled.length})</span>
                </p>
                <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-500" onClick={() => { setAssignOpen(true); setAssignSearch('') }}>
                  <Plus className="h-3.5 w-3.5" /> Asignar alumno
                </Button>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar alumno..." className="pl-10" />
              </div>

              {studentsQuery.isLoading ? (
                <div className="flex justify-center py-10"><Spinner className="h-6 w-6 text-blue-600" /></div>
              ) : filteredEnrolled.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
                  {enrolled.length === 0 ? 'Todavía no hay alumnos asignados.' : 'Sin resultados.'}
                </div>
              ) : (
                <ul className="space-y-2">
                  {filteredEnrolled.map((s) => (
                    <li key={s.studentId} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(s.fullName)}`}>
                        {initials(s.fullName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{s.fullName}</p>
                        <p className="truncate text-xs text-slate-400">{s.email}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                        {s.classesPerWeek ?? '—'}x/sem
                      </span>
                      <button
                        type="button"
                        onClick={() => setRemoveTarget(s)}
                        className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {course && tab === 'profesores' && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Profesores <span className="font-medium text-slate-400">({course.teacherName ? 1 : 0})</span>
              </p>
              {course.teacherName ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(course.teacherName)}`}>
                    {initials(course.teacherName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{course.teacherName}</p>
                    <p className="text-xs text-slate-400">Profesor a cargo</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onEdit(course)}>
                    <Pencil className="h-3.5 w-3.5" /> Cambiar
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
                  Este curso no tiene profesor asignado.
                </div>
              )}
              <p className="text-[11px] leading-4 text-slate-400">
                Cada curso tiene un profesor a cargo. La asignación se administra desde Editar curso.
              </p>
            </div>
          )}

          {course && tab === 'clases' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Clases del curso</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    {course.name} · {courseClasses.length} {courseClasses.length === 1 ? 'clase' : 'clases'}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
                  <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-500" onClick={openCreateClass}>
                    <Plus className="h-3.5 w-3.5" /> Nueva clase
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('/admin/classes')}>
                    <ExternalLink className="h-3.5 w-3.5" /> Ir al módulo Clases
                  </Button>
                </div>
              </div>

              {classesQuery.isLoading ? (
                <div className="flex justify-center py-10"><Spinner className="h-6 w-6 text-blue-600" /></div>
              ) : courseClasses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
                  Este curso no tiene clases programadas.
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {courseClasses.map((c) => (
                    <li key={c.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {DAY_LABELS[c.dayOfWeek ?? ''] ?? c.dayOfWeek} · {formatTime(c.startTime)}–{formatTime(c.endTime)}
                          </p>
                          <p className="truncate text-xs text-slate-400">{c.teacherName || 'Sin profesor'}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          c.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400'
                        }`}>
                          {c.isActive ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                        <Button variant="outline" size="sm" onClick={() => openEditClass(c)}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => toggleClass(c)} loading={classToggleMutation.isPending && classToggleMutation.variables?.id === c.id}>
                          <Power className="h-3.5 w-3.5" /> {c.isActive ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Eliminar
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Asignación individual */}
      {assignOpen && course && (
        <Modal
          open
          onClose={() => { setAssignOpen(false); setAssignTarget(null); setAssignSearch('') }}
          title="Asignar alumno"
          description={`Agregá un alumno a ${course.name}.`}
          className="sm:max-w-md"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => { setAssignOpen(false); setAssignTarget(null); setAssignSearch('') }}>Cancelar</Button>
              <Button
                loading={assignMutation.isPending}
                disabled={!canAssign}
                className="bg-blue-600 text-white hover:bg-blue-500"
                onClick={() => { if (assignTarget && assignFreq !== '') assignMutation.mutate({ student: assignTarget, classesPerWeek: Number(assignFreq) }) }}
              >
                Confirmar asignación
              </Button>
            </div>
          }
        >
          <div className="space-y-4 px-5 py-4 sm:px-6">
            {assignTarget ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3 dark:border-blue-900/60 dark:bg-blue-950/20">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(assignTarget.fullName)}`}>
                    {initials(assignTarget.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{assignTarget.fullName}</p>
                    <p className="truncate text-xs text-slate-400">{assignTarget.email}</p>
                  </div>
                  <button type="button" onClick={() => setAssignTarget(null)} className="text-xs font-semibold text-blue-600 dark:text-blue-400">Cambiar</button>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Frecuencia semanal</label>
                  {options.length === 0 ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Este curso no tiene precios configurados. Configuralos en Precios antes de asignar.
                    </p>
                  ) : (
                    <Select value={assignFreq === '' ? '' : String(assignFreq)} onChange={(e) => setAssignFreq(Number(e.target.value) || '')}>
                      <option value="">Seleccionar...</option>
                      {options.map((o) => (
                        <option key={o} value={o}>{o} {o === 1 ? 'clase' : 'clases'} / semana</option>
                      ))}
                    </Select>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} placeholder="Buscar alumno por nombre o email..." className="pl-10" autoFocus />
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {studentsQuery.isLoading ? (
                    <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-blue-600" /></div>
                  ) : filteredAvailable.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">No hay alumnos disponibles.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredAvailable.map((s) => (
                        <li key={s.studentId}>
                          <button
                            type="button"
                            onClick={() => setAssignTarget(s)}
                            className="flex w-full items-center gap-3 px-1 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(s.fullName)}`}>
                              {initials(s.fullName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{s.fullName}</p>
                              <p className="truncate text-xs text-slate-400">{s.email}</p>
                            </div>
                            <Plus className="h-4 w-4 shrink-0 text-slate-400" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      <ConfirmModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Quitar alumno"
        message={removeTarget ? `¿Quitar a ${removeTarget.fullName} de este curso? No se modificarán sus cuotas ni pagos.` : ''}
        confirmText="Quitar"
        variant="danger"
        loading={removeMutation.isPending}
        onConfirm={() => { if (removeTarget) removeMutation.mutate(removeTarget) }}
      />

      {/* Alta / edición de clase (curso bloqueado) */}
      {classModal && course && (
        <Modal
          open
          onClose={closeClassModal}
          title={classModal.mode === 'create' ? 'Nueva clase' : 'Editar clase'}
          description={`Curso: ${course.name}`}
          className="sm:max-w-md"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={closeClassModal}>Cancelar</Button>
              <Button
                type="submit"
                form="course-class-form"
                loading={classCreateMutation.isPending || classUpdateMutation.isPending}
                className="bg-blue-600 text-white hover:bg-blue-500"
              >
                {classModal.mode === 'create' ? 'Crear clase' : 'Guardar cambios'}
              </Button>
            </div>
          }
        >
          <form id="course-class-form" onSubmit={submitClass} className="space-y-4 px-5 py-5 sm:px-6">
            <Field label="Curso">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{course.name}</span>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">Fijo</span>
              </div>
            </Field>
            <Field label="Día">
              <Select
                value={classForm.dayOfWeek}
                onChange={(e) => setClassForm({ ...classForm, dayOfWeek: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {DAYS.map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Inicio" error={classErrors.startTime}>
                <TimePicker value={classForm.startTime} onChange={(v) => setClassForm({ ...classForm, startTime: v })} />
              </Field>
              <Field label="Fin" error={classErrors.endTime}>
                <TimePicker value={classForm.endTime} onChange={(v) => setClassForm({ ...classForm, endTime: v })} />
              </Field>
            </div>
            <Field label="Profesor *" error={classErrors.teacherId}>
              <Select
                value={classForm.teacherId}
                onChange={(e) => setClassForm({ ...classForm, teacherId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Seleccionar profesor</option>
                {teacherOptions.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
              </Select>
            </Field>
          </form>
        </Modal>
      )}

      <ConfirmModal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        title="Desactivar clase"
        message={deactivateTarget
          ? `¿Desactivar la clase de ${course?.name ?? ''} del ${DAY_LABELS[deactivateTarget.dayOfWeek ?? ''] ?? ''} ${formatTime(deactivateTarget.startTime)}–${formatTime(deactivateTarget.endTime)}? Las asistencias ya registradas no se modifican.`
          : ''}
        confirmText="Desactivar"
        variant="danger"
        loading={classToggleMutation.isPending}
        onConfirm={() => { if (deactivateTarget) classToggleMutation.mutate({ id: deactivateTarget.id, isActive: false }) }}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar clase"
        message={deleteTarget
          ? `¿Eliminar la clase de ${course?.name ?? ''} del ${DAY_LABELS[deleteTarget.dayOfWeek ?? ''] ?? ''} ${formatTime(deleteTarget.startTime)}–${formatTime(deleteTarget.endTime)}? Si tiene asistencias registradas no se podrá eliminar.`
          : ''}
        confirmText="Eliminar"
        variant="danger"
        loading={classDeleteMutation.isPending}
        onConfirm={() => { if (deleteTarget) classDeleteMutation.mutate(deleteTarget.id) }}
      />
    </div>
  )
}

const PANEL_TABS: { key: PanelTab; label: string }[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'alumnos', label: 'Alumnos' },
  { key: 'profesores', label: 'Profesores' },
  { key: 'clases', label: 'Clases' },
]

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="max-w-[62%] text-right text-sm font-semibold text-slate-700 dark:text-slate-200">{value}</dd>
    </div>
  )
}

export function CourseThumb({ course, size = 'md' }: { course: Course | null | undefined; size?: 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-12 w-12' : 'h-10 w-10'
  const src = imgUrl(course?.publicCoverImageUrl)
  if (src) {
    return <img src={src} alt="" className={`${dim} shrink-0 rounded-xl object-cover`} />
  }
  return (
    <div className={`flex ${dim} shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400`}>
      <BookOpen className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} />
    </div>
  )
}
