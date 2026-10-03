import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService, getApiError } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { TimePicker } from '@/components/ui/date-picker'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { EducativaCommissionClass, EducativaCommission, normalizeDayOfWeek } from '../../types'

const DAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

export function EducativaCommissionClassesPage() {
  const { companySlug, commissionId } = useParams<{ companySlug: string; commissionId: string }>()
  const slug = companySlug ?? ''
  const commission = commissionId ?? ''
  const qc = useQueryClient()

  const [editing, setEditing] = useState<EducativaCommissionClass | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<{ dayOfWeek: string; startTime: string; endTime: string }>({ dayOfWeek: '', startTime: '', endTime: '' })
  const [deleting, setDeleting] = useState<EducativaCommissionClass | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const commissionQuery = useQuery({
    queryKey: ['educativa-commission', slug, commission],
    queryFn: () => apiService.get<EducativaCommission>(`/api/educativa/${slug}/commissions/${commission}`),
    enabled: !!slug && !!commission,
    retry: false,
  })

  const query = useQuery({
    queryKey: ['educativa-classes', slug, commission],
    queryFn: () => apiService.get<EducativaCommissionClass[]>(`/api/educativa/${slug}/commissions/${commission}/classes?includeInactive=true`),
    enabled: !!slug && !!commission,
    retry: false,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['educativa-classes', slug, commission] })

  const openCreate = () => {
    setEditing(null)
    setForm({ dayOfWeek: '', startTime: '', endTime: '' })
    setError('')
    setModalOpen(true)
  }

  const openEdit = (c: EducativaCommissionClass) => {
    setEditing(c)
    setForm({ dayOfWeek: String(normalizeDayOfWeek(c.dayOfWeek)), startTime: c.startTime.slice(0, 5), endTime: c.endTime.slice(0, 5) })
    setError('')
    setModalOpen(true)
  }

  async function save() {
    if (form.dayOfWeek === '' || !form.startTime || !form.endTime) {
      setError('Completá día, hora de inicio y hora de fin.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = { dayOfWeek: Number(form.dayOfWeek), startTime: form.startTime, endTime: form.endTime }
      const base = `/api/educativa/${slug}/commissions/${commission}/classes`
      if (editing) {
        await apiService.put(`${base}/${editing.id}`, { ...payload, isActive: editing.isActive })
      } else {
        await apiService.post(base, payload)
      }
      setModalOpen(false)
      invalidate()
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function toggle(c: EducativaCommissionClass) {
    try {
      await apiService.put(`/api/educativa/${slug}/commissions/${commission}/classes/${c.id}`, {
        dayOfWeek: c.dayOfWeek, startTime: c.startTime, endTime: c.endTime, isActive: !c.isActive,
      })
      invalidate()
    } catch { /* ignore */ }
  }

  async function deactivate() {
    if (!deleting) return
    setSaving(true)
    try {
      await apiService.del(`/api/educativa/${slug}/commissions/${commission}/classes/${deleting.id}`)
      setDeleting(null)
      invalidate()
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  const items = query.data ?? []
  const comm = commissionQuery.data

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Educativa · Clases recurrentes</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">{comm?.name ?? 'Comisión'}</h1>
            <p className="mt-1 text-sm text-blue-200">
              Horarios semanales (NO se generan ocurrencias). Vigentes dentro del período de la comisión.
            </p>
          </div>
          <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50" onClick={openCreate}>+ Agregar horario</Button>
        </div>
      </section>

      <div className="flex items-center gap-2 text-sm">
        <Link to={`/educativa/${slug}/commissions`} className="text-blue-600 hover:underline dark:text-blue-400">← Comisiones</Link>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <Link to={`/educativa/${slug}/commissions/${commission}/enrollments`} className="text-blue-600 hover:underline dark:text-blue-400">Alumnos</Link>
      </div>

      {query.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner /></div>}
      {query.isError && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">No se pudieron cargar las clases.</p>}
      {!query.isLoading && !query.isError && items.length === 0 && (
        <Card><EmptyState icon="🕘" title="Sin horarios" description="Agregá los horarios recurrentes de esta comisión." /></Card>
      )}

      {!query.isLoading && !query.isError && items.length > 0 && (
        <Card className="p-0">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{c.dayLabel}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.timeLabel}</p>
                    <p className="text-xs text-slate-400">Clase recurrente semanal</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.isActive ? <Badge variant="success">Activa</Badge> : <Badge variant="default">Inactiva</Badge>}
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)}>Editar</Button>
                  <Button variant={c.isActive ? 'danger' : 'outline'} size="sm" onClick={() => (c.isActive ? setDeleting(c) : toggle(c))}>
                    {c.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar horario' : 'Agregar horario recurrente'}>
        <div className="space-y-4 px-5 py-4 sm:px-6">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">{error}</p>}
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800">
            Un solo registro representa la clase TODAS las semanas dentro del período de la comisión. Se permiten varios horarios incluso el mismo día.
          </p>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Día *</label>
          <Select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
            <option value="">Seleccionar día…</option>
            {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Inicio *</label>
              <TimePicker value={form.startTime} onChange={(v) => setForm({ ...form, startTime: v })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Fin *</label>
              <TimePicker value={form.endTime} onChange={(v) => setForm({ ...form, endTime: v })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={save}>Guardar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)} title="Desactivar horario"
        message={`¿Desactivar ${deleting?.dayLabel} ${deleting?.timeLabel}? El historial de asistencias se conserva.`}
        confirmText="Desactivar" variant="danger" loading={saving} onConfirm={deactivate} />
    </div>
  )
}
