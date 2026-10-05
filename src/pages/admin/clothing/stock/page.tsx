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

function StockNumbers({ tracksStock, stockQuantity, reservedQuantity, availableQuantity }: {
  tracksStock: boolean
  stockQuantity: number | null
  reservedQuantity: number
  availableQuantity: number | null
}) {
  if (!tracksStock) {
    return <span className="text-xs text-slate-400">Disponible siempre</span>
  }
  return (
    <span className="text-xs text-slate-600 dark:text-slate-300">
      Físico: <b>{stockQuantity ?? 0}</b> · Reservado: <b>{reservedQuantity}</b> · Disponible: <b className="text-violet-600 dark:text-violet-400">{availableQuantity ?? 0}</b>
    </span>
  )
}

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
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null)

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
      if (p.hasVariants) {
        const variants = p.variants ?? []
        if (variants.length === 0) return false
        return variants.filter((v) => v.isActive && v.tracksStock).length > 0 &&
          variants.filter((v) => v.isActive && v.tracksStock && (v.availableQuantity ?? 0) <= 0).length === variants.filter((v) => v.isActive && v.tracksStock).length
      }
      return p.tracksStock && (p.availableQuantity ?? 0) <= 0
    }).length,
  }

  function toggleExpand(product: Product) {
    const isCurrentlyExpanded = expanded.has(product.id)
    if (isCurrentlyExpanded) {
      setExpanded((prev) => { const n = new Set(prev); n.delete(product.id); return n })
    } else {
      setExpanded((prev) => { const n = new Set(prev); n.add(product.id); return n })
    }
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
    setSavingVariantId(variant.id)
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
    } finally {
      setSavingVariantId(null)
    }
  }

  function productBadge(p: Product): { label: string; variant: 'success' | 'danger' | 'info' | 'default' } {
    if (!p.isActive) return { label: 'Inactivo', variant: 'default' }
    if (p.hasVariants) return { label: `${p.variants?.filter((v) => v.isActive).length ?? 0} variantes activas`, variant: 'info' }
    if (!p.tracksStock) return { label: 'Disponible siempre', variant: 'info' }
    if ((p.availableQuantity ?? 0) > 0) return { label: `${p.availableQuantity} disponibles`, variant: 'success' }
    return { label: 'Sin stock', variant: 'danger' }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <BackButton to="/admin/clothing" label="Volver a la tienda" />
      <PageHero
        label="Stock"
        title="Gestión de stock"
        description="Stock físico, reservado y disponible por producto y variante."
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((p) => (
                    <Fragment key={p.id}>
                      <tr className="bg-white dark:bg-slate-900">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900 dark:text-white">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.categoryName ?? ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          {p.hasVariants ? (
                            <span className="text-xs text-violet-600 dark:text-violet-400">Con variantes</span>
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-400">Simple</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={productBadge(p).variant}>{productBadge(p).label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {p.hasVariants
                            ? <StockNumbers tracksStock={true} stockQuantity={null} reservedQuantity={0} availableQuantity={null} />
                            : <StockNumbers tracksStock={p.tracksStock} stockQuantity={p.stockQuantity} reservedQuantity={p.reservedQuantity} availableQuantity={p.availableQuantity} />
                          }
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
                                    const localTracks = v.tracksStock
                                    const localActive = v.isActive
                                    return (
                                      <div key={v.id} className="flex flex-wrap items-center gap-3 py-2">
                                        <span className="min-w-[100px] text-sm font-medium text-slate-900 dark:text-white">{v.name}</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                          {localActive ? 'Activa' : 'Inactiva'}
                                        </span>
                                        <StockNumbers tracksStock={localTracks} stockQuantity={v.stockQuantity} reservedQuantity={v.reservedQuantity} availableQuantity={v.availableQuantity} />
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          loading={savingVariantId === v.id}
                                          onClick={async () => {
                                            const updated: ProductVariant = {
                                              ...v,
                                              tracksStock: v.tracksStock,
                                              stockQuantity: v.tracksStock ? Number(v.stockQuantity ?? 0) : null,
                                              isActive: v.isActive,
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
                  ))}
                </tbody>
              </table>
            </div>
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
                <p className="text-xs text-slate-400">Físico {editProduct.stockQuantity ?? 0} · Reservado {editProduct.reservedQuantity} · Disponible {editProduct.availableQuantity ?? 0}</p>
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
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Stock físico</label>
                  <Input type="number" min="0" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
                  <p className="mt-1 text-xs text-slate-400">El stock físico no puede quedar menor a lo reservado ({editProduct.reservedQuantity}).</p>
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