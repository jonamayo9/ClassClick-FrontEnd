import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { SegmentedControl } from '@/components/ui/segmented-control'

interface Teacher { id: string; firstName: string; lastName: string; email: string; phone: string | null; isActive: boolean; role: string }

interface DelegateCourse { id: string; name: string; isActive: boolean; isAssigned: boolean }

function useSlug() { return useAuth((s) => s.activeCompanySlug ?? '') }

function initials(name: string) { return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() }

const avatarColors = ['bg-violet-500', 'bg-pink-500', 'bg-indigo-500', 'bg-rose-500', 'bg-purple-500']

function avatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return avatarColors[Math.abs(h) % avatarColors.length]
}

function roleBadge(role: string) {
  return role === 'Delegate'
    ? <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">Delegado</span>
    : <span className="inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700 dark:bg-violet-900 dark:text-violet-300">Profesor</span>
}

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', role: 'Teacher' }

function TeachersPageInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const slug = useSlug()

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['admin-teachers', slug],
    queryFn: () => apiService.get<Teacher[]>(`/api/admin/${slug}/teachers`),
    enabled: !!slug,
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTeacher, setDeleteTeacher] = useState<Teacher | null>(null)
  const [resetPwTeacher, setResetPwTeacher] = useState<Teacher | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [associateTeacher, setAssociateTeacher] = useState<Teacher | null>(null)
  const [courseSearch, setCourseSearch] = useState('')
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set())

  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['delegate-courses', slug, associateTeacher?.id],
    queryFn: () => apiService.get<DelegateCourse[]>(`/api/admin/${slug}/teachers/${associateTeacher!.id}/courses`),
    enabled: !!associateTeacher,
  })

  // Referencia ESTABLE: mientras no hay datos (query disabled/cargando) devuelve el MISMO [].
  // Evita que un array nuevo por render re-dispare el effect de sincronización (loop de renders).
  const courses = useMemo<DelegateCourse[]>(() => coursesData ?? [], [coursesData])

  useEffect(() => {
    setSelectedCourses(new Set(courses.filter((c) => c.isAssigned).map((c) => c.id)))
  }, [courses])

  const createMutation = useMutation({
    mutationFn: () => apiService.post(`/api/admin/${slug}/teachers`, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-teachers'] }); resetForm(); toast('Personal creado.') },
    onError: () => toast('Error al crear.', 'error'),
  })
  const updateMutation = useMutation({
    mutationFn: () => apiService.put(`/api/admin/${slug}/teachers/${editingId}`, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-teachers'] }); resetForm(); toast('Personal actualizado.') },
    onError: () => toast('Error al actualizar.', 'error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.del(`/api/admin/${slug}/teachers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-teachers'] }); setDeleteTeacher(null); toast('Eliminado.') },
    onError: () => toast('Error al eliminar.', 'error'),
  })
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiService.put(`/api/admin/${slug}/teachers/${id}/toggle-active`, { isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-teachers'] }); toast('Estado actualizado.') },
    onError: () => toast('Error al cambiar estado.', 'error'),
  })
  const resetPwMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiService.put(`/api/admin/${slug}/teachers/${id}/reset-password`, { newPassword, confirmNewPassword: confirmPassword }),
    onSuccess: () => { setResetPwTeacher(null); setNewPassword(''); setConfirmPassword(''); toast('Contraseña actualizada.') },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al resetear contraseña.'
      toast(msg, 'error')
    },
  })
  const associateMutation = useMutation({
    mutationFn: ({ id, courseIds }: { id: string; courseIds: string[] }) =>
      apiService.put(`/api/admin/${slug}/teachers/${id}/courses`, { courseIds }),
    onSuccess: () => { setAssociateTeacher(null); toast('Cursos asociados actualizados.') },
    onError: () => toast('Error al actualizar cursos.', 'error'),
  })

  function resetForm() { setEditingId(null); setForm(emptyForm); setErrors({}) }

  function openEdit(t: Teacher) {
    setEditingId(t.id); setForm({ firstName: t.firstName, lastName: t.lastName, email: t.email, phone: t.phone ?? '', role: t.role }); setErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'Requerido'
    if (!form.lastName.trim()) e.lastName = 'Requerido'
    if (!form.email.trim()) e.email = 'Requerido'
    if (!form.role) e.role = 'Requerido'
    setErrors(e); return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    if (editingId) updateMutation.mutate()
    else createMutation.mutate()
  }

  function toggleCourse(courseId: string) {
    setSelectedCourses((prev) => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  const filteredCourses = courseSearch.trim()
    ? courses.filter((c) => c.name.toLowerCase().includes(courseSearch.trim().toLowerCase()))
    : courses

  const teachersCount = teachers.length
  const teachersRoleCount = teachers.filter((t) => t.role === 'Teacher').length
  const delegatesRoleCount = teachers.filter((t) => t.role === 'Delegate').length
  const inactiveCount = teachers.filter((t) => !t.isActive).length

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 p-5 text-white sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Profesores / Delegados</h1>
        <p className="mt-1 text-sm text-violet-200">Gestión del personal de la institución</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total personal" value={String(teachersCount)} />
          <Stat label="Profesores" value={String(teachersRoleCount)} />
          <Stat label="Delegados" value={String(delegatesRoleCount)} />
          <Stat label="Inactivos" value={String(inactiveCount)} />
        </div>
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-black">{editingId ? 'Editar personal' : 'Nuevo personal'}</h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Nombre *</label>
            <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Apellido *</label>
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Email *</label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Teléfono</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Rol *</label>
            <SegmentedControl
              options={[{ value: 'Teacher', label: 'Profesor' }, { value: 'Delegate', label: 'Delegado' }]}
              value={form.role}
              onChange={(role) => setForm({ ...form, role })}
            />
            {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role}</p>}
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending} className="bg-violet-600 text-white hover:bg-violet-700">
              {editingId ? 'Guardar cambios' : 'Guardar'}
            </Button>
            {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
          </div>
        </form>
      </Card>

      {teachers.length === 0 ? (
        <div className="py-10 text-center text-slate-500">No hay personal cargado.</div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-3 py-3">Personal</th>
                  <th className="px-3 py-3">Rol</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Teléfono</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {teachers.map((t) => (
                  <tr key={t.id} className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(`${t.firstName} ${t.lastName}`)}`}>
                          {initials(`${t.firstName} ${t.lastName}`)}
                        </div>
                        <span className="font-medium">{t.firstName} {t.lastName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">{roleBadge(t.role)}</td>
                    <td className="px-3 py-3 text-slate-500">{t.email}</td>
                    <td className="px-3 py-3 text-slate-500">{t.phone ?? '-'}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        t.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}>{t.isActive ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {t.role === 'Delegate' && (
                          <Button variant="ghost" size="sm" onClick={() => { setAssociateTeacher(t); setCourseSearch(''); setSelectedCourses(new Set()) }}>Asociar cursos</Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => { setResetPwTeacher(t); setNewPassword(''); setConfirmPassword('') }}>Resetear pass</Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>Editar</Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleMutation.mutate({ id: t.id, isActive: !t.isActive })}>
                          {t.isActive ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => setDeleteTeacher(t)}>Eliminar</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {teachers.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(`${t.firstName} ${t.lastName}`)}`}>
                    {initials(`${t.firstName} ${t.lastName}`)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{t.firstName} {t.lastName}</div>
                    <div className="truncate text-xs text-slate-400">{t.email}</div>
                    <div className="mt-1">{roleBadge(t.role)}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                    t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>{t.isActive ? 'Activo' : 'Inactivo'}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {t.role === 'Delegate' && (
                    <Button variant="outline" size="sm" onClick={() => { setAssociateTeacher(t); setCourseSearch(''); setSelectedCourses(new Set()) }}>Asociar cursos</Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => { setResetPwTeacher(t); setNewPassword(''); setConfirmPassword('') }}>Resetear pass</Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(t)}>Editar</Button>
                  <Button variant="outline" size="sm" onClick={() => toggleMutation.mutate({ id: t.id, isActive: !t.isActive })}>
                    {t.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => setDeleteTeacher(t)}>Eliminar</Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <ConfirmModal open={!!deleteTeacher} onClose={() => setDeleteTeacher(null)} title="Eliminar personal"
        message={deleteTeacher ? `¿Eliminar a ${deleteTeacher.firstName} ${deleteTeacher.lastName}?` : ''}
        confirmText="Eliminar" variant="danger" loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteTeacher) deleteMutation.mutate(deleteTeacher.id) }} />

      {resetPwTeacher && (
        <Modal open={true} onClose={() => { setResetPwTeacher(null); setNewPassword(''); setConfirmPassword('') }} title="Resetear contraseña" className="sm:max-w-md">
          <div className="px-5 py-4 sm:px-6 space-y-4">
            <p className="text-sm text-slate-500">Nueva contraseña para <strong>{resetPwTeacher.email}</strong></p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nueva contraseña</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Confirmar contraseña</label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Las contraseñas no coinciden.</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setResetPwTeacher(null); setNewPassword(''); setConfirmPassword('') }}>Cancelar</Button>
              <Button loading={resetPwMutation.isPending} disabled={!newPassword || newPassword !== confirmPassword}
                className="bg-violet-600 text-white hover:bg-violet-700"
                onClick={() => resetPwMutation.mutate({ id: resetPwTeacher.id })}>Guardar</Button>
            </div>
          </div>
        </Modal>
      )}

      {associateTeacher && (
        <Modal open onClose={() => setAssociateTeacher(null)}
          title={`Asociar cursos — ${associateTeacher.firstName} ${associateTeacher.lastName}`}
          className="sm:max-w-lg">
          <div className="px-5 py-4 sm:px-6 space-y-4">
            <Input placeholder="Buscar curso..." value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)} />
            {coursesLoading ? (
              <div className="flex justify-center py-10"><Spinner className="h-6 w-6 text-violet-600" /></div>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                {filteredCourses.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-400">Sin resultados</p>
                ) : filteredCourses.map((c) => (
                  <label key={c.id}
                    className={`flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-sm last:border-0 dark:border-slate-800 ${c.isActive ? '' : 'opacity-60'}`}>
                    <input
                      type="checkbox"
                      checked={selectedCourses.has(c.id)}
                      disabled={!c.isActive}
                      onChange={() => toggleCourse(c.id)}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 disabled:cursor-not-allowed"
                    />
                    <span className="flex-1 font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                    {!c.isActive && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">Inactivo</span>
                    )}
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400">Los cursos inactivos ya asociados se conservan y no se pueden modificar.</p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setAssociateTeacher(null)}>Cancelar</Button>
              <Button loading={associateMutation.isPending} className="bg-violet-600 text-white hover:bg-violet-700"
                onClick={() => associateMutation.mutate({ id: associateTeacher.id, courseIds: Array.from(selectedCourses) })}>
                Guardar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 p-3 backdrop-blur-sm">
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs text-violet-200">{label}</div>
    </div>
  )
}

export default function TeachersPage() { return <ToastProvider><TeachersPageInner /></ToastProvider> }
