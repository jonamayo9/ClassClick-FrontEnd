import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { PageHero } from '@/components/ui/page-hero'
import { apiService } from '@/lib/api'
import { imgUrl } from '@/lib/media'
import { useAuth } from '@/stores/auth'

const ARS = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
function slug() { return useAuth.getState().activeCompanySlug ?? '' }

interface Product {
  id: string; name: string; description?: string; price: number; isAvailable?: boolean
  hasVariants?: boolean; parentCategoryName?: string; categoryName?: string
  allowsPersonalization?: boolean; personalizationLabel?: string; personalizationMaxLength?: number
  isReservation?: boolean; requiresDeposit?: boolean; depositAmount?: number
  images?: { imageUrl: string; isMain?: boolean }[]
  variants?: { id: string; name: string; isAvailable?: boolean; tracksStock?: boolean; stockQuantity?: number }[]
}

interface CartItem {
  key: string; productId: string; variantId: string | null; name: string; variantName: string | null
  price: number; quantity: number; imageUrl: string; isReservation?: boolean
  requiresDeposit?: boolean; depositAmount?: number
  personalizationText: string; personalizationLabel?: string
}

function getCartKey() { return `classclick_clothing_cart_${slug()}` }
function getCart(): CartItem[] { try { return JSON.parse(localStorage.getItem(getCartKey()) || '[]') } catch { return [] } }
function saveCart(cart: CartItem[]) { localStorage.setItem(getCartKey(), JSON.stringify(cart)) }

