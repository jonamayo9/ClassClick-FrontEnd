import { useState } from 'react'
import { apiService, getApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { money, formatDate, chargeStatusBadge, getChargePaymentMethodText } from '@/pages/admin/payments/hooks'
import type { DelegateCharge } from './types'
import { UploadProofModal } from './upload-modal'

export function ChargeItem({
  slug, charge, transferEnabled, onUploaded,
}: {
  slug: string
  charge: DelegateCharge
  transferEnabled: boolean
  onUploaded: () => void
}) {
  const toast = useToast()
  const [uploadOpen, setUploadOpen] = useState(false)

  const badge = chargeStatusBadge(charge.status)
  const methodLabel = charge.paymentMethodNameSnapshot
    || (charge.paymentMethod != null ? getChargePaymentMethodText(charge.paymentMethod) : '—')
  const canUpload = transferEnabled && (charge.status === 'Pending' || charge.status === 'Overdue')

  async function viewProof() {
    try {
      const res = await apiService.get<{ url: string }>(`/api/delegate/${slug}/payments/charges/${charge.monthlyChargeId}/proof/view`)
      window.open(res.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast(getApiError(err), 'error')
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-slate-900 dark:text-white">{charge.studentFullName}</div>
          <div className="text-xs text-slate-500">
            {charge.courseName} · {charge.month}/{charge.year} · vence {formatDate(charge.dueDateUtc)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${badge.classes}`}>{badge.label}</span>
          <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{charge.chargeTypeName}</span>
          <span className="font-black text-slate-900 dark:text-white">{money(charge.finalAmount)}</span>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
        {charge.paidAtUtc && <span>Pagado: {formatDate(charge.paidAtUtc)}</span>}
        {methodLabel !== '—' && <span>Método: {methodLabel}</span>}
        {charge.hasProof && (
          <span>
            Comprobante: <span className="font-semibold">{proofLabel(charge.proofStatus)}</span>
          </span>
        )}
        {!charge.hasProof && <span>Sin comprobante</span>}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {charge.hasProof && charge.canViewProof && <Button variant="outline" size="sm" onClick={viewProof}>Ver comprobante</Button>}
        {canUpload && <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setUploadOpen(true)}>Subir comprobante</Button>}
      </div>

      {uploadOpen && (
        <UploadProofModal slug={slug} charge={charge} onClose={() => setUploadOpen(false)} onDone={onUploaded} />
      )}
    </div>
  )
}

function proofLabel(status: string | null) {
  if (!status) return 'Enviado'
  if (status === 'InReview') return 'En revisión'
  if (status === 'Approved') return 'Aprobado'
  if (status === 'Rejected') return 'Rechazado'
  return status
}
