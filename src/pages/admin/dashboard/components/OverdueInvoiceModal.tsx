import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

export interface OverdueInvoice {
  invoiceId: string
  invoiceNumber: string
  periodYear: number
  periodMonth: number
  period: string
  originalAmount: number
  dueDateUtc: string
  lateWeeks: number
  lateFeePercentage: number
  lateFeeAmount: number
  amountWithLateFee: number
  lateFeeLabel: string | null
}

const FMT = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

function fmtDate(value: string | null | undefined) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('es-AR')
}

function lateFeeLabelOf(invoice: OverdueInvoice): string {
  return invoice.lateFeeLabel ?? `Mora (${invoice.lateFeePercentage}%)`
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 last:border-0 dark:border-slate-800">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-right text-xs font-semibold ${accent ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>{value}</span>
    </div>
  )
}

function OverdueCard({ invoice }: { invoice: OverdueInvoice }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-900 dark:text-white">Período {invoice.period}</p>
        <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600 ring-1 ring-red-300 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700">
          Vencida
        </span>
      </div>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Venció: {fmtDate(invoice.dueDateUtc)}</p>
      <div className="mt-2 space-y-1">
        <Row label="Importe original" value={FMT.format(invoice.originalAmount)} />
        <Row label={lateFeeLabelOf(invoice)} value={FMT.format(invoice.lateFeeAmount)} />
        <Row label="Total actualizado" value={FMT.format(invoice.amountWithLateFee)} accent />
      </div>
    </div>
  )
}

interface OverdueInvoiceModalProps {
  open: boolean
  invoices: OverdueInvoice[]
  onClose: () => void
}

export function OverdueInvoiceModal({ open, invoices, onClose }: OverdueInvoiceModalProps) {
  const navigate = useNavigate()

  function goToInvoice() {
    onClose()
    navigate('/admin/billing')
  }

  const single = invoices.length === 1

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={single ? 'Tenés una factura vencida' : `Tenés ${invoices.length} facturas vencidas`}
      className="sm:max-w-lg"
    >
      <div className="space-y-4 p-5 sm:p-6">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {single
            ? 'Una factura de tu institución hacia ClassClick se encuentra vencida. Regularizala para evitar que la mora continúe acumulándose.'
            : `Tu institución tiene ${invoices.length} facturas vencidas hacia ClassClick. Regularizalas para evitar que la mora continúe acumulándose.`}
        </p>

        {single ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Tu factura <span className="font-semibold text-slate-900 dark:text-white">{invoices[0].invoiceNumber}</span>{' '}
              correspondiente al período <span className="font-semibold text-slate-900 dark:text-white">{invoices[0].period}</span>{' '}
              se encuentra vencida. Actualmente tiene una mora del{' '}
              <span className="font-semibold text-red-600 dark:text-red-400">{invoices[0].lateFeePercentage}%</span>.
            </p>
            <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <Row label="Período" value={invoices[0].period} />
              <Row label="Fecha de vencimiento" value={fmtDate(invoices[0].dueDateUtc)} />
              <Row label="Importe original" value={FMT.format(invoices[0].originalAmount)} />
              <Row label={lateFeeLabelOf(invoices[0])} value={FMT.format(invoices[0].lateFeeAmount)} />
              <Row label="Total actualizado" value={FMT.format(invoices[0].amountWithLateFee)} accent />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Recordá que la mora es del 5% semanal. Para evitar que siga acumulándose, te recomendamos regularizar el pago.
            </p>
          </div>
        ) : (
          <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
            {invoices.map((inv) => <OverdueCard key={inv.invoiceId} invoice={inv} />)}
            <p className="pt-1 text-xs text-slate-500 dark:text-slate-400">
              Recordá que la mora es del 5% semanal. Para evitar que siga acumulándose, te recomendamos regularizar el pago.
            </p>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
          <Button size="sm" onClick={goToInvoice} className="bg-slate-800 text-white hover:bg-slate-700">Ver factura</Button>
        </div>
      </div>
    </Modal>
  )
}