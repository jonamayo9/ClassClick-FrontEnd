import { useState, useMemo } from 'react'
import { ToastProvider } from '@/components/ui/toast'
import { BackButton } from '@/components/ui/back-button'
import { PageHero } from '@/components/ui/page-hero'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { money, proofStatusLabel, proofTypeLabel, ProofStatus } from '../hooks'
import type { PaymentProof } from '../hooks'
import { usePaymentProofs } from './hooks'
import { ProofReviewModal } from '../orders/proof-review-modal'

// Pantalla legacy de comprobantes (ya no está en la navegación principal). Toda la revisión
// (Aprobar/Rechazar) vive EXCLUSIVAMENTE en el modal "Ver comprobante", igual que en Pedidos.
function PaymentProofsPageInner() {
  const { data: proofs = [], isLoading } = usePaymentProofs()
  const [search, setSearch] = useState('')
  const [reviewProof, setReviewProof] = useState<PaymentProof | null>(null)

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase()
    return proofs.filter((p) => {
      if (!text) return true
      return (p.studentName?.toLowerCase().includes(text) || p.studentDni?.includes(text) || p.orderId.includes(text))
    })
  }, [proofs, search])

  const stats = {
    total: proofs.length,
    pending: proofs.filter((p) => p.status === ProofStatus.Pending).length,
    approved: proofs.filter((p) => p.status === ProofStatus.Approved).length,
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <BackButton to="/admin/clothing" label="Volver a Indumentaria" />
      <PageHero
        label="Comprobantes"
        title="Comprobantes de pago"
        description="Revisá todos los comprobantes subidos por los alumnos desde el modal."
        stats={[
          { label: 'Total', value: stats.total },
          { label: 'Pendientes', value: stats.pending },
          { label: 'Aprobados', value: stats.approved },
        ]}
      />

      <Card className="p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Comprobantes</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} resultados</p>
          </div>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar alumno, DNI o pedido" className="sm:w-72" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Spinner className="h-6 w-6 text-violet-600" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🧾" title="Sin comprobantes" description="No hay comprobantes que revisar." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Alumno</th>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Importe</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((p, idx) => {
                  const bg = idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'
                  const ps = proofStatusLabel(p.status)
                  return (
                    <tr key={p.id} className={bg}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{p.studentName ?? '-'}</p>
                        {p.studentDni && <p className="text-xs text-slate-400">{p.studentDni}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">#{p.orderId.slice(0, 8)}</td>
                      <td className="px-4 py-3">{proofTypeLabel(p.type)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {p.orderTotalAmount != null ? money(p.orderTotalAmount) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ps.variant}>{ps.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => setReviewProof(p)}>
                          {p.fileUrl ? 'Ver comprobante' : 'Ver'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ProofReviewModal proof={reviewProof} open={!!reviewProof} onClose={() => setReviewProof(null)} />
    </div>
  )
}

export default function PaymentProofsPage() {
  return (
    <ToastProvider>
      <PaymentProofsPageInner />
    </ToastProvider>
  )
}