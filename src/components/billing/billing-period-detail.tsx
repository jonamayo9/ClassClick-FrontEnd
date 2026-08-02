import { Button } from '@/components/ui/button'
import { isFixedExtraChargeMode } from '@/pages/superadmin/billing.types'

const FMT = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export interface BillingPeriodDetailProps {
  period: string
  billableUsers: number
  extraUsers: number
  basePrice: number
  extraChargeMode: string | number
  extraUserPrice: number
  extraFixedAmount: number
  extraAmount: number
  totalAmount: number
  onDownloadPdf?: () => void
}

export function BillingPeriodDetail({
  period,
  billableUsers,
  extraUsers,
  basePrice,
  extraChargeMode,
  extraUserPrice,
  extraFixedAmount,
  extraAmount,
  totalAmount,
  onDownloadPdf,
}: BillingPeriodDetailProps) {
  const fixed = isFixedExtraChargeMode(extraChargeMode)
  const noExtra = extraUsers <= 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold">Detalle del período</h3>
        {onDownloadPdf && (
          <Button variant="outline" size="sm" onClick={onDownloadPdf}>
            PDF
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Período</p>
          <p className="text-lg font-black">{period}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Alumnos computados</p>
          <p className="text-lg font-black">{billableUsers}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Usuarios extra</p>
          <p className="text-lg font-black">{noExtra ? 'Sin usuarios extra' : extraUsers}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Base</p>
          <p className="text-lg font-black">{FMT.format(basePrice)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{fixed ? 'Monto fijo extra' : 'Precio extra por usuario'}</p>
          <p className="text-lg font-black">{fixed ? FMT.format(extraFixedAmount) : FMT.format(extraUserPrice)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Importe extra</p>
          <p className="text-lg font-black">{noExtra ? FMT.format(0) : FMT.format(extraAmount)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <span className="text-sm font-bold">Total</span>
        <span className="text-lg font-black text-emerald-600">{FMT.format(totalAmount)}</span>
      </div>
    </div>
  )
}
