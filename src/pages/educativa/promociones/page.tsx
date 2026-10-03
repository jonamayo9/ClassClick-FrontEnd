import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { apiService, getApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { EducativaPromotion, EducativaPromotionGroup, PromotionType, PromotionDistribution } from '../types'

interface PromoForm {
  name: string
  description?: string
  type: PromotionType | ''
  discountPercent?: number
  discountAmount?: number
  startDate: string
  endDate?: string
  participantCount: number | ''
  distribution: PromotionDistribution | ''
}

function PromocionesInner() {
  const { companySlug } = useParams<{ companySlug: string }>()
  const slug = companySlug ?? ''
  const toast = useToast()
  const qc = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<EducativaPromotion | null>(null)
  const [form, setForm] = useState<PromoForm>({ name: '', type: '', startDate: '', participantCount: '', distribution: '' })
  const [saving, setSaving] = useState(false)
  const [groupsOpen, setGroupsOpen] = useState(false)
  const [groups, setGroups] = useState<EducativaPromotionGroup[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)

  const query = useQuery({
    queryKey: ['educativa-promociones', slug],
    queryFn: () => apiService.get<EducativaPromotion[]>(`/api/educativa/${slug}/promotions`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })
  const items = query.data ?? []

  const invalidate = () => qc.invalidateQueries({ queryKey: ['educativa-promociones', slug] })

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', type: '', startDate: '', participantCount: '', distribution: '' })
    setShowForm(true)
  }

  const openEdit = (p: EducativaPromotion) => {
    setEditing(p)
    setForm({
      name: p.name, description: p.description ?? '', type: p.type, discountPercent: p.discountPercent ?? undefined,
      discountAmount: p.discountAmount ?? undefined, startDate: p.startDate.slice(0, 10), endDate: p.endDate?.slice(0, 10),
      participantCount: p.participantCount, distribution: p.distribution,
    })
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim() || !form.type || !form.distribution || form.participantCount === '' || !form.startDate) {
      toast('Completá los campos obligatorios.', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name, description: form.description || null, type: form.type,
        discountPercent: form.type === 'Percentage' ? form.discountPercent : null,
        discountAmount: form.type === 'FixedAmount' ? form.discountAmount : null,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        participantCount: Number(form.participantCount) || 2,
        distribution: form.distribution,
      }
      if (editing) {
        await apiService.put(`/api/educativa/${slug}/promotions/${editing.id}`, { ...payload, isActive: editing.isActive })
      } else {
        await apiService.post(`/api/educativa/${slug}/promotions`, payload)
      }
      setShowForm(false)
      invalidate()
      toast(editing ? 'Promoción actualizada.' : 'Promoción creada.')
    } catch (err) {
      toast(getApiError(err) || 'Error al guardar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggle(p: EducativaPromotion) {
    try {
      await apiService.put(`/api/educativa/${slug}/promotions/${p.id}`, {
        name: p.name, description: p.description ?? null, type: p.type, discountPercent: p.discountPercent,
        discountAmount: p.discountAmount, startDate: p.startDate, endDate: p.endDate,
        participantCount: p.participantCount, distribution: p.distribution, isActive: !p.isActive,
      })
      invalidate()
    } catch (err) {
      toast(getApiError(err) || 'Error.', 'error')
    }
  }

  async function openGroups() {
    setGroupsOpen(true)
    setGroupsLoading(true)
    try {
      setGroups(await apiService.get<EducativaPromotionGroup[]>(`/api/educativa/${slug}/promotion-groups`))
    } catch {
      setGroups([])
    } finally {
      setGroupsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black sm:text-2xl">Promociones</h1>
            <p className="mt-1 text-sm text-blue-200">Promociones de inscripción/matrícula y grupos de referidos</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={openGroups}>Grupos</Button>
            <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50" onClick={openCreate}>+ Nueva promoción</Button>
          </div>
        </div>
      </div>

      {query.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner /></div>}
      {!query.isLoading && items.length === 0 && <EmptyState icon="🎁" title="Sin promociones" description="Creá promociones de inscripción." />}
      {!query.isLoading && items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <Card key={p.id} className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">{p.name}</h3>
                  <p className="text-xs text-slate-400">{p.typeLabel} · {p.distributionLabel}</p>
                </div>
                {p.isActive ? <Badge variant="success">Activa</Badge> : <Badge variant="default">Inactiva</Badge>}
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {p.discountPercent ? `${p.discountPercent}% de descuento` : p.discountAmount ? `$${p.discountAmount} de descuento` : 'Beneficio sobre matrícula'} · {p.participantCount} participante(s)
              </p>
              <div className="mt-3 flex flex-wrap gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => openEdit(p)}>Editar</Button>
                <Button variant={p.isActive ? 'danger' : 'outline'} size="sm" onClick={() => toggle(p)}>{p.isActive ? 'Desactivar' : 'Activar'}</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar promoción' : 'Nueva promoción'} className="sm:max-w-lg">
        <div className="space-y-4 px-5 py-4 sm:px-6">
          <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Tipo *</label>
              <Select
                value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PromotionType })}>
                <option value="">Seleccionar tipo…</option>
                <option value="TwoForOne">2x1 por referidos</option>
                <option value="Percentage">Porcentaje de descuento</option>
                <option value="FixedAmount">Importe fijo</option>
                <option value="FreeEnrollment">Inscripción bonificada</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Distribución *</label>
              <Select
                value={form.distribution} onChange={(e) => setForm({ ...form, distribution: e.target.value as PromotionDistribution })}>
                <option value="">Seleccionar distribución…</option>
                <option value="Each">A cada participante</option>
                <option value="FirstOnly">Al primer participante</option>
                <option value="LastOnly">Al último participante</option>
              </Select>
            </div>
          </div>
          {form.type === 'Percentage' && (
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">% de descuento *</label><Input type="number" value={form.discountPercent ?? 0} onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })} /></div>
          )}
          {form.type === 'FixedAmount' && (
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Importe de descuento *</label><Input type="number" value={form.discountAmount ?? 0} onChange={(e) => setForm({ ...form, discountAmount: Number(e.target.value) })} /></div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Inicio *</label><DatePicker value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Fin</label><DatePicker value={form.endDate ?? ''} onChange={(v) => setForm({ ...form, endDate: v })} /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Participantes *</label><Input type="number" value={form.participantCount} onChange={(e) => setForm({ ...form, participantCount: e.target.value === '' ? '' : Number(e.target.value) })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button loading={saving} className="bg-blue-600 text-white hover:bg-blue-700" onClick={save}>Guardar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={groupsOpen} onClose={() => setGroupsOpen(false)} title="Grupos promocionales" className="sm:max-w-2xl">
        <div className="space-y-4 px-5 py-4 sm:px-6">
          {groupsLoading && <div className="flex justify-center py-8 text-slate-400"><Spinner /></div>}
          {!groupsLoading && groups.length === 0 && <p className="text-sm text-slate-400">Sin grupos promocionales.</p>}
          {!groupsLoading && groups.map((g) => (
            <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{g.promotionName}</p>
                <p className="text-xs text-slate-400">Código: {g.linkCode} · {g.participantsJoined}/{g.participantCount} participantes</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${g.status === 'Applied' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : g.status === 'Completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>{g.statusLabel}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}

export default function PromocionesPage() { return <ToastProvider><PromocionesInner /></ToastProvider> }