function CatalogInner() {
  const navigate = useNavigate()
  const toast = useToast()

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['clothing-products', slug()],
    queryFn: () => apiService.get<Product[]>(`/api/student/${slug()}/clothing/products`),
    enabled: !!slug(),
    select: (d: unknown) => { if (Array.isArray(d)) return d as Product[]; const r = d as { items?: Product[]; data?: Product[] }; return r.items ?? r.data ?? [] },
  })

  const createOrder = useMutation({
    mutationFn: (body: { paymentOption: number; items: { productId: string; variantId: string | null; quantity: number; personalizationText: string | null }[] }) =>
      apiService.post(`/api/student/${slug()}/clothing/orders`, body),
  })

  const [search, setSearch] = useState('')
  const [parentCat, setParentCat] = useState('')
  const [childCat, setChildCat] = useState('')
  const [cart, setCart] = useState<CartItem[]>(getCart)
  const [cartOpen, setCartOpen] = useState(false)
  const [payOption, setPayOption] = useState<1 | 2>(1)
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [detailVariant, setDetailVariant] = useState<string>('')
  const [detailPersonalization, setDetailPersonalization] = useState('')

  useEffect(() => { saveCart(cart) }, [cart])

  const parentCategories = useMemo(
    () => [...new Set(products.map((p) => p.parentCategoryName).filter((name): name is string => Boolean(name)))].sort(),
    [products],
  )
  const childCategories = useMemo(() => {
    const set = new Set(
      products
        .filter((p) => !parentCat || p.parentCategoryName === parentCat)
        .map((p) => p.categoryName)
        .filter((name): name is string => Boolean(name)),
    )
    return [...set].sort()
  }, [products, parentCat])

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return products.filter((p) => {
      if (parentCat && p.parentCategoryName !== parentCat) return false
      if (childCat && p.categoryName !== childCat) return false
      if (s) {
        const haystack = `${p.name} ${p.description ?? ''} ${p.parentCategoryName ?? ''} ${p.categoryName ?? ''} ${p.variants?.map((v) => v.name).join(' ') ?? ''}`.toLowerCase()
        if (!haystack.includes(s)) return false
      }
      return true
    })
  }, [products, parentCat, childCat, search])

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>()
    filtered.forEach((p) => {
      const group = p.categoryName || p.parentCategoryName || 'General'
      if (!map.has(group)) map.set(group, [])
      map.get(group)!.push(p)
    })
    return [...map.entries()]
  }, [filtered])

  const cartTotal = useMemo(() => {
    const items = cart.reduce((s, i) => s + i.price * i.quantity, 0)
    const deposit = cart.filter((i) => i.requiresDeposit).reduce((s, i) => s + (i.depositAmount || 0) * i.quantity, 0)
    return { items, deposit, full: items }
  }, [cart])

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  const updateQty = useCallback((key: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.key === key ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter((i) => i.quantity > 0))
  }, [])

  const removeItem = useCallback((key: string) => {
    setCart((prev) => prev.filter((i) => i.key !== key))
  }, [])

  function addToCart(product: Product, variantId: string | null, personalizationText: string) {
    const variant = product.variants?.find((v) => v.id === variantId)
    const key = `${product.id}_${variantId || 'no-variant'}_${personalizationText.toLowerCase() || 'no-custom'}`
    const imageUrl = product.images?.find((i) => i.isMain)?.imageUrl || product.images?.[0]?.imageUrl || ''
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key)
      if (existing) return prev.map((i) => i.key === key ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { key, productId: product.id, variantId, name: product.name, variantName: variant?.name || null, price: product.price, quantity: 1, imageUrl, isReservation: product.isReservation, requiresDeposit: product.requiresDeposit, depositAmount: product.depositAmount, personalizationText, personalizationLabel: product.personalizationLabel }]
    })
  }

  async function checkout() {
    if (cart.length === 0) { toast('El carrito está vacío.', 'error'); return }
    const hasDeposit = cart.some((i) => i.requiresDeposit)
    try {
      const result = await createOrder.mutateAsync({
        paymentOption: hasDeposit ? payOption : 2,
        items: cart.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity, personalizationText: i.personalizationText || null })),
      }) as { id?: string; data?: { id?: string } }
      const orderId = result.id ?? result.data?.id ?? ''
      sessionStorage.setItem('lastClothingOrderId', orderId)
      setCart([])
      navigate(`/student/clothing/order/${orderId}`)
    } catch { toast('Error al crear el pedido.', 'error') }
  }

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>

  return (
    <div className="space-y-5 pb-44">
      <PageHero
        label="Indumentaria"
        title="Tienda del club"
        description="Productos oficiales y personalizados."
        stats={[
          { label: 'Productos', value: products.length },
          ...(cart.length > 0 ? [{ label: 'En carrito', value: cartCount }] : []),
        ]}
      />

      {/* Search + nav */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscá producto, categoría o talle..." className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/student/clothing/orders')} className="whitespace-nowrap gap-1.5">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          Mis pedidos
        </Button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button onClick={() => { setParentCat(''); setChildCat('') }}
          className={`whitespace-nowrap rounded-full px-5 py-2 text-xs font-bold transition-all ${!parentCat ? 'bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>
          Todos
        </button>
        {parentCategories.map((cat) => (
          <button key={cat} onClick={() => { setParentCat(parentCat === cat ? '' : cat); setChildCat('') }}
            className={`whitespace-nowrap rounded-full px-5 py-2 text-xs font-bold transition-all ${parentCat === cat ? 'bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Subcategories */}
      {childCategories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button onClick={() => setChildCat('')}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-semibold transition-all ${!childCat ? 'border-2 border-violet-400 bg-violet-50 text-violet-700 shadow-sm dark:border-violet-500 dark:bg-violet-950/30 dark:text-violet-300' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900'}`}>
            Todas
          </button>
          {childCategories.map((cat) => (
            <button key={cat} onClick={() => setChildCat(childCat === cat ? '' : cat)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-semibold transition-all ${childCat === cat ? 'border-2 border-violet-400 bg-violet-50 text-violet-700 shadow-sm dark:border-violet-500 dark:bg-violet-950/30 dark:text-violet-300' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900'}`}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Products */}
      {filtered.length === 0 ? (
        <EmptyState icon="👕" title="Sin resultados" description="No hay productos que coincidan con tu búsqueda." />
      ) : (
        grouped.map(([group, items]) => (
          <section key={group}>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{group}</h2>
              <span className="text-xs text-slate-400">{items.length} artículo{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {items.map((p) => {
                const img = p.images?.find((i) => i.isMain)?.imageUrl || p.images?.[0]?.imageUrl
                const available = p.hasVariants ? p.variants?.some((v) => v.isAvailable) : p.isAvailable
                return (
                  <button key={p.id} onClick={() => { setDetailProduct(p); setDetailVariant(''); setDetailPersonalization('') }}
                    className="group flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <div className="aspect-[4/3] bg-slate-50 overflow-hidden dark:bg-slate-800">
                      {img ? (
                        <img src={imgUrl(img) ?? ''} alt={p.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <svg className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 p-3 text-left">
                      <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight min-h-[2em]">{p.name}</p>
                      <p className="text-base font-black text-violet-600 dark:text-violet-300">{ARS(p.price)}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {available ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Disponible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Sin stock
                          </span>
                        )}
                        {p.hasVariants && <span className="text-[10px] text-slate-400">{p.variants?.length} var.</span>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        ))
      )}

      {/* Product detail modal */}
      {detailProduct && (
        <Modal open={!!detailProduct} onClose={() => setDetailProduct(null)} title="" className="sm:max-w-md">
          <div className="relative h-56 bg-slate-50 overflow-hidden sm:rounded-t-2xl dark:bg-slate-800">
            {(() => {
              const img = detailProduct.images?.find((i) => i.isMain)?.imageUrl || detailProduct.images?.[0]?.imageUrl
              return img ? <img src={imgUrl(img) ?? ''} alt={detailProduct.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-6xl text-slate-300">👕</div>
            })()}
            <button onClick={() => setDetailProduct(null)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl bg-black/40 text-white backdrop-blur-sm hover:bg-black/60">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            {detailProduct.isReservation && (
              <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md">Reserva</span>
            )}
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{detailProduct.name}</h3>
                {detailProduct.description && <p className="text-sm text-slate-500 mt-1">{detailProduct.description}</p>}
              </div>
              {detailProduct.isAvailable !== false ? (
                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Disponible</span>
              ) : (
                <span className="shrink-0 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">Sin stock</span>
              )}
            </div>

            <p className="text-3xl font-black text-violet-600 dark:text-violet-300">{ARS(detailProduct.price)}</p>

            {/* Variants */}
            {detailProduct.hasVariants && detailProduct.variants && detailProduct.variants.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Variantes</p>
                <div className="flex flex-wrap gap-2">
                  {detailProduct.variants.map((v) => {
                    const active = detailVariant === v.id
                    return (
                      <button key={v.id} onClick={() => setDetailVariant(v.id)} disabled={v.isAvailable === false}
                        className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-all ${
                          active ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-sm dark:border-violet-400 dark:bg-violet-950/30 dark:text-violet-300' : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'
                        } ${v.isAvailable === false ? 'opacity-40 line-through cursor-not-allowed' : 'cursor-pointer'}`}>
                        {v.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Personalization */}
            {detailProduct.allowsPersonalization && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {detailProduct.personalizationLabel || 'Personalización'} (máx. {detailProduct.personalizationMaxLength || 30})
                </label>
                <Input value={detailPersonalization}
                  onChange={(e) => setDetailPersonalization(e.target.value.slice(0, detailProduct.personalizationMaxLength || 30))}
                  placeholder="Ej: nombre, número..." className="mt-1" />
              </div>
            )}

            {/* Deposit info */}
            {detailProduct.requiresDeposit && detailProduct.depositAmount != null && (
              <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-900/50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔒</span>
                  <div>
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Requiere seña</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">Seña de {ARS(detailProduct.depositAmount)}. El resto se abona al retirar.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={() => { addToCart(detailProduct, detailVariant || null, detailPersonalization); setDetailProduct(null) }}
                disabled={detailProduct.hasVariants && !detailVariant}
                className="flex-1 bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-500/20">
                Agregar al carrito
              </Button>
              <Button onClick={() => { addToCart(detailProduct, detailVariant || null, detailPersonalization); setDetailProduct(null); setCartOpen(true) }}
                disabled={detailProduct.hasVariants && !detailVariant}
                className="flex-1 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                Comprar ahora
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cart button */}
      {cart.length > 0 && !cartOpen && !detailProduct && (
        <button onClick={() => setCartOpen(true)}
          className="fixed bottom-24 left-4 right-4 z-40 flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl transition hover:bg-slate-800 md:bottom-8 md:left-auto md:right-8 md:w-80 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
          <div className="relative">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
            <span className="absolute -right-1.5 -top-1.5 flex h-4.5 w-4.5 min-w-[18px] items-center justify-center rounded-full bg-violet-500 text-[9px] font-bold text-white px-1">{cartCount}</span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-bold">Ver carrito</p>
            <p className="text-xs opacity-70">{cartCount} producto{cartCount !== 1 ? 's' : ''}</p>
          </div>
          <p className="text-sm font-black">{ARS(cartTotal.items)}</p>
        </button>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl dark:bg-slate-900 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <p className="text-base font-bold text-slate-900 dark:text-white">Carrito de compras</p>
                <p className="text-xs text-slate-400">{cartCount} producto{cartCount !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setCartOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">El carrito está vacío.</div>
              ) : cart.map((item) => (
                <div key={item.key} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                    {item.imageUrl ? <img src={imgUrl(item.imageUrl) ?? ''} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xl text-slate-300">👕</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                    {item.variantName && <p className="text-xs text-slate-400">{item.variantName}</p>}
                    {item.personalizationText && <p className="text-xs text-violet-600 truncate">📝 {item.personalizationLabel || 'Personalización'}: {item.personalizationText}</p>}
                    {item.requiresDeposit && <p className="text-xs text-amber-600">🔒 Seña: {ARS(item.depositAmount || 0)}</p>}
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-0.5 border border-slate-200 rounded-lg overflow-hidden dark:border-slate-600">
                        <button onClick={() => updateQty(item.key, -1)} className="flex h-7 w-7 items-center justify-center text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">−</button>
                        <span className="flex h-7 w-8 items-center justify-center text-xs font-bold text-slate-900 dark:text-white border-x border-slate-200 dark:border-slate-600">{item.quantity}</span>
                        <button onClick={() => updateQty(item.key, 1)} className="flex h-7 w-7 items-center justify-center text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">+</button>
                      </div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{ARS(item.price * item.quantity)}</p>
                    </div>
                  </div>
                  <button onClick={() => removeItem(item.key)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:text-red-500 transition">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-slate-200 px-5 py-4 space-y-3 dark:border-slate-700">
                {cart.some((i) => i.requiresDeposit) && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setPayOption(1)}
                      className={`rounded-xl border-2 px-3 py-2.5 text-center transition ${payOption === 1 ? 'border-violet-500 bg-violet-50 text-violet-700 dark:border-violet-400 dark:bg-violet-950/30 dark:text-violet-300' : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700'}`}>
                      <p className="text-xs font-bold">Seña</p>
                      <p className="text-sm font-black">{ARS(cartTotal.deposit)}</p>
                    </button>
                    <button onClick={() => setPayOption(2)}
                      className={`rounded-xl border-2 px-3 py-2.5 text-center transition ${payOption === 2 ? 'border-violet-500 bg-violet-50 text-violet-700 dark:border-violet-400 dark:bg-violet-950/30 dark:text-violet-300' : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700'}`}>
                      <p className="text-xs font-bold">Total</p>
                      <p className="text-sm font-black">{ARS(cartTotal.full)}</p>
                    </button>
                  </div>
                )}

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal</span><span className="font-bold text-slate-900 dark:text-white">{ARS(cartTotal.items)}</span>
                  </div>
                  {payOption === 1 && cart.some((i) => i.requiresDeposit) && (
                    <>
                      <div className="flex justify-between text-violet-600"><span>Pagás ahora</span><span className="font-bold">{ARS(cartTotal.deposit)}</span></div>
                      <div className="flex justify-between text-slate-400"><span>Restante</span><span className="font-bold">{ARS(cartTotal.full - cartTotal.deposit)}</span></div>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setCart([]); toast('Carrito vaciado.') }} size="sm">Vaciar</Button>
                  <Button onClick={checkout} loading={createOrder.isPending} className="flex-1 bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-500/20">
                    Confirmar pedido
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function StudentClothingCatalog() { return <ToastProvider><CatalogInner /></ToastProvider> }
