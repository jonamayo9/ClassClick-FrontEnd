import { useState, useMemo } from 'react'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { BackButton } from '@/components/ui/back-button'
import { PageHero } from '@/components/ui/page-hero'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { DateRangePicker } from '@/components/ui/date-picker'
import { money, formatDateTime, orderStatusLabel, paymentStatusLabel, paymentMethodLabel, orderSortPriority, generateMonthsBack, OrderStatus, PaymentStatus } from '../hooks'
import { useOrders, useOrderProofs, useApproveProof, useRejectProof, useDeliverOrder, useRejectOrder } from './hooks'

function OrdersPageInner() {
  const toast = useToast()
  const approveProof = useApproveProof()
  const rejectProof = useRejectProof()
  const deliverOrder = useDeliverOrder()
  const rejectOrder = useRejectOrder()

  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [periodOptions] = useState(() => generateMonthsBack(12))

  const filters = useMemo(() => {
    if (fromDate || toDate) {
      return { from: fromDate || undefined, to: toDate || undefined, status: filterStatus || undefined, paymentStatus: filterPayment || undefined }
    }
    return { period: period || undefined, status: filterStatus || undefined, paymentStatus: filterPayment || undefined }
  }, [period, fromDate, toDate, filterStatus, filterPayment])

  const { data: orders = [], isLoading } = useOrders(filters)

  const sorted = useMemo(() => {
    const text = search.trim().toLowerCase()
    return [...orders]
      .filter((o) => {
        if (!text) return true
        return o.studentName.toLowerCase().includes(text) || o.id.includes(text) || (o.studentDni?.includes(text))
      })
      .sort((a, b) => {
        const pa = orderSortPriority(a)
        const pb = orderSortPriority(b)
        if (pa !== pb) return pa - pb
        return new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime()
      })
  }, [orders, search])

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((o) => o.status === OrderStatus.Pending).length,
    totalAmount: orders.reduce((sum, o) => sum + o.totalAmount, 0),
  }), [orders])

  const [detailOrderId, setDetailOrderId] = useState<string | null>(null)
  const detailOrder = useMemo(() => orders.find((o) => o.id === detailOrderId) ?? null, [orders, detailOrderId])
  const { data: detailProofs = [] } = useOrderProofs(detailOrderId)

  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const [proofAction, setProofAction] = useState<{ proofId: string; type: 'approve' | 'reject' } | null>(null)
  const [proofNote, setProofNote] = useState('')

  function resetPeriod() { setPeriod(''); setFromDate(''); setToDate('') }

  async function handleProofAction() {
    if (!proofAction) return
    try {
      if (proofAction.type === 'approve') {
        await approveProof.mutateAsync({ proofId: proofAction.proofId, reviewNote: proofNote })
        toast('Comprobante aprobado.')
      } else {
        await rejectProof.mutateAsync({ proofId: proofAction.proofId, reviewNote: proofNote })
        toast('Comprobante rechazado.')
      }
      setProofAction(null)
      setProofNote('')
    } catch {
      toast('Error al procesar el comprobante.', 'error')
    }
  }

  async function handleDeliver(orderId: string) {
    try {
      await deliverOrder.mutateAsync(orderId)
      toast('Pedido marcado como entregado.')
      setDetailOrderId(null)
    } catch {
      toast('Error al marcar como entregado.', 'error')
    }
  }

  async function handleRejectOrder() {
    if (!rejectOrderId) return
    try {
      await rejectOrder.mutateAsync({ orderId: rejectOrderId, reason: rejectReason })
      toast('Pedido rechazado.')
      setRejectOrderId(null)
      setRejectReason('')
      setDetailOrderId(null)
    } catch {
      toast('Error al rechazar pedido.', 'error')
    }
  }

  function exportCSV() {
    const rows = sorted.flatMap((o) =>
      (o.items ?? []).map((item) => ({
        Pedido: o.id, Alumno: o.studentName, DNI: o.studentDni ?? '',
        Estado: orderStatusLabel(o.status).label, Pago: paymentStatusLabel(o.paymentStatus).label,
        Método: paymentMethodLabel(o.paymentMethod),
        Producto: item.productName, Variante: item.variantName ?? '',
        Cantidad: item.quantity, Precio: item.unitPrice, Subtotal: item.subtotal,
        Personalización: item.personalizationText ?? '',
      }))
    )
    if (rows.length === 0) { toast('Sin datos para exportar.', 'error'); return }
    const headers = Object.keys(rows[0])
    const csv = [headers.join(';'), ...rows.map((r) => headers.map((h) => `"${String(r[h as keyof typeof r]).replace(/"/g, '""')}"`).join(';'))].join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `pedidos_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function exportPDF() {
    const w = window.open('', '_blank')
    if (!w) { toast('Permití ventanas emergentes para exportar PDF.', 'error'); return }
    w.document.write(`<html><head><title>Pedidos - ClassClick</title><style>body{font-family:sans-serif;margin:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;text-align:left;font-size:12px}th{background:#f5f5f5}h1{font-size:18px}.fecha{color:#666;font-size:11px}</style></head><body>`)
    w.document.write(`<h1>Pedidos - ClassClick</h1><p class="fecha">${new Date().toLocaleDateString('es-AR')}</p>`)
    w.document.write(`<table><thead><tr><th>#</th><th>Alumno</th><th>Estado</th><th>Pago</th><th>Productos</th><th>Total</th></tr></thead><tbody>`)
    sorted.forEach((o) => {
      const items = (o.items ?? []).map((i) => `${i.productName}${i.variantName ? ' - ' + i.variantName : ''} x${i.quantity}`).join('<br>')
      w.document.write(`<tr><td>${o.id.slice(0, 8)}</td><td>${o.studentName}</td><td>${orderStatusLabel(o.status).label}</td><td>${paymentStatusLabel(o.paymentStatus).label}</td><td>${items}</td><td>${money(o.totalAmount)}</td></tr>`)
    })
    w.document.write('</tbody></table></body></html>')
    w.document.close(); w.print()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <BackButton to="/admin/clothing" label="Volver a Indumentaria" />
      <PageHero
        label="Pedidos"
        title="Pedidos de indumentaria"
        description="Revisá pedidos, comprobantes, aprobá pagos y gestioná entregas."
        stats={[
          { label: 'Total', value: stats.total },
          { label: 'Pendientes', value: stats.pending },
          { label: 'Total $', value: money(stats.totalAmount) },
        ]}
      />

      <Card className="p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Pedidos</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{sorted.length} resultados</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>Exportar CSV</Button>
            <Button variant="outline" size="sm" onClick={exportPDF}>Exportar PDF</Button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar alumno o DNI" className="w-full sm:w-60" />
          <div className="flex flex-wrap gap-2">
            <Select value={period} onChange={(e) => { resetPeriod(); setPeriod(e.target.value) }}>
              <option value="">Período</option>
              {periodOptions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
            <DateRangePicker
              from={fromDate}
              to={toDate}
              onChange={(range) => { resetPeriod(); setFromDate(range.from); setToDate(range.to) }}
              className="sm:w-72"
            />
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="1">Pendiente</option>
              <option value="2">Aprobado</option>
              <option value="3">Rechazado</option>
              <option value="4">Entregado</option>
              <option value="5">Cancelado</option>
            </Select>
            <Select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}>
              <option value="">Todos los pagos</option>
              <option value="0">Sin pago</option>
              <option value="1">Seña pendiente</option>
              <option value="2">Seña pagada</option>
              <option value="3">Pago pendiente</option>
              <option value="4">Pago completo</option>
              <option value="5">Rechazado</option>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Spinner className="h-6 w-6 text-violet-600" /></div>
        ) : sorted.length === 0 ? (
          <EmptyState icon="🛒" title="Sin pedidos" description="No hay pedidos para los filtros actuales." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Alumno</th>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Pago</th>
                  <th className="px-4 py-3">Importes</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((o, idx) => {
                  const bg = idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'
                  const os = orderStatusLabel(o.status)
                  const ps = paymentStatusLabel(o.paymentStatus)
                  return (
                    <tr key={o.id} className={bg}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{o.studentName}</p>
                        {o.studentDni && <p className="text-xs text-slate-400">{o.studentDni}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">#{o.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={ps.variant}>{ps.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{money(o.totalAmount)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={os.variant}>{os.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => setDetailOrderId(o.id)}>Ver</Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {detailOrder && (
        <Modal open={!!detailOrder} onClose={() => setDetailOrderId(null)} title={`Pedido #${detailOrder.id.slice(0, 8)}`} description={`${detailOrder.studentName} - ${formatDateTime(detailOrder.createdAtUtc)}`} className="sm:max-w-3xl">
          <div className="space-y-5 p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DetailTile label="Estado" value={orderStatusLabel(detailOrder.status).label} />
              <DetailTile label="Pago" value={paymentStatusLabel(detailOrder.paymentStatus).label} />
              <DetailTile label="Método" value={paymentMethodLabel(detailOrder.paymentMethod)} />
              <DetailTile label="Total" value={money(detailOrder.totalAmount)} />
            </div>

            {detailOrder.items && detailOrder.items.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-widest">Productos</p>
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        <th className="px-3 py-2">Producto</th>
                        <th className="px-3 py-2">Variante</th>
                        <th className="px-3 py-2 text-center">Cant.</th>
                        <th className="px-3 py-2 text-right">Precio</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {detailOrder.items.map((item, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'}>
                          <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                            {item.productName}
                            {item.personalizationText && <span className="block text-xs text-slate-400">{item.personalizationLabel}: {item.personalizationText}</span>}
                          </td>
                          <td className="px-3 py-2 text-slate-500">{item.variantName ?? '-'}</td>
                          <td className="px-3 py-2 text-center text-slate-700 dark:text-slate-300">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">{money(item.unitPrice)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-white">{money(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-widest">Comprobantes de pago</p>
              {detailProofs.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">Sin comprobantes</p>
              ) : (
                <div className="space-y-2">
                  {detailProofs.map((proof) => (
                    <div key={proof.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/30">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {proof.type === 1 ? 'Seña' : 'Pago total'}
                        </span>
                        <Badge variant={proof.status === 1 ? 'warning' : proof.status === 2 ? 'success' : 'danger'}>
                          {proof.status === 1 ? 'En revisión' : proof.status === 2 ? 'Aprobado' : 'Rechazado'}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        {proof.fileUrl && (
                          <Button variant="outline" size="sm" onClick={() => window.open(proof.fileUrl, '_blank')}>
                            Ver comprobante
                          </Button>
                        )}
                        {proof.status === 1 && (
                          <>
                            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setProofAction({ proofId: proof.id, type: 'approve' })}>
                              Aprobar
                            </Button>
                            <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => setProofAction({ proofId: proof.id, type: 'reject' })}>
                              Rechazar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {detailOrder.status === OrderStatus.Approved && detailOrder.paymentStatus === PaymentStatus.FullPaid && (
              <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700" loading={deliverOrder.isPending} onClick={() => handleDeliver(detailOrder.id)}>
                Marcar como entregado
              </Button>
            )}

            {detailOrder.status === OrderStatus.Pending && (
              <Button className="w-full bg-rose-600 text-white hover:bg-rose-700" onClick={() => { setRejectOrderId(detailOrder.id); setRejectReason('') }}>
                Rechazar pedido
              </Button>
            )}

            {detailOrder.status === OrderStatus.Rejected && detailOrder.rejectedAtUtc && (
              <p className="text-xs text-slate-400">Rechazado el {formatDateTime(detailOrder.rejectedAtUtc)}</p>
            )}
            {detailOrder.status === OrderStatus.Delivered && detailOrder.deliveredAtUtc && (
              <p className="text-xs text-slate-400">Entregado el {formatDateTime(detailOrder.deliveredAtUtc)}</p>
            )}
          </div>
        </Modal>
      )}

      {proofAction && (
        <Modal
          open={!!proofAction}
          onClose={() => { setProofAction(null); setProofNote('') }}
          title={proofAction.type === 'approve' ? 'Aprobar comprobante' : 'Rechazar comprobante'}
        >
          <div className="space-y-4 p-5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nota (opcional)</label>
              <Textarea value={proofNote} onChange={(e) => setProofNote(e.target.value)} rows={3} placeholder="Comentario para el alumno..." />
            </div>
            <div className="flex gap-3">
              <Button
                loading={approveProof.isPending || rejectProof.isPending}
                className={proofAction.type === 'approve' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-rose-600 text-white hover:bg-rose-700'}
                onClick={handleProofAction}
              >
                {proofAction.type === 'approve' ? 'Aprobar' : 'Rechazar'}
              </Button>
              <Button variant="outline" onClick={() => { setProofAction(null); setProofNote('') }}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}

      <Modal
        open={!!rejectOrderId}
        onClose={() => setRejectOrderId(null)}
        title="Rechazar pedido"
        description="Indicá el motivo del rechazo."
      >
        <div className="space-y-4 p-5">
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Motivo del rechazo..." />
          <div className="flex gap-3">
            <Button loading={rejectOrder.isPending} className="bg-rose-600 text-white hover:bg-rose-700" onClick={handleRejectOrder}>Rechazar pedido</Button>
            <Button variant="outline" onClick={() => setRejectOrderId(null)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

export default function OrdersPage() {
  return (
    <ToastProvider>
      <OrdersPageInner />
    </ToastProvider>
  )
}
