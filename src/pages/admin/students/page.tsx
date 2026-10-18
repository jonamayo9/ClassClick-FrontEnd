import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { apiService } from '@/lib/api'
import { imgUrl } from '@/lib/media'
import { useAuth } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Select } from '@/components/ui/select'
import { ActionMenu } from '@/components/ui/action-menu'
import { Pagination } from '@/components/ui/pagination'
import { AxiosError } from 'axios'
import { createWhatsAppUrl } from '@/lib/whatsapp'
import {
  Users, UserCheck, UsersRound, UserRoundX, Plus, FileSpreadsheet, Search,
  RotateCcw, Download, Eye, Pencil, ChevronRight, BookOpen, Upload,
} from 'lucide-react'

interface Student {
  id: string; firstName: string; lastName: string; fullName?: string; email: string
  isActive: boolean; isRegistrationCompleted: boolean; dni: string | null
  dateOfBirth: string | null; phone: string | null; whatsAppNumber?: string | null
  address: string | null
  emergencyContactName: string | null; emergencyContactPhone: string | null
  hasHealthInsurance: boolean; healthInsuranceName: string | null
  healthInsuranceMemberNumber: string | null; healthInsurancePlan: string | null
  memberNumber: string | null; notes: string | null; profileImageUrl: string | null; photoUrl: string | null
  courseCount: number
}

interface CourseOption { id: string; name: string }
interface PaginatedResult<T> {
  items: T[]
  totalCount: number
  totalPages: number
  page: number
  pageSize: number
  totalStudents?: number
  activeStudents?: number
  registeredStudents?: number
  pendingStudents?: number
}

interface StudentCourseEnrollment {
  courseId: string
  courseName: string
  teacherName: string | null
  isActive: boolean
  classesPerWeek: number
  enrolledAtUtc: string
}

interface StudentCharge {
  id: string
  courseId: string
  courseName: string
  year: number
  month: number
  status: string | number
  finalAmount: number
  dueDateUtc: string
  paidAtUtc: string | null
  paymentId: string | null
  paymentMethod: string | number | null
  chargeTypeName: string | null
  notes: string | null
}

interface StudentAccountStatus {
  studentId: string
  studentFullName: string
  totalCharges: number
  paidCharges: number
  pendingCharges: number
  overdueCharges: number
  totalDebt: number
  totalPaid: number
  charges: StudentCharge[]
}

function useSlug() { return useAuth((s) => s.activeCompanySlug ?? '') }

function initials(name: string) { return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() }
const avatarColors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-pink-500']
function avatarColor(name: string) { let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return avatarColors[Math.abs(h) % avatarColors.length] }
function fullName(s: Student) { return s.fullName ?? `${s.firstName} ${s.lastName}` }

function StudentAvatar({ student, className }: { student: Student; className?: string }) {
  const src = imgUrl(student.photoUrl ?? student.profileImageUrl)
  const [error, setError] = useState(false)
  const name = fullName(student)
  if (src && !error) return <img src={src} alt={name} className={`${className ?? 'h-9 w-9'} shrink-0 rounded-full object-cover`} onError={() => setError(true)} />
  return <div className={`${className ?? 'h-9 w-9'} flex shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(name)}`}>{initials(name)}</div>
}

const regBadge = (c: boolean) => c ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
const activeBadge = (a: boolean) => a ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400'

const arsFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
function money(value: number | null | undefined) { return arsFmt.format(Number(value ?? 0)) }
function fmtDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
function monthLabel(month: number) { return monthNames[month - 1] ?? String(month) }

