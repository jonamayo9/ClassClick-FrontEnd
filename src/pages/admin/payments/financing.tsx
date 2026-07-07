import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { formatDisplayName } from '@/lib/text'
import { useAuth } from '@/stores/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

interface AdminFinancingRequest {
  id: string
  studentName: string
  chargeInfo?: {
    year: number
    month: number
    finalAmount: number
    chargeTypeName: string
  }
  requestedInstallments: number
  frequencyName: string
  interestRate: number
  calculatedInterest: number
  totalWithInterest: number
  installmentAmount: number
  status: number
  adminReviewNote?: string
  createdAtUtc: string
  generatedCharges?: {
    id: string
    financingInstallmentNumber: number
    finalAmount: number
    dueDateUtc: string
    status: number
  }[]
}

export function FinancingRequestsTab() {
  const slug = useAuth((state) => state.activeCompanySlug ?? '')
  const queryClient = useQueryClient()
  const toast = useToast()
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['financing-requests', slug],
    queryFn: () => apiService.get<AdminFinancingRequest[]>(
      `/api/admin/${slug}/financing/requests`,
    ),
    enabled: Boolean(slug),
  })

  const review = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      apiService.post(
        `/api/admin/${slug}/financing/requests/${id}/${action}`,
        { reviewNote },
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['financing-requests'] })
      queryClient.invalidateQueries({ queryKey: ['charges'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      setReviewingId(null)
      setReviewNote('')
      toast(
        variables.action === 'approve'
          ? 'Financiación aprobada. La primera cuota ya está disponible.'
          : 'Financiación rechazada.',
      )
    },
    onError: (error: any) => {
      const response = error?.response?.data
      toast(
        typeof response === 'string'
          ? response
          : response?.message || 'No se pudo procesar la solicitud.',
        'error',
      )
    },
  })

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div>
  }

  if (requests.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="font-bold text-slate-800 dark:text-slate-100">Sin solicitudes</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Las solicitudes de financiación enviadas por alumnos aparecerán acá.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Solicitudes de financiación</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Revisá el plan, el interés total y el importe de cada cuota.
          </p>
        </div>
        <Badge variant="warning">
          {requests.filter((request) => request.status === 1).length} pendientes
        </Badge>
      </div>

      {requests.map((request) => (
        <Card key={request.id} className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white">{request.studentName}</h3>
                <StatusBadge status={request.status} />
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {formatDisplayName(request.chargeInfo?.chargeTypeName, 'Cuota')}
                {' · '}
                {request.requestedInstallments} cuotas
                {' · '}
                Frecuencia {request.frequencyName}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Capital {ARS.format(request.chargeInfo?.finalAmount || 0)}
                {' · '}
                Interés {request.interestRate}% ({ARS.format(request.calculatedInterest)})
                {' · '}
                Total {ARS.format(request.totalWithInterest)}
              </p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <p className="text-[10px] font-bold uppercase text-slate-400">Cada cuota</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {ARS.format(request.installmentAmount)}
              </p>
            </div>
          </div>

          {request.adminReviewNote?.trim() && (
            <div className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <span className="font-bold">Nota:</span> {request.adminReviewNote}
            </div>
          )}

          {request.status === 1 && (
            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              {reviewingId === request.id && (
                <Textarea
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Nota para el alumno (opcional)"
                  rows={2}
                  className="mb-3"
                />
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  loading={review.isPending && reviewingId === request.id}
                  className="bg-emerald-600 text-white hover:bg-emerald-500"
                  onClick={() => {
                    if (reviewingId !== request.id) {
                      setReviewingId(request.id)
                      setReviewNote('')
                      return
                    }
                    review.mutate({ id: request.id, action: 'approve' })
                  }}
                >
                  {reviewingId === request.id ? 'Confirmar aprobación' : 'Aprobar'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 dark:text-red-300"
                  onClick={() => {
                    if (reviewingId !== request.id) {
                      setReviewingId(request.id)
                      setReviewNote('')
                      return
                    }
                    review.mutate({ id: request.id, action: 'reject' })
                  }}
                >
                  {reviewingId === request.id ? 'Confirmar rechazo' : 'Rechazar'}
                </Button>
                {reviewingId === request.id && (
                  <Button size="sm" variant="ghost" onClick={() => setReviewingId(null)}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          )}

          {request.generatedCharges && request.generatedCharges.length > 0 && (
            <div className="mt-4 grid gap-2 border-t border-slate-200 pt-4 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-800">
              {request.generatedCharges.map((charge) => (
                <div key={charge.id} className="rounded-lg bg-slate-100 px-3 py-2 text-xs dark:bg-slate-800">
                  <div className="font-bold text-slate-800 dark:text-slate-100">
                    Cuota {charge.financingInstallmentNumber}/{request.requestedInstallments}
                  </div>
                  <div className="mt-0.5 text-slate-500 dark:text-slate-400">
                    Vence {new Date(charge.dueDateUtc).toLocaleDateString('es-AR')}
                    {' · '}
                    {ARS.format(charge.finalAmount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: number }) {
  if (status === 1) return <Badge variant="warning">Pendiente</Badge>
  if (status === 2) return <Badge variant="success">Aprobada</Badge>
  return <Badge variant="danger">Rechazada</Badge>
}
