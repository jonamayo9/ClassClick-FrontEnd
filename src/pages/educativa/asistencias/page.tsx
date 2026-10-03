import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { Pagination } from '@/components/ui/pagination'
import { DonutChart } from '@/pages/admin/dashboard/components/DonutChart'
import type { DonutSegment } from '@/types/dashboard'
import {
  EducativaAttendanceReportPage, EducativaAttendanceReportRow, EducativaAttendanceDetailRow,
  EducativaTraining, EducativaCommission, EducativaDocente, EducativaCommissionClass,
} from '../types'

function today(): string { return new Date().toISOString().slice(0, 10) }
function daysAgo(n: number): string { return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10) }

export function EducativaAsistenciasPage() {
  const { companySlug } = useParams<{ companySlug: string }>()
  const slug = companySlug ?? ''

  const [from, setFrom] = useState(daysAgo(6))
  const [to, setTo] = useState(today())
  const [trainingId, setTrainingId] = useState('')
  const [commissionId, setCommissionId] = useState('')
  const [docenteId, setDocenteId] = useState('')
  const [classId, setClassId] = useState('')
const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [detail, setDetail] = useState<EducativaAttendanceReportRow | null>(null)
  const [detailRows, setDetailRows] = useState<EducativaAttendanceDetailRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const trainingsQ = useQuery({ queryKey: ['educativa-trainings', slug], queryFn: () => apiService.get<EducativaTraining[]>(`/api/educativa/${slug}/trainings`), enabled: !!slug, retry: false })
  const commissionsQ = useQuery({ queryKey: ['educativa-commissions', slug], queryFn: () => apiService.get<EducativaCommission[]>(`/api/educativa/${slug}/commissions`), enabled: !!slug, retry: false })
  const docentesQ = useQuery({ queryKey: ['educativa-docentes', slug], queryFn: () => apiService.get<EducativaDocente[]>(`/api/educativa/${slug}/docentes`), enabled: !!slug, retry: false })
  const classesQ = useQuery({ queryKey: ['educativa-attendance-classes', slug], queryFn: () => apiService.get<EducativaCommissionClass[]>(`/api/educativa/${slug}/attendance/classes`), enabled: !!slug, retry: false })

  const params = new URLSearchParams({ page: String(page), pageSize: '20' })
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (trainingId) params.set('trainingId', trainingId)
  if (commissionId) params.set('commissionId', commissionId)
  if (docenteId) params.set('docenteId', docenteId)
  if (classId) params.set('classId', classId)
  if (status) params.set('status', status)

  const query = useQuery({
    queryKey: ['educativa-attendance-report', slug, from, to, trainingId, commissionId, docenteId, classId, status, page],
    queryFn: () => apiService.get<EducativaAttendanceReportPage>(`/api/educativa/${slug}/attendance/report?${params}`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })

  const report = query.data
  const summary = report?.summary

  const pieData: DonutSegment[] = summary ? [
    { label: 'Presentes', count: summary.presentes, percentage: summary.totalAlumnos > 0 ? (summary.presentes * 100) / summary.totalAlumnos : 0, color: '#22c55e' },
    { label: 'Ausentes', count: summary.ausentes, percentage: summary.totalAlumnos > 0 ? (summary.ausentes * 100) / summary.totalAlumnos : 0, color: '#ef4444' },
    { label: 'Tarde', count: summary.tardes, percentage: summary.totalAlumnos > 0 ? (summary.tardes * 100) / summary.totalAlumnos : 0, color: '#f59e0b' },
    { label: 'Justificados', count: summary.justificados, percentage: summary.totalAlumnos > 0 ? (summary.justificados * 100) / summary.totalAlumnos : 0, color: '#3b82f6' },
    { label: 'Sin registrar', count: summary.sinRegistrar, percentage: summary.totalAlumnos > 0 ? (summary.sinRegistrar * 100) / summary.totalAlumnos : 0, color: '#94a3b8' },
  ] : []

  async function openDetail(row: EducativaAttendanceReportRow) {
    setDetail(row)
    setDetailLoading(true)
    setDetailRows([])
    try {
      const rows = await apiService.get<EducativaAttendanceDetailRow[]>(
        `/api/educativa/${slug}/attendance/report/detail?commissionId=${row.commissionId}&classId=${row.commissionClassId}&date=${row.date}`,
      )
      setDetailRows(rows)
    } catch {
      setDetailRows([])
    } finally {
      setDetailLoading(false)
    }
  }

  function download(url: string, filename: string) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }

  async function exportFile(format: 'xlsx' | 'pdf') {
    const p = new URLSearchParams()
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    if (trainingId) p.set('trainingId', trainingId)
    if (commissionId) p.set('commissionId', commissionId)
    if (docenteId) p.set('docenteId', docenteId)
    if (classId) p.set('classId', classId)
    if (status) p.set('status', status)
    const blob = await apiService.getBlob(`/api/educativa/${slug}/attendance/report/export?format=${format}&${p}`)
    download(URL.createObjectURL(blob), format === 'pdf' ? 'reporte-asistencias-educativa.pdf' : 'reporte-asistencias-educativa.xlsx')
  }

  const items = report?.items ?? []
  const secondaryActiveCount = [trainingId, commissionId, docenteId, classId, status].filter(Boolean).length

  const resetFilters = () => {
    setTrainingId(''); setCommissionId(''); setDocenteId(''); setClassId(''); setStatus(''); setPage(1)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
<div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Educativa · Asistencia</p>
            <h1 className="mt-1 text-xl font-black sm:text-2xl">Asistencias</h1>
            <p className="mt-1 text-sm text-blue-200">Reporte por comisión, clase recurrente y fecha real.</p>
          </div>
        </div>
      </div>

<div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-slate-500 dark:text-slate-400">Desde</label>
        <DatePicker className="max-w-[150px]" value={from} onChange={(v) => { setFrom(v); setPage(1) }} />
        <label className="text-xs text-slate-500 dark:text-slate-400">Hasta</label>
        <DatePicker className="max-w-[150px]" value={to} onChange={(v) => { setTo(v); setPage(1) }} />
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
            <Select value={docenteId} onChange={(e) => { setDocenteId(e.target.value); setPage(1) }}>
              <option value="">Todos los docentes</option>
              {(docentesQ.data ?? []).map((d) => <option key={d.userId} value={d.userId}>{d.fullName}</option>)}
            </Select>
            <Select value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1) }}>
              <option value="">Todos los horarios</option>
              {(classesQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.commissionName} · {c.dayLabel} {c.timeLabel}</option>)}
            </Select>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
              <option value="">Todos los estados</option>
              <option value="Presente">Presente</option>
              <option value="Ausente">Ausente</option>
              <option value="Tarde">Tarde</option>
              <option value="Justificado">Justificado</option>
            </Select>
          </div>
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={resetFilters}>Limpiar filtros</Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
<Button variant="outline" size="sm" onClick={() => exportFile('xlsx')}>⬇ Exportar Excel</Button>
        <Button variant="outline" size="sm" onClick={() => exportFile('pdf')}>⬇ Exportar PDF</Button>
        <span className="text-xs text-slate-400">Se exporta el conjunto completo filtrado (no solo la página).</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <DonutChart data={pieData} title="Resumen del período" centerLabel="registros" loading={query.isLoading} />
        </div>
        <div className="lg:col-span-2">
          <Card className="overflow-x-auto scrollbar-hide p-0">
            {query.isLoading && <div className="flex justify-center py-10 text-slate-400"><Spinner /></div>}
            {!query.isLoading && items.length === 0 && (
              <EmptyState icon="🗓️" title="Sin datos" description="No hay asistencias para el período y filtros seleccionados." />
            )}
            {!query.isLoading && items.length > 0 && (
<table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="px-4 py-3">Formación / Comisión</th>
                    <th className="px-4 py-3">Docente</th>
                    <th className="px-4 py-3">Clase</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">P</th>
                    <th className="px-4 py-3">A</th>
                    <th className="px-4 py-3">T</th>
                    <th className="px-4 py-3">J</th>
                    <th className="px-4 py-3">SR</th>
                  </tr>
                </thead>
<tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {items.map((r) => (
                    <tr key={`${r.commissionClassId}-${r.date}`} className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30" onClick={() => openDetail(r)}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{r.commissionName}</p>
                        <p className="text-xs text-slate-400">{r.trainingName}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{r.docenteName || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{r.dayLabel} {r.timeLabel}</td>
                      <td className="px-4 py-3 text-slate-500">{r.date}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{r.totalAlumnos}</td>
                      <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">{r.presentes}</td>
                      <td className="px-4 py-3 text-red-500">{r.ausentes}</td>
                      <td className="px-4 py-3 text-amber-500">{r.tardes}</td>
                      <td className="px-4 py-3 text-blue-500">{r.justificados}</td>
                      <td className="px-4 py-3 text-slate-400">{r.sinRegistrar}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          {!query.isLoading && items.length > 0 && (
            <div className="mt-3">
              <Pagination page={page} pageSize={20} totalCount={report?.total ?? 0} onPageChange={setPage} />
            </div>
          )}
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} className="sm:max-w-2xl"
        title={`Detalle · ${detail?.commissionName ?? ''} · ${detail?.dayLabel ?? ''} ${detail?.timeLabel ?? ''} · ${detail?.date ?? ''}`}>
        <div className="space-y-4 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="success">Presentes {detail?.presentes}</Badge>
            <Badge variant="danger">Ausentes {detail?.ausentes}</Badge>
            <Badge variant="warning">Tarde {detail?.tardes}</Badge>
            <Badge variant="info">Justificados {detail?.justificados}</Badge>
            <Badge variant="default">Sin registrar {detail?.sinRegistrar}</Badge>
          </div>
          {detailLoading && <div className="flex justify-center py-8 text-slate-400"><Spinner /></div>}
          {!detailLoading && (
            <div className="overflow-x-auto scrollbar-hide">
<table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="px-3 py-2">Alumno</th>
                    <th className="px-3 py-2">Comisión</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Observación</th>
                  </tr>
                </thead>
<tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {detailRows.map((d) => (
                    <tr key={d.commissionEnrollmentId}>
                      <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{d.studentName}</td>
                      <td className="px-3 py-2 text-slate-500">{d.commissionName}</td>
                      <td className="px-3 py-2">
                        {d.status
                          ? <Badge variant={d.status === 'Presente' ? 'success' : d.status === 'Ausente' ? 'danger' : d.status === 'Tarde' ? 'warning' : 'info'}>{d.status}</Badge>
                          : <Badge variant="default">Sin registrar</Badge>}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{d.observation || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

