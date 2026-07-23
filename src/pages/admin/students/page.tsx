import { useState, useEffect, useRef } from 'react'
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
import { AxiosError } from 'axios'
import { createWhatsAppUrl } from '@/lib/whatsapp'

interface Student {
  id: string; firstName: string; lastName: string; fullName?: string; email: string
  isActive: boolean; isRegistrationCompleted: boolean; dni: string | null
  dateOfBirth: string | null; phone: string | null; whatsAppNumber?: string | null
  address: string | null
  emergencyContactName: string | null; emergencyContactPhone: string | null
  hasHealthInsurance: boolean; healthInsuranceName: string | null
  healthInsuranceMemberNumber: string | null; healthInsurancePlan: string | null
  memberNumber: string | null; notes: string | null; profileImageUrl: string | null; photoUrl: string | null
}

interface CourseOption { id: string; name: string }
interface PaginatedResult<T> { items: T[]; totalCount: number; totalPages: number; page: number; pageSize: number }

function useSlug() { return useAuth((s) => s.activeCompanySlug ?? '') }

function initials(name: string) { return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() }
const avatarColors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-pink-500']
function avatarColor(name: string) { let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return avatarColors[Math.abs(h) % avatarColors.length] }

function StudentAvatar({ student, className }: { student: Student; className?: string }) {
  const src = imgUrl(student.photoUrl ?? student.profileImageUrl)
  const [error, setError] = useState(false)
  const name = student.fullName ?? `${student.firstName} ${student.lastName}`
  if (src && !error) return <img src={src} alt={name} className={`${className ?? 'h-9 w-9'} shrink-0 rounded-full object-cover`} onError={() => setError(true)} />
  return <div className={`${className ?? 'h-9 w-9'} flex shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(name)}`}>{initials(name)}</div>
}

const regBadge = (c: boolean) => c ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
const activeBadge = (a: boolean) => a ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'

