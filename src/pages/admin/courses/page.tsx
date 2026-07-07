import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Select } from '@/components/ui/select'

export interface Course {
  id: string
  name: string
  description: string | null
  teacherId?: string
  teacherName?: string
  isActive: boolean
  studentCount?: number
  classesPerWeekOptions?: number[]
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

function useSlug() {
  return useAuth((s) => s.activeCompanySlug ?? '')
}

function formatClasses(value: number | null | undefined) {
  if (!value) return 'Sin definir'
  return `${value} ${value === 1 ? 'clase' : 'clases'} / semana`
}

function normalizeCourseList(data: Course[] | { items?: Course[]; data?: Course[] }) {
  if (Array.isArray(data)) return data
  return data.items ?? data.data ?? []
}

function CoursesPageInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const slug = useSlug()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<CoursesTab>('courses')

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['admin-courses', slug],
    queryFn: () => apiService.get<Course[] | { items?: Course[]; data?: Course[] }>(`/api/admin/${slug}/courses`).then(normalizeCourseList),
    enabled: !!slug,
  })

  const { data: teachers = [] } = useQuery({
    queryKey: ['admin-teachers', slug],
    queryFn: () => apiService.get<Teacher[]>(`/api/admin/${slug}/teachers`),
    enabled: !!slug,
  })

  const [form, setForm] = useState({ name: '', description: '', teacherId: '' })
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', teacherId: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null)

  const createMutation = useMutation({
    mutationFn: () => apiService.post(`/api/admin/${slug}/courses`, { ...form, teacherId: form.teacherId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      resetForm()
      toast('Curso creado.')
    },
    onError: () => toast('Error al crear curso.', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: () => {
      const course = courses.find((x) => x.id === editId)
      return apiService.put(`/api/admin/${slug}/courses/${editId}`, {
        ...editForm,
        teacherId: editForm.teacherId || undefined,
        isActive: course?.isActive ?? true,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      setEditId(null)
      toast('Curso actualizado.')
    },
    onError: () => toast('Error al actualizar.', 'error'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiService.patch(`/api/admin/${slug}/courses/${id}/active`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      toast('Estado actualizado.')
    },
    onError: () => toast('Error al cambiar estado.', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.del(`/api/admin/${slug}/courses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      setDeleteCourse(null)
      toast('Curso eliminado.')
    },
    onError: () => toast('Error al eliminar. Puede tener alumnos asociados.', 'error'),
  })

  function resetForm() {
    setForm({ name: '', description: '', teacherId: '' })
    setErrors({})
  }

  function openEdit(course: Course) {
    setEditId(course.id)
    setEditForm({
      name: course.name,
      description: course.description ?? '',
      teacherId: course.teacherId ?? '',
    })
  }

  function validate() {
    const nextErrors: Record<string, string> = {}
    if (!form.name.trim()) nextErrors.name = 'El nombre es obligatorio.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!validate()) return
    createMutation.mutate()
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-blue-600" /></div>
  }

  return (
    <div className="space-y-5 pb-8">
      <CoursesHeader
        total={courses.length}
        active={courses.filter((c) => c.isActive).length}
        teachers={teachers.length}
      />

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <TabButton active={activeTab === 'courses'} onClick={() => setActiveTab('courses')}>Cursos</TabButton>
        <TabButton active={activeTab === 'assignments'} onClick={() => setActiveTab('assignments')}>Asignar alumnos</TabButton>
      </div>

      {activeTab === 'courses' ? (
        <>
          <Card className="space-y-4 p-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Nuevo curso</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Carga el curso y asignale un profesor.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Nombre *" error={errors.name}>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field label="Descripcion">
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </Field>
                <Field label="Profesor">
                  <TeacherSelect value={form.teacherId} teachers={teachers} onChange={(teacherId) => setForm({ ...form, teacherId })} />
                </Field>
              </div>
              <Button type="submit" loading={createMutation.isPending} className="bg-blue-600 text-white hover:bg-blue-500">Crear curso</Button>
            </form>
          </Card>

          <CoursesGrid
            courses={courses}
            onOpenDetail={(id) => navigate(`/admin/courses/${id}`)}
            onEdit={openEdit}
            onToggle={(course) => toggleMutation.mutate({ id: course.id, isActive: !course.isActive })}
            onDelete={setDeleteCourse}
          />
        </>
      ) : (
        <CourseAssignmentsPanel
          slug={slug}
          courses={courses}
          onChanged={() => {
            qc.invalidateQueries({ queryKey: ['admin-courses'] })
          }}
        />
      )}

      {editId && (
        <Modal open onClose={() => setEditId(null)} title="Editar curso" className="sm:max-w-md">
          <div className="space-y-4 px-5 py-4 sm:px-6">
            <Field label="Nombre *">
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </Field>
            <Field label="Descripcion">
              <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </Field>
            <Field label="Profesor">
              <TeacherSelect value={editForm.teacherId} teachers={teachers} onChange={(teacherId) => setEditForm({ ...editForm, teacherId })} />
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditId(null)}>Cancelar</Button>
              <Button loading={updateMutation.isPending} onClick={() => updateMutation.mutate()} className="bg-blue-600 text-white hover:bg-blue-500">Guardar</Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmModal
        open={!!deleteCourse}
        onClose={() => setDeleteCourse(null)}
        title="Eliminar curso"
        message={deleteCourse ? `Estas seguro de eliminar "${deleteCourse.name}"? Los alumnos quedaran sin esta asignacion.` : ''}
        confirmText="Eliminar"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteCourse) deleteMutation.mutate(deleteCourse.id) }}
      />
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
        active
          ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white'
          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
      }`}
    >
      {children}
    </button>
  )
}

function CoursesHeader({ total, active, teachers }: { total: number; active: number; teachers: number }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase text-blue-600 dark:text-blue-300">Academico</div>
          <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Cursos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Administra cursos, profesores y alumnos asignados.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:w-80">
          <HeaderStat label="Total" value={total} />
          <HeaderStat label="Activos" value={active} />
          <HeaderStat label="Profesores" value={teachers} />
        </div>
      </div>
    </section>
  )
}

function HeaderStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-0.5 text-lg font-black text-slate-950 dark:text-white">{value}</div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
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
          <li>Usa una fila por cada asignacion.</li>
          <li>Para poner un alumno en dos cursos, repetis el correo en dos filas con cursos distintos.</li>
          <li>El nombre del curso debe coincidir con el curso cargado.</li>
          <li>La frecuencia debe existir en los precios del curso.</li>
          <li>Si el alumno ya estaba en ese curso, se actualiza la frecuencia.</li>
        </ul>
      </div>
    </details>
  )
}

function CoursesGrid({
  courses,
  onOpenDetail,
  onEdit,
  onToggle,
  onDelete,
}: {
  courses: Course[]
  onOpenDetail: (id: string) => void
  onEdit: (course: Course) => void
  onToggle: (course: Course) => void
  onDelete: (course: Course) => void
}) {
  if (courses.length === 0) {
    return <EmptyState icon="C" title="Sin cursos" description="Crea tu primer curso para empezar." />
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => (
        <Card key={course.id} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{course.name}</h3>
              {course.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{course.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {course.teacherName && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{course.teacherName}</span>}
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {(course.classesPerWeekOptions ?? []).length} precios
                </span>
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              course.isActive
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              {course.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => onOpenDetail(course.id)}>Detalle</Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(course)}>Editar</Button>
            <Button variant="outline" size="sm" onClick={() => onToggle(course)}>{course.isActive ? 'Desactivar' : 'Activar'}</Button>
            <Button variant="outline" size="sm" className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30" onClick={() => onDelete(course)}>Eliminar</Button>
          </div>
        </Card>
      ))}
    </div>
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
      toast('Asignacion guardada.')
      qc.invalidateQueries({ queryKey: ['course-assignment-students'] })
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      onChanged()
    },
    onError: (error: Error) => toast(error.message || 'No se pudo guardar la asignacion.', 'error'),
  })

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiService.postForm<ImportResult>(`/api/admin/${slug}/courses/import-students-excel`, formData)
    },
    onSuccess: (result) => {
      setImportResult(result)
      toast('Importacion finalizada.')
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
                Cada curso mantiene su propia nomina. Un alumno puede quedar asignado en mas de un curso.
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
                Guardar asignacion
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
                <div className="font-bold">Importacion finalizada</div>
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
            <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{hasMissingClasses ? 'Falta frecuencia' : `Pag. ${currentStudentPage}/${totalStudentPages}`}</div>
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
