import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { apiService, getApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { Pencil, RefreshCw } from 'lucide-react'
import { EducativaDocente, EducativaCommission } from '../types'

function DocentesInner() {
  const { companySlug } = useParams<{ companySlug: string }>()
  const slug = companySlug ?? ''
  const toast = useToast()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [editing, setEditing] = useState<EducativaDocente | null>(null)
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '' })
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const [resetTarget, setResetTarget] = useState<EducativaDocente | null>(null)
  const [resetForm, setResetForm] = useState({ password: '', confirm: '' })
  const [resetError, setResetError] = useState('')
  const [resetSaving, setResetSaving] = useState(false)

  const query = useQuery({
    queryKey: ['educativa-docentes', slug],
    queryFn: () => apiService.get<EducativaDocente[]>(`/api/educativa/${slug}/docentes`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })
  const docentes = (query.data ?? []).filter((d) => !search || (d.fullName + d.email).toLowerCase().includes(search.toLowerCase()))

  const invalidate = () => qc.invalidateQueries({ queryKey: ['educativa-docentes', slug] })

  function validatePassword(password: string, confirm: string): string {
    if (!password) return 'La contraseña es obligatoria.'
    if (password.length < 4) return 'La contraseña debe tener al menos 4 caracteres.'
    if (password !== confirm) return 'Las contraseñas no coinciden.'
    return ''
  }

  async function save() {
    const pwError = validatePassword(form.password, form.confirmPassword)
    if (pwError) { setFormError(pwError); return }
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setFormError('Nombre, apellido y email son obligatorios.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      await apiService.post(`/api/educativa/${slug}/docentes`, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      setShowForm(false)
      setForm({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' })
      invalidate()
      toast('Docente creado.')
    } catch (err) {
      setFormError(getApiError(err) || 'Error al crear.')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(docente: EducativaDocente) {
    setEditing(docente)
    setEditForm({ firstName: docente.firstName, lastName: docente.lastName, email: docente.email })
    setEditError('')
  }

  async function saveEdit() {
    if (!editing) return
    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.email.trim()) {
      setEditError('Nombre, apellido y email son obligatorios.')
      return
    }
    setEditSaving(true)
    setEditError('')
    try {
      await apiService.put(`/api/educativa/${slug}/docentes/${editing.userId}`, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim(),
      })
      setEditing(null)
      invalidate()
      toast('Docente actualizado.')
    } catch (err) {
      setEditError(getApiError(err) || 'Error al actualizar.')
    } finally {
      setEditSaving(false)
    }
  }

  function openReset(docente: EducativaDocente) {
    setResetTarget(docente)
    setResetForm({ password: '', confirm: '' })
    setResetError('')
  }

  async function saveReset() {
    if (!resetTarget) return
    const pwError = validatePassword(resetForm.password, resetForm.confirm)
    if (pwError) { setResetError(pwError); return }
    setResetSaving(true)
    setResetError('')
    try {
      await apiService.put(`/api/educativa/${slug}/docentes/${resetTarget.userId}/password`, {
        newPassword: resetForm.password,
      })
      setResetTarget(null)
      toast('Contraseña actualizada correctamente.')
    } catch (err) {
      setResetError(getApiError(err) || 'No se pudo actualizar la contraseña.')
    } finally {
      setResetSaving(false)
    }
  }

  async function commissionsOf(userId: string): Promise<number> {
    try {
      const list = await apiService.get<EducativaCommission[]>(`/api/educativa/${slug}/commissions?docenteId=${userId}`)
      return Array.isArray(list) ? list.length : 0
    } catch {
      return 0
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black sm:text-2xl">Docentes</h1>
            <p className="mt-1 text-sm text-blue-200">Docentes Educativa y sus comisiones asignadas</p>
          </div>
          <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50" onClick={() => { setFormError(''); setShowForm(true) }}>+ Nuevo docente</Button>
        </div>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <Input placeholder="Buscar docente..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {query.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner /></div>}
        {!query.isLoading && docentes.length === 0 && <EmptyState icon="👨‍🏫" title="Sin docentes" description="Creá docentes y asígnalos a comisiones." />}
        {!query.isLoading && docentes.length > 0 && (
          <Card className="overflow-x-auto scrollbar-hide p-0">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-4 py-3">Docente</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Comisiones</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {docentes.map((d) => (
                  <DocenteRow
                    key={d.userId}
                    docente={d}
                    countOf={commissionsOf}
                    onEdit={openEdit}
                    onReset={openReset}
                  />
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo docente" className="sm:max-w-md">
        <div className="space-y-4 px-5 py-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre *</label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Apellido *</label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
          </div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Email *</label><Input type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Contraseña *</label><Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Repetir contraseña *</label><Input type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></div>
          </div>
          {formError && <p className="text-xs font-medium text-red-500">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button loading={saving} className="bg-blue-600 text-white hover:bg-blue-700" onClick={save}>Crear</Button>
          </div>
        </div>
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Editar docente" className="sm:max-w-md">
        <div className="space-y-4 px-5 py-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre *</label><Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Apellido *</label><Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} /></div>
          </div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Email *</label><Input type="email" autoComplete="off" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
          {editError && <p className="text-xs font-medium text-red-500">{editError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button loading={editSaving} className="bg-blue-600 text-white hover:bg-blue-700" onClick={saveEdit}>Guardar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={resetTarget !== null} onClose={() => setResetTarget(null)} title="Restablecer contraseña" className="sm:max-w-md">
        <div className="space-y-4 px-5 py-4 sm:px-6">
          {resetTarget && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/[0.02]">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{resetTarget.fullName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{resetTarget.email}</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nueva contraseña *</label><Input type="password" autoComplete="new-password" value={resetForm.password} onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Repetir contraseña *</label><Input type="password" autoComplete="new-password" value={resetForm.confirm} onChange={(e) => setResetForm({ ...resetForm, confirm: e.target.value })} /></div>
          </div>
          {resetError && <p className="text-xs font-medium text-red-500">{resetError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancelar</Button>
            <Button loading={resetSaving} className="bg-blue-600 text-white hover:bg-blue-700" onClick={saveReset}>Guardar contraseña</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function DocenteRow({
  docente,
  countOf,
  onEdit,
  onReset,
}: {
  docente: EducativaDocente
  countOf: (id: string) => Promise<number>
  onEdit: (d: EducativaDocente) => void
  onReset: (d: EducativaDocente) => void
}) {
  const [count, setCount] = useState<number | null>(null)
  useState(() => { countOf(docente.userId).then(setCount) })
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{docente.fullName}</td>
      <td className="px-4 py-3 text-slate-500">{docente.email}</td>
      <td className="px-4 py-3 text-slate-500">{count === null ? '…' : count}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onEdit(docente)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => onReset(docente)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Restablecer contraseña
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function DocentesPage() { return <ToastProvider><DocentesInner /></ToastProvider> }