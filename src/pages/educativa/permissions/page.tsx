import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiService, getApiError } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { EDUCATIVE_PERMISSIONS } from '@/hooks/usePermission'
import { cn } from '@/lib/utils'
import { KeyRound, Crown, ArrowRight, Pencil, UserPlus, RefreshCw } from 'lucide-react'

interface PermissionUserDto {
  userId: string
  fullName: string
  email: string
  role: string
  isSuperAdmin: boolean
  permissions: Record<string, boolean>
}

interface PermissionsListDto {
  users: PermissionUserDto[]
  functionalCodes: string[]
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.charAt(0) ?? ''
  const second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return (first + second).toUpperCase() || '?'
}

/** Un administrador nuevo nace con TODOS los permisos habilitados por defecto. */
function allPermissions(): Record<string, boolean> {
  return Object.fromEntries(EDUCATIVE_PERMISSIONS.map((p) => [p.code, true]))
}

export function EducativaPermissionsPage() {
  const { companySlug } = useParams<{ companySlug: string }>()
  const slug = companySlug ?? ''
  const toast = useToast()
  const { fetchCompanies } = useAuth()

  const usersQuery = useQuery({
    queryKey: ['educativa-permission-users', slug],
    queryFn: () => apiService.get<PermissionsListDto>(`/api/educativa/${slug}/permissions/users`),
    enabled: !!slug,
    retry: false,
  })

  const [drafts, setDrafts] = useState<Record<string, Record<string, boolean>>>({})
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  // Alta de administrador
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' })
  const [createError, setCreateError] = useState('')
  const [createPerms, setCreatePerms] = useState<Record<string, boolean>>(allPermissions())

  // Restablecer contraseña
  const [resetTarget, setResetTarget] = useState<PermissionUserDto | null>(null)
  const [resetForm, setResetForm] = useState({ password: '', confirm: '' })
  const [resetError, setResetError] = useState('')
  const [resetting, setResetting] = useState(false)

  const users = usersQuery.data?.users ?? []

  const draftFor = (userId: string): Record<string, boolean> => {
    if (drafts[userId]) return drafts[userId]
    const base = users.find((u) => u.userId === userId)?.permissions ?? {}
    return base
  }

  const toggle = (userId: string, code: string) => {
    setDrafts((prev) => {
      const current = draftFor(userId)
      return { ...prev, [userId]: { ...current, [code]: !current[code] } }
    })
  }

  const resetDraft = (userId: string) => {
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[userId]
      return next
    })
    setEditingUserId((current) => (current === userId ? null : current))
  }

  const dirtyUsers = useMemo(
    () => (usersQuery.data?.users ?? []).filter((u) => {
      const d = drafts[u.userId]
      if (!d) return false
      return EDUCATIVE_PERMISSIONS.some((p) => (d[p.code] ?? false) !== (u.permissions[p.code] ?? false))
    }),
    [usersQuery.data, drafts],
  )

  async function saveUser(user: PermissionUserDto) {
    setSavingId(user.userId)
    try {
      await apiService.put(`/api/educativa/${slug}/permissions/users/${user.userId}`, {
        permissions: draftFor(user.userId),
      })
      resetDraft(user.userId)
      toast('Permisos guardados.')
      await fetchCompanies()
      await usersQuery.refetch()
    } catch (err) {
      toast(getApiError(err) || 'No se pudieron guardar los permisos.', 'error')
    } finally {
      setSavingId(null)
    }
  }

  function openCreate() {
    setCreateForm({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' })
    setCreateError('')
    setCreatePerms(allPermissions())
    setCreateOpen(true)
  }

  function validateCreate(): string {
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.email.trim()) {
      return 'Nombre, apellido y email son obligatorios.'
    }
    if (!createForm.password) return 'La contraseña es obligatoria.'
    if (createForm.password.length < 4) return 'La contraseña debe tener al menos 4 caracteres.'
    if (createForm.password !== createForm.confirmPassword) return 'Las contraseñas no coinciden.'
    return ''
  }

  async function handleCreate() {
    const error = validateCreate()
    if (error) {
      setCreateError(error)
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      await apiService.post(`/api/educativa/${slug}/permissions/users`, {
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        permissions: createPerms,
      })
      setCreateOpen(false)
      toast('Administrador creado correctamente.')
      await fetchCompanies()
      await usersQuery.refetch()
    } catch (err) {
      toast(getApiError(err) || 'No se pudo crear el administrador.', 'error')
    } finally {
      setCreating(false)
    }
  }

  function openReset(user: PermissionUserDto) {
    setResetTarget(user)
    setResetForm({ password: '', confirm: '' })
    setResetError('')
  }

  async function handleReset() {
    if (!resetTarget) return
    if (!resetForm.password) { setResetError('La contraseña es obligatoria.'); return }
    if (resetForm.password.length < 4) { setResetError('La contraseña debe tener al menos 4 caracteres.'); return }
    if (resetForm.password !== resetForm.confirm) { setResetError('Las contraseñas no coinciden.'); return }

    setResetting(true)
    setResetError('')
    try {
      await apiService.put(`/api/educativa/${slug}/permissions/users/${resetTarget.userId}/password`, {
        newPassword: resetForm.password,
      })
      setResetTarget(null)
      toast('Contraseña actualizada correctamente.')
    } catch (err) {
      setResetError(getApiError(err) || 'No se pudo actualizar la contraseña.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1080px] space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Roles y Permisos</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Asigná el acceso de cada administrador por módulo. Comisiones incluye automáticamente el acceso a Clases.
          </p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Agregar administrador
        </Button>
      </div>

      {usersQuery.isLoading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D1A2E]" />
          ))}
        </div>
      ) : usersQuery.isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          No se pudo cargar la lista de administradores.
        </p>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#0D1A2E]">
          <KeyRound className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">No hay administradores para configurar</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Los permisos se asignan por administrador de la institución.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {users.map((user) => {
            const draft = draftFor(user.userId)
            const editing = editingUserId === user.userId
            const dirty = dirtyUsers.some((u) => u.userId === user.userId)
            return (
              <div
                key={user.userId}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0D1A2E]"
              >
                {/* Cabecera: nombre, email, rol */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-sm font-bold text-blue-600 dark:text-blue-400">
                    {initialsOf(user.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{user.fullName || 'Sin nombre'}</p>
                      {user.isSuperAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                          <Crown className="h-3 w-3" aria-hidden="true" />
                          SuperAdmin
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {user.email}
                      {user.role ? <span className="ml-1.5 text-slate-400 dark:text-slate-500">· Rol: {user.role}</span> : null}
                    </p>
                  </div>
                  {user.isSuperAdmin ? (
                    <span className="rounded-full bg-slate-500/10 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      No editable
                    </span>
                  ) : !editing ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingUserId(user.userId)}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Editar permisos
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openReset(user)}>
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        Restablecer contraseña
                      </Button>
                    </div>
                  ) : null}
                </div>

                {user.isSuperAdmin ? (
                  <p className="mt-4 rounded-xl border border-amber-200/70 bg-amber-500/[0.06] p-3 text-xs text-amber-700 dark:border-amber-500/20 dark:text-amber-400">
                    Acceso total a todos los módulos. Los permisos de un SuperAdmin no se pueden modificar.
                  </p>
                ) : editing ? (
                  <>
                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {EDUCATIVE_PERMISSIONS.map((perm) => {
                        const enabled = draft[perm.code] ?? false
                        return (
                          <button
                            key={perm.code}
                            type="button"
                            onClick={() => toggle(user.userId, perm.code)}
                            className={cn(
                              'flex items-start gap-2.5 rounded-xl border p-3 text-left transition',
                              enabled
                                ? 'border-blue-500/40 bg-blue-500/[0.06] dark:bg-blue-500/10'
                                : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]',
                            )}
                          >
                            <span
                              className={cn(
                                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition',
                                enabled
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900',
                              )}
                            >
                              {enabled && (
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">{perm.label}</span>
                              <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                                {perm.code === 'commissions'
                                  ? 'Permite gestionar comisiones e incluye automáticamente el acceso a Clases.'
                                  : perm.description}
                              </span>
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-white/[0.06]">
                      <Button variant="outline" size="sm" disabled={savingId !== null} onClick={() => resetDraft(user.userId)}>
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        disabled={!dirty || savingId !== null}
                        loading={savingId === user.userId}
                        onClick={() => saveUser(user)}
                      >
                        Guardar cambios
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                      {EDUCATIVE_PERMISSIONS.map((perm) => {
                        const enabled = draft[perm.code] ?? false
                        return (
                          <div
                            key={perm.code}
                            title={perm.description}
                            className={cn(
                              'flex items-center justify-between gap-1 rounded-lg border px-2 py-1.5',
                              enabled
                                ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                                : 'border-slate-200 bg-slate-50/60 dark:border-white/10 dark:bg-white/[0.02]',
                            )}
                          >
                            <span className={cn('truncate text-[11px] font-semibold', enabled ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500')}>
                              {perm.label}
                            </span>
                            <span className={cn('shrink-0 text-[10px] font-bold', enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500')}>
                              {enabled ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                      Comisiones incluye automáticamente el acceso a Clases.
                    </p>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: agregar administrador */}
      <Modal
        open={createOpen}
        onClose={() => { if (!creating) setCreateOpen(false) }}
        ariaLabel="Agregar administrador"
        title="Agregar administrador"
        className="sm:max-w-xl"
      >
        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre *</span>
              <Input
                value={createForm.firstName}
                onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                placeholder="Nombre"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Apellido *</span>
              <Input
                value={createForm.lastName}
                onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                placeholder="Apellido"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Email *</span>
            <Input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="email@institucion.com"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Contraseña *</span>
              <Input
                type="password"
                autoComplete="new-password"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Contraseña"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Repetir contraseña *</span>
              <Input
                type="password"
                autoComplete="new-password"
                value={createForm.confirmPassword}
                onChange={(e) => setCreateForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Repetir contraseña"
              />
            </label>
          </div>
          {createError && <p className="text-xs font-medium text-red-500">{createError}</p>}

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Permisos</p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {EDUCATIVE_PERMISSIONS.map((perm) => {
                const enabled = createPerms[perm.code] ?? false
                return (
                  <button
                    key={perm.code}
                    type="button"
                    onClick={() => setCreatePerms((prev) => ({ ...prev, [perm.code]: !prev[perm.code] }))}
                    className={cn(
                      'flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition',
                      enabled
                        ? 'border-blue-500/40 bg-blue-500/[0.06] dark:bg-blue-500/10'
                        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition',
                        enabled
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900',
                      )}
                    >
                      {enabled && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">{perm.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                        {perm.code === 'commissions'
                          ? 'Permite gestionar comisiones e incluye automáticamente el acceso a Clases.'
                          : perm.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
            <Button variant="outline" size="sm" disabled={creating} onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={creating} onClick={handleCreate}>
              Crear administrador
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: restablecer contraseña */}
      <Modal
        open={resetTarget !== null}
        onClose={() => { if (!resetting) setResetTarget(null) }}
        ariaLabel="Restablecer contraseña"
        title="Restablecer contraseña"
        className="sm:max-w-md"
      >
        <div className="space-y-4 px-5 py-5 sm:px-6">
          {resetTarget && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/[0.02]">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{resetTarget.fullName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{resetTarget.email}</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nueva contraseña *</span>
              <Input
                type="password"
                autoComplete="new-password"
                value={resetForm.password}
                onChange={(e) => setResetForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Nueva contraseña"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Repetir contraseña *</span>
              <Input
                type="password"
                autoComplete="new-password"
                value={resetForm.confirm}
                onChange={(e) => setResetForm((f) => ({ ...f, confirm: e.target.value }))}
                placeholder="Repetir contraseña"
              />
            </label>
          </div>
          {resetError && <p className="text-xs font-medium text-red-500">{resetError}</p>}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
            <Button variant="outline" size="sm" disabled={resetting} onClick={() => setResetTarget(null)}>
              Cancelar
            </Button>
            <Button size="sm" loading={resetting} onClick={handleReset}>
              Guardar contraseña
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}