function ActionMenu({ actions }: { actions: { label: string; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {actions.map((a) => (
            <button key={a.label} onClick={() => { setOpen(false); a.onClick() }}
              className={`flex w-full items-center px-4 py-2.5 text-left text-sm font-medium transition ${a.danger ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function StudentsPage() { return <ToastProvider><StudentsPageInner /></ToastProvider> }

function StudentsPageInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const slug = useSlug()

  const [search, setSearch] = useState('')
  const [regFilter, setRegFilter] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [page, setPage] = useState(1)
  const searchTimer = useRef<number | undefined>(undefined)

  const { data, isLoading } = useQuery({
    queryKey: ['students', slug, search, regFilter, courseFilter, page],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (regFilter) params.set('isRegistrationCompleted', regFilter)
      if (courseFilter) params.set('courseId', courseFilter)
      params.set('page', String(page)); params.set('pageSize', '20')
      return apiService.get<PaginatedResult<Student>>(`/api/admin/${slug}/students?${params}`)
    },
    enabled: !!slug,
  })
  const { data: courses } = useQuery({
    queryKey: ['admin-courses', slug],
    queryFn: () => apiService.get<CourseOption[]>(`/api/admin/${slug}/courses`),
    enabled: !!slug,
  })
  const students = data?.items ?? []; const totalCount = data?.totalCount ?? 0; const totalPages = data?.totalPages ?? 1

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

  const debouncedSearch = (value: string) => {
    clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => { setSearch(value); setPage(1) }, 350)
  }

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => apiService.post(`/api/admin/${slug}/students`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); resetForm(); toast('Alumno creado correctamente.') },
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
  function openEdit(s: Student) { setEditStudent(s); setEditForm({ firstName: s.firstName, lastName: s.lastName, email: s.email, isActive: s.isActive, memberNumber: s.memberNumber ?? '' }) }
  function openDetail(s: Student) {
    setDetailStudent(s)
    apiService.get<unknown[]>(`/api/admin/${slug}/students/${s.id}/guardians`).then((data) => {
      if (Array.isArray(data)) setDetailGuardians(data as typeof detailGuardians)
    }).catch(() => setDetailGuardians([]))
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Alumnos</h1>
        <p className="mt-1 text-sm text-blue-200">Creación, edición y gestión de alumnos</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total" value={String(totalCount)} />
          <Stat label="Activos" value={String(students.filter((s) => s.isActive).length)} />
          <Stat label="Registrados" value={String(students.filter((s) => s.isRegistrationCompleted).length)} />
          <Stat label="Pendientes" value={String(students.filter((s) => !s.isRegistrationCompleted).length)} />
        </div>
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-black">Nuevo alumno</h2>
        <p className="mb-4 text-sm text-slate-500">Alta inicial — luego completa su perfil desde la app</p>
        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <h3 className="text-sm font-bold">Alta masiva por Excel</h3>
          <p className="mt-0.5 text-xs text-slate-500">Cargá varios alumnos desde un archivo .xlsx.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={async () => {
              try {
                const blob = await apiService.getBlob(`/api/admin/${slug}/students/import-template`)
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href = url; a.download = 'plantilla-importacion-alumnos.xlsx'
                document.body.appendChild(a); a.click(); a.remove()
                URL.revokeObjectURL(url)
              } catch { importResult?.errors?.push('Error al descargar la plantilla.'); setImportResult(importResult ? { ...importResult } : { created: 0, skipped: 0, errors: [], errorDetails: [] }) }
            }}>Descargar plantilla</Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} loading={importMutation.isPending}>Importar Excel</Button>
            <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importMutation.mutate(f) }} />
          </div>

          {/* Format help */}
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-semibold text-blue-700 dark:text-blue-300">Ver formato esperado</summary>
            <div className="mt-1 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
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

          {/* Import result */}
          {importResult && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Importación finalizada</p>
              <div className="mt-1 flex gap-4 text-xs text-emerald-700 dark:text-emerald-300">
                <span>Creados: <b>{importResult.created}</b></span>
                <span>Omitidos: <b>{importResult.skipped}</b></span>
              </div>

              {importResult.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Errores por fila:</p>
                  {/* Group errors by message */}
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
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Nombre" error={errors.firstName}><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label="Apellido" error={errors.lastName}><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          <Field label="Email" error={errors.email}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Contraseña" error={errors.password}><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="N° Carnet" error={errors.memberNumber}>
            <Input value={form.memberNumber} onChange={(e) => setForm({ ...form, memberNumber: e.target.value })} placeholder="Automático" maxLength={15} />
          </Field>
          <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
            <Button type="submit" loading={createMutation.isPending} className="bg-blue-600 text-white hover:bg-blue-700">Guardar</Button>
          </div>
        </form>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-black">Listado</h2>
          <span className="text-xs text-slate-400">({totalCount} alumnos)</span>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Input placeholder="Buscar nombre, email o DNI..." autoComplete="off" onChange={(e) => debouncedSearch(e.target.value)} />
          <Select value={regFilter} onChange={(e) => { setRegFilter(e.target.value); setPage(1) }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="">Todos los registros</option>
            <option value="true">Registrados</option>
            <option value="false">Pendientes</option>
          </Select>
          <Select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1) }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="">Todos los cursos</option>
            {courses?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
        ) : students.length === 0 ? (
          <div className="py-10 text-center text-slate-500">No hay alumnos cargados.</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="px-3 py-3">Alumno</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3 text-center">Registro</th>
                    <th className="px-3 py-3 text-center">Estado</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {students.map((s) => (
                    <tr key={s.id} className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-3 cursor-pointer" onClick={() => openDetail(s)}>
                        <div className="flex items-center gap-3">
                          <StudentAvatar student={s} />
                          <div className="min-w-0">
                            <div className="truncate font-medium hover:text-blue-600">{s.fullName ?? `${s.firstName} ${s.lastName}`}</div>
                            <div className="truncate text-xs text-slate-400">{s.dni ?? ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-500">{s.email}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${regBadge(s.isRegistrationCompleted)}`}>{s.isRegistrationCompleted ? 'Registrado' : 'Pendiente'}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${activeBadge(s.isActive)}`}>{s.isActive ? 'Activo' : 'Inactivo'}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <ActionMenu actions={[
                          { label: 'Editar', onClick: () => openEdit(s) },
                          { label: s.isActive ? 'Desactivar' : 'Activar', onClick: () => setToggleStudent(s) },
                          { label: 'Resetear contraseña', onClick: () => setResetPwStudent(s) },
                          { label: 'Reenviar invitación Google', onClick: () => resendGoogleInvitationMutation.mutate(s.id) },
                          { label: 'Eliminar', onClick: () => setDeleteStudent(s), danger: true },
                        ]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {students.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openDetail(s)}>
                      <div className="truncate font-medium hover:text-blue-600">{s.fullName ?? `${s.firstName} ${s.lastName}`}</div>
                      <div className="truncate text-xs text-slate-400">{s.email}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${regBadge(s.isRegistrationCompleted)}`}>{s.isRegistrationCompleted ? 'Registrado' : 'Pendiente'}</span>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${activeBadge(s.isActive)}`}>{s.isActive ? 'Activo' : 'Inactivo'}</span>
                      <ActionMenu actions={[
                        { label: 'Editar', onClick: () => openEdit(s) },
                        { label: s.isActive ? 'Desactivar' : 'Activar', onClick: () => setToggleStudent(s) },
                        { label: 'Resetear contraseña', onClick: () => setResetPwStudent(s) },
                        { label: 'Reenviar invitación Google', onClick: () => resendGoogleInvitationMutation.mutate(s.id) },
                        { label: 'Eliminar', onClick: () => setDeleteStudent(s), danger: true },
                      ]} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
              <span>Mostrando {(page - 1) * 20 + 1}–{Math.min(page * 20, totalCount)} de {totalCount}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                <span className="text-xs">Pág {page} de {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
              </div>
            </div>
          </>
        )}
      </Card>

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
              <Button loading={updateMutation.isPending} onClick={() => updateMutation.mutate()} className="bg-blue-600 text-white hover:bg-blue-700">Guardar cambios</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      {detailStudent && (
        <Modal open={true} onClose={() => setDetailStudent(null)} title="Detalle del alumno" className="sm:max-w-lg">
          <div className="px-5 py-4 sm:px-6 space-y-5 text-sm">
            {/* Información general */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Información general</h3>
              <div className="flex items-center gap-4 mb-3">
                <StudentAvatar student={detailStudent} className="h-14 w-14" />
                <div>
                  <p className="text-base font-bold">{detailStudent.fullName ?? `${detailStudent.firstName} ${detailStudent.lastName}`}</p>
                  <p className="text-sm text-slate-500">{detailStudent.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <RowDetail label="N° de carnet" value={detailStudent.memberNumber} />
                <RowDetail label="Estado" value={detailStudent.isActive ? 'Activo' : 'Inactivo'} />
              </div>
            </div>

            {/* Contacto */}
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

            {/* Datos personales */}
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Datos personales</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <RowDetail label="DNI" value={detailStudent.dni} />
                <RowDetail label="Dirección" value={detailStudent.address} />
                <RowDetail label="Nacimiento" value={detailStudent.dateOfBirth ? new Date(detailStudent.dateOfBirth).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'} />
                <RowDetail label="Obra social" value={detailStudent.hasHealthInsurance ? detailStudent.healthInsuranceName ?? 'Sí' : 'No'} />
              </div>
            </div>

            {/* Emergencia */}
            {detailStudent.emergencyContactName && (
              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Emergencia</h3>
                <RowDetail label="Contacto" value={`${detailStudent.emergencyContactName} (${detailStudent.emergencyContactPhone ?? '—'})`} />
              </div>
            )}

            {/* Tutores */}
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

            {/* Notas */}
            {detailStudent.notes && (
              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Notas</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">{detailStudent.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Toggle Modal */}
      <ConfirmModal open={!!toggleStudent} onClose={() => setToggleStudent(null)}
        title={toggleStudent?.isActive ? 'Desactivar alumno' : 'Activar alumno'}
        message={toggleStudent ? `¿${toggleStudent.isActive ? 'Desactivar' : 'Activar'} a ${toggleStudent.fullName ?? `${toggleStudent.firstName} ${toggleStudent.lastName}`}?` : ''}
        confirmText={toggleStudent?.isActive ? 'Desactivar' : 'Activar'}
        variant={toggleStudent?.isActive ? 'danger' : 'primary'}
        loading={toggleMutation.isPending}
        onConfirm={() => { if (toggleStudent) toggleMutation.mutate({ id: toggleStudent.id, isActive: !toggleStudent.isActive }) }} />

      {/* Delete Modal */}
      <ConfirmModal open={!!deleteStudent} onClose={() => setDeleteStudent(null)}
        title="Eliminar alumno"
        message={deleteStudent
          ? `¿Eliminar a "${deleteStudent.fullName ?? `${deleteStudent.firstName} ${deleteStudent.lastName}`}"? Esta acción no se puede deshacer.`
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
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => resetPwMutation.mutate({ id: resetPwStudent.id })}>Guardar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/15 p-3 backdrop-blur-sm"><div className="text-2xl font-black">{value}</div><div className="text-xs text-blue-200">{label}</div></div>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>{children}{error && <p className="mt-1 text-xs text-red-500">{error}</p>}</div>
}

function RowDetail({ label, value, className }: { label: string; value: string | null | undefined; className?: string }) {
  return <div className={`rounded-xl bg-slate-50 p-3 dark:bg-slate-800 ${className ?? ''}`}><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p><p className="mt-0.5 text-sm font-semibold">{value ?? '-'}</p></div>
}
