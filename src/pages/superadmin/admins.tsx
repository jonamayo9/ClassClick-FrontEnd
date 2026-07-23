import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { apiService } from '@/lib/api'
import { StudentsTab } from './students-tab'

interface Company { id: string; name: string; slug?: string }
interface Admin { id: string; email: string; firstName: string; lastName: string; phone?: string; isActive: boolean; isSuperAdmin?: boolean; systemRole?: string; companies?: { companyId: string; companyName?: string }[]; createdAtUtc?: string }


function AdminsInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'admins' | 'superadmins' | 'students'>('admins')

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['superadmin-admins'],
    queryFn: () => apiService.get<Admin[]>('/api/superadmin/admins'),
  })

  const { data: superAdmins = [] } = useQuery({
    queryKey: ['superadmin-superadmins'],
    queryFn: () => apiService.get<Admin[]>('/api/superadmin/admins?includeSuperAdmins=true'),
  })

  const { data: students = [] } = useQuery({
    queryKey: ['superadmin-students'],
    queryFn: () => apiService.get<Admin[]>('/api/superadmin/admins?role=Student'),
  })

  const { data: companies = [] } = useQuery({
    queryKey: ['superadmin-companies'],
    queryFn: () => apiService.get<Company[]>('/api/superadmin/companies'),
  })

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', isActive: true, isSuperAdmin: false })
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set())
  const [pwModal, setPwModal] = useState<Admin | null>(null)
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [toggleTarget, setToggleTarget] = useState<Admin | null>(null)
  const [companyFilter, setCompanyFilter] = useState('')

  const filteredAdmins = useMemo(() => {
    if (!companyFilter) return admins
    return admins.filter((a) => a.companies?.some((c) => c.companyId === companyFilter))
  }, [admins, companyFilter])

  const assignCompaniesMutation = useMutation({
    mutationFn: ({ adminId, companyIds }: { adminId: string; companyIds: string[] }) =>
      apiService.post(`/api/superadmin/admins/${adminId}/companies`, { companyIds }),
  })

  const removeCompanyMutation = useMutation({
    mutationFn: ({ adminId, companyId }: { adminId: string; companyId: string }) =>
      apiService.del(`/api/superadmin/admins/${adminId}/companies/${companyId}`),
  })

  const createMutation = useMutation({
    mutationFn: () => apiService.post<Admin>('/api/superadmin/admins', form),
    onSuccess: async (createdAdmin) => {
      qc.invalidateQueries({ queryKey: ['superadmin-admins'] })
      qc.invalidateQueries({ queryKey: ['superadmin-superadmins'] })
      if (!form.isSuperAdmin && selectedCompanies.size > 0 && createdAdmin) {
        try {
          await assignCompaniesMutation.mutateAsync({
            adminId: createdAdmin.id,
            companyIds: Array.from(selectedCompanies)
          })
        } catch {
          toast('Error al asignar empresas. El admin se creó pero sin empresas.', 'error')
        }
      }
      setShowForm(false)
      toast(form.isSuperAdmin ? 'SuperAdmin creado.' : 'Admin creado.')
      resetForm()
    },
    onError: () => toast('Error al crear.', 'error'),
  })
  const updateMutation = useMutation({
    mutationFn: () => apiService.put(`/api/superadmin/admins/${editId}`, { firstName: form.firstName, lastName: form.lastName, email: form.email, isActive: form.isActive }),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['superadmin-admins'] })
      qc.invalidateQueries({ queryKey: ['superadmin-superadmins'] })
      if (editId && !form.isSuperAdmin) {
        const admin = admins.find((a) => a.id === editId)
        const currentIds = new Set((admin?.companies || []).map((c) => c.companyId))
        const newIds = selectedCompanies
        const toAdd = [...newIds].filter((id) => !currentIds.has(id))
        const toRemove = [...currentIds].filter((id) => !newIds.has(id))
        try {
          if (toAdd.length > 0) await assignCompaniesMutation.mutateAsync({ adminId: editId, companyIds: toAdd })
          for (const companyId of toRemove) await removeCompanyMutation.mutateAsync({ adminId: editId, companyId })
        } catch {
          toast('Error al sincronizar empresas.', 'error')
        }
      }
      setShowForm(false)
      resetForm()
      toast('Usuario actualizado.')
    },
    onError: () => toast('Error al actualizar.', 'error'),
  })
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiService.post(`/api/superadmin/admins/${id}/status`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superadmin-admins'] })
      qc.invalidateQueries({ queryKey: ['superadmin-superadmins'] })
      setToggleTarget(null)
      toast('Estado actualizado.')
    },
    onError: () => toast('Error al cambiar estado.', 'error'),
  })
  const pwMutation = useMutation({
    mutationFn: () => apiService.post(`/api/superadmin/admins/${pwModal!.id}/password`, { password: pwNew }),
    onSuccess: () => { setPwModal(null); setPwNew(''); setPwConfirm(''); toast('Contraseña actualizada.') },
    onError: () => toast('Error al cambiar contraseña.', 'error'),
  })

  function resetForm() { setForm({ firstName: '', lastName: '', email: '', password: '', isActive: true, isSuperAdmin: false }); setSelectedCompanies(new Set()); setEditId(null) }
  function openEdit(a: Admin) {
    setEditId(a.id)
    setForm({ firstName: a.firstName, lastName: a.lastName, email: a.email, password: '', isActive: a.isActive, isSuperAdmin: !!a.isSuperAdmin })
    setSelectedCompanies(new Set((a.companies || []).map((c) => c.companyId)))
    setShowForm(true)
  }

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-slate-600" /></div>

  const superAdminCount = superAdmins.length
  const studentCount = students.length

  return (
    <div className="space-y-5 pb-8">
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Administradores</h1>
        <p className="mt-1 text-sm text-slate-400">Gestión de admins del sistema</p>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button onClick={() => setTab('admins')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${tab === 'admins' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500 hover:text-slate-700'}`}>Admins ({admins.length})</button>
        <button onClick={() => setTab('superadmins')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${tab === 'superadmins' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500 hover:text-slate-700'}`}>SuperAdmins ({superAdminCount})</button>
        <button onClick={() => setTab('students')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${tab === 'students' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500 hover:text-slate-700'}`}>Alumnos ({studentCount})</button>
      </div>

      {tab === 'admins' && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-bold">Listado</h2>
            <div className="flex items-center gap-2">
              <Select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="text-xs">
                <option value="">Todas las empresas</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }} className="bg-slate-800 text-white hover:bg-slate-700 shrink-0">Nuevo admin</Button>
            </div>
          </div>
          {filteredAdmins.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{companyFilter ? 'Sin admins para esta empresa.' : 'Sin administradores.'}</p>
          ) : (
            <div className="space-y-2">
              {filteredAdmins.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{a.firstName} {a.lastName}</p>
                    <p className="text-xs text-slate-400">{a.email}</p>
                    {a.companies && a.companies.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {a.companies.map((c) => (
                          <span key={c.companyId} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {c.companyName || c.companyId.slice(0, 8)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {a.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => openEdit(a)}>Editar</Button>
                    <Button variant="outline" size="sm" onClick={() => setPwModal(a)}>Pass</Button>
                    <Button variant="outline" size="sm" onClick={() => setToggleTarget(a)}>
                      {a.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'superadmins' && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold">SuperAdmins</h2>
            <Button
              size="sm"
              onClick={() => {
                resetForm()
                setForm((current) => ({ ...current, isSuperAdmin: true }))
                setShowForm(true)
              }}
              className="bg-slate-800 text-white hover:bg-slate-700"
            >
              Nuevo SuperAdmin
            </Button>
          </div>
          {superAdmins.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Sin superadmins.</p>
          ) : (
            <div className="space-y-2">
              {superAdmins.map((a: Admin) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{a.firstName} {a.lastName}</p>
                    <p className="text-xs text-slate-400">{a.email}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {a.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => openEdit(a)}>Editar</Button>
                    <Button variant="outline" size="sm" onClick={() => setPwModal(a)}>Contraseña</Button>
                    <Button variant="outline" size="sm" onClick={() => setToggleTarget(a)}>
                      {a.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'students' && <StudentsTab companies={companies} />}

      {showForm && (
        <Modal
          open={true}
          onClose={() => { setShowForm(false); resetForm() }}
          title={editId ? `Editar ${form.isSuperAdmin ? 'SuperAdmin' : 'admin'}` : `Nuevo ${form.isSuperAdmin ? 'SuperAdmin' : 'admin'}`}
          className="sm:max-w-md"
        >
            <div className="px-5 py-4 sm:px-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre *</label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Apellido *</label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
              </div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Email *</label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              {!editId && <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Contraseña *</label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>}
              {editId && (
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500" />
                  <span className="text-sm font-medium">Admin activo</span>
                </label>
              )}

              {!form.isSuperAdmin && (
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-400">Empresas asignadas</label>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                    {companies.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2 text-center">No hay empresas disponibles.</p>
                    ) : (
                      companies.map((c) => {
                        const checked = selectedCompanies.has(c.id)
                        return (
                          <label key={c.id} className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                            <input type="checkbox" checked={checked}
                              onChange={() => {
                                setSelectedCompanies((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(c.id)) next.delete(c.id)
                                  else next.add(c.id)
                                  return next
                                })
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">{c.name}</span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setShowForm(false); resetForm() }}>Cancelar</Button>
                <Button loading={createMutation.isPending || updateMutation.isPending}
                  onClick={() => {
                    if (editId) updateMutation.mutate()
                    else createMutation.mutate()
                  }}
                  className="bg-slate-800 text-white hover:bg-slate-700">{editId ? 'Guardar' : `Crear ${form.isSuperAdmin ? 'SuperAdmin' : 'admin'}`}</Button>
              </div>
            </div>
        </Modal>
      )}

      {pwModal && (
        <Modal open={true} onClose={() => { setPwModal(null); setPwNew(''); setPwConfirm('') }} title="Cambiar contraseña" className="sm:max-w-md">
          <div className="px-5 py-4 sm:px-6 space-y-4">
            <p className="text-sm text-slate-500">Nueva contraseña para <strong>{pwModal.email}</strong></p>
            <Input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="Nueva contraseña" />
            <Input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="Confirmar nueva contraseña" />
            {pwConfirm && pwNew !== pwConfirm && <p className="text-xs font-medium text-red-500">Las contraseñas no coinciden.</p>}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setPwModal(null); setPwNew(''); setPwConfirm('') }}>Cancelar</Button>
              <Button loading={pwMutation.isPending} disabled={pwNew.length < 4 || pwNew !== pwConfirm} onClick={() => pwMutation.mutate()}
                className="bg-slate-800 text-white hover:bg-slate-700">Guardar</Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmModal open={!!toggleTarget} onClose={() => setToggleTarget(null)}
        title={toggleTarget?.isActive ? 'Desactivar usuario' : 'Activar usuario'}
        message={toggleTarget ? `¿${toggleTarget.isActive ? 'Desactivar' : 'Activar'} a ${toggleTarget.firstName} ${toggleTarget.lastName}?` : ''}
        confirmText={toggleTarget?.isActive ? 'Desactivar' : 'Activar'} variant="danger"
        loading={toggleMutation.isPending}
        onConfirm={() => { if (toggleTarget) toggleMutation.mutate({ id: toggleTarget.id, isActive: !toggleTarget.isActive }) }} />
    </div>
  )
}

export default function AdminsPage() { return <ToastProvider><AdminsInner /></ToastProvider> }
