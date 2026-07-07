import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { PageHero } from '@/components/ui/page-hero'
import { apiService } from '@/lib/api'
import { imgUrl } from '@/lib/media'
import { useAuth } from '@/stores/auth'

const ARS = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
function slug() { return useAuth.getState().activeCompanySlug ?? '' }
function fmt(v: string | null | undefined) { if (!v) return ''; return new Date(v).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

interface Order { id: string; createdAtUtc: string; status: string | number; paymentOption: string | number; paymentStatus: string | number; hasPendingPaymentProof?: boolean; totalAmount: number; depositAmount?: number; pendingAmount?: number; items?: { productName: string; variantName?: string; personalizationText?: string; quantity: number; unitPrice: number; subtotal: number }[] }
interface Proof { id: string; type: number; status: number; fileUrl: string; isImage?: boolean; isPdf?: boolean; uploadedAtUtc?: string; reviewNote?: string }

function stLabel(s: string | number) { const n = Number(s); return ['', 'Pendiente', 'Aprobado', 'Rechazado', 'Entregado', 'Cancelado'][n] || 'Pendiente' }
function stClass(s: string | number) { const n = Number(s); return n === 1 ? 'bg-amber-50 text-amber-700' : n === 2 ? 'bg-emerald-50 text-emerald-700' : n === 3 ? 'bg-rose-50 text-rose-700' : n === 4 ? 'bg-blue-50 text-blue-700' : n === 5 ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700' }
function pmLabel(o: Order): string {
  const s = Number(o.paymentStatus)
  if (s === 0) return 'Sin pago'
  if (s === 1) return o.hasPendingPaymentProof ? 'Seña en revisión' : 'Seña pendiente'
  if (s === 2) return 'Seña aprobada'
  if (s === 3) return o.hasPendingPaymentProof ? 'Pago en revisión' : 'Pago total pendiente'
  if (s === 4) return 'Pago aprobado'
  if (s === 5) return 'Pago rechazado'
  return 'Pago pendiente'
}
function pmClass(s: string | number) { const n = Number(s); return n === 1 || n === 3 ? 'bg-orange-50 text-orange-700' : n === 2 || n === 4 ? 'bg-emerald-50 text-emerald-700' : n === 5 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600' }
function poLabel(s: string | number) { return Number(s) === 1 ? 'Seña' : 'Total' }
function canUp(o: Order): boolean { return !o.hasPendingPaymentProof && Number(o.status) === 1 && [1, 2, 3, 5].includes(Number(o.paymentStatus)) }
function toPay(o: Order): number {
  const ps = Number(o.paymentStatus)
  if (ps === 2) return Number(o.pendingAmount || 0)
  if (Number(o.paymentOption) === 1) return Number(o.depositAmount || 0)
  return Number(o.pendingAmount || o.totalAmount || 0)
}
function pfText(o: Order): string {
  if (Number(o.paymentStatus) === 2) return 'restante'
  return Number(o.paymentOption) === 1 ? 'seña' : 'total'
}

function OrdersInner() {
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['clothing-orders', slug()],
    queryFn: () => apiService.get<Order[]>(`/api/student/${slug()}/clothing/orders`),
    enabled: !!slug(),
    select: (d: unknown) => { if (Array.isArray(d)) return d as Order[]; const r = d as { items?: Order[]; data?: Order[] }; return r.items ?? r.data ?? [] },
  })

  const { data: settings } = useQuery({
    queryKey: ['clothing-settings', slug()],
    queryFn: () => apiService.get<{ paymentAlias?: string; paymentAliasHolder?: string }>(`/api/student/${slug()}/clothing/settings`),
    enabled: !!slug(),
  })

  const uploadProof = useMutation({
    mutationFn: ({ orderId, file }: { orderId: string; file: File }) => {
      const fd = new FormData(); fd.append('file', file)
      return apiService.postForm(`/api/student/${slug()}/clothing/orders/${orderId}/payment-proof`, fd)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clothing-orders'] }); toast('Comprobante enviado correctamente.'); setSelectedOrder(null); setProofFile(null) },
  })

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [proofs, setProofs] = useState<Proof[]>([])
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [viewingProof, setViewingProof] = useState<Proof | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [aliasCopied, setAliasCopied] = useState(false)
  const [loadingProofs, setLoadingProofs] = useState(false)

  const pendingOrders = orders.filter((o) => ![3, 4, 5].includes(Number(o.status)))
  const completedOrders = orders.filter((o) => [3, 4, 5].includes(Number(o.status)))

  async function openDetail(o: Order) {
    setSelectedOrder(o)
    setLoadingProofs(true)
    try {
      const d = await apiService.get<unknown>(`/api/student/${slug()}/clothing/orders/${o.id}/payment-proofs`)
      setProofs(Array.isArray(d) ? d as Proof[] : [])
    } catch { setProofs([]) }
    setLoadingProofs(false)
  }

  async function handleUpload() {
    if (!selectedOrder || !proofFile) return
    uploadProof.mutate({ orderId: selectedOrder.id, file: proofFile })
  }

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>

  return (
    <div className="space-y-5 pb-8">
      <PageHero
        label="Indumentaria"
        title="Mis pedidos"
        description="Seguí el estado de tus pedidos de indumentaria."
        stats={[
          ...(pendingOrders.length > 0 ? [{ label: 'En curso', value: pendingOrders.length }] : []),
          { label: 'Total', value: orders.length },
        ]}
      />

      {orders.length === 0 ? (
        <EmptyState icon="🧥" title="Sin pedidos" description="Todavía no realizaste ningún pedido." action={{ label: 'Ir a la tienda', onClick: () => navigate('/student/clothing') }} />
      ) : (
        <div className="space-y-6">
          {/* Current */}
          {pendingOrders.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pedidos en curso</h2>
              {pendingOrders.map((o) => <OrderCard key={o.id} order={o} onSelect={() => openDetail(o)} />)}
            </section>
          )}

          {/* History */}
          {completedOrders.length > 0 && (
            <section className="space-y-3">
              <button onClick={() => setHistoryOpen(!historyOpen)}
                className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 transition">
                <svg className={`h-4 w-4 transition-transform duration-200 ${historyOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                Pedidos anteriores ({completedOrders.length})
              </button>
              {historyOpen && <div className="space-y-3">{completedOrders.map((o) => <OrderCard key={o.id} order={o} onSelect={() => openDetail(o)} />)}</div>}
            </section>
          )}
        </div>
      )}

      {/* Detail modal */}
      {selectedOrder && (
        <Modal open={!!selectedOrder} onClose={() => { setSelectedOrder(null); setProofFile(null) }} title="Detalle del pedido" description={`#${selectedOrder.id.slice(0, 8)}`} className="sm:max-w-xl">
          {loadingProofs ? (
            <div className="flex items-center justify-center py-12"><Spinner className="h-6 w-6 text-violet-600" /></div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Status cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-xl px-4 py-3 ${stClass(selectedOrder.status)}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Estado</p>
                  <p className="mt-0.5 text-sm font-bold">{stLabel(selectedOrder.status)}</p>
                </div>
                <div className={`rounded-xl px-4 py-3 ${pmClass(selectedOrder.paymentStatus)}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Pago</p>
                  <p className="mt-0.5 text-sm font-bold">{pmLabel(selectedOrder)}</p>
                </div>
              </div>

              {/* Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="bg-slate-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800">Productos</div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 bg-white px-4 py-3 dark:bg-slate-900">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{item.productName}{item.variantName ? ` · ${item.variantName}` : ''}</p>
                          {item.personalizationText && <p className="text-xs text-violet-500 dark:text-violet-400">📝 {item.personalizationText}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{ARS(item.subtotal)}</p>
                          <p className="text-[10px] text-slate-400">{item.quantity} × {ARS(item.unitPrice)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Total del pedido</span><span className="font-bold text-slate-900 dark:text-white">{ARS(selectedOrder.totalAmount)}</span></div>
                {selectedOrder.paymentOption === 1 && <div className="flex justify-between text-sm"><span className="text-slate-500">Seña</span><span className="font-bold text-violet-600">{ARS(selectedOrder.depositAmount || 0)}</span></div>}
                <div className="flex justify-between text-sm"><span className="text-slate-500">Forma de pago</span><span className="font-bold text-slate-700 dark:text-slate-300">{selectedOrder.paymentOption === 1 ? 'Seña' : 'Pago completo'}</span></div>
              </div>

              {/* Proofs */}
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Comprobantes</p>
                {proofs.length > 0 ? (
                  <div className="space-y-2">
                    {proofs.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
                        <div>
                          <p className="text-xs font-medium text-slate-900 dark:text-white">{p.type === 1 ? 'Seña' : 'Pago total'}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              p.status === 1 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' :
                              p.status === 2 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' :
                              'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
                            }`}>{p.status === 1 ? 'En revisión' : p.status === 2 ? 'Aprobado' : 'Rechazado'}</span>
                            {p.reviewNote && <span className="text-[10px] text-slate-400">· {p.reviewNote}</span>}
                          </div>
                        </div>
                        <button onClick={() => setViewingProof(p)}
                          className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Ver</button>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-slate-400">Todavía no cargaste comprobantes.</p>}
              </div>

              {/* Upload */}
              {canUp(selectedOrder) && (
                <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-5 space-y-4 dark:border-orange-900/50 dark:from-orange-950/30 dark:to-amber-950/20">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-lg dark:bg-orange-900/40">💳</span>
                    <div>
                      <p className="text-sm font-bold text-orange-800 dark:text-orange-200">Comprobante de pago</p>
                      <p className="text-xs text-orange-600 dark:text-orange-400">Importe: {ARS(toPay(selectedOrder))}</p>
                    </div>
                  </div>
                  {settings?.paymentAlias && (
                    <div className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-700 dark:bg-slate-900">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-violet-700 dark:text-violet-300">{settings.paymentAlias}</p>
                          {settings.paymentAliasHolder && <p className="text-xs text-slate-500">{settings.paymentAliasHolder}</p>}
                        </div>
                        <button onClick={async () => { await navigator.clipboard.writeText(settings.paymentAlias!); setAliasCopied(true); setTimeout(() => setAliasCopied(false), 3000) }}
                          className="shrink-0 rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-600 hover:bg-violet-50 dark:border-violet-700 dark:hover:bg-violet-950/30">{aliasCopied ? '✓ Copiado' : 'Copiar'}</button>
                      </div>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-700 shadow-sm border border-slate-200 rounded-xl px-3 py-2 dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-slate-200 dark:border-slate-700" />
                  <Button onClick={handleUpload} disabled={!proofFile} loading={uploadProof.isPending} className="w-full bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-500/20">
                    {proofFile ? `Subir ${proofFile.name}` : 'Seleccioná un archivo'}
                  </Button>
                </div>
              )}

              {selectedOrder.hasPendingPaymentProof && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">📎 Comprobante enviado</p>
                  <p className="text-xs text-emerald-600 mt-1">Está pendiente de revisión por el club.</p>
                </div>
              )}

              {!canUp(selectedOrder) && !selectedOrder.hasPendingPaymentProof && selectedOrder.status === 1 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">
                  No hay acciones pendientes para este pedido.
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Proof viewer */}
      {viewingProof && (
        <Modal open={!!viewingProof} onClose={() => setViewingProof(null)} title="Comprobante" className="sm:max-w-3xl">
          <div className="bg-slate-100 p-4 dark:bg-slate-800">
            {viewingProof.isImage ? (
              <img src={imgUrl(viewingProof.fileUrl) ?? ''} alt="Comprobante" className="mx-auto max-h-[72vh] w-auto max-w-full rounded-lg object-contain shadow-sm" />
            ) : viewingProof.isPdf ? (
              <iframe src={imgUrl(viewingProof.fileUrl) ?? ''} title="PDF" className="h-[72vh] w-full rounded-lg border-0 shadow-sm" />
            ) : (
              <div className="flex items-center justify-center py-16 text-sm text-slate-500">No se puede previsualizar este archivo.</div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

function OrderCard({ order, onSelect }: { order: Order; onSelect: () => void }) {
  const needsUpload = canUp(order)

  return (
    <button onClick={onSelect} className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 text-left">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">#{order.id.slice(0, 8)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{fmt(order.createdAtUtc)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${stClass(order.status)}`}>{stLabel(order.status)}</span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          <span className="font-medium">Forma:</span> {poLabel(order.paymentOption)}
          <span className="mx-1.5">·</span>
          <span className="font-medium">Pago:</span> <span className={`${pmClass(order.paymentStatus)}`}>{pmLabel(order)}</span>
        </div>
        <p className="text-base font-black text-slate-900 dark:text-white">{ARS(order.totalAmount)}</p>
      </div>

      {needsUpload && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 dark:bg-amber-950/20">
          <span className="text-sm">⏳</span>
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Cargá comprobante de {pfText(order)}</span>
        </div>
      )}
      {order.hasPendingPaymentProof && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 dark:bg-blue-950/20">
          <span className="text-sm">📎</span>
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Comprobante enviado — esperando revisión</span>
        </div>
      )}
    </button>
  )
}

export default function StudentClothingOrders() { return <ToastProvider><OrdersInner /></ToastProvider> }
