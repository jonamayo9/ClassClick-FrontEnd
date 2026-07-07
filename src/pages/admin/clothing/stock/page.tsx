import { Fragment, useState, useMemo } from 'react'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { BackButton } from '@/components/ui/back-button'
import { PageHero } from '@/components/ui/page-hero'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import type { Product, ProductVariant } from '../hooks'
import { useProducts } from '../products/hooks'
import { useUpdateProductStock, useUpdateVariantStock } from './hooks'

function StockPageInner() {
  const { data: products = [], isLoading } = useProducts()
  const updateProductStock = useUpdateProductStock()
  const updateVariantStock = useUpdateVariantStock()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [editTracksStock, setEditTracksStock] = useState(true)
  const [editQuantity, setEditQuantity] = useState('0')
  const [variantEdits, setVariantEdits] = useState<Record<string, { tracksStock: boolean; stockQuantity: string; isActive: boolean }>>({})

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase()
    return products.filter((p) => {
      if (!text) return true
      const haystack = `${p.name} ${p.categoryName ?? ''}`.toLowerCase()
      return haystack.includes(text)
    })
  }, [products, search])

  const stats = {
    products: products.length,
    variants: products.reduce((sum, p) => sum + (p.variants?.length ?? 0), 0),
    outOfStock: products.filter((p) => {
      if (!p.isActive) return false
      if (p.hasVariants) return p.variants?.every((v) => v.isActive && v.tracksStock && !v.stockQuantity)
      return p.tracksStock && !p.stockQuantity
    }).length,
  }

    function toggleExpand(product: Product) {
    const isCurrentlyExpanded = expanded.has(product.id)
    if (isCurrentlyExpanded) {
      setExpanded((prev) => { const n = new Set(prev); n.delete(product.id); return n })
    } else {
      setExpanded((prev) => { const n = new Set(prev); n.add(product.id); return n })
      product.variants?.forEach((v) => {
        setVariantEdits((prev) =>
          prev[v.id] ? prev : { ...prev, [v.id]: { tracksStock: v.tracksStock, stockQuantity: v.stockQuantity == null ? '0' : String(v.stockQuantity), isActive: v.isActive } }
        )
      })
    }
  }

  function patchVariantEdit(variantId: string, patch: Partial<{ tracksStock: boolean; stockQuantity: string; isActive: boolean }>) {
    setVariantEdits((prev) => ({ ...prev, [variantId]: { ...prev[variantId], ...patch } }))
  }

  function openEditProduct(p: Product) {
    setEditProduct(p)
    setEditTracksStock(p.tracksStock)
    setEditQuantity(p.stockQuantity == null ? '0' : String(p.stockQuantity))
  }

  async function saveProductStock() {
    if (!editProduct) return
    try {
      await updateProductStock.mutateAsync({
        id: editProduct.id,
        tracksStock: editTracksStock,
        stockQuantity: editTracksStock ? Number(editQuantity || 0) : null,
      })
      toast('Stock actualizado.')
      setEditProduct(null)
    } catch {
      toast('Error al actualizar stock.', 'error')
    }
  }

  async function saveVariantStock(productId: string, variant: ProductVariant) {
    try {
      await updateVariantStock.mutateAsync({
        productId,
        variantId: variant.id,
        tracksStock: variant.tracksStock,
        stockQuantity: variant.tracksStock ? Number(variant.stockQuantity || 0) : null,
        isActive: variant.isActive,
      })
      toast(`Variante "${variant.name}" actualizada.`)
    } catch {
      toast(`Error al actualizar la variante "${variant.name}".`, 'error')
    }
  }

  function variantBadge(v: ProductVariant): { label: string; variant: 'success' | 'danger' | 'info' | 'default' } {
    if (!v.isActive) return { label: 'Inactivo', variant: 'default' }
    if (!v.tracksStock) return { label: 'Disponible siempre', variant: 'info' }
    if (v.stockQuantity && v.stockQuantity > 0) return { label: `${v.stockQuantity}`, variant: 'success' }
    return { label: 'Sin stock', variant: 'danger' }
  }

  function productBadge(p: Product): { label: string; variant: 'success' | 'danger' | 'info' | 'default' } {
    if (!p.isActive) return { label: 'Inactivo', variant: 'default' }
    if (p.hasVariants) return { label: `${p.variants?.filter((v) => v.isActive).length ?? 0} variantes activas`, variant: 'info' }
    if (!p.tracksStock) return { label: 'Disponible siempre', variant: 'info' }
    if (p.stockQuantity && p.stockQuantity > 0) return { label: `${p.stockQuantity} en stock`, variant: 'success' }
    return { label: 'Sin stock', variant: 'danger' }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <BackButton to="/admin/clothing" label="Volver a Indumentaria" />
      <PageHero
        label="Stock"
        title="Gestión de stock"
        description="Controlá el stock por producto y por variante."
        stats={[
          { label: 'Productos', value: stats.products },
          { label: 'Variantes', value: stats.variants },
          { label: 'Sin stock', value: stats.outOfStock },
        ]}
      />

      <Card className="p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Stock</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} productos</p>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto o categoría"
            className="sm:w-80"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Spinner className="h-6 w-6 text-violet-600" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="📦" title="Sin productos" description="No hay productos para mostrar." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((p, idx) => {
                  const bg = idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'
                  const badge = productBadge(p)
                  return (
                    <Fragment key={p.id}>
                      <tr className={bg}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900 dark:text-white">{p.name}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.categoryName ?? '-'}</td>
                        <td className="px-4 py-3">
                          {p.hasVariants ? (
                            <span className="text-xs text-violet-600 dark:text-violet-400">Con variantes</span>
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-400">Simple</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.hasVariants ? (
                            <Button variant="outline" size="sm" onClick={() => toggleExpand(p)}>
                              {expanded.has(p.id) ? 'Contraer' : 'Gestionar'}
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => openEditProduct(p)}>
                              Editar stock
                            </Button>
                          )}
                        </td>
                      </tr>
                      {p.hasVariants && expanded.has(p.id) && (
                        <tr className="bg-slate-50/50 dark:bg-slate-800/10">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                              <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">Variantes</p>
                              {(!p.variants || p.variants.length === 0) ? (
                                <p className="text-xs text-slate-400">Sin variantes</p>
                              ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {p.variants.map((v) => {
                                    const edit = variantEdits[v.id] ?? { tracksStock: v.tracksStock, stockQuantity: v.stockQuantity == null ? '0' : String(v.stockQuantity), isActive: v.isActive }
                                    const localTracks = edit.tracksStock
                                    const localActive = edit.isActive
                                    return (
                                      <div key={v.id} className="flex flex-wrap items-center gap-3 py-2">
                                        <span className="min-w-[100px] text-sm font-medium text-slate-900 dark:text-white">{v.name}</span>
                                        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                          <input type="checkbox" checked={localTracks} onChange={(e) => patchVariantEdit(v.id, { tracksStock: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-violet-600" />
                                          Stock
                                        </label>
                                        {localTracks ? (
                                          <Input type="number" min="0" value={edit.stockQuantity} onChange={(e) => patchVariantEdit(v.id, { stockQuantity: e.target.value })} className="w-20" />
                                        ) : (
                                          <span className="w-20 text-xs text-slate-400">Siempre</span>
                                        )}
                                        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                          <input type="checkbox" checked={localActive} onChange={(e) => patchVariantEdit(v.id, { isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-violet-600" />
                                          Activa
                                        </label>
                                        <Badge variant={variantBadge(v).variant}>{variantBadge(v).label}</Badge>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          loading={updateVariantStock.isPending}
                                          onClick={async () => {
                                            const updated: ProductVariant = {
                                              ...v,
                                              tracksStock: localTracks,
                                              stockQuantity: localTracks ? Number(edit.stockQuantity || 0) : null,
                                              isActive: localActive,
                                            }
                                            await saveVariantStock(p.id, updated)
                                          }}
                                        >
                                          Guardar
                                        </Button>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditProduct(null)} />
          <div className="relative z-10 w-full rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Stock: {editProduct.name}</h2>
              </div>
              <button
                onClick={() => setEditProduct(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4 p-5">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                <input type="checkbox" checked={editTracksStock} onChange={(e) => setEditTracksStock(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Controlar stock</span>
              </label>
              {editTracksStock && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Cantidad</label>
                  <Input type="number" min="0" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <Button onClick={saveProductStock} loading={updateProductStock.isPending} className="bg-violet-600 text-white hover:bg-violet-700">
                  Guardar
                </Button>
                <Button variant="outline" onClick={() => setEditProduct(null)} disabled={updateProductStock.isPending}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function StockPage() {
  return (
    <ToastProvider>
      <StockPageInner />
    </ToastProvider>
  )
}
