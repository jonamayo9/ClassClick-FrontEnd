import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { Expand, X } from 'lucide-react'
import {
  money,
  formatDateTime,
  proofStatusLabel,
  proofTypeLabel,
  paymentConceptLabel,
  paymentMethodTypeLabel,
  ProofStatus,
} from '../hooks'
import type { PaymentProof } from '../hooks'
import { useApproveProof, useRejectProof } from './hooks'

/**
 * Modal de revisión de un comprobante de pago de Indumentaria. Se abre dentro del contexto
 * del pedido (sin navegar a otra pantalla): vista previa real (imagen/PDF), datos del pedido,
 * estado semántico, y acciones Aprobar / Rechazar (motivo obligatorio) cuando está pendiente.
 */
export function ProofReviewModal({ proof, open, onClose, initialPhase = 'view' }: {
  proof: PaymentProof | null
  open: boolean
  onClose: () => void
  initialPhase?: 'view' | 'approve' | 'reject'
}) {
  const toast = useToast()
  const approveProof = useApproveProof()
  const rejectProof = useRejectProof()
  const [phase, setPhase] = useState<'view' | 'approve' | 'reject'>(initialPhase)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [enlarged, setEnlarged] = useState(false)

  const pending = approveProof.isPending || rejectProof.isPending

  function close() {
    setPhase('view')
    setNote('')
    setError('')
    onClose()
  }

  async function confirmApprove() {
    if (!proof) return
    setError('')
    try {
      await approveProof.mutateAsync({ proofId: proof.id, reviewNote: note })
      toast('Comprobante aprobado. El pago se aplicó al pedido.')
      close()
    } catch {
      setError('No se pudo aprobar el comprobante. Intentá nuevamente.')
    }
  }

  async function confirmReject() {
    if (!proof) return
    if (!note.trim()) {
      setError('Indicá el motivo del rechazo (es obligatorio).')
      return
    }
    setError('')
    try {
      await rejectProof.mutateAsync({ proofId: proof.id, reviewNote: note })
      toast('Comprobante rechazado. El alumno podrá volver a cargarlo mientras la reserva siga vigente.')
      close()
    } catch {
      setError('No se pudo rechazar el comprobante. Intentá nuevamente.')
    }
  }

  if (!proof) return null

  const st = proofStatusLabel(proof.status)
  const isPending = proof.status === ProofStatus.Pending

  const preview = (
    <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
      {proof.fileUrl ? (
        proof.isPdf ? (
          <iframe src={proof.fileUrl} className="h-64 w-full" title="Comprobante PDF" />
        ) : (
          <img src={proof.fileUrl} alt="Comprobante de pago" className="max-h-72 w-full object-contain" />
        )
      ) : (
        <p className="text-xs text-slate-400">Sin archivo disponible.</p>
      )}
      {proof.fileUrl && (
        <button
          type="button"
          onClick={() => setEnlarged(true)}
          className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-900/80 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-900"
        >
          <Expand className="h-3.5 w-3.5" aria-hidden="true" />
          Ampliar
        </button>
      )}
    </div>
  )

  return (
    <>
      <Modal
        open={open}
        onClose={close}
        title={`Comprobante · ${proofTypeLabel(proof.type)}`}
        description={`Pedido #${proof.orderId.slice(0, 8)}`}
        ariaLabel="Revisión de comprobante"
        className="sm:max-w-lg"
        footer={
          <div className="space-y-3">
            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>
            )}
            {isPending && phase === 'view' && (
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setPhase('reject'); setError('') }} disabled={pending}>
                  Rechazar
                </Button>
                <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => { setPhase('approve'); setError('') }} disabled={pending}>
                  Aprobar
                </Button>
              </div>
            )}
            {isPending && phase === 'approve' && (
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setPhase('view'); setError('') }} disabled={pending}>Volver</Button>
                <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={confirmApprove} loading={approveProof.isPending}>
                  Confirmar aprobación
                </Button>
              </div>
            )}
            {isPending && phase === 'reject' && (
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setPhase('view'); setError('') }} disabled={pending}>Volver</Button>
                <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={confirmReject} loading={rejectProof.isPending} disabled={!note.trim()}>
                  Rechazar comprobante
                </Button>
              </div>
            )}
            {!isPending && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={close}>Cerrar</Button>
              </div>
            )}
          </div>
        }
      >
        <div className="space-y-4 p-5">
          {preview}

          <div className="grid grid-cols-2 gap-3">
            <Detail label="Alumno / comprador">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{proof.studentName || 'Comprador'}</p>
              {proof.studentDni && <p className="text-xs text-slate-400">DNI {proof.studentDni}</p>}
            </Detail>
            <Detail label="Pedido">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">#{proof.orderId.slice(0, 8)}</p>
            </Detail>
            <Detail label="Importe">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{money(proof.orderTotalAmount ?? 0)}</p>
              {proof.amountInformed != null && (
                <p className="text-xs text-slate-400">Informado: {money(proof.amountInformed)}</p>
              )}
            </Detail>
            <Detail label="Fecha de carga">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatDateTime(proof.uploadedAtUtc)}</p>
              {proof.reviewedAtUtc && <p className="text-xs text-slate-400">Revisado {formatDateTime(proof.reviewedAtUtc)}</p>}
            </Detail>
            <Detail label="Método de pago">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {proof.method != null ? paymentMethodTypeLabel(proof.method) : '-'}
              </p>
            </Detail>
            <Detail label="Tipo de pago">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {proofTypeLabel(proof.type)}{proof.concept != null ? ` · ${paymentConceptLabel(proof.concept)}` : ''}
              </p>
            </Detail>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</p>
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>

          {proof.reviewNote && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {proof.status === ProofStatus.Rejected ? 'Motivo de rechazo' : 'Nota de revisión'}
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{proof.reviewNote}</p>
            </div>
          )}

          {isPending && phase === 'reject' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Motivo del rechazo <span className="text-rose-500">*</span>
              </label>
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Motivo (obligatorio). El alumno lo verá al revisar su comprobante."
              />
            </div>
          )}

          {isPending && phase === 'approve' && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Confirmá la aprobación. El importe se aplicará al pedido y el alumno recibirá la notificación.
              {note.trim() && <span className="mt-1 block text-xs text-slate-400">Nota: {note}</span>}
            </p>
          )}
        </div>
      </Modal>

      {enlarged && proof.fileUrl && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black/90 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Comprobante ampliado</p>
            <button
              type="button"
              onClick={() => setEnlarged(false)}
              aria-label="Cerrar vista ampliada"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto rounded-xl">
            {proof.isPdf ? (
              <iframe src={proof.fileUrl} className="h-full min-h-[70vh] w-full" title="Comprobante PDF ampliado" />
            ) : (
              <img src={proof.fileUrl} alt="Comprobante de pago ampliado" className="mx-auto max-h-full object-contain" />
            )}
          </div>
        </div>
      )}
    </>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  )
}