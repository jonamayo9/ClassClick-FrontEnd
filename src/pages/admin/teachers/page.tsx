import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { apiService, getApiError } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Select } from '@/components/ui/select'
import { ActionMenu } from '@/components/ui/action-menu'
import type { ActionMenuItem } from '@/components/ui/action-menu'
import { Pagination } from '@/components/ui/pagination'
import {
  Users, GraduationCap, UserCheck, UserRoundX, Plus, Search, RotateCcw,
} from 'lucide-react'

interface Teacher {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  isActive: boolean
  role: string
  roles?: string[]
}
interface TeacherSummary { total: number; teachers: number; delegates: number; inactive: number }
interface DelegateCourse { id: string; name: string; isActive: boolean; isAssigned: boolean }
interface TeachersPaged { items: Teacher[]; totalCount: number }

function useSlug() { return useAuth((s) => s.activeCompanySlug ?? '') }
function initials(name: string) { return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?' }
const avatarColors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500']
function avatarColor(name: string) { let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return avatarColors[Math.abs(h) % avatarColors.length] }
function fullName(t: Teacher) { return `${t.firstName} ${t.lastName}`.trim() }

const roleLabel: Record<string, string> = { Teacher: 'Profesor', Delegate: 'Delegado' }
const roleClass: Record<string, string> = {
  Teacher: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  Delegate: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
}
function teacherRoles(t: Teacher): string[] {
  const roles = t.roles && t.roles.length > 0 ? t.roles : [t.role]
  return [...new Set(roles.filter(Boolean))]
}

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', role: 'Teacher' }
const PAGE_SIZES = [10, 20, 50]

export default function TeachersPage() { return <ToastProvider><TeachersPageInner /></ToastProvider> }

function TeachersPageInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const slug = useSlug()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const searchTimer = useRef<number | undefined>(undefined)

  const [panelTeacher, setPanelTeacher] = useState<Teacher | null>(null)
  const [formOpen, setFormOpen] = useState(false)
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

  function onSearchChange(value: string) {
    setSearchInput(value)
    clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => { setSearch(value); setPage(1) }, 300)
  }
  function clearFilters() {
    clearTimeout(searchTimer.current)
    setSearchInput(''); setSearch(''); setRoleFilter(''); setActiveFilter(''); setPage(1)
  }

  const listQuery = useQuery({
    queryKey: ['admin-teachers-paged', slug, search, roleFilter, activeFilter, page, pageSize],
    queryFn: async (): Promise<TeachersPaged> => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)
      if (activeFilter) params.set('isActive', activeFilter)
      params.set('page', String(page)); params.set('pageSize', String(pageSize))
      const data = await apiService.get<Teacher[] | TeachersPaged>(`/api/admin/${slug}/teachers?${params}`)
      if (Array.isArray(data)) return { items: data, totalCount: data.length }
      return { items: data.items ?? [], totalCount: data.totalCount ?? (data.items?.length ?? 0) }
    },
    enabled: !!slug,
    placeholderData: (prev) => prev,
  })
  const summaryQuery = useQuery({
    queryKey: ['admin-teachers-summary', slug],
    queryFn: () => apiService.get<TeacherSummary>(`/api/admin/${slug}/teachers/summary`),
    enabled: !!slug,
  })

  const teachers = listQuery.data?.items ?? []
  const totalCount = listQuery.data?.totalCount ?? 0
  const summary = summaryQuery.data

  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['delegate-courses', slug, associateTeacher?.id],
    queryFn: () => apiService.get<DelegateCourse[]>(`/api/admin/${slug}/teachers/${associateTeacher!.id}/courses`),
    enabled: !!associateTeacher,
  })
  const courses = useMemo<DelegateCourse[]>(() => coursesData ?? [], [coursesData])
  useEffect(() => {
    setSelectedCourses(new Set(courses.filter((c) => c.isAssigned).map((c) => c.id)))
  }, [courses])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-teachers-paged'] })
    qc.invalidateQueries({ queryKey: ['admin-teachers-summary'] })
    qc.invalidateQueries({ queryKey: ['admin-teachers'] })
  }

  const createMutation = useMutation({
    mutationFn: () => apiService.post(`/api/admin/${slug}/teachers`, form),
    onSuccess: () => { invalidate(); setFormOpen(false); resetForm(); toast('Personal creado.') },
    onError: (e) => toast(getApiError(e) || 'Error al crear.', 'error'),
  })
  const updateMutation = useMutation({
    mutationFn: () => apiService.put(`/api/admin/${slug}/teachers/${editingId}`, form),
    onSuccess: () => { invalidate(); setFormOpen(false); resetForm(); toast('Personal actualizado.') },
    onError: (e) => toast(getApiError(e) || 'Error al actualizar.', 'error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.del(`/api/admin/${slug}/teachers/${id}`),
    onSuccess: () => { invalidate(); setDeleteTeacher(null); setPanelTeacher(null); toast('Personal eliminado.') },
    onError: (e) => toast(getApiError(e) || 'Error al eliminar.', 'error'),
  })
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiService.put(`/api/admin/${slug}/teachers/${id}/toggle-active`, { isActive }),
    onSuccess: () => { invalidate(); toast('Estado actualizado.') },
    onError: (e) => toast(getApiError(e) || 'Error al cambiar estado.', 'error'),
  })
  const resetPwMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiService.put(`/api/admin/${slug}/teachers/${id}/reset-password`, { newPassword, confirmNewPassword: confirmPassword }),
    onSuccess: () => { setResetPwTeacher(null); setNewPassword(''); setConfirmPassword(''); toast('Contraseña actualizada.') },
    onError: (e) => toast(getApiError(e) || 'Error al resetear contraseña.', 'error'),
  })
  const associateMutation = useMutation({
    mutationFn: ({ id, courseIds }: { id: string; courseIds: string[] }) =>
      apiService.put(`/api/admin/${slug}/teachers/${id}/courses`, { courseIds }),
    onSuccess: () => { setAssociateTeacher(null); toast('Cursos asociados actualizados.') },
    onError: (e) => toast(getApiError(e) || 'Error al actualizar cursos.', 'error'),
  })

  function resetForm() { setEditingId(null); setForm(emptyForm); setErrors({}) }
  function openCreate() { resetForm(); setFormOpen(true) }
  function openEdit(t: Teacher) {
    setEditingId(t.id)
    setForm({ firstName: t.firstName, lastName: t.lastName, email: t.email, phone: t.phone ?? '', role: t.role })
    setErrors({})
    setFormOpen(true)
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
  function actionsFor(t: Teacher): ActionMenuItem[] {
    const isDelegate = teacherRoles(t).includes('Delegate')
    const actions: ActionMenuItem[] = [
      { label: 'Ver detalle', onClick: () => setPanelTeacher(t) },
      { label: 'Editar', onClick: () => openEdit(t) },
      { label: t.isActive ? 'Desactivar' : 'Activar', onClick: () => toggleMutation.mutate({ id: t.id, isActive: !t.isActive }) },
      { label: 'Resetear contraseña', onClick: () => { setResetPwTeacher(t); setNewPassword(''); setConfirmPassword('') } },
    ]
    if (isDelegate) actions.push({ label: 'Asociar cursos', onClick: () => { setAssociateTeacher(t); setCourseSearch(''); setSelectedCourses(new Set()) } })
    actions.push({ label: 'Eliminar', onClick: () => setDeleteTeacher(t), danger: true })
    return actions
  }

  const filteredCourses = courseSearch.trim()
    ? courses.filter((c) => c.name.toLowerCase().includes(courseSearch.trim().toLowerCase()))
    : courses

  const hasFilters = !!search || !!roleFilter || !!activeFilter

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-white sm:text-[26px]">Profesores / Delegados</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-[13px]">Administrá el personal, sus roles y accesos a la institución.</p>
        </div>
        <Button className="h-11 w-full bg-blue-600 text-white hover:bg-blue-500 sm:h-10 sm:w-auto" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuevo personal
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3.5">
        <KpiCard icon={Users} tone="violet" value={summary?.total} label="Total personal" />
        <KpiCard icon={GraduationCap} tone="blue" value={summary?.teachers} label="Profesores" />
        <KpiCard icon={UserCheck} tone="emerald" value={summary?.delegates} label="Delegados" />
        <KpiCard icon={UserRoundX} tone="amber" value={summary?.inactive} label="Inactivos" />
      </div>

      {/* Filters */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative min-w-0 sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-10" placeholder="Buscar por nombre, apellido, email o teléfono..." value={searchInput} onChange={(e) => onSearchChange(e.target.value)} />
          </div>
          <div className="sm:w-44">
            <Select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }} aria-label="Filtro por rol">
              <option value="">Todos los roles</option>
              <option value="Teacher">Profesores</option>
              <option value="Delegate">Delegados</option>
            </Select>
          </div>
          <div className="sm:w-40">
            <Select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }} aria-label="Filtro por estado">
              <option value="">Todos los estados</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </Select>
          </div>
          <Button variant="outline" className="h-11 shrink-0" onClick={clearFilters} disabled={!hasFilters}>
            <RotateCcw className="h-4 w-4" /> Limpiar
          </Button>
        </div>
      </Card>

      {/* Listing */}
      <Card className="p-4 sm:p-6">
        {listQuery.isLoading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>
        ) : listQuery.isError ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">No se pudo cargar el personal.</p>
            <Button variant="outline" size="sm" onClick={() => void listQuery.refetch()}>Reintentar</Button>
          </div>
        ) : teachers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{hasFilters ? 'Sin resultados' : 'Sin personal registrado'}</p>
            <p className="mt-1 text-xs text-slate-400">{hasFilters ? 'Probá ajustar o limpiar los filtros.' : 'Creá el primer profesor o delegado con “Nuevo personal”.'}</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-[0.4px] text-slate-400 dark:border-slate-800">
                    <th className="px-3 py-3 font-semibold">Personal</th>
                    <th className="px-3 py-3 font-semibold">Rol</th>
                    <th className="px-3 py-3 font-semibold">Email</th>
                    <th className="px-3 py-3 font-semibold">Teléfono</th>
                    <th className="px-3 py-3 font-semibold">Estado</th>
                    <th className="px-3 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {teachers.map((t) => (
                    <tr key={t.id} onClick={() => setPanelTeacher(t)}
                      className="group cursor-pointer transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <TeacherAvatar teacher={t} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900 transition group-hover:text-blue-600 dark:text-white">{fullName(t)}</p>
                            <p className="truncate text-xs text-slate-400">{t.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><RoleBadges teacher={t} /></td>
                      <td className="px-3 py-2.5"><span className="block max-w-[220px] truncate text-[13px] text-slate-500 dark:text-slate-400" title={t.email}>{t.email}</span></td>
                      <td className="px-3 py-2.5 text-[13px] text-slate-500 dark:text-slate-400">{t.phone || '—'}</td>
                      <td className="px-3 py-2.5"><StatusBadge active={t.isActive} /></td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end"><ActionMenu actions={actionsFor(t)} /></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {teachers.map((t) => (
                <div key={t.id} role="button" tabIndex={0}
                  onClick={() => setPanelTeacher(t)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPanelTeacher(t) } }}
                  className="flex items-center gap-3 p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <TeacherAvatar teacher={t} className="h-11 w-11" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{fullName(t)}</p>
                    <p className="truncate text-xs text-slate-400">{t.email}</p>
                    <div className="mt-1 flex items-center gap-1.5"><RoleBadges teacher={t} /><StatusBadge active={t.isActive} /></div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <ActionMenu actions={actionsFor(t)} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Pagination page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage}
                loading={listQuery.isFetching} showPageNumbers pageSizeOptions={PAGE_SIZES}
                onPageSizeChange={(n) => { setPageSize(n); setPage(1) }} />
            </div>
          </>
        )}
      </Card>

      {/* Detail panel */}
      {panelTeacher && (
        <DetailPanel teacher={panelTeacher} onClose={() => setPanelTeacher(null)}
          onEdit={openEdit} onToggle={(t) => toggleMutation.mutate({ id: t.id, isActive: !t.isActive })}
          onResetPw={(t) => { setResetPwTeacher(t); setNewPassword(''); setConfirmPassword('') }}
          onDelete={(t) => setDeleteTeacher(t)}
          onAssociateCourses={(t) => { setAssociateTeacher(t); setCourseSearch(''); setSelectedCourses(new Set()) }} />
      )}

      {/* Create / Edit modal */}
      {formOpen && (
        <Modal open={true} onClose={() => { setFormOpen(false); resetForm() }}
          title={editingId ? 'Editar personal' : 'Nuevo personal'}
          description={editingId ? 'Modificá los datos del personal.' : 'Creá un profesor o delegado para la institución.'}
          className="sm:max-w-[600px]">
          <form id="teacher-form" onSubmit={handleSubmit} className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
            <Field label="Nombre *" error={errors.firstName}><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
            <Field label="Apellido *" error={errors.lastName}><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
            <Field label="Email *" error={errors.email}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Teléfono"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Rol *</label>
              <SegmentedControl
                options={[{ value: 'Teacher', label: 'Profesor' }, { value: 'Delegate', label: 'Delegado' }]}
                value={form.role}
                onChange={(role) => setForm({ ...form, role })}
              />
              {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role}</p>}
            </div>
            <div className="flex flex-col-reverse gap-2 pt-1 sm:col-span-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); resetForm() }}>Cancelar</Button>
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending} className="bg-blue-600 text-white hover:bg-blue-500">
                {editingId ? 'Guardar cambios' : 'Crear personal'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete */}
      <ConfirmModal open={!!deleteTeacher} onClose={() => setDeleteTeacher(null)} title="Eliminar personal"
        message={deleteTeacher ? `¿Eliminar a ${fullName(deleteTeacher)}? Esta acción no se puede deshacer.` : ''}
        confirmText="Eliminar" variant="danger" loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteTeacher) deleteMutation.mutate(deleteTeacher.id) }} />

      {/* Reset password */}
      {resetPwTeacher && (
        <Modal open={true} onClose={() => { setResetPwTeacher(null); setNewPassword(''); setConfirmPassword('') }} title="Resetear contraseña" className="sm:max-w-md">
          <div className="px-5 py-4 sm:px-6 space-y-4">
            <p className="text-sm text-slate-500">Nueva contraseña para <strong>{resetPwTeacher.email}</strong></p>
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
              <Button variant="outline" onClick={() => { setResetPwTeacher(null); setNewPassword(''); setConfirmPassword('') }}>Cancelar</Button>
              <Button loading={resetPwMutation.isPending} disabled={!newPassword || newPassword !== confirmPassword}
                className="bg-blue-600 text-white hover:bg-blue-500"
                onClick={() => resetPwMutation.mutate({ id: resetPwTeacher.id })}>Guardar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Associate courses (delegates) */}
      {associateTeacher && (
        <Modal open onClose={() => setAssociateTeacher(null)}
          title={`Asociar cursos — ${fullName(associateTeacher)}`} className="sm:max-w-lg">
          <div className="px-5 py-4 sm:px-6 space-y-4">
            <Input placeholder="Buscar curso..." value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)} />
            {coursesLoading ? (
              <div className="flex justify-center py-10"><Spinner className="h-6 w-6 text-blue-600" /></div>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                {filteredCourses.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-400">Sin resultados</p>
                ) : filteredCourses.map((c) => (
                  <label key={c.id}
                    className={`flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-sm last:border-0 dark:border-slate-800 ${c.isActive ? '' : 'opacity-60'}`}>
                    <input type="checkbox" checked={selectedCourses.has(c.id)} disabled={!c.isActive}
                      onChange={() => toggleCourse(c.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed" />
                    <span className="flex-1 font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                    {!c.isActive && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">Inactivo</span>}
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400">Los cursos inactivos ya asociados se conservan y no se pueden modificar.</p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setAssociateTeacher(null)}>Cancelar</Button>
              <Button loading={associateMutation.isPending} className="bg-blue-600 text-white hover:bg-blue-500"
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

/* ─── Components ─── */

type KpiTone = 'violet' | 'blue' | 'emerald' | 'amber'
const kpiTones: Record<KpiTone, { icon: string }> = {
  violet: { icon: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400' },
  blue: { icon: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' },
  emerald: { icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  amber: { icon: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' },
}
function KpiCard({ icon: Icon, tone, value, label }: {
  icon: React.ComponentType<{ className?: string }>; tone: KpiTone; value?: number; label: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-[42px] sm:w-[42px] ${kpiTones[tone].icon}`}><Icon className="h-5 w-5" /></div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight text-slate-900 dark:text-white sm:text-2xl">{value ?? '—'}</p>
        <p className="truncate text-[11px] font-medium leading-tight text-slate-500 dark:text-slate-400 sm:text-xs">{label}</p>
      </div>
    </div>
  )
}

function TeacherAvatar({ teacher, className }: { teacher: Teacher; className?: string }) {
  return (
    <div className={`${className ?? 'h-9 w-9'} flex shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(fullName(teacher))}`}>
      {initials(fullName(teacher))}
    </div>
  )
}

function RoleBadges({ teacher }: { teacher: Teacher }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {teacherRoles(teacher).map((r) => (
        <span key={r} className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${roleClass[r] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
          {roleLabel[r] ?? r}
        </span>
      ))}
    </div>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">Activo</span>
  ) : (
    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-700/60 dark:text-slate-400">Inactivo</span>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>{children}{error && <p className="mt-1 text-xs text-red-500">{error}</p>}</div>
}

function RowDetail({ label, value }: { label: string; value: string | null | undefined }) {
  return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p><p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">{value || '—'}</p></div>
}

function DetailPanel({ teacher, onClose, onEdit, onToggle, onResetPw, onDelete, onAssociateCourses }: {
  teacher: Teacher
  onClose: () => void
  onEdit: (t: Teacher) => void
  onToggle: (t: Teacher) => void
  onResetPw: (t: Teacher) => void
  onDelete: (t: Teacher) => void
  onAssociateCourses: (t: Teacher) => void
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') { setVisible(false); setTimeout(onClose, 200) } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function close() { setVisible(false); setTimeout(onClose, 200) }
  const isDelegate = teacherRoles(teacher).includes('Delegate')

  return (
    <div className="fixed inset-0 z-[55]">
      <div className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`} onClick={close} />
      <div className={`absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 sm:max-w-[520px] dark:bg-slate-900 ${visible ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <TeacherAvatar teacher={teacher} className="h-12 w-12" />
              <div className="min-w-0">
                <p className="truncate text-[19px] font-bold text-slate-900 dark:text-white">{fullName(teacher)}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <RoleBadges teacher={teacher} />
                  <StatusBadge active={teacher.isActive} />
                </div>
              </div>
            </div>
            <button onClick={close} aria-label="Cerrar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Información personal</h3>
            <div className="grid grid-cols-2 gap-2">
              <RowDetail label="Nombre" value={teacher.firstName} />
              <RowDetail label="Apellido" value={teacher.lastName} />
              <RowDetail label="Email" value={teacher.email} />
              <RowDetail label="Teléfono" value={teacher.phone} />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Información administrativa</h3>
            <div className="grid grid-cols-2 gap-2">
              <RowDetail label="Rol" value={teacherRoles(teacher).map((r) => roleLabel[r] ?? r).join(' / ')} />
              <RowDetail label="Estado" value={teacher.isActive ? 'Activo' : 'Inactivo'} />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Acciones</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button variant="outline" className="justify-start" onClick={() => onEdit(teacher)}>Editar</Button>
              <Button variant="outline" className="justify-start" onClick={() => onToggle(teacher)}>{teacher.isActive ? 'Desactivar' : 'Activar'}</Button>
              <Button variant="outline" className="justify-start" onClick={() => onResetPw(teacher)}>Resetear contraseña</Button>
              {isDelegate && <Button variant="outline" className="justify-start" onClick={() => onAssociateCourses(teacher)}>Asociar cursos</Button>}
              <Button variant="outline" className="justify-start border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30" onClick={() => onDelete(teacher)}>Eliminar</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
