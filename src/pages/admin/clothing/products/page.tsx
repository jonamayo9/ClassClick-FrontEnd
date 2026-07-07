import { useEffect, useMemo, useState } from 'react'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { BackButton } from '@/components/ui/back-button'
import { PageHero } from '@/components/ui/page-hero'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { Spinner } from '@/components/ui/spinner'
import { imgUrl } from '@/lib/media'
import { money } from '../hooks'
import type { Category, Product } from '../hooks'
import { useCategories } from '../categories/hooks'
import {
  useCreateProduct,
  useDeleteImage,
  useDeleteProduct,
  useProducts,
  useSetMainImage,
  useUpdateProduct,
  useUploadImage,
} from './hooks'

const PAGE_SIZE = 10

interface EditableVariant {
  id?: string
  name: string
  tracksStock: boolean
  stockQuantity: string
  isActive: boolean
}

interface ProductFormState {
  parentCategoryId: string
  categoryId: string
  name: string
  description: string
  price: string
  isReservation: boolean
  requiresDeposit: boolean
  depositAmount: string
  tracksStock: boolean
  stockQuantity: string
  hasVariants: boolean
  isActive: boolean
  allowsPersonalization: boolean
  personalizationLabel: string
  personalizationMaxLength: string
  variants: EditableVariant[]
}

function emptyForm(): ProductFormState {
  return {
    parentCategoryId: '',
    categoryId: '',
    name: '',
    description: '',
    price: '',
    isReservation: false,
    requiresDeposit: false,
    depositAmount: '',
    tracksStock: true,
    stockQuantity: '0',
    hasVariants: false,
    isActive: true,
    allowsPersonalization: false,
    personalizationLabel: 'Nombre personalizado',
    personalizationMaxLength: '30',
    variants: [],
  }
}

function formFromProduct(product: Product, categories: Category[]): ProductFormState {
  const category = categories.find((c) => c.id === product.categoryId)
  const parentCategoryId = category?.parentId ? category.parentId : product.categoryId
  const categoryId = category?.parentId ? product.categoryId : ''

  return {
    parentCategoryId,
    categoryId,
    name: product.name ?? '',
    description: product.description ?? '',
    price: String(product.price ?? ''),
    isReservation: !!product.isReservation,
    requiresDeposit: !!product.requiresDeposit,
    depositAmount: product.depositAmount == null ? '' : String(product.depositAmount),
    tracksStock: !!product.tracksStock,
    stockQuantity: product.stockQuantity == null ? '0' : String(product.stockQuantity),
    hasVariants: !!product.hasVariants,
    isActive: !!product.isActive,
    allowsPersonalization: !!product.allowsPersonalization,
    personalizationLabel: product.personalizationLabel ?? 'Nombre personalizado',
    personalizationMaxLength: String(product.personalizationMaxLength ?? 30),
    variants: (product.variants ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      tracksStock: !!v.tracksStock,
      stockQuantity: v.stockQuantity == null ? '0' : String(v.stockQuantity),
      isActive: !!v.isActive,
    })),
  }
}

function buildPayload(form: ProductFormState): Record<string, unknown> {
  const hasVariants = form.hasVariants
  const allowsPersonalization = form.allowsPersonalization
  const requiresDeposit = form.requiresDeposit
  const tracksStock = hasVariants ? false : form.tracksStock

  return {
    categoryId: form.categoryId || form.parentCategoryId,
    name: form.name.trim(),
    description: form.description.trim() || null,
    price: Number(form.price),
    isReservation: form.isReservation,
    requiresDeposit,
    depositAmount: requiresDeposit ? Number(form.depositAmount || 0) : null,
    tracksStock,
    stockQuantity: tracksStock ? Number(form.stockQuantity || 0) : null,
    allowsFullPayment: true,
    hasVariants,
    isActive: form.isActive,
    allowsPersonalization,
    personalizationLabel: allowsPersonalization ? form.personalizationLabel.trim() || 'Nombre personalizado' : null,
    personalizationMaxLength: allowsPersonalization ? Number(form.personalizationMaxLength || 30) : null,
    variants: hasVariants
      ? form.variants
        .filter((v) => v.name.trim())
        .map((v) => ({
          id: v.id,
          name: v.name.trim(),
          tracksStock: v.tracksStock,
          stockQuantity: v.tracksStock ? Number(v.stockQuantity || 0) : null,
          isActive: v.isActive,
        }))
      : [],
  }
}

