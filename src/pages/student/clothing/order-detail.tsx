import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'

const ARS = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
function slug() { return useAuth.getState().activeCompanySlug ?? '' }
function fmt(v: string | null | undefined) { if (!v) return ''; return new Date(v).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) }

function DetailInner() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const orderId = id || sessionStorage.getItem('lastClothingOrderId') || ''

  const { data: order, isLoading } = useQuery({
    queryKey: ['clothing-order', slug(), orderId],
    queryFn: () => apiService.get<{ id: string; createdAtUtc: string; status: number; paymentOption: number; paymentStatus: number; hasPendingPaymentProof?: boolean; totalAmount: number; depositAmount?: number; pendingAmount?: number; items?: { productName: string; variantName?: string; personalizationText?: string; quantity: number; unitPrice: number; subtotal: number }[] }>(`/api/student/${slug()}/clothing/orders/${orderId}`),
    enabled: !!orderId && !!slug(),
  })

  const { data: settings } = useQuery({
    queryKey: ['clothing-settings', slug()],
    queryFn: () => apiService.get<{ paymentAlias?: string; paymentAliasHolder?: string }>(`/api/student/${slug()}/clothing/settings`),
    enabled: !!slug(),
  })

  const uploadProof = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData(); fd.append('file', file)
      return apiService.postForm(`/api/student/${slug()}/clothing/orders/${orderId}/payment-proof`, fd)
    },
    onSuccess: () => { toast('Comprobante enviado.'); setProofFile(null); setSent(true) },
  })

  const [proofFile, setProofFile] = useState<File | null>(null)
  const [sent, setSent] = useState(false)
  const [aliasCopied, setAliasCopied] = useState(false)

  const canUpload = order && !order.hasPendingPaymentProof && order.status === 1 && [1, 2, 3, 5].includes(order.paymentStatus) && !sent
  const payAmount = order?.paymentStatus === 2 ? (order.pendingAmount || 0) : order?.paymentOption === 1 ? (order.depositAmount || 0) : (order?.pendingAmount || order?.totalAmount || 0)
  const payText = order?.paymentStatus === 2 ? 'restante' : order?.paymentOption === 1 ? 'seña' : 'total'

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>

  if (!order) return <div className="py-16 text-center text-sm text-slate-500">Pedido no encontrado.</div>

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-8">
      {/* Success header */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl dark:bg-emerald-900/30">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="mt-3 text-xl font-black text-slate-900 dark:text-white">Pedido confirmado</h1>
        <p className="mt-1 text-sm text-slate-500">#{order.id.slice(0, 8)} · {fmt(order.createdAtUtc)}</p>
        <p className="mt-1 text-xs text-slate-400">Podés subir el comprobante de pago cuando quieras desde esta pantalla.</p>
      </div>

      {/* Status badges */}
      <div className="flex justify-center gap-3">
        <Badge variant={order.status === 1 ? 'warning' : order.status === 2 ? 'success' : order.status === 3 ? 'danger' : order.status === 4 ? 'info' : 'default'}>
          {['', 'Pendiente', 'Aprobado', 'Rechazado', 'Entregado', 'Cancelado'][order.status]}
        </Badge>
        <Badge variant={
          order.paymentStatus === 0 ? 'default' : [1, 3].includes(order.paymentStatus) ? 'warning' : [2, 4].includes(order.paymentStatus) ? 'success' : 'danger'
        }>
          {order.paymentStatus === 0 ? 'Sin pago' : order.paymentStatus === 1 ? 'Seña pendiente' : order.paymentStatus === 2 ? 'Seña pagada' : order.paymentStatus === 3 ? 'Pago pendiente' : order.paymentStatus === 4 ? 'Pago completo' : 'Rechazado'}
        </Badge>
      </div>

      {/* Payment proof upload */}
      {canUpload && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 space-y-4 dark:border-orange-900/50 dark:bg-orange-950/20">
          <div>
            <p className="text-sm font-bold text-orange-800 dark:text-orange-200">Comprobante de {payText}</p>
            <p className="text-xs text-orange-600 mt-1">Importe: {ARS(payAmount)}</p>
          </div>
          {settings?.paymentAlias && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-700 dark:bg-violet-950/30">
              <p className="text-sm font-bold text-violet-700 dark:text-violet-300">{settings.paymentAlias}</p>
              {settings.paymentAliasHolder && <p className="text-xs text-violet-600">{settings.paymentAliasHolder}</p>}
              <button onClick={async () => { await navigator.clipboard.writeText(settings.paymentAlias!); setAliasCopied(true); setTimeout(() => setAliasCopied(false), 3000) }}
                className="mt-1 text-xs font-semibold text-violet-600 hover:text-violet-500">{aliasCopied ? '✓ Copiado' : 'Copiar alias'}</button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1 file:text-xs file:font-medium dark:text-slate-300 dark:file:bg-slate-700" />
          <Button onClick={() => { if (proofFile) uploadProof.mutate(proofFile) }} disabled={!proofFile} loading={uploadProof.isPending}
            className="bg-violet-600 text-white hover:bg-violet-700">Subir comprobante</Button>
        </div>
      )}

      {order.hasPendingPaymentProof && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Comprobante enviado</p>
          <p className="text-xs text-emerald-600">Está pendiente de revisión del club.</p>
        </div>
      )}

      {!canUpload && !order.hasPendingPaymentProof && order.status === 1 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">
          No hay acciones pendientes para este pedido.
        </div>
      )}

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800">Productos</div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.productName}{item.variantName ? ` · ${item.variantName}` : ''}</p>
                  {item.personalizationText && <p className="text-xs text-slate-400">{item.personalizationText}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white">{ARS(item.subtotal)}</p>
                  <p className="text-[10px] text-slate-400">{item.quantity} × {ARS(item.unitPrice)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate('/student/clothing/orders')} className="flex-1">Ir a mis pedidos</Button>
        <Button onClick={() => navigate('/student/clothing')} className="flex-1 bg-violet-600 text-white hover:bg-violet-700">Volver a la tienda</Button>
      </div>
    </div>
  )
}

export default function StudentClothingOrderDetail() { return <ToastProvider><DetailInner /></ToastProvider> }
