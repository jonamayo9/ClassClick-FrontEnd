import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui/card'

function buildQuery(params: Record<string, string | null>): string {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value)
  })
  return query.toString()
}

export default function MercadoPagoMobileReturnPage() {
  const [searchParams] = useSearchParams()
  const target = searchParams.get('target') === 'clothing' ? 'clothing' : 'payment'
  const attempt = searchParams.get('attempt')
  const chargeId = searchParams.get('chargeId')
  const orderId = searchParams.get('orderId')
  const company = searchParams.get('company')
  const context = searchParams.get('context')

  const deepLink = useMemo(() => {
    if (!attempt || !company) return null
    const query = buildQuery({
      target,
      attempt,
      chargeId,
      orderId,
      company,
      context,
    })
    return `classclick:///mercadopago/return?${query}`
  }, [attempt, chargeId, company, context, orderId, target])

  const fallback = useMemo(() => {
    if (target === 'clothing') {
      if (!orderId) return '/student/clothing/orders'
      return context === 'educational'
        ? `/estudiante/tienda/pedido/${encodeURIComponent(orderId)}`
        : `/student/clothing/order/${encodeURIComponent(orderId)}`
    }

    const query = buildQuery({ attempt })
    return `/student/payments/mercadopago/result${query ? `?${query}` : ''}`
  }, [attempt, context, orderId, target])

  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    if (!deepLink) {
      setShowFallback(true)
      return
    }

    const timer = window.setTimeout(() => {
      if (document.visibilityState !== 'hidden') setShowFallback(true)
    }, 1800)

    try {
      window.location.replace(deepLink)
    } catch {
      setShowFallback(true)
    }

    return () => window.clearTimeout(timer)
  }, [deepLink])

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-10">
      <Card className="w-full p-6 text-center sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl dark:bg-blue-950/40">
          ↗
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
          Volviendo a ClassClick
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Estamos abriendo la aplicación para mostrarte el resultado real del pago.
        </p>

        {showFallback ? (
          <div className="mt-5 flex flex-col gap-2">
            <a
              href={deepLink ?? fallback}
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Abrir ClassClick Mobile
            </a>
            <Link
              to={fallback}
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Continuar en la web
            </Link>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
