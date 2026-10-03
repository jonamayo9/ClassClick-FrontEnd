import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { apiService, getApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { fmtDate, EducativaGraduatePage, EducativaTraining, EducativaCommission } from '../types'

function GraduadosInner() {
  const { companySlug } = useParams<{ companySlug: string }>()
  const slug = companySlug ?? ''
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [trainingId, setTrainingId] = useState('')
  const [commissionId, setCommissionId] = useState('')
  const [from, setFrom] = useState('')
const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const trainingsQ = useQuery({ queryKey: ['educativa-trainings', slug], queryFn: () => apiService.get<EducativaTraining[]>(`/api/educativa/${slug}/trainings`), enabled: !!slug, retry: false })
  const commissionsQ = useQuery({ queryKey: ['educativa-commissions', slug], queryFn: () => apiService.get<EducativaCommission[]>(`/api/educativa/${slug}/commissions`), enabled: !!slug, retry: false })

  const params = new URLSearchParams({ page: String(page), pageSize: '20' })
  if (search) params.set('search', search)
  if (trainingId) params.set('trainingId', trainingId)
  if (commissionId) params.set('commissionId', commissionId)
  if (from) params.set('fromGraduationDate', `${from}T00:00:00Z`)
  if (to) params.set('toGraduationDate', `${to}T23:59:59Z`)

  const query = useQuery({
    queryKey: ['educativa-graduados', slug, search, trainingId, commissionId, from, to, page],
    queryFn: () => apiService.get<EducativaGraduatePage>(`/api/educativa/${slug}/graduates?${params}`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })
const items = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const secondaryActiveCount = [trainingId, commissionId, from, to].filter(Boolean).length

  const resetFilters = () => {
    setSearch(''); setTrainingId(''); setCommissionId(''); setFrom(''); setTo(''); setPage(1)
  }

  async function exportExcel() {
    setExporting(true)
    try {
      const p = new URLSearchParams()
      if (search) p.set('search', search)
      if (trainingId) p.set('trainingId', trainingId)
      if (commissionId) p.set('commissionId', commissionId)
      if (from) p.set('fromGraduationDate', `${from}T00:00:00Z`)
      if (to) p.set('toGraduationDate', `${to}T23:59:59Z`)
      const blob = await apiService.getBlob(`/api/educativa/${slug}/graduates/export?${p}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'graduados-educativa.xlsx'; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast(getApiError(err) || 'Error al exportar.', 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black sm:text-2xl">Graduados</h1>
            <p className="mt-1 text-sm text-blue-200">Egresados con certificado obligatorio emitido</p>
          </div>
          <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50" onClick={exportExcel} loading={exporting}>Exportar Excel</Button>
        </div>
      </div>

<div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-[200px]" placeholder="Buscar nombre, DNI o email..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <Button variant="outline" size="sm" className="inline-flex items-center gap-1.5" onClick={() => setFiltersOpen((v) => !v)}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtros{secondaryActiveCount > 0 ? ` (${secondaryActiveCount})` : ''}
        </Button>
      </div>

      {filtersOpen && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="grid gap-2 sm:grid-cols-3">
            <Select value={trainingId} onChange={(e) => { setTrainingId(e.target.value); setPage(1) }}>
              <option value="">Todas las formaciones</option>
              {(trainingsQ.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <Select value={commissionId} onChange={(e) => { setCommissionId(e.target.value); setPage(1) }}>
              <option value="">Todas las comisiones</option>
              {(commissionsQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker value={from} onChange={(v) => { setFrom(v); setPage(1) }} />
              <DatePicker value={to} onChange={(v) => { setTo(v); setPage(1) }} />
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={resetFilters}>Limpiar filtros</Button>
          </div>
        </div>
      )}

      {query.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner /></div>}
      {!query.isLoading && items.length === 0 && <EmptyState icon="🎓" title="Sin graduados" description="Los graduados se derivan del certificado obligatorio emitido." />}
      {!query.isLoading && items.length > 0 && (
        <>
          <Card className="overflow-x-auto scrollbar-hide p-0">
<table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-4 py-3">Alumno</th>
                  <th className="px-4 py-3">DNI</th>
                  <th className="px-4 py-3">Edad</th>
                  <th className="px-4 py-3">Formación</th>
                  <th className="px-4 py-3">Comisión</th>
                  <th className="px-4 py-3">Graduado</th>
                  <th className="px-4 py-3">Certificado</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {items.map((g) => (
                  <tr key={g.certificateRequestId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{g.fullName}</td>
<td className="px-4 py-3 text-slate-500">{g.dni || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{g.age ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{g.trainingName}</td>
<td className="px-4 py-3 text-slate-500">{g.commissionName}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(g.graduationDate)}</td>
                    <td className="px-4 py-3 text-slate-500">{g.certificateName}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        {g.certificateDownloadUrl && <a href={g.certificateDownloadUrl} target="_blank" rel="noreferrer"><Button variant="outline" size="sm">Descargar</Button></a>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Pagination page={page} pageSize={20} totalCount={total} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

export default function GraduadosPage() { return <ToastProvider><GraduadosInner /></ToastProvider> }
