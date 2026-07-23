import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import { apiService } from '@/lib/api'

interface DocType { id: string; name: string; description?: string; isRequired: boolean; isActive: boolean; hasExpiration: boolean; expirationWarningDays?: number; maxValidityDays?: number; allowMultipleFiles: boolean; maxFiles: number; maxFileSizeMb: number; allowedExtensions?: string }
interface Company { id: string; name: string; slug: string }

function DocumentTypesInner() {
  const toast = useToast()
  const qc = useQueryClient()

  const { data: companies = [] } = useQuery({
    queryKey: ['superadmin-companies'],
    queryFn: () => apiService.get<Company[]>('/api/superadmin/companies'),
  })

  const [selectedSlug, setSelectedSlug] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', isRequired: false, isActive: true, hasExpiration: false, expirationWarningDays: 30, maxValidityDays: '' as string | number, allowMultipleFiles: false, maxFiles: 2, maxFileSizeMb: 10, allowedExtensions: '.pdf,.jpg,.jpeg,.png' })

  const { data: docTypes = [], isLoading } = useQuery({
    queryKey: ['document-types', selectedSlug],
    queryFn: () => apiService.get<DocType[]>(`/api/superadmin/companies/${selectedSlug}/document-types`),
    enabled: !!selectedSlug,
  })

  function buildPayload() {
    const mv = form.maxValidityDays
    return {
      ...form,
      maxValidityDays: (mv === '' || mv === null || mv === undefined) ? null : Number(mv),
    }
  }

  const createMutation = useMutation({
    mutationFn: () => apiService.post(`/api/superadmin/companies/${selectedSlug}/document-types`, buildPayload()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['document-types'] }); setShowForm(false); resetForm(); toast('Tipo documental creado.') },
    onError: () => toast('Error al crear.', 'error'),
  })
  const updateMutation = useMutation({
    mutationFn: () => apiService.put(`/api/superadmin/companies/${selectedSlug}/document-types/${editId}`, buildPayload()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['document-types'] }); setShowForm(false); resetForm(); toast('Tipo documental actualizado.') },
    onError: () => toast('Error al actualizar.', 'error'),
  })
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiService.post(`/api/superadmin/companies/${selectedSlug}/document-types/${id}/deactivate`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['document-types'] }); toast('Tipo documental desactivado.') },
    onError: () => toast('Error al desactivar.', 'error'),
  })

  function resetForm() { setForm({ name: '', description: '', isRequired: false, isActive: true, hasExpiration: false, expirationWarningDays: 30, maxValidityDays: '', allowMultipleFiles: false, maxFiles: 2, maxFileSizeMb: 10, allowedExtensions: '.pdf,.jpg,.jpeg,.png' }); setEditId(null) }

  function openEdit(d: DocType) {
    setEditId(d.id)
    setForm({ name: d.name, description: d.description ?? '', isRequired: d.isRequired, isActive: d.isActive, hasExpiration: d.hasExpiration, expirationWarningDays: d.expirationWarningDays ?? 30, maxValidityDays: d.maxValidityDays ?? '', allowMultipleFiles: d.allowMultipleFiles, maxFiles: d.maxFiles, maxFileSizeMb: d.maxFileSizeMb, allowedExtensions: d.allowedExtensions ?? '.pdf,.jpg,.jpeg,.png' })
    setShowForm(true)
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Tipos documentales</h1>
        <p className="mt-1 text-sm text-slate-400">Gestioná los tipos de documentos por empresa</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Select value={selectedSlug} onChange={(e) => setSelectedSlug(e.target.value)} className="max-w-xs">
            <option value="">Seleccionar empresa</option>
            {companies.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </Select>
          {selectedSlug && (
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }} className="bg-slate-800 text-white hover:bg-slate-700">Nuevo tipo</Button>
          )}
        </div>

        {!selectedSlug ? (
          <p className="py-8 text-center text-sm text-slate-400">Seleccioná una empresa para ver sus tipos documentales.</p>
        ) : isLoading ? (
          <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-slate-600" /></div>
        ) : docTypes.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Sin tipos documentales para esta empresa.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Requerido</th>
                  <th className="px-3 py-2">Vencimiento</th>
                  <th className="px-3 py-2">Multi archivo</th>
                  <th className="px-3 py-2">Tamaño</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {docTypes.map((d) => (
                  <tr key={d.id} className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2 font-medium">{d.name}{d.description ? <span className="text-xs text-slate-400 ml-1">· {d.description}</span> : ''}</td>
                    <td className="px-3 py-2">{d.isRequired ? <span className="text-emerald-600">Sí</span> : 'No'}</td>
                    <td className="px-3 py-2">{d.hasExpiration ? `${d.expirationWarningDays}d` : '-'}</td>
                    <td className="px-3 py-2">{d.allowMultipleFiles ? `${d.maxFiles} archivos` : 'No'}</td>
                    <td className="px-3 py-2">{d.maxFileSizeMb} MB</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${d.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{d.isActive ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>Editar</Button>
                        {d.isActive && <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deactivateMutation.mutate(d.id)}>Desactivar</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showForm && (
        <Modal open={true} onClose={() => { setShowForm(false); resetForm() }} title={editId ? 'Editar tipo documental' : 'Nuevo tipo documental'} className="sm:max-w-md">
          <div className="px-5 py-4 sm:px-6 space-y-4">
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Descripción</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 cursor-pointer dark:border-slate-700"><input type="checkbox" checked={form.isRequired} onChange={(e) => setForm({ ...form, isRequired: e.target.checked })} className="rounded border-slate-300 text-slate-800" /><span className="text-xs font-medium">Requerido</span></label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 cursor-pointer dark:border-slate-700"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-slate-300 text-slate-800" /><span className="text-xs font-medium">Activo</span></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 cursor-pointer dark:border-slate-700"><input type="checkbox" checked={form.hasExpiration} onChange={(e) => setForm({ ...form, hasExpiration: e.target.checked })} className="rounded border-slate-300 text-slate-800" /><span className="text-xs font-medium">Tiene vencimiento</span></label>
              {form.hasExpiration && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Días aviso</label>
                  <Input type="number" min={0} value={form.expirationWarningDays} onChange={(e) => setForm({ ...form, expirationWarningDays: Number(e.target.value) })} />
                </div>
              )}
            </div>
            {form.hasExpiration && (
              <div className="grid grid-cols-2 gap-3">
                <div />
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Validez máxima (días)</label>
                  <Input type="number" min={1} max={365} value={form.maxValidityDays} placeholder="Sin límite"
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === '') { setForm({ ...form, maxValidityDays: '' }); return }
                      const n = Number(v)
                      if (n < 1) return setForm({ ...form, maxValidityDays: 1 })
                      if (n > 365) return setForm({ ...form, maxValidityDays: 365 })
                      setForm({ ...form, maxValidityDays: n })
                    }} />
                  <p className="mt-0.5 text-[10px] text-slate-400">Cantidad máxima de días entre la fecha de carga y la fecha de vencimiento. Vacío = sin límite.</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 cursor-pointer dark:border-slate-700"><input type="checkbox" checked={form.allowMultipleFiles} onChange={(e) => setForm({ ...form, allowMultipleFiles: e.target.checked })} className="rounded border-slate-300 text-slate-800" /><span className="text-xs font-medium">Múltiples archivos</span></label>
              {form.allowMultipleFiles && <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Cant. máxima</label><Input type="number" min={2} value={form.maxFiles} onChange={(e) => setForm({ ...form, maxFiles: Number(e.target.value) })} /></div>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Tamaño máx (MB)</label><Input type="number" min={1} value={form.maxFileSizeMb} onChange={(e) => setForm({ ...form, maxFileSizeMb: Number(e.target.value) })} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Extensiones</label><Input value={form.allowedExtensions} onChange={(e) => setForm({ ...form, allowedExtensions: e.target.value })} placeholder=".pdf,.jpg,.png" /></div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm() }}>Cancelar</Button>
              <Button loading={createMutation.isPending || updateMutation.isPending}
                onClick={() => editId ? updateMutation.mutate() : createMutation.mutate()}
                className="bg-slate-800 text-white hover:bg-slate-700">{editId ? 'Guardar' : 'Crear'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function DocumentTypesPage() { return <ToastProvider><DocumentTypesInner /></ToastProvider> }
