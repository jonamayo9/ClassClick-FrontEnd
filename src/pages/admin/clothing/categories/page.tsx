import { useState } from 'react'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { BackButton } from '@/components/ui/back-button'
import { PageHero } from '@/components/ui/page-hero'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from './hooks'
import type { Category } from '../hooks'

function CategoriesPageInner() {
  const { data: categories = [], isLoading } = useCategories()
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()
  const toast = useToast()

  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editParentId, setEditParentId] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [editError, setEditError] = useState('')

  const parentCategories = categories.filter((c) => !c.parentId)
  const childCategories = categories.filter((c) => c.parentId)

  const stats = {
    parents: parentCategories.length,
    children: childCategories.length,
    total: categories.length,
  }

  function resetCreateForm() {
    setName('')
    setParentId('')
    setFormError('')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!name.trim()) {
      setFormError('El nombre es obligatorio.')
      return
    }
    try {
      await createMutation.mutateAsync({ name: name.trim(), parentId: parentId || null })
      toast('Categoría creada correctamente.')
      resetCreateForm()
    } catch {
      setFormError('No se pudo crear la categoría.')
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditParentId(cat.parentId ?? '')
    setEditIsActive(cat.isActive)
    setEditError('')
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    setEditError('')
    if (!editName.trim()) {
      setEditError('El nombre es obligatorio.')
      return
    }
    try {
      await updateMutation.mutateAsync({
        id: editingId!,
        name: editName.trim(),
        parentId: editParentId || null,
        isActive: editIsActive,
      })
      toast('Categoría actualizada.')
      setEditingId(null)
    } catch {
      setEditError('No se pudo actualizar la categoría.')
    }
  }

  async function handleDelete() {
    if (!deletingId) return
    try {
      await deleteMutation.mutateAsync(deletingId)
      toast('Categoría eliminada.')
      setDeletingId(null)
    } catch {
      toast('Error al eliminar la categoría.', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <BackButton to="/admin/clothing" label="Volver a Indumentaria" />
      <PageHero
        label="Categorías"
        title="Categorías de productos"
        description="Organizá los productos con categorías y subcategorías."
        stats={[
          { label: 'Padres', value: stats.parents },
          { label: 'Subcat.', value: stats.children },
          { label: 'Total', value: stats.total },
        ]}
      />

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <Card className="w-full shrink-0 p-5 space-y-4 xl:w-96">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Crear categoría</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Podés crear una categoría padre o subcategoría.</p>
          </div>

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ej: Remeras" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Categoría padre</label>
              <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">Sin padre (categoría principal)</option>
                {parentCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>

            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {formError}
              </div>
            )}

            <Button type="submit" loading={createMutation.isPending} className="w-full bg-violet-600 text-white hover:bg-violet-700">
              Crear categoría
            </Button>
          </form>
        </Card>

        <Card className="min-w-0 flex-1 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Listado de categorías</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {parentCategories.length} padres &middot; {childCategories.length} subcategorías
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-6 w-6 text-violet-600" />
            </div>
          ) : categories.length === 0 ? (
            <EmptyState icon="🏷️" title="Sin categorías" description="Creá tu primera categoría para empezar a organizar productos." />
          ) : (
            <div className="space-y-5">
              {parentCategories.map((parent) => {
                const children = categories.filter((c) => c.parentId === parent.id)
                return (
                  <div key={parent.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{parent.name}</span>
                        {!parent.isActive && <Badge variant="default">Inactiva</Badge>}
                      </div>
                      <div className="flex gap-1.5">
                        <Button variant="outline" size="sm" className="text-[11px] px-2.5 py-1.5" onClick={() => startEdit(parent)}>
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[11px] px-2.5 py-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                          onClick={() => setDeletingId(parent.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>

                    {children.length > 0 ? (
                      <div className="ml-4 space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
                        {children.map((child) => (
                          <div key={child.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 dark:bg-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 dark:text-slate-500">↳</span>
                              <span className="text-sm text-slate-700 dark:text-slate-300">{child.name}</span>
                              {!child.isActive && <Badge variant="default">Inactiva</Badge>}
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => startEdit(child)}>
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px] text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                onClick={() => setDeletingId(child.id)}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="ml-4 text-xs text-slate-400 dark:text-slate-500">Sin subcategorías</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {editingId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingId(null)} />
          <div className="relative z-10 w-full rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Editar categoría</h2>
              </div>
              <button
                onClick={() => setEditingId(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-3 px-5 py-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={80} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Categoría padre</label>
                <Select value={editParentId} onChange={(e) => setEditParentId(e.target.value)}>
                  <option value="">Sin padre (categoría principal)</option>
                  {parentCategories.filter((c) => c.id !== editingId).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                <input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Categoría activa</span>
              </label>

              {editError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {editError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={updateMutation.isPending} className="flex-1 bg-violet-600 text-white hover:bg-violet-700">
                  Guardar cambios
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingId(null)} disabled={updateMutation.isPending}>
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Eliminar categoría"
        message="Esta acción no se puede deshacer. Si la categoría tiene productos o subcategorías activas, el servidor rechazará la operación."
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

export default function CategoriesPage() {
  return (
    <ToastProvider>
      <CategoriesPageInner />
    </ToastProvider>
  )
}
