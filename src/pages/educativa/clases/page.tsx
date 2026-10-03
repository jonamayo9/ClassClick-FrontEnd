import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { EducativaCommissionClass } from '../types'

export function EducativaClasesPage() {
  const { companySlug } = useParams<{ companySlug: string }>()
  const slug = companySlug ?? ''

  const query = useQuery({
    queryKey: ['educativa-classes-global', slug],
    queryFn: () => apiService.get<EducativaCommissionClass[]>(`/api/educativa/${slug}/attendance/classes`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })
  const items = query.data ?? []

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Clases</h1>
        <p className="mt-1 text-sm text-blue-200">Clases recurrentes de todas las comisiones</p>
      </div>

      {query.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner /></div>}
      {!query.isLoading && items.length === 0 && <EmptyState icon="📅" title="Sin clases" description="Agregá horarios recurrentes desde una comisión." />}
      {!query.isLoading && items.length > 0 && (
        <Card className="overflow-x-auto scrollbar-hide p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="px-4 py-3">Día</th>
                <th className="px-4 py-3">Horario</th>
                <th className="px-4 py-3">Comisión</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{c.dayLabel}</td>
                  <td className="px-4 py-3 text-slate-500">{c.timeLabel}</td>
                  <td className="px-4 py-3 text-slate-500">{c.commissionName}</td>
                  <td className="px-4 py-3">{c.isActive ? <Badge variant="success">Activa</Badge> : <Badge variant="default">Inactiva</Badge>}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Link to={`/educativa/${slug}/commissions/${c.commissionId}/classes`}><Button variant="outline" size="sm">Gestionar</Button></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
