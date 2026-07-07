import { useState, useRef, useCallback, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useAnnouncements, useCourses, useCreateAnnouncement,
  useUpdateAnnouncement, useDeleteAnnouncement,
} from './hooks'
import type { Announcement, CourseOption } from './hooks'

export default function AnnouncementsPage() {
  const { data: announcements = [], isLoading } = useAnnouncements()
  const { data: courses = [] } = useCourses()
  const createMutation = useCreateAnnouncement()
  const updateMutation = useUpdateAnnouncement()
  const deleteMutation = useDeleteAnnouncement()

  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteItem, setDeleteItem] = useState<Announcement | null>(null)
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([])

  const toastId = useRef(0)
  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId.current
    setToasts((p) => [...p, { id, message: msg, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500)
  }, [])

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id)
      toast('Novedad eliminada.')
      if (editId === id) { setFormMode('create'); setEditId(null) }
      setDeleteItem(null)
    } catch { toast('Error al eliminar.', 'error') }
  }

  function handleEdit(item: Announcement) {
    setFormMode('edit')
    setEditId(item.id)
  }

  function handleCancelEdit() {
    setFormMode('create')
    setEditId(null)
  }

  const stats = {
    total: announcements.length,
    active: announcements.filter((a) => a.isActive).length,
    withImage: announcements.filter((a) => a.imageUrl).length,
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 via-amber-700 to-yellow-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Comunicación</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">Novedades</h1>
            <p className="mt-1 text-sm text-amber-200 sm:text-base">Publicá avisos para alumnos con texto, imagen o ambos.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200">Total</p>
              <p className="mt-0.5 text-xl font-bold sm:text-2xl">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200">Activas</p>
              <p className="mt-0.5 text-xl font-bold sm:text-2xl">{stats.active}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200">Con imagen</p>
              <p className="mt-0.5 text-xl font-bold sm:text-2xl">{stats.withImage}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        {/* Form */}
        <AnnouncementForm
          mode={formMode} editId={editId} announcements={announcements}
          courses={courses} createMutation={createMutation} updateMutation={updateMutation}
          toast={toast} onCancelEdit={handleCancelEdit} />

        {/* List */}
        <Card className="min-w-0 flex-1 p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Listado de novedades</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Administrá lo que ven los alumnos.</p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-500">
              Todavía no hay novedades cargadas.
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      <th className="px-4 py-3">Novedad</th>
                      <th className="px-4 py-3">Imagen</th>
                      <th className="px-4 py-3">Alcance</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[...announcements].sort((a, b) => new Date(b.createdAtUtc || 0).getTime() - new Date(a.createdAtUtc || 0).getTime()).map((item, i) => {
                      const bg = i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'
                      return (
                        <tr key={item.id} className={bg}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900 dark:text-white">{item.title || 'Sin título'}</p>
                            <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{item.text || 'Sin texto'}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">{item.createdAtUtc ? new Date(item.createdAtUtc).toLocaleDateString('es-AR') : '-'}</p>
                          </td>
                          <td className="px-4 py-3">
                            {item.imageUrl
                              ? <img src={item.imageUrl} alt="" className="h-12 w-16 rounded-xl border border-slate-200 object-cover dark:border-slate-700" />
                              : <span className="text-xs text-slate-400">Sin imagen</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {item.isGlobal
                              ? <span className="text-xs text-slate-500">Global</span>
                              : <span className="text-xs text-blue-600 dark:text-blue-400">{(item.courseNames || []).join(', ')}</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {item.isActive
                              ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Activa</span>
                              : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">Inactiva</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button variant="outline" size="sm" className="text-[11px] px-2.5 py-1.5"
                                onClick={() => handleEdit(item)}>Editar</Button>
                              <Button variant="outline" size="sm" className="text-[11px] px-2.5 py-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                onClick={() => setDeleteItem(item)}>Eliminar</Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 sm:hidden">
                {[...announcements].sort((a, b) => new Date(b.createdAtUtc || 0).getTime() - new Date(a.createdAtUtc || 0).getTime()).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex gap-3">
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white">{item.title || 'Sin título'}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{item.text || 'Sin texto'}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {item.isActive
                            ? <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Activa</span>
                            : <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">Inactiva</span>
                          }
                          <span className="text-[11px] text-slate-400">
                            {item.isGlobal ? 'Global' : (item.courseNames || []).join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <Button variant="outline" size="sm" className="text-[11px] px-2.5 py-1.5"
                        onClick={() => handleEdit(item)}>Editar</Button>
                      <Button variant="outline" size="sm" className="text-[11px] px-2.5 py-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                        onClick={() => setDeleteItem(item)}>Eliminar</Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Delete Confirm */}
      {deleteItem && (
        <ConfirmModal
          title="Eliminar novedad"
          message="Vas a eliminar esta novedad. Esta acción no se puede deshacer."
          confirmText="Eliminar" loading={deleteMutation.isPending}
          onConfirm={() => handleDelete(deleteItem.id)}
          onClose={() => setDeleteItem(null)} />
      )}

      {/* Toasts */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:right-4 sm:left-auto sm:top-4 sm:bottom-auto sm:items-end sm:p-0">
        {toasts.map((t) => (
          <div key={t.id}
            className={`pointer-events-auto animate-slide-up rounded-xl border px-5 py-3 text-sm font-medium shadow-lg ${
              t.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
            }`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Form ─── */
function AnnouncementForm({ mode, editId, announcements, courses, createMutation, updateMutation, toast, onCancelEdit }: {
  mode: 'create' | 'edit'; editId: string | null
  announcements: Announcement[]; courses: CourseOption[]
  createMutation: ReturnType<typeof useCreateAnnouncement>
  updateMutation: ReturnType<typeof useUpdateAnnouncement>
  toast: (msg: string, type?: 'success' | 'error') => void
  onCancelEdit: () => void
}) {
  const editing = announcements.find((a) => a.id === editId)

  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [scope, setScope] = useState<'global' | 'courses'>('global')
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)
  const [notifyStudents, setNotifyStudents] = useState(true)
  const [image, setImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editing) {
      setTitle(editing.title || '')
      setText(editing.text || '')
      setScope(editing.isGlobal ? 'global' : 'courses')
      setSelectedCourseIds(editing.courseIds || [])
      setIsActive(editing.isActive)
      setImage(null)
      setRemoveImage(false)
      setError('')
    } else {
      setTitle(''); setText(''); setScope('global'); setSelectedCourseIds([])
      setIsActive(true); setNotifyStudents(true); setImage(null); setRemoveImage(false); setError('')
    }
  }, [editId, editing])

  const isMutating = createMutation.isPending || updateMutation.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    const hasText = !!text.trim()
    const hasImage = !!image
    const hasExistingImage = !!editing?.imageUrl && !removeImage
    if (!hasText && !hasImage && !hasExistingImage) {
      setError('La novedad debe tener texto, imagen o ambas cosas.'); return
    }
    if (image && image.size > 5 * 1024 * 1024) { setError('La imagen no puede superar los 5 MB.'); return }
    if (scope === 'courses' && selectedCourseIds.length === 0) { setError('Seleccioná al menos un curso.'); return }

    const fd = new FormData()
    fd.append('title', title.trim())
    fd.append('text', text.trim())
    if (image) fd.append('image', image)
    fd.append('isGlobal', scope === 'global' ? 'true' : 'false')
    if (scope === 'courses') selectedCourseIds.forEach((id) => fd.append('courseIds', id))

    try {
      if (mode === 'edit' && editId) {
        fd.append('isActive', isActive ? 'true' : 'false')
        fd.append('removeImage', removeImage ? 'true' : 'false')
        await updateMutation.mutateAsync({ id: editId, formData: fd })
        toast('Novedad actualizada.')
        onCancelEdit()
      } else {
        fd.append('isActive', isActive ? 'true' : 'false')
        fd.append('notifyStudents', notifyStudents ? 'true' : 'false')
        await createMutation.mutateAsync(fd)
        toast('Novedad publicada.')
        setTitle(''); setText(''); setScope('global'); setSelectedCourseIds([])
        setIsActive(true); setNotifyStudents(true); setImage(null); setRemoveImage(false); setError('')
      }
    } catch (err: any) { setError(err?.message || 'No se pudo guardar la novedad.') }
  }

  function toggleCourse(id: string) {
    setSelectedCourseIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id])
  }

  return (
    <Card className="w-full shrink-0 p-5 space-y-4 xl:w-96">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{mode === 'edit' ? 'Editar novedad' : 'Crear novedad'}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Podés cargar solo texto, solo imagen o ambas cosas.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Título opcional</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Ej: Entrenamiento suspendido" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Texto</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={3000}
            placeholder="Escribí la novedad..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Alcance</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="radio" name="scope" value="global" checked={scope === 'global'}
                onChange={() => setScope('global')} className="h-4 w-4 text-amber-600 focus:ring-amber-500" />
              Todos los alumnos
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="radio" name="scope" value="courses" checked={scope === 'courses'}
                onChange={() => setScope('courses')} className="h-4 w-4 text-amber-600 focus:ring-amber-500" />
              Por curso
            </label>
          </div>
          {scope === 'courses' && (
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex flex-wrap gap-2">
                {courses.map((c) => (
                  <label key={c.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${
                      selectedCourseIds.includes(c.id)
                        ? 'border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}>
                    <input type="checkbox" checked={selectedCourseIds.includes(c.id)}
                      onChange={() => toggleCourse(c.id)} className="sr-only" />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Imagen opcional</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImage(e.target.files?.[0] || null)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:file:bg-slate-700 dark:file:text-slate-300" />
          <p className="mt-1 text-xs text-slate-400">JPG, PNG o WEBP. Máx 5 MB.</p>
        </div>

        {editing?.imageUrl && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Imagen actual</p>
            <img src={editing.imageUrl} alt="" className="max-h-32 w-full rounded-xl object-cover" />
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
              Eliminar imagen actual
            </label>
          </div>
        )}

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Novedad activa</span>
        </label>

        {mode === 'create' && (
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
            <input type="checkbox" checked={notifyStudents} onChange={(e) => setNotifyStudents(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Notificar a alumnos</span>
          </label>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          {mode === 'edit' && (
            <Button type="button" variant="outline" className="flex-1" onClick={onCancelEdit} disabled={isMutating}>
              Cancelar
            </Button>
          )}
          <Button type="submit" loading={isMutating}
            className={`flex-1 ${mode === 'edit' ? '' : 'w-full'} bg-amber-600 text-white hover:bg-amber-700`}>
            {mode === 'edit' ? 'Guardar cambios' : 'Publicar'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

/* ─── Confirm Modal ─── */
function ConfirmModal({ title, message, confirmText, loading, onConfirm, onClose }: {
  title: string; message: string; confirmText: string; loading: boolean
  onConfirm: () => void; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full animate-slide-up rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
        </div>
        <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button size="sm" loading={loading} className="bg-rose-600 text-white hover:bg-rose-700" onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  )
}
