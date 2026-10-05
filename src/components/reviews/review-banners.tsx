import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'

interface PendingProofItem {
  id: string
  orderId: string
  studentName: string
  uploadedAtUtc: string
  amountInformed?: number | null
  proofType: number
}

interface PendingSummary {
  clothing: { count: number; items: PendingProofItem[] }
  payments: { count: number }
}

const ARS = (n?: number | null) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0)

const linkCls =
  'inline-flex shrink-0 items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700'

/**
 * Avisos administrativos de elementos pendientes de revisión (Indumentaria y Cuotas).
 * Sigue el patrón del banner global de facturación de ClassClick y vive en el dashboard.
 * Indumentaria: navega a cada pedido pendiente. Cuotas: navega a la revisión de pagos.
 */
export function ReviewBanners({ slug, vertical }: { slug: string; vertical: 'deportivo' | 'educativa' }) {
  const role = useAuth((s) => (s.activeRole ?? s.user?.systemRole ?? '').toLowerCase())

  const { data } = useQuery({
    queryKey: ['reviews-pending-summary', slug],
    queryFn: () => apiService.get<PendingSummary>(`/api/admin/${slug}/reviews/pending-summary`),
    enabled: !!slug && role === 'admin',
    refetchInterval: 5 * 60 * 1000,
  })

  if (role !== 'admin' || !data) return null

  const clothing = data.clothing
  const payments = data.payments
  const ordersBase = vertical === 'educativa' ? `/educativa/${slug}/clothing/orders` : '/admin/clothing/orders'
  const paymentsBase = vertical === 'educativa' ? `/educativa/${slug}/pagos` : '/admin/payments?status=pending_review'

  return (
    <div className="space-y-3">
      {clothing.count > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                Comprobantes de Indumentaria por revisar ({clothing.count})
              </p>
              <p className="mt-0.5 text-xs opacity-90">Hay comprobantes de pago pendientes de aprobación.</p>
            </div>
            <Link to={ordersBase} className={linkCls}>Ver pedidos</Link>
          </div>
          {clothing.items.length > 0 && (
            <div className="mt-2 divide-y divide-amber-200/60 dark:divide-amber-800/60">
              {clothing.items.map((it) => (
                <Link
                  key={it.id}
                  to={`${ordersBase}?order=${it.orderId}`}
                  className="flex w-full items-center justify-between gap-3 py-1.5 text-xs text-amber-900 transition hover:text-amber-700 dark:text-amber-200 dark:hover:text-white"
                >
                  <span className="truncate font-medium">
                    {it.studentName} · #{it.orderId.slice(0, 8)}
                  </span>
                  <span className="shrink-0 font-semibold">{ARS(it.amountInformed)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {payments.count > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
                Pagos de cuotas por revisar ({payments.count})
              </p>
              <p className="mt-0.5 text-xs opacity-90">Comprobantes de cuotas informados pendientes de aprobación.</p>
            </div>
            <Link to={paymentsBase} className={linkCls}>Revisar pagos</Link>
          </div>
        </div>
      )}
    </div>
  )
}