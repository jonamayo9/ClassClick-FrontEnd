import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { clothingFinancialPeriodQs } from './clothing-financial-period'

export interface ClothingFinancialSummary {
  income: number
  refunds: number
  net: number
}

interface FinancialRow {
  kind: 'income' | 'refund'
  paymentId: string
  orderId: string
  orderNumber: string
  companyName: string
  studentOrBuyer: string
  studentDni?: string | null
  movementDateUtc: string
  productName?: string | null
  paymentConcept: string
  paymentMethod: string
  amount: number
  currency: string
  paymentStatus: string
  refundState: string
  refundedAmount: number
  refundedAtUtc?: string | null
  refundNote?: string | null
  net: number
}

interface Page<T> {
  total: number
  page: number
  pageSize: number
  items: T[]
}

const ARS = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
const moneyAny = (n: number, currency: string) => `${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ${currency}`
const fmtDate = (v?: string | null) => v ? new Date(v).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

const conceptLabel: Record<string, string> = { Deposit: 'Pago inicial', Balance: 'Saldo', Full: 'Pago total' }
const methodLabel: Record<string, string> = { Transfer: 'Transferencia', MercadoPago: 'Mercado Pago', Cash: 'Efectivo' }
const refundLabel: Record<string, string> = { Refunded: 'Reembolsado', Partial: 'Reembolso parcial', Pending: 'Pendiente', Failed: 'Fallido', None: 'Sin reembolso' }

const COLUMNS: { key: string; label: string; className?: string }[] = [
  { key: 'order', label: 'Pedido' },
  { key: 'person', label: 'Alumno / comprador' },
  { key: 'date', label: 'Fecha' },
  { key: 'product', label: 'Producto' },
  { key: 'concept', label: 'Tipo' },
  { key: 'method', label: 'Medio' },
  { key: 'amount', label: 'Importe', className: 'text-right' },
  { key: 'currency', label: 'Moneda' },
  { key: 'status', label: 'Estado' },
  { key: 'refund', label: 'Reembolso' },
  { key: 'net', label: 'Neto', className: 'text-right' },
]

function refundBadge(state: string) {
  switch (state) {
    case 'Refunded': return 'success'
    case 'Partial': return 'info'
    case 'Pending': return 'warning'
    case 'Failed': return 'danger'
    default: return 'default'
  }
}

/**
 * Modal de detalle financiero de Indumentaria (ingresos y reintegros reales).
 * Paginación desde backend (25/página) y export del conjunto completo filtrado.
 */