const chargeStatusMap: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
  paid: { label: 'Pagada', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  overdue: { label: 'Vencida', className: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' },
  cancelled: { label: 'Cancelada', className: 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400' },
  refundpendingstudentapproval: { label: 'Pend. aprobación', className: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' },
}
const chargeStatusNumeric: Record<string, string> = { '1': 'pending', '2': 'paid', '3': 'overdue', '4': 'cancelled', '5': 'refundpendingstudentapproval' }
function chargeStatusKey(status: string | number) {
  const raw = String(status).toLowerCase().trim()
  return chargeStatusNumeric[raw] ?? raw
}
function chargeStatusMeta(status: string | number) {
  const key = chargeStatusKey(status)
  return chargeStatusMap[key] ?? { label: String(status), className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' }
}

type KpiTone = 'violet' | 'green' | 'blue' | 'amber'

const kpiTones: Record<KpiTone, { icon: string; text: string }> = {
  violet: { icon: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400', text: 'text-violet-600 dark:text-violet-400' },
  green: { icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400', text: 'text-emerald-600 dark:text-emerald-400' },
  blue: { icon: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400', text: 'text-blue-600 dark:text-blue-400' },
  amber: { icon: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400', text: 'text-amber-600 dark:text-amber-400' },
}

export default function StudentsPage() { return <ToastProvider><StudentsPageInner /></ToastProvider> }

function StudentsPageInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const slug = useSlug()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [regFilter, setRegFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [exporting, setExporting] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const searchTimer = useRef<number | undefined>(undefined)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['students', slug, search, regFilter, activeFilter, courseFilter, page, pageSize],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (regFilter) params.set('isRegistrationCompleted', regFilter)
      if (activeFilter) params.set('isActive', activeFilter)
      if (courseFilter) params.set('courseId', courseFilter)
      params.set('page', String(page)); params.set('pageSize', String(pageSize))
      return apiService.get<PaginatedResult<Student>>(`/api/admin/${slug}/students?${params}`)
    },
    enabled: !!slug,
    placeholderData: (prev) => prev,
  })
  const { data: courses } = useQuery({
    queryKey: ['admin-courses', slug],
    queryFn: () => apiService.get<CourseOption[]>(`/api/admin/${slug}/courses`),
    enabled: !!slug,
  })
  const students = data?.items ?? []; const totalCount = data?.totalCount ?? 0
  const totalStudents = data?.totalStudents ?? 0
  const activeStudents = data?.activeStudents ?? 0
  const registeredStudents = data?.registeredStudents ?? 0
  const pendingStudents = data?.pendingStudents ?? 0
  const percent = (n: number) => (totalStudents > 0 ? Math.round((n / totalStudents) * 100) : 0)

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', memberNumber: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [detailStudent, setDetailStudent] = useState<Student | null>(null)
  const [detailGuardians, setDetailGuardians] = useState<{ firstName: string; lastName: string; email?: string; phone?: string; documentNumber?: string; relationshipType?: number; canPayCharges?: boolean; isPrimary?: boolean }[]>([])
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', isActive: true, memberNumber: '' })
  const [toggleStudent, setToggleStudent] = useState<Student | null>(null)
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null)
  const [resetPwStudent, setResetPwStudent] = useState<Student | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[]; errorDetails?: { row: number; field?: string; message: string }[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const detailCoursesQuery = useQuery({
    queryKey: ['student-courses', slug, detailStudent?.id],
    queryFn: () => apiService.get<StudentCourseEnrollment[]>(`/api/admin/${slug}/students/${detailStudent!.id}/courses`),
    enabled: !!slug && !!detailStudent,
  })
  const detailAccountQuery = useQuery({
    queryKey: ['student-account', slug, detailStudent?.id],
    queryFn: () => apiService.get<StudentAccountStatus>(`/api/admin/${slug}/monthly-charges/student/${detailStudent!.id}/account-status`),
    enabled: !!slug && !!detailStudent,
    retry: false,
  })

  const debouncedSearch = (value: string) => {
    clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => { setSearch(value); setPage(1) }, 350)
  }

  function clearFilters() {
    clearTimeout(searchTimer.current)
    setSearchInput(''); setSearch(''); setRegFilter(''); setActiveFilter(''); setCourseFilter(''); setPage(1)
  }

  async function handleExport() {
    if (!slug || exporting) return
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (regFilter) params.set('isRegistrationCompleted', regFilter)
      if (activeFilter) params.set('isActive', activeFilter)
      if (courseFilter) params.set('courseId', courseFilter)
      const qs = params.toString()
      const blob = await apiService.getBlob(`/api/admin/${slug}/students/export${qs ? '?' + qs : ''}`)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `alumnos_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast('Error al exportar. Intentá nuevamente.', 'error')
    }
    setExporting(false)
  }

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => apiService.post(`/api/admin/${slug}/students`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); resetForm(); setShowCreate(false); toast('Alumno creado correctamente.') },
    onError: () => toast('Error al crear el alumno.', 'error'),
  })
  const resendGoogleInvitationMutation = useMutation({
    mutationFn: (id: string) => apiService.post(`/api/admin/${slug}/students/${id}/google-invitation`, {}),
    onSuccess: () => toast('Invitación Google reenviada.'),
    onError: () => toast('No se pudo reenviar la invitación Google.', 'error'),
  })
  const updateMutation = useMutation({
    mutationFn: () => apiService.put(`/api/admin/${slug}/students/${editStudent!.id}`, editForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); setEditStudent(null); toast('Alumno actualizado.') },
    onError: () => toast('Error al actualizar.', 'error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.del(`/api/admin/${slug}/students/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); setDeleteStudent(null); toast('Alumno eliminado.') },
    onError: (e: Error) => {
      const axiosError = e as AxiosError<{ message?: string }>
      const serverMsg = axiosError.response?.data?.message
      toast(serverMsg || 'Error al eliminar. El alumno puede tener cursos, pagos o tutores asociados.', 'error')
    },
  })
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiService.patch(`/api/admin/${slug}/students/${id}/active`, { isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); setToggleStudent(null); toast('Estado actualizado.') },
    onError: () => toast('Error al cambiar estado.', 'error'),
  })
  const resetPwMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => apiService.post(`/api/admin/${slug}/students/${id}/reset-password`, { newPassword, confirmNewPassword: confirmPassword }),
    onSuccess: () => { setResetPwStudent(null); setNewPassword(''); setConfirmPassword(''); toast('Contraseña actualizada.') },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al resetear contraseña.'
      toast(msg, 'error')
    },
  })
  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData(); fd.append('file', file)
      return apiService.postForm(`/api/admin/${slug}/students/import-excel`, fd)
    },
    onSuccess: (d: unknown) => {
      const r = d as Record<string, unknown>
      const rawErrors = (r?.errors as string[]) ?? []
      const rawDetails = (r?.errorDetails as unknown[]) ?? []
      const errorDetails = rawDetails.map((e: any) => ({ row: Number(e?.row ?? 0), field: e?.field ?? '', message: e?.message ?? '' }))
      setImportResult({ created: Number(r?.created ?? 0), skipped: Number(r?.skipped ?? 0), errors: rawErrors, errorDetails })
      qc.invalidateQueries({ queryKey: ['students'] })
    },
    onError: () => setImportResult({ created: 0, skipped: 0, errors: ['Error al importar. Verificá el formato del archivo.'], errorDetails: [] }),
  })

  function validate() {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'Requerido'
    if (!form.lastName.trim()) e.lastName = 'Requerido'
    if (!form.email.trim()) e.email = 'Requerido'
    setErrors(e); return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); if (!validate()) return; createMutation.mutate(form) }
  function resetForm() { setForm({ firstName: '', lastName: '', email: '', password: '', memberNumber: '' }); setErrors({}) }
  function openCreate() { resetForm(); setShowCreate(true) }
  function closeCreate() { setShowCreate(false); resetForm() }
  function openEdit(s: Student) { setEditStudent(s); setEditForm({ firstName: s.firstName, lastName: s.lastName, email: s.email, isActive: s.isActive, memberNumber: s.memberNumber ?? '' }) }
  function openDetail(s: Student) {
    setDetailStudent(s)
    apiService.get<unknown[]>(`/api/admin/${slug}/students/${s.id}/guardians`).then((data) => {
      if (Array.isArray(data)) setDetailGuardians(data as typeof detailGuardians)
    }).catch(() => setDetailGuardians([]))
  }

  function overflowActions(s: Student) {
    return [
      { label: s.isActive ? 'Desactivar' : 'Activar', onClick: () => setToggleStudent(s) },
      { label: 'Resetear contraseña', onClick: () => setResetPwStudent(s) },
      { label: 'Reenviar invitación Google', onClick: () => resendGoogleInvitationMutation.mutate(s.id) },
      { label: 'Eliminar', onClick: () => setDeleteStudent(s), danger: true },
    ]
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-white sm:text-[26px]">Alumnos</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-[13px]">Creación, edición y gestión de alumnos</p>
        </div>
        <div className="hidden shrink-0 items-center gap-2.5 sm:flex">
          <Button variant="outline" className="h-10" onClick={() => setShowImport(true)}>
            <FileSpreadsheet className="h-4 w-4" /> Importar Excel
          </Button>
          <Button className="h-10 bg-blue-600 text-white hover:bg-blue-500" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo alumno
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3.5">
        <KpiCard icon={Users} tone="violet" value={totalStudents} label="Total de alumnos" />
        <KpiCard icon={UserCheck} tone="green" value={activeStudents} label="Activos" percent={percent(activeStudents)} />
        <KpiCard icon={UsersRound} tone="blue" value={registeredStudents} label="Registrados" percent={percent(registeredStudents)} />
        <KpiCard icon={UserRoundX} tone="amber" value={pendingStudents} label="Pendientes" percent={percent(pendingStudents)} />
      </div>

      {/* Mobile actions */}
      <div className="flex flex-col gap-2.5 sm:hidden">
        <Button className="h-[42px] w-full bg-blue-600 text-white hover:bg-blue-500" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuevo alumno
        </Button>
        <Button variant="outline" className="h-[42px] w-full" onClick={() => setShowImport(true)}>
          <FileSpreadsheet className="h-4 w-4" /> Importar Excel
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative min-w-0 sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); debouncedSearch(e.target.value) }}
              placeholder="Buscar por nombre, email o DNI..."
              autoComplete="off"
              className="pl-10"
            />
          </div>
          <div className="sm:w-44">
            <Select value={regFilter} onChange={(e) => { setRegFilter(e.target.value); setPage(1) }} aria-label="Filtro por registro">
              <option value="">Todos los registros</option>
              <option value="true">Registrados</option>
              <option value="false">Pendientes</option>
            </Select>
          </div>
          <div className="sm:w-40">
            <Select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }} aria-label="Filtro por estado">
              <option value="">Todos los estados</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </Select>
          </div>
          <div className="sm:w-44">
            <Select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1) }} aria-label="Filtro por curso">
              <option value="">Todos los cursos</option>
              {courses?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <Button variant="outline" className="h-11 shrink-0" onClick={clearFilters}>
            <RotateCcw className="h-4 w-4" /> Limpiar
          </Button>
        </div>
      </Card>

      {/* Listing */}
      <Card className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Listado de alumnos</h2>
            <span className="text-xs text-slate-400">({totalCount})</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} loading={exporting} disabled={exporting || totalCount === 0}>
            <Download className="h-3.5 w-3.5" /> Exportar
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
        ) : isError ? (
          <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">No se pudieron cargar los alumnos. Intentá nuevamente.</div>
        ) : students.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">No hay alumnos cargados.</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-[0.4px] text-slate-400 dark:border-slate-800 dark:text-slate-400">
                    <th className="px-3 py-3 font-semibold">Nombre</th>
                    <th className="px-3 py-3 font-semibold">Contacto</th>
                    <th className="px-3 py-3 text-center font-semibold">Registro</th>
                    <th className="px-3 py-3 text-center font-semibold">Estado</th>
                    <th className="px-3 py-3 text-center font-semibold">Cursos</th>
                    <th className="px-3 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {students.map((s) => (
                    <tr key={s.id} onClick={() => openDetail(s)}
                      className="group cursor-pointer transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5">
                        <button type="button" onClick={(e) => { e.stopPropagation(); openDetail(s) }}
                          className="flex items-center gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                          <StudentAvatar student={s} className="h-10 w-10" />
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900 transition group-hover:text-blue-600 dark:text-white">{fullName(s)}</div>
                            <div className="truncate text-xs text-slate-400">{s.dni ? `DNI ${s.dni}` : 'Sin DNI'}</div>
                          </div>
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="max-w-[220px] truncate text-[13px] text-slate-500 dark:text-slate-400" title={s.email}>{s.email}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${regBadge(s.isRegistrationCompleted)}`}>{s.isRegistrationCompleted ? 'Registrado' : 'Pendiente'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${activeBadge(s.isActive)}`}>{s.isActive ? 'Activo' : 'Inactivo'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">
                          <BookOpen className="h-3.5 w-3.5 text-slate-400" /> {s.courseCount}
                        </span>
                      </td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          <IconButton label="Ver detalle" onClick={() => openDetail(s)}><Eye className="h-4 w-4" /></IconButton>
                          <IconButton label="Editar" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></IconButton>
                          <ActionMenu actions={overflowActions(s)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col gap-2 md:hidden">
              {students.map((s) => (
                <div key={s.id} role="button" tabIndex={0}
                  onClick={() => openDetail(s)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(s) } }}
                  className="cursor-pointer rounded-[10px] border border-slate-200 bg-white p-3 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <StudentAvatar student={s} className="h-11 w-11" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{fullName(s)}</p>
                      <p className="truncate text-xs text-slate-400">{s.dni ? `DNI ${s.dni}` : s.email}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${regBadge(s.isRegistrationCompleted)}`}>{s.isRegistrationCompleted ? 'Registrado' : 'Pendiente'}</span>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${activeBadge(s.isActive)}`}>{s.isActive ? 'Activo' : 'Inactivo'}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <BookOpen className="h-3 w-3" /> {s.courseCount}
                    </span>
                    <div className="ml-auto" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <ActionMenu actions={overflowActions(s)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

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
          </>
        )}
      </Card>

      {/* Create Modal */}
      {showCreate && (
        <Modal
          open={true}
          onClose={closeCreate}
          title="Nuevo alumno"
          description="Alta inicial — luego completa su perfil desde la app"
          className="sm:max-w-[600px]"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={closeCreate}>Cancelar</Button>
              <Button type="submit" form="create-student-form" loading={createMutation.isPending} className="bg-blue-600 text-white hover:bg-blue-500">Guardar alumno</Button>
            </div>
          }
        >
          <form id="create-student-form" onSubmit={handleSubmit} autoComplete="off" className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
            <Field label="Nombre" error={errors.firstName}><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
            <Field label="Apellido" error={errors.lastName}><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
            <Field label="Email" error={errors.email}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Contraseña" error={errors.password}><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Field label="N° Carnet" error={errors.memberNumber}>
                <Input value={form.memberNumber} onChange={(e) => setForm({ ...form, memberNumber: e.target.value })} placeholder="Automático" maxLength={15} />
              </Field>
            </div>
          </form>
        </Modal>
      )}

      {/* Import Modal */}
      {showImport && (
        <Modal
          open={true}
          onClose={() => setShowImport(false)}
          title="Importar alumnos"
          description="Cargá varios alumnos desde un archivo .xlsx."
          className="sm:max-w-lg"
        >
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={async () => {
                try {
                  const blob = await apiService.getBlob(`/api/admin/${slug}/students/import-template`)
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = 'plantilla-importacion-alumnos.xlsx'
                  document.body.appendChild(a); a.click(); a.remove()
                  URL.revokeObjectURL(url)
                } catch { toast('Error al descargar la plantilla.', 'error') }
              }}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> Descargar plantilla
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} loading={importMutation.isPending}>
                <Upload className="h-3.5 w-3.5" /> Seleccionar archivo
              </Button>
              <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importMutation.mutate(f)
                e.target.value = ''
              }} />
            </div>

            <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <summary className="cursor-pointer text-xs font-semibold text-blue-700 dark:text-blue-300">Ver formato esperado</summary>
              <div className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                <p className="font-semibold">Columnas del archivo (en orden):</p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <p><b>Nombre</b> — obligatorio</p>
                  <p><b>Apellido</b> — obligatorio</p>
                  <p><b>Correo</b> — obligatorio, único por empresa</p>
                  <p><b>Contraseña</b> — obligatoria si MetodoAcceso es password</p>
                  <p><b>MetodoAcceso</b> — opcional. Valores: <code>password</code>, <code>google</code> o vacío (equivale a password)</p>
                  <p><b>Contraseña</b> — obligatoria si MetodoAcceso es <code>password</code> o está vacío</p>
                  <p><b>N° Carnet</b> — opcional, se genera automáticamente si se deja vacío</p>
                </div>
                <p className="mt-1 text-blue-600 dark:text-blue-400"><b>MetodoAcceso:</b> vacío o <code>password</code> = el alumno inicia sesión con email y contraseña (contraseña obligatoria). <code>google</code> = el alumno inicia sesión con Google (contraseña no obligatoria).</p>
              </div>
            </details>

            {importResult && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Importación finalizada</p>
                <div className="mt-1 flex gap-4 text-xs text-emerald-700 dark:text-emerald-300">
                  <span>Creados: <b>{importResult.created}</b></span>
                  <span>Omitidos: <b>{importResult.skipped}</b></span>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Errores por fila:</p>
                    {(() => {
                      const groups: Record<string, { count: number; rows: number[] }> = {}
                      for (const err of importResult.errorDetails?.length ? importResult.errorDetails : importResult.errors.map((e, i) => {
                        const m = e.match(/Fila (\d+): (.+)/)
                        return { row: m ? Number(m[1]) : i + 2, message: m ? m[2] : e }
                      })) {
                        if (!groups[err.message]) groups[err.message] = { count: 0, rows: [] }
                        groups[err.message].count++
                        groups[err.message].rows.push(err.row)
                      }
                      return Object.entries(groups).map(([msg, info]) => (
                        <details key={msg} className="text-[11px]">
                          <summary className="cursor-pointer text-rose-600 dark:text-rose-400">{info.count} fila(s): {msg}</summary>
                          {info.rows.length > 0 && (
                            <p className="ml-2 text-slate-500">Filas: {info.rows.join(', ')}</p>
                          )}
                        </details>
                      ))
                    })()}
                  </div>
                )}

                {importResult.errors.length > 0 && (
                  <button type="button" onClick={() => {
                    const header = 'Fila,Error\n'
                    const rows = importResult!.errorDetails?.length
                      ? importResult!.errorDetails.map(e => `${e.row},"${e.message}"`).join('\n')
                      : importResult!.errors.map(e => {
                          const m = e.match(/Fila (\d+): (.+)/)
                          return m ? `${m[1]},"${m[2]}"` : `,${e}`
                        }).join('\n')
                    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = `errores-importacion-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
                    URL.revokeObjectURL(url)
                  }} className="mt-2 text-xs font-semibold text-rose-600 underline hover:text-rose-500 dark:text-rose-400">
                    Descargar reporte de errores (CSV)
                  </button>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editStudent && (
        <Modal open={true} onClose={() => setEditStudent(null)} title="Editar alumno" className="sm:max-w-md">
          <div className="px-5 py-4 sm:px-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre</label><Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Apellido</label><Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} /></div>
            </div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Email</label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">N° Carnet</label><Input value={editForm.memberNumber} onChange={(e) => setEditForm({ ...editForm, memberNumber: e.target.value })} placeholder="Automático" maxLength={15} /></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditStudent(null)}>Cancelar</Button>
              <Button loading={updateMutation.isPending} onClick={() => updateMutation.mutate()} className="bg-blue-600 text-white hover:bg-blue-500">Guardar cambios</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      {detailStudent && (
        <Modal open={true} onClose={() => setDetailStudent(null)} title="Detalle del alumno" className="sm:max-w-2xl">
          <div className="px-5 py-4 sm:px-6 space-y-5 text-sm">
            <div>
              <div className="flex items-start gap-4">
                <StudentAvatar student={detailStudent} className="h-14 w-14" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-slate-900 dark:text-white">{fullName(detailStudent)}</p>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">{detailStudent.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${activeBadge(detailStudent.isActive)}`}>{detailStudent.isActive ? 'Activo' : 'Inactivo'}</span>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${regBadge(detailStudent.isRegistrationCompleted)}`}>{detailStudent.isRegistrationCompleted ? 'Registrado' : 'Pendiente'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Contacto</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <RowDetail label="Teléfono" value={detailStudent.phone} />
                <RowDetail label="WhatsApp" value={detailStudent.whatsAppNumber ?? '—'} />
              </div>
              {(() => {
                const waUrl = createWhatsAppUrl(detailStudent.whatsAppNumber)
                if (!waUrl) return null
                const companyName = (useAuth.getState().companies.find(c => (c.slug ?? c.companySlug) === useAuth.getState().activeCompanySlug)?.name ?? 'ClassClick')
                const msg = encodeURIComponent(`Hola ${detailStudent.firstName}, te contactamos desde ${companyName}.`)
                return (
                  <a href={`${waUrl}?text=${msg}`} target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Enviar WhatsApp
                  </a>
                )
              })()}
            </div>

            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Datos personales</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                <RowDetail label="N° de carnet" value={detailStudent.memberNumber} />
                <RowDetail label="DNI" value={detailStudent.dni} />
                <RowDetail label="Registro" value={detailStudent.isRegistrationCompleted ? 'Registrado' : 'Pendiente'} />
                <RowDetail label="Nacimiento" value={detailStudent.dateOfBirth ? fmtDate(detailStudent.dateOfBirth) : '-'} />
                <RowDetail label="Obra social" value={detailStudent.hasHealthInsurance ? detailStudent.healthInsuranceName ?? 'Sí' : 'No'} />
                <RowDetail label="Dirección" value={detailStudent.address} />
              </div>
            </div>

            {detailStudent.emergencyContactName && (
              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Emergencia</h3>
                <RowDetail label="Contacto" value={`${detailStudent.emergencyContactName} (${detailStudent.emergencyContactPhone ?? '—'})`} />
              </div>
            )}

            {detailGuardians.length > 0 && (
              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Tutores / Responsables</h3>
                <div className="space-y-2">
                  {detailGuardians.map((g: any, i: number) => {
                    const waNum = g.whatsAppNumber ?? g.whatsappNumber ?? g.WhatsAppNumber
                    const waUrl = createWhatsAppUrl(waNum)
                    const companyName = (useAuth.getState().companies.find(c => (c.slug ?? c.companySlug) === useAuth.getState().activeCompanySlug)?.name ?? 'ClassClick')
                    return (
                      <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold">{g.firstName} {g.lastName}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">{g.email}{g.phone ? ` · ${g.phone}` : ''}</p>
                          </div>
                          {g.isPrimary && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">Principal</span>}
                        </div>
                        {waUrl && (
                          <a href={`${waUrl}?text=${encodeURIComponent(`Hola ${g.firstName}, te contactamos desde ${companyName}.`)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-emerald-700 transition">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            Enviar WhatsApp
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {detailStudent.notes && (
              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Notas</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">{detailStudent.notes}</p>
              </div>
            )}

            {/* Cursos e inscripciones */}
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cursos e inscripciones</h3>
                {(detailCoursesQuery.data?.length ?? 0) > 0 && (
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {detailCoursesQuery.data!.filter((c) => c.isActive).length} activo(s) · {detailCoursesQuery.data!.length} en total
                  </span>
                )}
              </div>
              {detailCoursesQuery.isLoading ? (
                <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>
              ) : detailCoursesQuery.isError ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No se pudieron cargar los cursos.</p>
              ) : (detailCoursesQuery.data?.length ?? 0) === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">Sin cursos asociados.</p>
              ) : (
                <div className="space-y-2">
                  {detailCoursesQuery.data!.map((c) => (
                    <div key={c.courseId} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{c.courseName}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {c.teacherName ? `Prof. ${c.teacherName}` : 'Sin profesor asignado'} · {c.classesPerWeek} clase(s)/semana
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${activeBadge(c.isActive)}`}>{c.isActive ? 'Activo' : 'Inactivo'}</span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-400">Inscripción: {fmtDate(c.enrolledAtUtc)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Situación económica */}
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Situación económica</h3>
              {detailAccountQuery.isLoading ? (
                <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>
              ) : detailAccountQuery.isError ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No se pudo cargar la situación económica. Puede requerir el módulo de Pagos.</p>
              ) : detailAccountQuery.data ? (() => {
                const account = detailAccountQuery.data
                const groups: { courseId: string; courseName: string; charges: StudentCharge[] }[] = []
                for (const ch of account.charges) {
                  let g = groups.find((x) => x.courseId === ch.courseId)
                  if (!g) { g = { courseId: ch.courseId, courseName: ch.courseName, charges: [] }; groups.push(g) }
                  g.charges.push(ch)
                }
                const today = new Date(); today.setHours(0, 0, 0, 0)
                const upcoming = account.charges
                  .filter((ch) => chargeStatusKey(ch.status) === 'pending' && new Date(ch.dueDateUtc).getTime() >= today.getTime())
                  .sort((a, b) => new Date(a.dueDateUtc).getTime() - new Date(b.dueDateUtc).getTime())
                  .slice(0, 3)
                return (
                  <>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <StatTile label="Deuda pendiente" value={money(account.totalDebt)} tone="rose" />
                      <StatTile label="Total pagado" value={money(account.totalPaid)} tone="emerald" />
                      <StatTile label="Cuotas pendientes" value={account.pendingCharges} tone="amber" />
                      <StatTile label="Cuotas vencidas" value={account.overdueCharges} tone="rose" />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">{account.totalCharges} cuota(s) en total · {account.paidCharges} pagada(s)</p>

                    {upcoming.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Próximos vencimientos</p>
                        <div className="space-y-1">
                          {upcoming.map((ch) => (
                            <div key={`up-${ch.id}`} className="flex items-center justify-between gap-2 text-xs">
                              <span className="truncate text-slate-600 dark:text-slate-300">{ch.courseName} · {monthLabel(ch.month)} {ch.year}</span>
                              <span className="shrink-0 font-semibold tabular-nums text-slate-700 dark:text-slate-200">{money(ch.finalAmount)} <span className="font-normal text-slate-400">· {fmtDate(ch.dueDateUtc)}</span></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {groups.length === 0 ? (
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Sin cuotas registradas.</p>
                    ) : groups.map((g) => (
                      <div key={g.courseId} className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                          <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{g.courseName}</p>
                          <span className="shrink-0 text-[11px] text-slate-400">{g.charges.length} cuota(s)</span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {g.charges.map((ch) => {
                            const meta = chargeStatusMeta(ch.status)
                            return (
                              <div key={ch.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-slate-700 dark:text-slate-200">
                                    {monthLabel(ch.month)} {ch.year}{ch.chargeTypeName ? ` · ${ch.chargeTypeName}` : ''}
                                  </p>
                                  <p className="text-[11px] text-slate-400">
                                    Vence {fmtDate(ch.dueDateUtc)}{ch.paidAtUtc ? ` · Pagada ${fmtDate(ch.paidAtUtc)}` : ''}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{money(ch.finalAmount)}</span>
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.className}`}>{meta.label}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </>
                )
              })() : null}
            </div>
          </div>
        </Modal>
      )}

      {/* Toggle Modal */}
      <ConfirmModal open={!!toggleStudent} onClose={() => setToggleStudent(null)}
        title={toggleStudent?.isActive ? 'Desactivar alumno' : 'Activar alumno'}
        message={toggleStudent ? `¿${toggleStudent.isActive ? 'Desactivar' : 'Activar'} a ${fullName(toggleStudent)}?` : ''}
        confirmText={toggleStudent?.isActive ? 'Desactivar' : 'Activar'}
        variant={toggleStudent?.isActive ? 'danger' : 'primary'}
        loading={toggleMutation.isPending}
        onConfirm={() => { if (toggleStudent) toggleMutation.mutate({ id: toggleStudent.id, isActive: !toggleStudent.isActive }) }} />

      {/* Delete Modal */}
      <ConfirmModal open={!!deleteStudent} onClose={() => setDeleteStudent(null)}
        title="Eliminar alumno"
        message={deleteStudent
          ? `¿Eliminar a "${fullName(deleteStudent)}"? Esta acción no se puede deshacer.`
          : ''}
        confirmText="Eliminar"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteStudent) deleteMutation.mutate(deleteStudent.id) }} />

      {/* Reset Password Modal */}
      {resetPwStudent && (
        <Modal open={true} onClose={() => { setResetPwStudent(null); setNewPassword(''); setConfirmPassword('') }} title="Resetear contraseña" className="sm:max-w-md">
          <div className="px-5 py-4 sm:px-6 space-y-4">
            <p className="text-sm text-slate-500">Nueva contraseña para <strong>{resetPwStudent.email}</strong></p>
            <div className="space-y-3">
              <Field label="Nueva contraseña">
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
              </Field>
              <Field label="Confirmar contraseña">
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
              </Field>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Las contraseñas no coinciden.</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setResetPwStudent(null); setNewPassword(''); setConfirmPassword('') }}>Cancelar</Button>
              <Button loading={resetPwMutation.isPending} disabled={!newPassword || newPassword !== confirmPassword}
                className="bg-blue-600 text-white hover:bg-blue-500"
                onClick={() => resetPwMutation.mutate({ id: resetPwStudent.id })}>Guardar</Button>
            </div>
          </div>
        </Modal>
      )}
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

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200">
      {children}
    </button>
  )
}

function StatTile({ label, value, tone }: { label: string; value: string | number; tone: 'rose' | 'emerald' | 'amber' | 'blue' }) {
  const tones: Record<string, string> = {
    rose: 'text-rose-600 dark:text-rose-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    blue: 'text-blue-600 dark:text-blue-400',
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-base font-bold tabular-nums ${tones[tone]}`}>{value}</p>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>{children}{error && <p className="mt-1 text-xs text-red-500">{error}</p>}</div>
}

function RowDetail({ label, value, className }: { label: string; value: string | null | undefined; className?: string }) {
  return <div className={`rounded-xl bg-slate-50 p-3 dark:bg-slate-800 ${className ?? ''}`}><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p><p className="mt-0.5 text-sm font-semibold">{value ?? '-'}</p></div>
}
