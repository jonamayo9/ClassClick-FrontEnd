import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useModule } from '@/hooks/useModule'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClothingFinancialModal, type ClothingFinancialSummary } from './clothing-financial-modal'
import { clothingFinancialPeriodQs } from './clothing-financial-period'

const ARS = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

/**
 * Card "Indumentaria financiera" del dashboard: ingresos aprobados, reembolsos ejecutados y
 * neto del período. Abre un modal con el detalle paginado (25) y exportable a Excel/PDF.
 * from/to: fechas del período (YYYY-MM-DD). fromUtc/toUtc: instantes precisos (opcional,
 * usado por el dashboard Educativo para respetar los límites en hora Argentina).
 */
export function ClothingFinancialDashboardCard({ slug, from, to, fromUtc, toUtc }: {
  slug: string
  from: string
  to: string
  fromUtc?: string
  toUtc?: string
}) {
  const clothingOn = useModule('clothing')
  const [open, setOpen] = useState(false)

  const qs = clothingFinancialPeriodQs(from, to, fromUtc, toUtc)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['clothing-financial-summary', slug, from, to, fromUtc ?? '', toUtc ?? ''],
    queryFn: () => apiService.get<ClothingFinancialSummary>(`/api/admin/${slug}/clothing/financial/summary?${qs}`),
    enabled: !!slug && clothingOn,
    retry: false,
  })

  if (!clothingOn) return null

  return (
    <>
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Indumentaria financiera</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Cobros aprobados, reintegros y neto del período.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={isLoading}>
            {isLoading ? 'Cargando…' : 'Ver detalle'}
          </Button>
        </div>
        {isError ? (
          <p className="mt-3 text-xs text-slate-400">No se pudieron calcular los movimientos del período.</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Ingresos</p>
              <p className="mt-0.5 text-lg font-black text-emerald-700 dark:text-emerald-300 tabular-nums">{isLoading ? '…' : ARS(data?.income ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Reembolsos</p>
              <p className="mt-0.5 text-lg font-black text-rose-700 dark:text-rose-300 tabular-nums">{isLoading ? '…' : ARS(data?.refunds ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Neto</p>
              <p className="mt-0.5 text-lg font-black text-slate-900 tabular-nums dark:text-white">{isLoading ? '…' : ARS(data?.net ?? 0)}</p>
            </div>
          </div>
        )}
      </Card>

      <ClothingFinancialModal open={open} onClose={() => setOpen(false)} slug={slug} from={from} to={to} fromUtc={fromUtc} toUtc={toUtc} />
    </>
  )
}