import { useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'
import { useAuth } from '@/stores/auth'
import {
  useSponsors, useCreateSponsor, useUpdateSponsor, useDeleteSponsor,
} from './hooks'
import type { Sponsor } from './hooks'

export default function SponsorsPage() {
  const { data: sponsors = [], isLoading } = useSponsors()
  const createMutation = useCreateSponsor()
  const updateMutation = useUpdateSponsor()
  const deleteMutation = useDeleteSponsor()
  const qc = useQueryClient()
  const [editItem, setEditItem] = useState<Sponsor | null>(null)
  const [deleteItem, setDeleteItem] = useState<Sponsor | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([])

  const toastId = useRef(0)
  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId.current
    setToasts((p) => [...p, { id, message: msg, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500)
  }, [])

  function getSorted(list: Sponsor[]) {
    return [...list].sort((a, b) => {
      const oa = Number(a.displayOrder || 0)
      const ob = Number(b.displayOrder || 0)
      return oa !== ob ? oa - ob : new Date(a.createdAtUtc || 0).getTime() - new Date(b.createdAtUtc || 0).getTime()
    })
  }

  async function handleMove(id: string, direction: -1 | 1) {
    const sorted = getSorted(sponsors)
    const idx = sorted.findIndex((s) => s.id === id)
    if (idx < 0) return
    const target = idx + direction
    if (target < 0 || target >= sorted.length) return
    const reordered = [...sorted]
    const tmp = reordered[idx]; reordered[idx] = reordered[target]; reordered[target] = tmp
    const slug = useAuth.getState().activeCompanySlug
    if (!slug) { toast('Error: empresa no encontrada.', 'error'); return }

    function buildFd(s: Sponsor, order: number) {
      const fd = new FormData()
      fd.append('name', s.name || '')
      fd.append('overlayText', s.overlayText || '')
      fd.append('description', s.description || '')
      fd.append('websiteUrl', s.websiteUrl || '')
      fd.append('instagramUrl', s.instagramUrl || '')
      fd.append('whatsApp', s.whatsApp || '')
      fd.append('displayOrder', String(order))
      fd.append('isActive', s.isActive ? 'true' : 'false')
      return fd
    }

    setMovingId(id)
    try {
      for (let i = 0; i < reordered.length; i++) {
        await api.put(`/api/admin/${slug}/sponsors/${reordered[i].id}`, buildFd(reordered[i], 10000 + i), {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
      for (let i = 0; i < reordered.length; i++) {
        await api.put(`/api/admin/${slug}/sponsors/${reordered[i].id}`, buildFd(reordered[i], i + 1), {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
      qc.invalidateQueries({ queryKey: ['sponsors'] })
      toast('Orden actualizado.')
    } catch (err: any) {
      toast(err?.message || 'Error al reordenar.', 'error')
    } finally {
      setMovingId(null)
    }
  }

  const stats = {
    total: sponsors.length,
    active: sponsors.filter((s) => s.isActive).length,
    withLinks: sponsors.filter((s) => s.websiteUrl || s.instagramUrl || s.whatsApp).length,
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-fuchsia-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-fuchsia-400/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-200">Publicidad</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">Sponsors</h1>
            <p className="mt-1 text-sm text-fuchsia-200 sm:text-base">Administrá los sponsors que ven los alumnos en la app.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-200">Total</p>
              <p className="mt-0.5 text-xl font-bold sm:text-2xl">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-200">Activos</p>
              <p className="mt-0.5 text-xl font-bold sm:text-2xl">{stats.active}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-200">Con links</p>
              <p className="mt-0.5 text-xl font-bold sm:text-2xl">{stats.withLinks}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        {/* Create Form */}
        <CreateSponsorCard sponsors={sponsors} mutation={createMutation} toast={toast} />

        {/* List */}
        <Card className="min-w-0 flex-1 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Sponsors</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Usá las flechas para ordenarlos.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : sponsors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-500">
              Todavía no hay sponsors cargados.
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      <th className="px-4 py-3">Sponsor</th>
                      <th className="px-4 py-3">Imagen</th>
                      <th className="px-4 py-3">Orden</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {getSorted(sponsors).map((item, index, arr) => {
                      const bg = index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'
                      return (
                        <tr key={item.id} className={bg}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                            <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{item.overlayText || 'Sin texto'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <img src={item.imageUrl} alt={item.name}
                              className="h-12 w-20 rounded-xl border border-slate-200 object-cover dark:border-slate-700" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 text-center text-sm text-slate-700 dark:text-slate-300">{item.displayOrder}</span>
                              <button type="button" onClick={() => handleMove(item.id, -1)}
                                disabled={index === 0 || movingId === item.id}
                                className="rounded-lg border border-slate-300 p-1.5 text-xs hover:bg-slate-50 disabled:opacity-30 dark:border-slate-600 dark:hover:bg-slate-800">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                              </button>
                              <button type="button" onClick={() => handleMove(item.id, 1)}
                                disabled={index === arr.length - 1 || movingId === item.id}
                                className="rounded-lg border border-slate-300 p-1.5 text-xs hover:bg-slate-50 disabled:opacity-30 dark:border-slate-600 dark:hover:bg-slate-800">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {item.isActive
                              ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Activo</span>
                              : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">Inactivo</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button variant="outline" size="sm" className="text-[11px] px-2.5 py-1.5"
                                onClick={() => setEditItem(item)}>Editar</Button>
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
                {getSorted(sponsors).map((item, index, arr) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex gap-3">
                      <img src={item.imageUrl} alt={item.name}
                        className="h-16 w-24 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{item.overlayText || 'Sin texto'}</p>
                        <div className="mt-1.5">
                          {item.isActive
                            ? <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Activo</span>
                            : <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">Inactivo</span>
                          }
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500">Orden {item.displayOrder}</span>
                        <button type="button" onClick={() => handleMove(item.id, -1)}
                          disabled={index === 0 || movingId === item.id}
                          className="rounded-lg border border-slate-300 p-1 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-600 dark:hover:bg-slate-800">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button type="button" onClick={() => handleMove(item.id, 1)}
                          disabled={index === arr.length - 1 || movingId === item.id}
                          className="rounded-lg border border-slate-300 p-1 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-600 dark:hover:bg-slate-800">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                      </div>
                      <div className="flex gap-1.5">
                        <Button variant="outline" size="sm" className="text-[11px] px-2.5 py-1.5"
                          onClick={() => setEditItem(item)}>Editar</Button>
                        <Button variant="outline" size="sm" className="text-[11px] px-2.5 py-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                          onClick={() => setDeleteItem(item)}>Eliminar</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Edit Modal */}
      {editItem && (
        <EditSponsorModal sponsor={editItem} sponsors={sponsors}
          mutation={updateMutation} toast={toast}
          onClose={() => setEditItem(null)} />
      )}

      {/* Delete Confirm */}
      {deleteItem && (
        <ConfirmModal title="Eliminar sponsor"
          message={`Vas a eliminar "${deleteItem.name}". Esta acción no se puede deshacer.`}
          confirmText="Eliminar" loading={deleteMutation.isPending}
          onConfirm={async () => {
            try {
              await deleteMutation.mutateAsync(deleteItem.id)
              toast('Sponsor eliminado.')
              setDeleteItem(null)
            } catch { toast('Error al eliminar.', 'error') }
          }}
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

/* ─── Create Sponsor Form ─── */
function CreateSponsorCard({ sponsors, mutation, toast }: {
  sponsors: Sponsor[]; mutation: ReturnType<typeof useCreateSponsor>; toast: (msg: string, type?: 'success' | 'error') => void
}) {
  const [name, setName] = useState('')
  const [displayOrder, setDisplayOrder] = useState('0')
  const [overlayText, setOverlayText] = useState('')
  const [description, setDescription] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [whatsApp, setWhatsApp] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')

  function handleImage(files: FileList | null) {
    const file = files?.[0]
    setImage(file || null)
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  function reset() {
    setName(''); setDisplayOrder('0'); setOverlayText(''); setDescription('')
    setWebsiteUrl(''); setInstagramUrl(''); setWhatsApp(''); setIsActive(true)
    setImage(null); setPreview(null); setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!name.trim()) { setError('El nombre es obligatorio.'); return }
    if (!image) { setError('La imagen es obligatoria.'); return }
    if (image.size > 5 * 1024 * 1024) { setError('La imagen no puede superar los 5 MB.'); return }
    const order = Number(displayOrder)
    if (sponsors.some((s) => Number(s.displayOrder || 0) === order)) { setError('Ya existe un sponsor con ese orden.'); return }

    const fd = new FormData()
    fd.append('name', name.trim()); fd.append('overlayText', overlayText.trim()); fd.append('description', description.trim())
    fd.append('websiteUrl', websiteUrl.trim()); fd.append('instagramUrl', instagramUrl.trim()); fd.append('whatsApp', whatsApp.trim())
    fd.append('displayOrder', displayOrder || '0'); fd.append('isActive', isActive ? 'true' : 'false')
    fd.append('image', image)

    try {
      await mutation.mutateAsync(fd)
      toast('Sponsor creado correctamente.')
      reset()
    } catch { setError('No se pudo guardar el sponsor.') }
  }

  return (
    <Card className="w-full shrink-0 p-5 space-y-4 xl:w-96">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Crear sponsor</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">La imagen es obligatoria.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Ej: Pizzería Don José" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Orden</label>
            <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Texto sobre imagen</label>
          <Input value={overlayText} onChange={(e) => setOverlayText(e.target.value)} maxLength={80} placeholder="Ej: 10% off para socios" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Descripción</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1500}
            placeholder="Información que verá el alumno..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="Web" />
          <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="Instagram" />
          <Input value={whatsApp} onChange={(e) => setWhatsApp(e.target.value)} placeholder="WhatsApp" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Imagen</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleImage(e.target.files)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:file:bg-slate-700 dark:file:text-slate-300" />
          <p className="mt-1 text-xs text-slate-400">JPG, PNG o WEBP. Máx 5 MB.</p>
          {preview && (
            <img src={preview} alt="Preview" className="mt-2 h-20 w-32 rounded-xl border border-slate-200 object-cover dark:border-slate-700" />
          )}
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Sponsor activo</span>
        </label>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
        )}

        <Button type="submit" loading={mutation.isPending} className="w-full bg-violet-600 text-white hover:bg-violet-700">
          Guardar sponsor
        </Button>
      </form>
    </Card>
  )
}

/* ─── Edit Modal ─── */
function EditSponsorModal({ sponsor, sponsors, mutation, toast, onClose }: {
  sponsor: Sponsor; sponsors: Sponsor[]
  mutation: ReturnType<typeof useUpdateSponsor>; toast: (msg: string, type?: 'success' | 'error') => void; onClose: () => void
}) {
  const [name, setName] = useState(sponsor.name)
  const [displayOrder, setDisplayOrder] = useState(String(sponsor.displayOrder))
  const [overlayText, setOverlayText] = useState(sponsor.overlayText || '')
  const [description, setDescription] = useState(sponsor.description || '')
  const [websiteUrl, setWebsiteUrl] = useState(sponsor.websiteUrl || '')
  const [instagramUrl, setInstagramUrl] = useState(sponsor.instagramUrl || '')
  const [whatsApp, setWhatsApp] = useState(sponsor.whatsApp || '')
  const [isActive, setIsActive] = useState(sponsor.isActive)
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')

  function handleImage(files: FileList | null) {
    const file = files?.[0]
    setImage(file || null)
    if (file) {
      setPreview(URL.createObjectURL(file))
    } else {
      setPreview(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!name.trim()) { setError('El nombre es obligatorio.'); return }
    if (image && image.size > 5 * 1024 * 1024) { setError('La imagen no puede superar los 5 MB.'); return }
    const order = Number(displayOrder)
    if (sponsors.some((s) => s.id !== sponsor.id && Number(s.displayOrder || 0) === order)) {
      setError('Ya existe un sponsor con ese orden.'); return
    }

    const fd = new FormData()
    fd.append('name', name.trim()); fd.append('overlayText', overlayText.trim()); fd.append('description', description.trim())
    fd.append('websiteUrl', websiteUrl.trim()); fd.append('instagramUrl', instagramUrl.trim()); fd.append('whatsApp', whatsApp.trim())
    fd.append('displayOrder', displayOrder || '0'); fd.append('isActive', isActive ? 'true' : 'false')
    if (image) fd.append('image', image)

    try {
      await mutation.mutateAsync({ id: sponsor.id, formData: fd })
      toast('Sponsor actualizado.')
      onClose()
    } catch { setError('No se pudo guardar el sponsor.') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">Editar sponsor</h2>
            <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">Modificá la información del sponsor.</p>
          </div>
          <button onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Orden</label>
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Texto sobre imagen</label>
            <Input value={overlayText} onChange={(e) => setOverlayText(e.target.value)} maxLength={80} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Descripción</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1500}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="Web" />
            <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="Instagram" />
            <Input value={whatsApp} onChange={(e) => setWhatsApp(e.target.value)} placeholder="WhatsApp" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Imagen actual</p>
            <img src={preview || sponsor.imageUrl} alt={sponsor.name}
              className="h-20 w-32 rounded-xl border border-slate-200 object-cover dark:border-slate-700" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Cambiar imagen</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleImage(e.target.files)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:file:bg-slate-700 dark:file:text-slate-300" />
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Sponsor activo</span>
          </label>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={mutation.isPending} className="flex-1 bg-violet-600 text-white hover:bg-violet-700">
              Guardar cambios
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
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

