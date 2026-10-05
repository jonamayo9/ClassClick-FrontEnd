import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { money } from '@/lib/currency'
import {
  usePublicStoreInfo,
  usePublicProducts,
  usePublicCheckoutPreview,
  usePublicCreateOrder,
  type PublicProduct,
  type CheckoutItem,
} from './hooks'

interface CartLine {
  productId: string
  variantId?: string | null
  quantity: number
  name: string
  variantName?: string
  unitPrice: number
}

function loadCart(slug: string): CartLine[] {
  try {
    return JSON.parse(localStorage.getItem(`cc_store_cart_${slug}`) ?? '[]') as CartLine[]
  } catch {
    return []
  }
}

function StoreInner() {
  const { companySlug = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const { data: info, isLoading: loadingInfo, isError } = usePublicStoreInfo(companySlug)
  const { data: products, isLoading: loadingProducts } = usePublicProducts(companySlug)
  const previewMutation = usePublicCheckoutPreview(companySlug)
  const createMutation = usePublicCreateOrder(companySlug)

  const [cart, setCart] = useState<CartLine[]>(() => loadCart(companySlug))
  const [showCart, setShowCart] = useState(false)
  const [selected, setSelected] = useState<Record<string, string>>({})

  // Checkout state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<'Pickup' | 'HomeDelivery'>('Pickup')
  const [province, setProvince] = useState('')
  const [locality, setLocality] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [street, setStreet] = useState('')
  const [streetNumber, setStreetNumber] = useState('')
  const [floor, setFloor] = useState('')
  const [references, setReferences] = useState('')
  const [deliveryInstructions, setDeliveryInstructions] = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [paymentOption, setPaymentOption] = useState(0)
  const [previewOverride, setPreviewOverride] = useState<unknown>(null)
  const [quoteChange, setQuoteChange] = useState<{ message: string; newQuote: { deliveryFee?: number | null; zoneLabel?: string | null; zoneId?: string | null } } | null>(null)

  useEffect(() => {
    localStorage.setItem(`cc_store_cart_${companySlug}`, JSON.stringify(cart))
  }, [cart, companySlug])

  const preview = (previewOverride ?? previewMutation.data) as {
    productsTotal: number
    deliveryFee: number
    fullTotal: number
    minimumInitialPayment: number
    allowsFullCheckout: boolean
    deliveryAvailable: boolean
    deliveryMessage?: string | null
    deliveryZoneLabel?: string | null
    currency: string
    options: { concept: string; amount: number; available: boolean }[]
    methods: { transferEnabled: boolean; transferCanPay: boolean; mercadoPagoEnabled: boolean; mercadoPagoConnected: boolean }
  } | undefined

  const cur = preview?.currency ?? info?.currency ?? 'ARS'

  const checkoutItems = useMemo<CheckoutItem[]>(
    () => cart.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
    [cart],
  )

  function addToCart(product: PublicProduct, variantId?: string) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id && (l.variantId ?? null) === (variantId ?? null))
      const name = product.name
      const variantName = variantId ? product.variants.find((v) => v.id === variantId)?.name : undefined
      if (existing) return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l))
      return [...prev, { productId: product.id, variantId: variantId ?? null, quantity: 1, name, variantName, unitPrice: product.price }]
    })
    setShowCart(true)
    toast('Producto agregado al carrito.')
  }

  function updateQty(index: number, delta: number) {
    setCart((prev) =>
      prev
        .map((l, i) => (i === index ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    )
  }

  function runPreview() {
    setCheckoutError('')
    if (cart.length === 0) return setCheckoutError('El carrito está vacío.')
    if (deliveryMethod === 'HomeDelivery' && (!locality.trim() && !postalCode.trim())) {
      return setCheckoutError('Completá la localidad y el código postal para cotizar el envío.')
    }
    previewMutation.mutate(
      {
        items: checkoutItems,
        deliveryMethod,
        province: deliveryMethod === 'HomeDelivery' ? province.trim() || undefined : undefined,
        locality: deliveryMethod === 'HomeDelivery' ? locality.trim() || undefined : undefined,
        postalCode: deliveryMethod === 'HomeDelivery' ? postalCode.trim() || undefined : undefined,
      },
      {
        onError: (e: unknown) => {
          const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
          setCheckoutError(msg ?? 'No se pudo cotizar el pedido.')
        },
      },
    )
  }

  async function createOrder() {
    setCheckoutError('')
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setCheckoutError('Completá nombre, apellido y email del comprador.')
      return
    }
    if (!preview) {
      setCheckoutError('Cotizá el pedido antes de continuar.')
      return
    }
    if (deliveryMethod === 'HomeDelivery' && !preview.deliveryAvailable) {
      setCheckoutError(preview.deliveryMessage ?? 'Este domicilio está fuera de la zona de entrega.')
      return
    }
    const chosen = preview.options.find((o) => o.available)
    if (!chosen) {
      setCheckoutError('No hay opciones de pago disponibles para este pedido.')
      return
    }
    try {
      const created = await createMutation.mutateAsync({
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        paymentOption: paymentOption === 1 ? 1 : 2,
        items: checkoutItems,
        deliveryMethod,
        province: deliveryMethod === 'HomeDelivery' ? province.trim() || undefined : undefined,
        locality: deliveryMethod === 'HomeDelivery' ? locality.trim() || undefined : undefined,
        postalCode: deliveryMethod === 'HomeDelivery' ? postalCode.trim() || undefined : undefined,
        street: deliveryMethod === 'HomeDelivery' ? street.trim() || undefined : undefined,
        streetNumber: deliveryMethod === 'HomeDelivery' ? streetNumber.trim() || undefined : undefined,
        floor: floor.trim() || undefined,
        references: references.trim() || undefined,
        deliveryInstructions: deliveryInstructions.trim() || undefined,
        expectedDeliveryFee: preview?.deliveryFee,
      })
      const order = created as unknown as { publicToken: string }
      localStorage.removeItem(`cc_store_cart_${companySlug}`)
      navigate(`/tienda/${companySlug}/pedido/${order.publicToken}`)
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string; newQuote?: { deliveryFee?: number | null; zoneLabel?: string | null; zoneId?: string | null } } } }
      if (err?.response?.status === 409 && err.response.data?.newQuote) {
        setQuoteChange({ message: err.response.data.message ?? 'El costo del envío cambió.', newQuote: err.response.data.newQuote })
        return
      }
      setCheckoutError(err?.response?.data?.message ?? 'No se pudo crear el pedido.')
    }
  }

  function acceptNewQuote() {
    if (!quoteChange?.newQuote || !preview) return
    const newFee = quoteChange.newQuote.deliveryFee ?? preview.deliveryFee
    const newMinInitial = preview.minimumInitialPayment - preview.deliveryFee + newFee
    const updated: typeof preview = {
      ...preview,
      deliveryFee: newFee,
      fullTotal: preview.productsTotal + newFee,
      minimumInitialPayment: newMinInitial,
      deliveryZoneLabel: quoteChange.newQuote.zoneLabel ?? preview.deliveryZoneLabel,
    }
    setPreviewOverride(updated)
    setQuoteChange(null)
    void createOrder()
  }

  if (loadingInfo || loadingProducts) {
    return <div className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950"><Spinner className="h-7 w-7 text-violet-600" /></div>
  }

  if (isError || !info?.publicStoreEnabled) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="text-center">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Tienda no disponible</h1>
          <p className="mt-1 text-sm text-slate-500">Esta tienda no está habilitada actualmente.</p>
        </div>
      </div>
    )
  }

  const deliveryEnabled = deliveryMethod === 'HomeDelivery' && !!info.homeDeliveryEnabled

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600">{info.title ?? 'Tienda'}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{info.description}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowCart(true)}>
            Carrito ({cart.reduce((s, l) => s + l.quantity, 0)})
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {info.instructions && (
          <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300">
            {info.instructions}
          </div>
        )}

        {!products?.length ? (
          <p className="py-16 text-center text-sm text-slate-500">No hay productos disponibles.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const chosenVariant = p.hasVariants ? (selected[p.id] ?? p.variants.find((v) => v.isAvailable)?.id) : undefined
              return (
                <div key={p.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <div className="aspect-square w-full bg-slate-100 dark:bg-slate-800">
                    {p.images.find((i) => i.isMain)?.imageUrl ? (
                      <img src={p.images.find((i) => i.isMain)?.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">Sin imagen</div>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{p.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{p.description}</p>
                    </div>
                    <p className="text-lg font-extrabold text-violet-700 dark:text-violet-400">{money(p.price, cur)}</p>
                    {p.requiresDeposit && p.depositAmount != null && (
                      <p className="text-xs text-slate-500">Seña mínima: {money(p.depositAmount, cur)}</p>
                    )}
                    {p.hasVariants && (
                      <div className="flex flex-wrap gap-2">
                        {p.variants.map((v) => (
                          <button
                            key={v.id}
                            disabled={!v.isAvailable}
                            onClick={() => setSelected((s) => ({ ...s, [p.id]: v.id }))}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-40 ${
                              chosenVariant === v.id
                                ? 'border-violet-600 bg-violet-600 text-white'
                                : 'border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <Button
                      className="w-full bg-violet-600 text-white hover:bg-violet-700"
                      disabled={!p.isAvailable}
                      onClick={() => addToCart(p, chosenVariant)}
                    >
                      {p.isAvailable ? 'Agregar al carrito' : 'Sin stock'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={() => setShowCart(false)}>
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h2 className="font-bold text-slate-900 dark:text-white">Tu carrito</h2>
              <button className="text-slate-400" onClick={() => setShowCart(false)}>✕</button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {cart.length === 0 ? (
                <p className="text-sm text-slate-500">El carrito está vacío.</p>
              ) : (
                cart.map((l, i) => (
                  <div key={`${l.productId}-${l.variantId}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{l.name}</p>
                      <p className="text-xs text-slate-500">{l.variantName}</p>
                      <p className="text-xs text-slate-500">{money(l.unitPrice, cur)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="h-7 w-7 rounded-full border border-slate-300 dark:border-slate-600" onClick={() => updateQty(i, -1)}>−</button>
                      <span className="w-6 text-center text-sm font-semibold">{l.quantity}</span>
                      <button className="h-7 w-7 rounded-full border border-slate-300 dark:border-slate-600" onClick={() => updateQty(i, 1)}>+</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="space-y-4 border-t border-slate-200 p-5 dark:border-slate-800">
                {/* Datos del comprador */}
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input placeholder="Nombre *" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  <Input placeholder="Apellido *" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  <Input placeholder="Email *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Input placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>

                {/* Método de entrega */}
                <div className="grid gap-2 sm:grid-cols-2">
                  {info.pickupEnabled && (
                    <button
                      onClick={() => setDeliveryMethod('Pickup')}
                      className={`rounded-xl border p-3 text-left text-sm ${deliveryMethod === 'Pickup' ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/40' : 'border-slate-200 dark:border-slate-700'}`}
                    >
                      <span className="font-semibold text-slate-900 dark:text-white">Retiro en la institución</span>
                      <p className="text-xs text-slate-500">{info.pickupAddress?.addressFormatted ?? 'En la sede'}</p>
                      <p className="text-xs font-bold text-violet-700 dark:text-violet-400">Gratis</p>
                    </button>
                  )}
                  {info.homeDeliveryEnabled && (
                    <button
                      onClick={() => setDeliveryMethod('HomeDelivery')}
                      className={`rounded-xl border p-3 text-left text-sm ${deliveryMethod === 'HomeDelivery' ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/40' : 'border-slate-200 dark:border-slate-700'}`}
                    >
                      <span className="font-semibold text-slate-900 dark:text-white">Envío a domicilio</span>
                      <p className="text-xs text-slate-500">Calculá el costo según tu dirección</p>
                    </button>
                  )}
                </div>

                {deliveryEnabled && (
                  <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Input placeholder="Provincia" value={province} onChange={(e) => setProvince(e.target.value)} />
                      <Input placeholder="Localidad *" value={locality} onChange={(e) => setLocality(e.target.value)} />
                      <Input placeholder="Código postal *" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} maxLength={12} />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Input placeholder="Calle *" value={street} onChange={(e) => setStreet(e.target.value)} />
                      <Input placeholder="Número" value={streetNumber} onChange={(e) => setStreetNumber(e.target.value)} maxLength={20} />
                      <Input placeholder="Piso / Dto (opcional)" value={floor} onChange={(e) => setFloor(e.target.value)} />
                    </div>
                    <Input placeholder="Referencias (opcional)" value={references} onChange={(e) => setReferences(e.target.value)} maxLength={300} />
                    <p className="text-xs text-slate-400">
                      El costo de envío se calcula según la localidad y el código postal configurados por la institución.
                    </p>
                  </div>
                )}

                <Button className="w-full bg-violet-600 text-white hover:bg-violet-700" onClick={runPreview} loading={previewMutation.isPending}>
                  Cotizar y ver resumen
                </Button>

                {checkoutError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    {checkoutError}
                  </div>
                )}

                {preview && (
                  <div className="space-y-2 rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Productos</span><span>{money(preview.productsTotal, cur)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Envío{preview.deliveryZoneLabel ? ` (${preview.deliveryZoneLabel})` : ''}</span><span>{preview.deliveryFee > 0 ? money(preview.deliveryFee, cur) : 'Gratis'}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900 dark:border-slate-700 dark:text-white">
                      <span>Total</span><span>{money(preview.fullTotal, cur)}</span>
                    </div>
                    {!preview.deliveryAvailable && deliveryMethod === 'HomeDelivery' && (
                      <p className="text-sm text-amber-600 dark:text-amber-400">{preview.deliveryMessage ?? 'Este domicilio está fuera de la zona de entrega.'}</p>
                    )}
                    {quoteChange && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                        <p>{quoteChange.message}</p>
                        {quoteChange.newQuote?.deliveryFee != null && (
                          <p className="mt-1 font-semibold">
                            Nuevo envío: {money(quoteChange.newQuote.deliveryFee, cur)} · Nuevo total:{' '}
                            {money((preview.productsTotal ?? 0) + quoteChange.newQuote.deliveryFee, cur)}
                          </p>
                        )}
                        <Button size="sm" className="mt-2 bg-amber-600 text-white hover:bg-amber-700" loading={createMutation.isPending} onClick={acceptNewQuote}>
                          Aceptar nuevo total
                        </Button>
                      </div>
                    )}
                    <div className="pt-2">
                      <p className="mb-2 text-xs font-semibold text-slate-500">Opción de pago</p>
                      <div className="space-y-1.5">
                        {preview.options.map((o) => (
                          <button
                            key={o.concept}
                            disabled={!o.available}
                            onClick={() => setPaymentOption(o.concept === 'Deposit' ? 1 : 2)}
                            className={`w-full rounded-xl border p-2.5 text-left text-sm ${paymentOption === (o.concept === 'Deposit' ? 1 : 2) ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/40' : 'border-slate-200 dark:border-slate-700'} disabled:opacity-40`}
                          >
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {o.concept === 'Deposit' ? 'Adelanto' : o.concept === 'Full' ? 'Pago total' : 'Saldo'}
                            </span>
                            <span className="ml-1 text-violet-700 dark:text-violet-400">{money(o.amount, cur)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button
                      className="w-full bg-violet-600 text-white hover:bg-violet-700"
                      loading={createMutation.isPending}
                      onClick={createOrder}
                    >
                      Confirmar pedido
                    </Button>
                    <p className="text-center text-[11px] text-slate-400">
                      El pago se realiza a continuación. Para transferencia verás los datos bancarios; para Mercado Pago serás redirigido.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="border-t border-slate-200 bg-white py-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-center text-xs text-slate-400">
          {info.pickupEnabled && info.pickupAddress?.addressFormatted ? `Retiro: ${info.pickupAddress.addressFormatted}` : 'Comprá sin registrarte'}
        </p>
      </footer>
    </div>
  )
}

export default function PublicClothingStorePage() {
  return (
    <ToastProvider>
      <StoreInner />
    </ToastProvider>
  )
}