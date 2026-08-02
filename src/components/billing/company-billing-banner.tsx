import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'

interface Summary {
  hasPendingInvoice: boolean
  invoiceId?: string | null
  period?: string | null
  status?: string | null
  statusValue?: number | null
  dueDateUtc?: string | null
}

const InvoiceStatus = { Pending: 3, UnderReview: 4, Paid: 5, Overdue: 6, Cancelled: 7 }

function fmtDue(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-AR')
}

export function CompanyBillingBanner() {
  const slug = useAuth((s) => s.activeCompanySlug)
  const role = useAuth((s) => (s.activeRole ?? s.user?.systemRole ?? '').toLowerCase())

  const { data } = useQuery({
    queryKey: ['admin-billing-summary', slug],
    queryFn: () => apiService.get<Summary>(`/api/admin/${slug}/billing/summary`),
    enabled: !!slug && role === 'admin',
    refetchInterval: 5 * 60 * 1000,
  })

  if (role !== 'admin' || !data?.hasPendingInvoice) return null

  const status = data.statusValue ?? 0
  const period = data.period ?? ''
  const due = fmtDue(data.dueDateUtc)

  if (status === InvoiceStatus.Paid || status === InvoiceStatus.Cancelled) return null

  let title = ''
  let message = ''
  let style = ''
  let buttonText = ''

  if (status === InvoiceStatus.UnderReview) {
    title = 'Comprobante en revisión'
    message = `Recibimos tu comprobante correspondiente al período ${period}. Está siendo revisado.`
    style = 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100'
    buttonText = 'Ver detalle'
  } else if (status === InvoiceStatus.Overdue) {
    title = 'Factura de ClassClick vencida'
    message = `El cargo correspondiente al período ${period} está vencido desde el ${due}.`
    style = 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100'
    buttonText = 'Ver factura'
  } else {
    title = 'Factura de ClassClick disponible'
    message = `Ya está disponible el cargo correspondiente al período ${period}. Vence el ${due}.`
    style = 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100'
    buttonText = 'Ver factura'
  }

  return (
    <div className={`mb-4 flex flex-col gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:justify-between ${style}`}>
      <div className="min-w-0">
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-0.5 text-xs opacity-90">{message}</p>
      </div>
      <Link
        to="/admin/billing"
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
      >
        {buttonText}
      </Link>
    </div>
  )
}
