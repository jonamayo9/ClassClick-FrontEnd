import { useState, useMemo } from 'react'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { BackButton } from '@/components/ui/back-button'
import { PageHero } from '@/components/ui/page-hero'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { money, formatDateTime, proofStatusLabel, proofTypeLabel } from '../hooks'
import type { PaymentProof } from '../hooks'
import { usePaymentProofs, useApproveProof, useRejectProof } from './hooks'

function PaymentProofsPageInner() {
  const { data: proofs = [], isLoading } = usePaymentProofs()
  const approveProof = useApproveProof()
  const rejectProof = useRejectProof()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null)
  const [actionProof, setActionProof] = useState<PaymentProof | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')
  const [reviewNote, setReviewNote] = useState('')

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase()
    return proofs.filter((p) => {
      if (!text) return true
      return (p.studentName?.toLowerCase().includes(text) || p.studentDni?.includes(text) || p.orderId.includes(text))
    })
  }, [proofs, search])

  const stats = {
    total: proofs.length,
    pending: proofs.filter((p) => p.status === 1).length,
    approved: proofs.filter((p) => p.status === 2).length,
  }

  async function handleAction() {
    if (!actionProof) return
    try {
      if (actionType === 'approve') {
        await approveProof.mutateAsync({ proofId: actionProof.id, reviewNote })
        toast('Comprobante aprobado.')
      } else {
        await rejectProof.mutateAsync({ proofId: actionProof.id, reviewNote })
        toast('Comprobante rechazado.')
      }
      setActionProof(null)
      setReviewNote('')
    } catch {
      toast('Error al procesar el comprobante.', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <BackButton to="/admin/clothing" label="Volver a Indumentaria" />
      <PageHero
        label="Comprobantes"
        title="Comprobantes de pago"
        description="Revisá y aprobá todos los comprobantes subidos por los alumnos."
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
                        <div className="flex justify-end gap-1.5">
                          <Button variant="outline" size="sm" onClick={() => setSelectedProof(p)}>Ver</Button>
                          {p.status === 1 && (
                            <>
                              <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] px-2.5 py-1.5"
                                onClick={() => { setActionProof(p); setActionType('approve'); setReviewNote('') }}>
                                Aprobar
                              </Button>
                              <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700 text-[11px] px-2.5 py-1.5"
                                onClick={() => { setActionProof(p); setActionType('reject'); setReviewNote('') }}>
                                Rechazar
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedProof && (
        <Modal open={!!selectedProof} onClose={() => setSelectedProof(null)} title="Comprobante" description={`${proofTypeLabel(selectedProof.type)} - ${money(selectedProof.orderTotalAmount ?? 0)}`} className="sm:max-w-lg">
          <div className="space-y-4 p-5">
            {selectedProof.fileUrl && (
              <div className="flex justify-center">
                {selectedProof.isPdf ? (
                  <iframe src={selectedProof.fileUrl} className="h-96 w-full rounded-xl border border-slate-200 dark:border-slate-700" title="Comprobante PDF" />
                ) : (
                  <img src={selectedProof.fileUrl} alt="Comprobante" className="max-h-96 rounded-xl border border-slate-200 object-contain dark:border-slate-700" />
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold uppercase text-slate-400">Estado</p>
                <Badge variant={proofStatusLabel(selectedProof.status).variant}>{proofStatusLabel(selectedProof.status).label}</Badge>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold uppercase text-slate-400">Subido</p>
                <p className="mt-1 text-sm text-slate-900 dark:text-white">{formatDateTime(selectedProof.uploadedAtUtc)}</p>
              </div>
            </div>
            {selectedProof.reviewNote && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold uppercase text-slate-400">Nota de revisión</p>
                <p className="mt-1 text-sm text-slate-900 dark:text-white">{selectedProof.reviewNote}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {actionProof && (
        <Modal open={!!actionProof} onClose={() => { setActionProof(null); setReviewNote('') }} title={actionType === 'approve' ? 'Aprobar comprobante' : 'Rechazar comprobante'} className="sm:max-w-md">
          <div className="space-y-4 p-5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nota para el alumno</label>
              <Textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={3} placeholder="Opcional..." />
            </div>
            <div className="flex gap-3">
              <Button
                loading={approveProof.isPending || rejectProof.isPending}
                className={actionType === 'approve' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-rose-600 text-white hover:bg-rose-700'}
                onClick={handleAction}
              >
                {actionType === 'approve' ? 'Aprobar' : 'Rechazar'}
              </Button>
              <Button variant="outline" onClick={() => { setActionProof(null); setReviewNote('') }}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}
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