export function ClothingFinancialModal({ open, onClose, slug, from, to, fromUtc, toUtc }: {
  open: boolean
  onClose: () => void
  slug: string
  from: string
  to: string
  fromUtc?: string
  toUtc?: string
}) {
  const toast = useToast()
  const [kind, setKind] = useState<'income' | 'refunds'>('income')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null)
  const [params, setParams] = useState('')

  useEffect(() => {
    if (open) { setPage(1); setSearch(''); setKind('income'); setParams('') }
  }, [open])

  const qs = `?${clothingFinancialPeriodQs(from, to, fromUtc, toUtc)}`

  const summary = useQuery({
    queryKey: ['clothing-financial-summary', slug, from, to, fromUtc ?? '', toUtc ?? ''],
    queryFn: () => apiService.get<ClothingFinancialSummary>(`/api/admin/${slug}/clothing/financial/summary${qs}`),
    enabled: !!slug && open,
    retry: false,
  })

  const detail = useQuery({
    queryKey: ['clothing-financial-detail', slug, from, to, fromUtc ?? '', toUtc ?? '', kind, params, page],
    queryFn: () => apiService.get<Page<FinancialRow>>(
      `/api/admin/${slug}/clothing/financial/detail${qs}&kind=${kind}${params ? `&search=${params}` : ''}&page=${page}&pageSize=25`),
    enabled: !!slug && open,
    retry: false,
  })

  async function exportFile(format: 'xlsx' | 'pdf') {
    setExporting(format)
    try {
      const blob = await apiService.getBlob(
        `/api/admin/${slug}/clothing/financial/export${qs}&kind=${kind}${params ? `&search=${params}` : ''}&format=${format}`,
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `indumentaria-financiero-${kind}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast('No se pudo exportar el detalle.', 'error')
    } finally {
      setExporting(null)
    }
  }

  const s = summary.data
  const rows = detail.data?.items ?? []
  const loading = detail.isLoading

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Financiero de Indumentaria"
      description={`Período: ${from} al ${to} · Cobros aprobados y reintegros ejecutados`}
      ariaLabel="Detalle financiero de Indumentaria"
      className="sm:max-w-4xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {detail.data ? `Mostrando ${detail.data.pageSize} por página · total ${detail.data.total}` : 'Cargando…'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" loading={exporting === 'xlsx'} onClick={() => exportFile('xlsx')}>Exportar Excel</Button>
            <Button variant="outline" size="sm" loading={exporting === 'pdf'} onClick={() => exportFile('pdf')}>Exportar PDF</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        {/* Totales */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Ingresos (bruto)</p>
            <p className="mt-0.5 text-lg font-black text-emerald-700 dark:text-emerald-300 tabular-nums">{summary.isLoading ? '…' : ARS(s?.income ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Reembolsos</p>
            <p className="mt-0.5 text-lg font-black text-rose-700 dark:text-rose-300 tabular-nums">{summary.isLoading ? '…' : ARS(s?.refunds ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Neto</p>
            <p className="mt-0.5 text-lg font-black text-slate-900 tabular-nums dark:text-white">{summary.isLoading ? '…' : ARS(s?.net ?? 0)}</p>
          </div>
        </div>

        {/* Tabs + filtro */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            {(['income', 'refunds'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => { setKind(k); setPage(1) }}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  kind === k ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
                )}
              >
                {k === 'income' ? 'Ingresos' : 'Reembolsos'}
              </button>
            ))}
          </div>
          <form
            className="w-full sm:w-72"
            onSubmit={(e) => { e.preventDefault(); setParams(search.trim()); setPage(1) }}
          >
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar alumno, DNI o pedido" />
          </form>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner className="h-6 w-6 text-violet-600" /></div>
        ) : detail.isError ? (
          <EmptyState icon="⚠️" title="No se pudo cargar el detalle" description="Revisá los filtros e intentá nuevamente." />
        ) : rows.length === 0 ? (
          <EmptyState icon="🧾" title="Sin movimientos" description="No hay movimientos para los filtros actuales." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {COLUMNS.map((c) => <th key={c.key} className={cn('px-3 py-2', c.className)}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((r) => (
                  <tr key={r.paymentId} className="bg-white dark:bg-slate-900">
                    <td className="px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white">#{r.orderNumber}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{r.studentOrBuyer}</p>
                      {r.studentDni && <p className="text-[11px] text-slate-400">DNI {r.studentDni}</p>}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{fmtDate(r.movementDateUtc)}</td>
                    <td className="max-w-[140px] truncate px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{r.productName ?? '-'}</td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{conceptLabel[r.paymentConcept] ?? r.paymentConcept}</td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{methodLabel[r.paymentMethod] ?? r.paymentMethod}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-white">{moneyAny(r.amount, r.currency)}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{r.currency}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{r.paymentStatus}</td>
                    <td className="px-3 py-2">
                      <Badge variant={refundBadge(r.refundState)}>{refundLabel[r.refundState] ?? r.refundState}</Badge>
                      {r.refundNote && <p className="mt-0.5 max-w-[180px] truncate text-[11px] text-slate-400" title={r.refundNote}>{r.refundNote}</p>}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-white">{moneyAny(r.net, r.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={detail.data?.page ?? 1}
          pageSize={detail.data?.pageSize ?? 25}
          totalCount={detail.data?.total ?? 0}
          onPageChange={setPage}
          loading={loading}
        />
      </div>
    </Modal>
  )
}