import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { DatePicker } from '@/components/ui/date-picker'

interface Charge { id: string; name: string; amount: number; dueDate: string | null; isActive: boolean }

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

function useSlug() { return useAuth((s) => s.activeCompanySlug ?? '') }

function ChargesPageInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const slug = useSlug()

  const { data: charges = [], isLoading } = useQuery({
    queryKey: ['admin-charges', slug],
    queryFn: () => apiService.get<Charge[]>(`/api/admin/${slug}/charges`),
    enabled: !!slug,
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', amount: '', dueDate: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteCharge, setDeleteCharge] = useState<Charge | null>(null)

  const createMutation = useMutation({
    mutationFn: () => apiService.post(`/api/admin/${slug}/charges`, { ...form, amount: Number(form.amount) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-charges'] }); resetForm(); toast('Cuota creada.') },
    onError: () => toast('Error al crear cuota.', 'error'),
  })
  const updateMutation = useMutation({
    mutationFn: () => apiService.put(`/api/admin/${slug}/charges/${editingId}`, { name: form.name, amount: Number(form.amount), dueDate: form.dueDate || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-charges'] }); resetForm(); toast('Cuota actualizada.') },
    onError: () => toast('Error al actualizar.', 'error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.del(`/api/admin/${slug}/charges/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-charges'] }); setDeleteCharge(null); toast('Cuota eliminada.') },
    onError: () => toast('Error al eliminar.', 'error'),
  })
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiService.put(`/api/admin/${slug}/charges/${id}/toggle-active`, { isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-charges'] }); toast('Estado actualizado.') },
    onError: () => toast('Error al cambiar estado.', 'error'),
  })

  function resetForm() { setEditingId(null); setForm({ name: '', amount: '', dueDate: '' }); setErrors({}) }

  function openEdit(c: Charge) {
    setEditingId(c.id); setForm({ name: c.name, amount: String(c.amount), dueDate: c.dueDate ?? '' }); setErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Requerido'
    if (!form.amount || isNaN(Number(form.amount))) e.amount = 'Monto inválido'
    setErrors(e); return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    if (editingId) updateMutation.mutate()
    else createMutation.mutate()
  }

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-rose-600" /></div>

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 p-5 text-white sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Cuotas</h1>
        <p className="mt-1 text-sm text-rose-200">Conceptos de cobro recurrentes</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Total" value={String(charges.length)} />
          <Stat label="Activas" value={String(charges.filter((c) => c.isActive).length)} />
          <Stat label="Inactivas" value={String(charges.filter((c) => !c.isActive).length)} />
        </div>
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-black">{editingId ? 'Editar cuota' : 'Nueva cuota'}</h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_auto_auto]">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Nombre *</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Monto *</label>
            <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Vencimiento</label>
            <DatePicker value={form.dueDate} onChange={(value) => setForm({ ...form, dueDate: value })} />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending} className="bg-rose-600 text-white hover:bg-rose-700">
              {editingId ? 'Guardar' : 'Crear'}
            </Button>
            {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
          </div>
        </form>
      </Card>

      {charges.length === 0 ? (
        <div className="py-10 text-center text-slate-500">No hay cuotas creadas.</div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-3 py-3">Nombre</th>
                  <th className="px-3 py-3">Monto</th>
                  <th className="px-3 py-3">Vencimiento</th>
                  <th className="px-3 py-3 text-center">Estado</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {charges.map((c) => (
                  <tr key={c.id} className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-3 font-medium">{c.name}</td>
                    <td className="px-3 py-3 font-semibold">{ARS.format(c.amount)}</td>
                    <td className="px-3 py-3 text-slate-500">{c.dueDate ?? '-'}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        c.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}>{c.isActive ? 'Activa' : 'Inactiva'}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Editar</Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleMutation.mutate({ id: c.id, isActive: !c.isActive })}>
                          {c.isActive ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => setDeleteCharge(c)}>Eliminar</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {charges.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm font-bold text-rose-600">{ARS.format(c.amount)}</div>
                    {c.dueDate && <div className="text-xs text-slate-400">Vence: {c.dueDate}</div>}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {c.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)}>Editar</Button>
                  <Button variant="outline" size="sm" onClick={() => toggleMutation.mutate({ id: c.id, isActive: !c.isActive })}>
                    {c.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => setDeleteCharge(c)}>Eliminar</Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <ConfirmModal open={!!deleteCharge} onClose={() => setDeleteCharge(null)} title="Eliminar cuota"
        message={deleteCharge ? `¿Eliminar "${deleteCharge.name}"?` : ''}
        confirmText="Eliminar" variant="danger" loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteCharge) deleteMutation.mutate(deleteCharge.id) }} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 p-3 backdrop-blur-sm">
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs text-rose-200">{label}</div>
    </div>
  )
}

export default function ChargesPage() { return <ToastProvider><ChargesPageInner /></ToastProvider> }
