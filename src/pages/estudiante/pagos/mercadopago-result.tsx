import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface AttemptStatus {
  attemptId: string
  status?: string
  isPaid: boolean
  paymentReference?: string | null
  message?: string
}

export function EstudianteMercadoPagoResultPage() {
  const slug = useAuth((s) => s.activeCompanySlug ?? '')
  const [params] = useSearchParams()
  const attempt = params.get('attempt') ?? ''

  const [validateBusy, setValidateBusy] = useState(false)

  const statusQuery = useQuery({
    queryKey: ['estudiante-mp-attempt', slug, attempt],
    queryFn: () => apiService.get<AttemptStatus>(`/api/educativa/student/${slug}/mercadopago/attempts/${attempt}/status`),
    enabled: !!slug && !!attempt,
    retry: false,
  })

  async function validateStatus() {
    if (!attempt) return
    setValidateBusy(true)
    try {
      await apiService.post(`/api/educativa/student/${slug}/mercadopago/attempts/${attempt}/validate-status`, {})
    } catch {
      // best-effort: el job de reconciliación reintenta
    } finally {
      setValidateBusy(false)
      statusQuery.refetch()
    }
  }

  const s = statusQuery.data

  return (
    <div className="mx-auto max-w-lg space-y-4 p-5">
      <section className="rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 px-5 py-6 text-white shadow-lg sm:px-8">
        <p className="text-xs uppercase tracking-[0.3em] text-violet-200">Portal del alumno</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Resultado del pago</h1>
      </section>

      {statusQuery.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner /></div>}

      {!statusQuery.isLoading && s && (
        <Card className="p-6">
          <div className={`rounded-xl px-4 py-3 text-center text-sm font-bold ${s.isPaid ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'}`}>
            {s.isPaid ? 'Pago aprobado' : 'Pago pendiente de confirmación'}
          </div>
          <p className="mt-3 text-center text-sm text-slate-600 dark:text-slate-300">{s.message ?? 'Estamos confirmando tu pago.'}</p>
          {s.paymentReference && <p className="mt-2 text-center text-xs text-slate-400">Referencia: {s.paymentReference}</p>}

          {!s.isPaid && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={validateStatus} loading={validateBusy}>Consultar nuevamente</Button>
            </div>
          )}
        </Card>
      )}

      {!statusQuery.isLoading && statusQuery.isError && (
        <Card className="p-6 text-center text-sm text-slate-500">No se pudo consultar el estado del pago. Revisá tus pagos en unos minutos.</Card>
      )}

      <div className="text-center">
        <a href="/estudiante/pagos" className="text-sm font-semibold text-violet-600 hover:underline dark:text-violet-400">Volver a Pagos</a>
      </div>
    </div>
  )
}