function getCreatedProductId(response: unknown): string | null {
  const data = response as { id?: string; data?: { id?: string }; item?: { id?: string } }
  return data?.id ?? data?.data?.id ?? data?.item?.id ?? null
}

function mainImage(product: Product): string | null {
  const image = product.images?.find((i) => i.isMain) ?? product.images?.[0]
  return imgUrl(image?.imageUrl) ?? null
}

function categoryLabel(product: Product, categories: Category[]): string {
  const category = categories.find((c) => c.id === product.categoryId)
  if (!category) return product.categoryName ?? 'Sin categoría'
  const parent = category.parentId ? categories.find((c) => c.id === category.parentId) : null
  return parent ? `${parent.name} / ${category.name}` : category.name
}

function ProductsPageInner() {
  const { data: products = [], isLoading: loadingProducts } = useProducts()
  const { data: categories = [], isLoading: loadingCategories } = useCategories()
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const deleteMutation = useDeleteProduct()
  const uploadImageMutation = useUploadImage()
  const deleteImageMutation = useDeleteImage()
  const setMainImageMutation = useSetMainImage()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [parentFilter, setParentFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  const parentCategories = categories.filter((c) => !c.parentId)
  const childFilterOptions = categories.filter((c) => c.parentId === parentFilter)

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase()
    return products.filter((p) => {
      if (text) {
        const haystack = `${p.name} ${p.description ?? ''} ${p.categoryName ?? ''}`.toLowerCase()
        if (!haystack.includes(text)) return false
      }
      if (categoryFilter) return p.categoryId === categoryFilter
      if (parentFilter) {
        const allowed = new Set([parentFilter, ...categories.filter((c) => c.parentId === parentFilter).map((c) => c.id)])
        return allowed.has(p.categoryId)
      }
      return true
    })
  }, [categories, categoryFilter, parentFilter, products, search])

  useEffect(() => {
    setPage(1)
  }, [search, parentFilter, categoryFilter])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const stats = {
    total: products.length,
    active: products.filter((p) => p.isActive).length,
    variants: products.filter((p) => p.hasVariants).length,
  }

  async function handleCreate(payload: Record<string, unknown>, files: File[]) {
    const created = await createMutation.mutateAsync(payload)
    const productId = getCreatedProductId(created)
    if (productId) {
      for (const file of files) {
        await uploadImageMutation.mutateAsync({ productId, file })
      }
    }
    toast(productId || files.length === 0 ? 'Producto creado correctamente.' : 'Producto creado. No se pudieron asociar imágenes automáticamente.')
  }

  async function handleUpdate(product: Product, payload: Record<string, unknown>, files: File[]) {
    await updateMutation.mutateAsync({ id: product.id, ...payload })
    for (const file of files) {
      await uploadImageMutation.mutateAsync({ productId: product.id, file })
    }
    toast('Producto actualizado.')
    setEditingProduct(null)
  }

  async function handleDelete() {
    if (!deletingProduct) return
    try {
      await deleteMutation.mutateAsync(deletingProduct.id)
      toast('Producto eliminado.')
      setDeletingProduct(null)
    } catch {
      toast('Error al eliminar el producto.', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <BackButton to="/admin/clothing" label="Volver a Indumentaria" />
      <PageHero
        label="Productos"
        title="Catálogo de indumentaria"
        description="Administrá productos, variantes, stock base, señas, personalización e imágenes."
        stats={[
          { label: 'Total', value: stats.total },
          { label: 'Activos', value: stats.active },
          { label: 'Variantes', value: stats.variants },
        ]}
      />

      <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-start">
        <ProductFormCard
          categories={categories}
          loadingCategories={loadingCategories}
          loading={createMutation.isPending || uploadImageMutation.isPending}
          onSubmit={handleCreate}
        />

        <Card className="min-w-0 flex-1 p-5 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Productos</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} resultados filtrados.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[680px]">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto" />
              <Select value={parentFilter} onChange={(e) => { setParentFilter(e.target.value); setCategoryFilter('') }}>
                <option value="">Todas las categorías</option>
                {parentCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} disabled={!parentFilter}>
                <option value="">Todas las subcategorías</option>
                {childFilterOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
          </div>

          {loadingProducts ? (
            <div className="flex items-center justify-center py-16"><Spinner className="h-6 w-6 text-violet-600" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="👕" title="Sin productos" description="No hay productos para los filtros actuales." />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {paged.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    category={categoryLabel(product, categories)}
                    onEdit={() => setEditingProduct(product)}
                    onDelete={() => setDeletingProduct(product)}
                  />
                ))}
              </div>
              <Pagination page={page} pageSize={PAGE_SIZE} totalCount={filtered.length} onPageChange={setPage} />
            </>
          )}
        </Card>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingProduct(null)} />
          <div className="relative z-10 flex max-h-[90vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-4xl sm:rounded-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Editar producto</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Modificá información, variantes e imágenes.</p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <ProductForm
                product={editingProduct}
                categories={categories}
                loadingCategories={loadingCategories}
                loading={updateMutation.isPending || uploadImageMutation.isPending}
                onSubmit={(payload, files) => handleUpdate(editingProduct, payload, files)}
                onCancel={() => setEditingProduct(null)}
                onDeleteImage={async (imageId) => {
                  await deleteImageMutation.mutateAsync({ productId: editingProduct.id, imageId })
                  toast('Imagen eliminada.')
                }}
                onSetMainImage={async (imageId) => {
                  await setMainImageMutation.mutateAsync({ productId: editingProduct.id, imageId })
                  toast('Imagen principal actualizada.')
                }}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        title="Eliminar producto"
        message={deletingProduct ? `Vas a eliminar "${deletingProduct.name}". Esta acción no se puede deshacer.` : ''}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function ProductFormCard({ categories, loadingCategories, loading, onSubmit }: {
  categories: Category[]
  loadingCategories: boolean
  loading: boolean
  onSubmit: (payload: Record<string, unknown>, files: File[]) => Promise<void>
}) {
  return (
    <Card className="w-full shrink-0 p-5 2xl:w-[430px]">
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Crear producto</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Configurá precio, variantes, stock e imágenes.</p>
      </div>
      <ProductForm categories={categories} loadingCategories={loadingCategories} loading={loading} onSubmit={onSubmit} />
    </Card>
  )
}

function ProductForm({
  product,
  categories,
  loadingCategories,
  loading,
  onSubmit,
  onCancel,
  onDeleteImage,
  onSetMainImage,
}: {
  product?: Product
  categories: Category[]
  loadingCategories: boolean
  loading: boolean
  onSubmit: (payload: Record<string, unknown>, files: File[]) => Promise<void>
  onCancel?: () => void
  onDeleteImage?: (imageId: string) => Promise<void>
  onSetMainImage?: (imageId: string) => Promise<void>
}) {
  const toast = useToast()
  const [form, setForm] = useState<ProductFormState>(() => product ? formFromProduct(product, categories) : emptyForm())
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')

  const parentCategories = categories.filter((c) => !c.parentId)
  const childOptions = categories.filter((c) => c.parentId === form.parentCategoryId)

  function patch<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validate(): string | null {
    if (!form.parentCategoryId && !form.categoryId) return 'La categoría es obligatoria.'
    if (!form.name.trim()) return 'El nombre es obligatorio.'
    if (Number(form.price) <= 0) return 'El precio debe ser mayor a cero.'
    if (form.requiresDeposit && Number(form.depositAmount) <= 0) return 'La seña debe ser mayor a cero.'
    if (form.allowsPersonalization) {
      const max = Number(form.personalizationMaxLength)
      if (max < 1 || max > 50) return 'El máximo de personalización debe estar entre 1 y 50.'
    }
    if (form.hasVariants && form.variants.filter((v) => v.name.trim()).length === 0) return 'Agregá al menos una variante.'
    return null
  }

  function addVariant() {
    patch('variants', [...form.variants, { name: '', tracksStock: true, stockQuantity: '0', isActive: true }])
  }

  function updateVariant(index: number, data: Partial<EditableVariant>) {
    patch('variants', form.variants.map((v, i) => i === index ? { ...v, ...data } : v))
  }

  function removeVariant(index: number) {
    patch('variants', form.variants.filter((_, i) => i !== index))
  }

  function handleFiles(list: FileList | null) {
    const selected = Array.from(list ?? [])
    const valid = selected.filter((file) => file.size <= 5 * 1024 * 1024)
    if (valid.length !== selected.length) toast('Algunas imágenes superan los 5 MB y fueron omitidas.', 'error')
    setFiles((prev) => [...prev, ...valid])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const msg = validate()
    if (msg) {
      setError(msg)
      return
    }
    try {
      await onSubmit(buildPayload(form), files)
      if (!product) {
        setForm(emptyForm())
        setFiles([])
      }
    } catch {
      setError('No se pudo guardar el producto.')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Categoría</label>
          <Select
            value={form.parentCategoryId}
            disabled={loadingCategories}
            onChange={(e) => setForm((prev) => ({ ...prev, parentCategoryId: e.target.value, categoryId: '' }))}
          >
            <option value="">Seleccionar</option>
            {parentCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Subcategoría</label>
          <Select value={form.categoryId} disabled={!form.parentCategoryId} onChange={(e) => patch('categoryId', e.target.value)}>
            <option value="">Usar categoría principal</option>
            {childOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre</label>
          <Input value={form.name} onChange={(e) => patch('name', e.target.value)} maxLength={120} placeholder="Ej: Camiseta titular" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Precio</label>
          <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => patch('price', e.target.value)} placeholder="0" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Descripción</label>
        <Textarea rows={3} value={form.description} onChange={(e) => patch('description', e.target.value)} maxLength={1500} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Toggle label="Producto activo" checked={form.isActive} onChange={(v) => patch('isActive', v)} />
        <Toggle label="Es reserva" checked={form.isReservation} onChange={(v) => patch('isReservation', v)} />
        <Toggle label="Requiere seña" checked={form.requiresDeposit} onChange={(v) => patch('requiresDeposit', v)} />
        <Toggle label="Tiene variantes" checked={form.hasVariants} onChange={(v) => patch('hasVariants', v)} />
        <Toggle label="Permite personalización" checked={form.allowsPersonalization} onChange={(v) => patch('allowsPersonalization', v)} />
        {!form.hasVariants && <Toggle label="Controlar stock" checked={form.tracksStock} onChange={(v) => patch('tracksStock', v)} />}
      </div>

      {form.requiresDeposit && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Monto de seña</label>
          <Input type="number" min="0" step="0.01" value={form.depositAmount} onChange={(e) => patch('depositAmount', e.target.value)} />
        </div>
      )}

      {!form.hasVariants && form.tracksStock && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Stock</label>
          <Input type="number" min="0" value={form.stockQuantity} onChange={(e) => patch('stockQuantity', e.target.value)} />
        </div>
      )}

      {form.allowsPersonalization && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Etiqueta de personalización</label>
            <Input value={form.personalizationLabel} onChange={(e) => patch('personalizationLabel', e.target.value)} maxLength={80} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Máx.</label>
            <Input type="number" min="1" max="50" value={form.personalizationMaxLength} onChange={(e) => patch('personalizationMaxLength', e.target.value)} />
          </div>
        </div>
      )}

      {form.hasVariants && (
        <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Variantes</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Talles, colores u opciones con stock propio.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addVariant}>Agregar</Button>
          </div>
          <div className="space-y-2">
            {form.variants.map((variant, index) => (
              <div key={variant.id ?? index} className="grid grid-cols-1 gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50 sm:grid-cols-[1fr_100px_auto_auto]">
                <Input value={variant.name} onChange={(e) => updateVariant(index, { name: e.target.value })} placeholder="Ej: Talle M" />
                {variant.tracksStock ? (
                  <Input type="number" min="0" value={variant.stockQuantity} onChange={(e) => updateVariant(index, { stockQuantity: e.target.value })} />
                ) : (
                  <div className="flex items-center rounded-xl border border-slate-200 px-3 text-xs text-slate-400 dark:border-slate-700">Siempre</div>
                )}
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={variant.tracksStock} onChange={(e) => updateVariant(index, { tracksStock: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-violet-600" />
                  Stock
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <input type="checkbox" checked={variant.isActive} onChange={(e) => updateVariant(index, { isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-violet-600" />
                    Activa
                  </label>
                  <Button type="button" variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30" onClick={() => removeVariant(index)}>
                    Quitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {product && product.images && product.images.length > 0 && (
        <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
          <p className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Imágenes actuales</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {product.images.map((image) => (
              <div key={image.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <img src={imgUrl(image.imageUrl) ?? ''} alt={product.name} className="h-24 w-full object-cover" />
                <div className="space-y-1 p-2">
                  {image.isMain && <Badge variant="success">Principal</Badge>}
                  <div className="flex gap-1">
                    {!image.isMain && onSetMainImage && <Button type="button" variant="outline" size="sm" className="h-7 flex-1 text-[11px]" onClick={() => onSetMainImage(image.id)}>Principal</Button>}
                    {onDeleteImage && <Button type="button" variant="outline" size="sm" className="h-7 flex-1 border-rose-200 text-[11px] text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400" onClick={() => onDeleteImage(image.id)}>Eliminar</Button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Imágenes</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:file:bg-slate-700 dark:file:text-slate-300"
        />
        {files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <span key={`${file.name}-${index}`} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {file.name}
                <button type="button" className="text-rose-500" onClick={() => setFiles(files.filter((_, i) => i !== index))}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading} className="flex-1 bg-violet-600 text-white hover:bg-violet-700">
          {product ? 'Guardar cambios' : 'Crear producto'}
        </Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>}
      </div>
    </form>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
    </label>
  )
}

function ProductCard({ product, category, onEdit, onDelete }: {
  product: Product
  category: string
  onEdit: () => void
  onDelete: () => void
}) {
  const image = mainImage(product)
  const stockLabel = product.hasVariants
    ? `${product.variants?.length ?? 0} variantes`
    : product.tracksStock ? `${product.stockQuantity ?? 0} en stock` : 'Siempre disponible'

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex gap-4 p-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
          {image ? <img src={image} alt={product.name} className="h-full w-full object-cover" /> : <span className="text-3xl">👕</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-1 text-sm font-bold text-slate-900 dark:text-white">{product.name}</h3>
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{category}</p>
            </div>
            <p className="shrink-0 text-sm font-black text-violet-600 dark:text-violet-300">{money(product.price)}</p>
          </div>
          <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{product.description || 'Sin descripción'}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant={product.isActive ? 'success' : 'default'}>{product.isActive ? 'Activo' : 'Inactivo'}</Badge>
            <Badge variant="info">{stockLabel}</Badge>
            {product.requiresDeposit && <Badge variant="warning">Seña {money(product.depositAmount ?? 0)}</Badge>}
            {product.allowsPersonalization && <Badge variant="violet">Personalizable</Badge>}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>
        <Button variant="outline" size="sm" className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30" onClick={onDelete}>
          Eliminar
        </Button>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <ToastProvider>
      <ProductsPageInner />
    </ToastProvider>
  )
}
