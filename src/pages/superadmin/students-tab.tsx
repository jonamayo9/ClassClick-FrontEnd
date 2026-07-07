import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { apiService } from '@/lib/api'

interface Admin { id: string; email: string; firstName: string; lastName: string; isActive: boolean; companies?: { companyId: string; companyName?: string }[] }
interface Company { id: string; name: string; slug?: string }

export function StudentsTab({ companies }: { companies: Company[] }) {
  const toast = useToast()
  const qc = useQueryClient()

  const { data: allStudents = [], isLoading } = useQuery({
    queryKey: ['superadmin-students'],
    queryFn: () => apiService.get<Admin[]>('/api/superadmin/admins?role=Student'),
  })

  const [companyFilter, setCompanyFilter] = useState('')
  const [editStudent, setEditStudent] = useState<Admin | null>(null)
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '' })
  const [pwStudent, setPwStudent] = useState<Admin | null>(null)
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [toggleTarget, setToggleTarget] = useState<Admin | null>(null)
  const [massCompanyId, setMassCompanyId] = useState('')
  const [massAction, setMassAction] = useState<'activate' | 'deactivate' | null>(null)

  const filtered = useMemo(() => {
    if (!companyFilter) return allStudents
    return allStudents.filter((s) => s.companies?.some((c) => c.companyId === companyFilter))
  }, [allStudents, companyFilter])

  const updateMutation = useMutation({
    mutationFn: () => apiService.put(`/api/superadmin/admins/${editStudent!.id}`, { firstName: editForm.firstName, lastName: editForm.lastName, email: editForm.email, isActive: editStudent!.isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['superadmin-students'] }); setEditStudent(null); toast('Alumno actualizado.') },
    onError: () => toast('Error al actualizar.', 'error'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiService.post(`/api/superadmin/admins/${id}/status`, { isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['superadmin-students'] }); setToggleTarget(null); toast('Estado actualizado.') },
    onError: () => toast('Error al cambiar estado.', 'error'),
  })

  const pwMutation = useMutation({
    mutationFn: () => apiService.post(`/api/superadmin/admins/${pwStudent!.id}/password`, { password: pwNew }),
    onSuccess: () => { setPwStudent(null); setPwNew(''); setPwConfirm(''); toast('Contraseña actualizada.') },
    onError: () => toast('Error al cambiar contraseña.', 'error'),
  })

  const massMutation = useMutation({
    mutationFn: async () => {
      const targetStudents = allStudents.filter((s) => s.companies?.some((c) => c.companyId === massCompanyId))
      const active = massAction === 'activate'
      for (const s of targetStudents) {
        await apiService.post(`/api/superadmin/admins/${s.id}/status`, { isActive: active })
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['superadmin-students'] }); setMassAction(null); setMassCompanyId(''); toast(`Alumnos ${massAction === 'activate' ? 'activados' : 'desactivados'}.`) },
    onError: () => toast('Error en operación masiva.', 'error'),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-slate-600" /></div>

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-bold">Alumnos ({filtered.length})</h2>
        <div className="flex items-center gap-2">
          <Select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="text-xs">
            <option value="">Todas las empresas</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          {companyFilter && (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => { setMassCompanyId(companyFilter); setMassAction('activate') }} className="text-emerald-600">Activar todos</Button>
              <Button size="sm" variant="outline" onClick={() => { setMassCompanyId(companyFilter); setMassAction('deactivate') }} className="text-red-500">Desactivar todos</Button>
            </div>
          )}
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{companyFilter ? 'Sin alumnos para esta empresa.' : 'Sin alumnos registrados.'}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{s.firstName} {s.lastName}</p>
                <p className="text-xs text-slate-400">{s.email}{s.companies && s.companies.length > 0 ? ` · ${s.companies.map((c) => c.companyName).join(', ')}` : ''}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {s.isActive ? 'Activo' : 'Inactivo'}
                </span>
                <Button variant="outline" size="sm" onClick={() => { setEditStudent(s); setEditForm({ firstName: s.firstName, lastName: s.lastName, email: s.email }) }}>Editar</Button>
                <Button variant="outline" size="sm" onClick={() => setPwStudent(s)}>Pass</Button>
                <Button variant="outline" size="sm" onClick={() => setToggleTarget(s)}>
                  {s.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editStudent && (
        <Modal open={true} onClose={() => setEditStudent(null)} title="Editar alumno" className="sm:max-w-md">
          <div className="px-5 py-4 sm:px-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre</label><Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Apellido</label><Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} /></div>
            </div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Email</label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditStudent(null)}>Cancelar</Button>
              <Button loading={updateMutation.isPending} onClick={() => updateMutation.mutate()} className="bg-slate-800 text-white hover:bg-slate-700">Guardar</Button>
            </div>
          </div>
        </Modal>
      )}

      {pwStudent && (
        <Modal open={true} onClose={() => { setPwStudent(null); setPwNew(''); setPwConfirm('') }} title="Resetear contraseña" className="sm:max-w-md">
          <div className="px-5 py-4 sm:px-6 space-y-4">
            <p className="text-sm text-slate-500">Nueva contraseña para <strong>{pwStudent.email}</strong></p>
            <Input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="Nueva contraseña" />
            <Input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="Confirmar nueva contraseña" />
            {pwConfirm && pwNew !== pwConfirm && <p className="text-xs font-medium text-red-500">Las contraseñas no coinciden.</p>}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setPwStudent(null); setPwNew(''); setPwConfirm('') }}>Cancelar</Button>
              <Button loading={pwMutation.isPending} disabled={pwNew.length < 4 || pwNew !== pwConfirm} onClick={() => pwMutation.mutate()} className="bg-slate-800 text-white hover:bg-slate-700">Guardar</Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmModal open={!!toggleTarget} onClose={() => setToggleTarget(null)}
        title={toggleTarget?.isActive ? 'Desactivar alumno' : 'Activar alumno'}
        message={toggleTarget ? `¿${toggleTarget.isActive ? 'Desactivar' : 'Activar'} a ${toggleTarget.firstName} ${toggleTarget.lastName}?` : ''}
        confirmText={toggleTarget?.isActive ? 'Desactivar' : 'Activar'} variant="danger"
        loading={toggleMutation.isPending}
        onConfirm={() => { if (toggleTarget) toggleMutation.mutate({ id: toggleTarget.id, isActive: !toggleTarget.isActive }) }} />

      <ConfirmModal open={!!massAction} onClose={() => setMassAction(null)}
        title={massAction === 'activate' ? 'Activar alumnos' : 'Desactivar alumnos'}
        message={`¿${massAction === 'activate' ? 'Activar' : 'Desactivar'} todos los alumnos de ${companies.find((c) => c.id === massCompanyId)?.name ?? 'esta empresa'}?`}
        confirmText={massAction === 'activate' ? 'Activar todos' : 'Desactivar todos'} variant="danger"
        loading={massMutation.isPending}
        onConfirm={() => massMutation.mutate()} />
    </Card>
  )
}
