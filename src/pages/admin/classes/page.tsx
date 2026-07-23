import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHero } from '@/components/ui/page-hero'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { TimePicker } from '@/components/ui/date-picker'

interface ClassItem { id: string; courseId?: string; courseName?: string; teacherId?: string; teacherName?: string; dayOfWeek?: string; startTime?: string; endTime?: string; isActive: boolean }
interface Course { id: string; name: string }
interface Teacher { id: string; firstName: string; lastName: string }

const DAY_LABELS: Record<string, string> = {
  Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles',
  Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado', Sunday: 'Domingo',
}
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function formatTime(t: string): string {
  return t ? t.slice(0, 5) : ''
}

function useSlug() { return useAuth((s) => s.activeCompanySlug ?? '') }

function ClassesPageInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const slug = useSlug()

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['admin-classes', slug],
    queryFn: () => apiService.get<ClassItem[]>(`/api/admin/${slug}/classes`),
    enabled: !!slug,
  })
  const { data: courses = [] } = useQuery({
    queryKey: ['admin-courses', slug],
    queryFn: () => apiService.get<Course[]>(`/api/admin/${slug}/courses`),
    enabled: !!slug,
    select: (d: unknown) => { if (Array.isArray(d)) return d as Course[]; const r = d as { items?: Course[]; data?: Course[] }; return r.items ?? r.data ?? [] },
  })
  const { data: teachers = [] } = useQuery({
    queryKey: ['admin-teachers', slug],
    queryFn: () => apiService.get<Teacher[]>(`/api/admin/${slug}/teachers`),
    enabled: !!slug,
    select: (d: unknown) => { if (Array.isArray(d)) return d as Teacher[]; const r = d as { items?: Teacher[]; data?: Teacher[] }; return r.items ?? r.data ?? [] },
  })

  const [editClass, setEditClass] = useState<ClassItem | null>(null)
  const [form, setForm] = useState({ courseId: '', teacherId: '', dayOfWeek: 'Monday', startTime: '', endTime: '' })
  const [deleteClass, setDeleteClass] = useState<ClassItem | null>(null)

  const createMutation = useMutation({
    mutationFn: () => apiService.post(`/api/admin/${slug}/classes`, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-classes'] }); setForm({ courseId: '', teacherId: '', dayOfWeek: 'Monday', startTime: '', endTime: '' }); toast('Clase creada.') },
    onError: (e: Error) => toast(e.message || 'Error al crear.', 'error'),
  })
  const updateMutation = useMutation({
    mutationFn: () => apiService.put(`/api/admin/${slug}/classes/${editClass!.id}`, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-classes'] }); setEditClass(null); toast('Clase actualizada.') },
    onError: (e: Error) => toast(e.message || 'Error al actualizar.', 'error'),
  })
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiService.patch(`/api/admin/${slug}/classes/${id}/active`, { isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-classes'] }); toast('Estado actualizado.') },
    onError: (e: Error) => toast(e.message || 'Error al cambiar estado.', 'error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.del(`/api/admin/${slug}/classes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-classes'] }); setDeleteClass(null); toast('Clase eliminada.') },
    onError: (e: Error) => toast(e.message || 'Error al eliminar.', 'error'),
  })

  const uniqueCourses = courses as Course[]
  const uniqueTeachers = teachers as Teacher[]

  function openEdit(c: ClassItem) {
    setEditClass(c)
    setForm({ courseId: c.courseId ?? '', teacherId: c.teacherId ?? '', dayOfWeek: c.dayOfWeek ?? 'Monday', startTime: formatTime(c.startTime ?? ''), endTime: formatTime(c.endTime ?? '') })
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate()
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateMutation.mutate()
  }

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>

  return (
    <div className="space-y-5 pb-8">
      <PageHero label="Horarios" title="Clases" description="Creá y administrá los horarios de cada curso." stats={[
        { label: 'Total', value: classes.length },
        { label: 'Activas', value: classes.filter((c) => c.isActive).length },
      ]} />

      {/* Create */}
      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Nueva clase</h2>
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Curso</label>
            <Select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
              <option value="">Seleccionar...</option>
              {uniqueCourses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Profesor</label>
            <Select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
              <option value="">Seleccionar...</option>
              {uniqueTeachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Día</label>
            <Select value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
              {DAYS.map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
            </Select>
          </div>
          <div />
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Inicio</label>
            <TimePicker value={form.startTime} onChange={(value) => setForm({ ...form, startTime: value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Fin</label>
            <TimePicker value={form.endTime} onChange={(value) => setForm({ ...form, endTime: value })} />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" loading={createMutation.isPending}
              className="bg-violet-600 text-white hover:bg-violet-700">Crear</Button>
          </div>
        </form>
      </Card>

      {/* Edit Modal */}
      {editClass && (
        <Modal open={true} onClose={() => setEditClass(null)} title="Editar clase" className="sm:max-w-lg">
          <form onSubmit={handleEditSubmit} className="px-5 py-4 sm:px-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Curso</label>
                <Select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {uniqueCourses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Profesor</label>
                <Select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {uniqueTeachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Día</label>
                <Select value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
                  {DAYS.map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                </Select>
              </div>
              <div />
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Inicio</label>
                <TimePicker value={form.startTime} onChange={(value) => setForm({ ...form, startTime: value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Fin</label>
                <TimePicker value={form.endTime} onChange={(value) => setForm({ ...form, endTime: value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" type="button" onClick={() => setEditClass(null)}>Cancelar</Button>
              <Button type="submit" loading={updateMutation.isPending}
                className="bg-violet-600 text-white hover:bg-violet-700">Guardar</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* List */}
      {classes.length === 0 ? (
        <EmptyState icon="📅" title="Sin clases" description="Creá una clase para empezar a registrar horarios." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{c.courseName || 'Sin curso'}</h3>
                  <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                    {c.teacherName && <p>Profesor: {c.teacherName}</p>}
                    {c.dayOfWeek && <p>{DAY_LABELS[c.dayOfWeek] ?? c.dayOfWeek} · {formatTime(c.startTime ?? '')} hs - {formatTime(c.endTime ?? '')} hs</p>}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${c.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                  {c.isActive ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <Button variant="outline" size="sm" onClick={() => openEdit(c)}>Editar</Button>
                <Button variant="outline" size="sm" onClick={() => toggleMutation.mutate({ id: c.id, isActive: !c.isActive })}>
                  {c.isActive ? 'Desactivar' : 'Activar'}
                </Button>
                <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
                  onClick={() => setDeleteClass(c)}>Eliminar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ConfirmModal open={!!deleteClass} onClose={() => setDeleteClass(null)} title="Eliminar clase"
        message={deleteClass ? `¿Eliminar la clase de ${deleteClass.courseName || 'sin curso'}?` : ''}
        confirmText="Eliminar" variant="danger" loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteClass) deleteMutation.mutate(deleteClass.id) }} />
    </div>
  )
}

export default function ClassesPage() { return <ToastProvider><ClassesPageInner /></ToastProvider> }
