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
import { cancellationStatusLabel } from '../hooks'
import { useCancellationRequests, useApproveCancellation, useRejectCancellation } from './hooks'

function CancellationsPageInner() {
  const { data: requests = [], isLoading } = useCancellationRequests()
  const approveMutation = useApproveCancellation()
  const rejectMutation = useRejectCancellation()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [actionRequest, setActionRequest] = useState<{ id: string; type: 'approve' | 'reject' } | null>(null)
  const [note, setNote] = useState('')

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase()
    return requests.filter((r) => {
      if (!text) return true
      return r.studentName.toLowerCase().includes(text) || r.orderId.includes(text)
    })
  }, [requests, search])

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 1).length,
  }

  async function handleAction() {
    if (!actionRequest) return
    try {
      if (actionRequest.type === 'approve') {
        await approveMutation.mutateAsync({ id: actionRequest.id, note })
        toast('Cancelación aprobada.')
      } else {
        await rejectMutation.mutateAsync({ id: actionRequest.id, note })
        toast('Cancelación rechazada.')
      }
      setActionRequest(null)
      setNote('')
    } catch {
      toast('Error al procesar la solicitud.', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <BackButton to="/admin/clothing" label="Volver a Indumentaria" />
      <PageHero
        label="Cancelaciones"
        title="Solicitudes de cancelación"
        description="Revisá y procesá las solicitudes de cancelación de pedidos."
        stats={[
          { label: 'Total', value: stats.total },
          { label: 'Pendientes', value: stats.pending },
        ]}
      />

      <Card className="p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Solicitudes</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} resultados</p>
          </div>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar alumno o pedido" className="sm:w-72" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Spinner className="h-6 w-6 text-violet-600" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="❌" title="Sin solicitudes" description="No hay solicitudes de cancelación pendientes." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Alumno</th>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((r, idx) => {
                  const bg = idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'
                  const cs = cancellationStatusLabel(r.status)
                  return (
                    <tr key={r.id} className={bg}>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{r.studentName}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">#{r.orderId.slice(0, 8)}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{r.reason}</td>
                      <td className="px-4 py-3">
                        <Badge variant={cs.variant}>{cs.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === 1 && (
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => { setActionRequest({ id: r.id, type: 'approve' }); setNote('') }}>
                              Aprobar
                            </Button>
                            <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => { setActionRequest({ id: r.id, type: 'reject' }); setNote('') }}>
                              Rechazar
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {actionRequest && (
        <Modal
          open={!!actionRequest}
          onClose={() => { setActionRequest(null); setNote('') }}
          title={actionRequest.type === 'approve' ? 'Aprobar cancelación' : 'Rechazar cancelación'}
          className="sm:max-w-md"
        >
          <div className="space-y-4 p-5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nota para el alumno</label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Opcional..." />
            </div>
            <div className="flex gap-3">
              <Button
                loading={approveMutation.isPending || rejectMutation.isPending}
                className={actionRequest.type === 'approve' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-rose-600 text-white hover:bg-rose-700'}
                onClick={handleAction}
              >
                {actionRequest.type === 'approve' ? 'Aprobar' : 'Rechazar'}
              </Button>
              <Button variant="outline" onClick={() => { setActionRequest(null); setNote('') }}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function CancellationsPage() {
  return (
    <ToastProvider>
      <CancellationsPageInner />
    </ToastProvider>
  )
}
