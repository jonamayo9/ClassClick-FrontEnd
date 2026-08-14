import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService, getApiError } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { SelectField } from '@/components/ui/select-field'
import { ChargeItem } from './charge-item'
import type { DelegateCharge } from './types'

export default function DelegatePaymentsPage() {
  const slug = useAuth((s) => s.activeCompanySlug) ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  const [year, setYear] = useState(() => String(new Date().getFullYear()))
  const [month, setMonth] = useState(() => String(new Date().getMonth() + 1))
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [status, setStatus] = useState('')
  const [chargeType, setChargeType] = useState('')
  const [search, setSearch] = useState('')
  const [courseId, setCourseId] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null)

  const secondaryActiveCount = [courseId, status, chargeType].filter(Boolean).length

  const { data: courses = [] } = useQuery({
    queryKey: ['delegate-courses', slug],
    queryFn: () => apiService.get<{ id: string; name: string }[]>(`/api/delegate/${slug}/courses`),
    enabled: !!slug,
  })

  const { data: methods } = useQuery({
    queryKey: ['delegate-payment-methods', slug],
    queryFn: () => apiService.get<{ transferEnabled: boolean }>(`/api/delegate/${slug}/payments/methods`),
    enabled: !!slug,
  })
  const transferEnabled = methods?.transferEnabled ?? false

  const { data: chargeTypes = [] } = useQuery({
    queryKey: ['delegate-charge-types', slug],
    queryFn: () => apiService.get<{ id: string; name: string }[]>(`/api/delegate/${slug}/payments/charge-types`),
    enabled: !!slug,
  })

  const { data: charges = [], isLoading } = useQuery({
    queryKey: ['delegate-charges', slug, year, month, status, chargeType, courseId, search],
    queryFn: () => {
      const p = new URLSearchParams()
      if (year) p.set('year', year)
      if (month) p.set('month', month)
      if (status) p.set('status', status)
      if (chargeType) p.set('chargeTypeId', chargeType)
      if (courseId) p.set('courseId', courseId)
      if (search.trim()) p.set('search', search.trim())
      const q = p.toString()
      return apiService.get<DelegateCharge[]>(`/api/delegate/${slug}/payments/charges${q ? `?${q}` : ''}`)
    },
    enabled: !!slug,
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['delegate-charges'] })

  async function runExport(format: 'pdf' | 'xlsx') {
    if (exporting) return
    if (charges.length === 0) {
      toast('No hay pagos para exportar con los filtros seleccionados.', 'error')
      setExportOpen(false)
      return
    }
    setExporting(format)
    setExportOpen(false)
    try {
      const p = new URLSearchParams()
      if (year) p.set('year', year)
      if (month) p.set('month', month)
      if (courseId) p.set('courseId', courseId)
      if (status) p.set('status', status)
      if (chargeType) p.set('chargeTypeId', chargeType)
      if (search.trim()) p.set('search', search.trim())
      p.set('format', format)
      const blob = await apiService.getBlob(`/api/delegate/${slug}/payments/charges/export?${p.toString()}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Pagos_${year}-${month.padStart(2, '0')}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast(getApiError(err), 'error')
    } finally {
      setExporting(null)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i)
  const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: new Date(0, i).toLocaleString('es-AR', { month: 'long' }) }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black sm:text-2xl">Pagos</h1>
        <p className="mt-1 text-sm text-slate-500">Cuotas de los alumnos de tus cursos asignados. Solo lectura.</p>
      </div>

      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
        <div className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:gap-2">
          <div className="sm:w-32">
            <SelectField value={month} onValueChange={setMonth} placeholder="Mes" aria-label="Mes"
              options={[{ value: '', label: 'Todos los meses' }, ...months]} />
          </div>
          <div className="sm:w-28">
            <SelectField value={year} onValueChange={setYear} placeholder="Año" aria-label="Año"
              options={[{ value: '', label: 'Todos los años' }, ...years.map((y) => ({ value: String(y), label: String(y) }))]} />
          </div>
        </div>
        <Input placeholder="Buscar alumno..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:flex-1 sm:min-w-[160px] sm:max-w-[220px]" />
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <Button variant="outline" size="sm" className="inline-flex items-center gap-1.5" onClick={() => setFiltersOpen((v) => !v)}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros{secondaryActiveCount > 0 ? ` (${secondaryActiveCount})` : ''}
          </Button>
          <div className="relative">
            <Button variant="outline" size="sm" disabled={exporting !== null}
              className="inline-flex items-center gap-1.5" onClick={() => setExportOpen((v) => !v)}>
              {exporting ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              Exportar
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 z-40 mt-1 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <button onClick={() => runExport('pdf')} disabled={exporting !== null}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">
                  PDF
                </button>
                <button onClick={() => runExport('xlsx')} disabled={exporting !== null}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">
                  Excel
                </button>
              </div>
            </>
          )}
          </div>
        </div>
      </div>

      {filtersOpen && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="grid gap-2 sm:grid-cols-3">
            <SelectField value={courseId} onValueChange={setCourseId} placeholder="Curso" aria-label="Curso"
              options={[{ value: '', label: 'Todos los cursos' }, ...courses.map((c) => ({ value: c.id, label: c.name }))]} />
            <SelectField value={status} onValueChange={setStatus} placeholder="Estado" aria-label="Estado"
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'Pending', label: 'Pendiente' },
                { value: 'Paid', label: 'Pagada' },
                { value: 'Overdue', label: 'Vencida' },
                { value: 'Cancelled', label: 'Cancelada' },
              ]} />
            <SelectField value={chargeType} onValueChange={setChargeType} placeholder="Tipo" aria-label="Tipo de cuota"
              options={[{ value: '', label: 'Todos los tipos' }, ...chargeTypes.map((t) => ({ value: t.id, label: t.name }))]} />
          </div>
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setCourseId(''); setStatus(''); setChargeType('') }}>
              Limpiar filtros
            </Button>
          </div>
        </div>
      )}

      {!transferEnabled && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          La transferencia no está habilitada en esta empresa: las cuotas se ven normalmente, pero no se puede subir comprobante.
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-blue-600" /></div>
      ) : charges.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">No hay cuotas para estos filtros.</Card>
      ) : (
        <div className="space-y-2">
          {charges.map((c) => (
            <ChargeItem key={c.monthlyChargeId} slug={slug} charge={c} transferEnabled={transferEnabled} onUploaded={refresh} />
          ))}
        </div>
      )}
    </div>
  )
}
