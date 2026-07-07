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

interface Student {
  id: string; firstName: string; lastName: string; fullName?: string; email: string
  isActive: boolean; isRegistrationCompleted: boolean; dni: string | null
  dateOfBirth: string | null; phone: string | null; address: string | null
  emergencyContactName: string | null; emergencyContactPhone: string | null
  hasHealthInsurance: boolean; healthInsuranceName: string | null
  healthInsuranceMemberNumber: string | null; healthInsurancePlan: string | null
  notes: string | null; profileImageUrl: string | null; photoUrl: string | null
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

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', accessMethod: 'password' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [detailStudent, setDetailStudent] = useState<Student | null>(null)
  const [detailGuardians, setDetailGuardians] = useState<{ firstName: string; lastName: string; email?: string; phone?: string; documentNumber?: string; relationshipType?: number; canPayCharges?: boolean; isPrimary?: boolean }[]>([])
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '' })
  const [toggleStudent, setToggleStudent] = useState<Student | null>(null)
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null)
  const [resetPwStudent, setResetPwStudent] = useState<Student | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [importResult, setImportResult] = useState<string | null>(null)
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
      setImportResult(`Importación completada: ${String(r?.created ?? 0)} creados, ${String(r?.skipped ?? 0)} omitidos`)
      qc.invalidateQueries({ queryKey: ['students'] })
    },
    onError: () => setImportResult('Error al importar. Verificá el formato del archivo.'),
  })

  function validate() {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'Requerido'
    if (!form.lastName.trim()) e.lastName = 'Requerido'
    if (!form.email.trim()) e.email = 'Requerido'
    if (form.accessMethod === 'password' && !form.password.trim()) e.password = 'Requerido'
    setErrors(e); return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); if (!validate()) return; createMutation.mutate(form) }
  function resetForm() { setForm({ firstName: '', lastName: '', email: '', password: '', accessMethod: 'password' }); setErrors({}) }
  function openEdit(s: Student) { setEditStudent(s); setEditForm({ firstName: s.firstName, lastName: s.lastName, email: s.email }) }
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
          <p className="mt-0.5 text-xs text-slate-500">Columnas: Nombre, Apellido, Correo, Contraseña, MetodoAcceso opcional. Si MetodoAcceso es google, la contraseña no es obligatoria.</p>
          <div className="mt-2 flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} loading={importMutation.isPending}>Importar Excel</Button>
            <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importMutation.mutate(f) }} />
          </div>
          {importResult && <p className="mt-2 text-xs font-medium text-green-700 dark:text-green-300">{importResult}</p>}
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Nombre" error={errors.firstName}><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label="Apellido" error={errors.lastName}><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          <Field label="Email" error={errors.email}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Método de acceso">
            <Select value={form.accessMethod} onChange={(e) => setForm({ ...form, accessMethod: e.target.value, password: e.target.value === 'google' ? '' : form.password })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              <option value="password">Contraseña</option>
              <option value="google">Google</option>
            </Select>
          </Field>
          {form.accessMethod === 'password' && (
            <Field label="Contraseña" error={errors.password}><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          )}
          {form.accessMethod === 'google' && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
              Se crea pendiente de registro y recibe una invitación por email para ingresar con Google.
            </div>
          )}
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
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Email</label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} disabled /></div>
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
          <div className="px-5 py-4 sm:px-6 space-y-4">
            <div className="flex items-center gap-4">
              <StudentAvatar student={detailStudent} className="h-14 w-14" />
              <div>
                <p className="text-base font-bold">{detailStudent.fullName ?? `${detailStudent.firstName} ${detailStudent.lastName}`}</p>
                <p className="text-sm text-slate-500">{detailStudent.email}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <RowDetail label="DNI" value={detailStudent.dni} />
              <RowDetail label="Teléfono" value={detailStudent.phone} />
              <RowDetail label="Dirección" value={detailStudent.address} />
              <RowDetail label="Nacimiento" value={detailStudent.dateOfBirth ? new Date(detailStudent.dateOfBirth).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'} />
              <RowDetail label="Emergencia" value={detailStudent.emergencyContactName ? `${detailStudent.emergencyContactName} (${detailStudent.emergencyContactPhone})` : '-'} />
              <RowDetail label="Obra social" value={detailStudent.hasHealthInsurance ? detailStudent.healthInsuranceName ?? 'Sí' : 'No'} />
              <RowDetail label="Estado" value={detailStudent.isActive ? 'Activo' : 'Inactivo'} />
              <RowDetail label="Notas" value={detailStudent.notes} className="sm:col-span-2" />
            </div>
            {detailGuardians.length > 0 && (
              <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Tutores</p>
                <div className="space-y-2">
                  {detailGuardians.map((g, i) => (
                    <div key={i} className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800">
                      <p className="font-semibold">{g.firstName} {g.lastName}</p>
                      <p className="text-slate-400">{g.email}{g.phone ? ` · ${g.phone}` : ''}{g.documentNumber ? ` · DNI: ${g.documentNumber}` : ''}</p>
                    </div>
                  ))}
                </div>
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
