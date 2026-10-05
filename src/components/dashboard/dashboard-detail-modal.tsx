import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiService, getApiError } from '@/lib/api'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/select-field'
import { Pagination } from '@/components/ui/pagination'
import { useToast } from '@/components/ui/toast'
import { Search, FileText, FileSpreadsheet, Inbox } from 'lucide-react'

export interface DetailColumn<T = Record<string, unknown>> {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  className?: string
  render: (row: T) => React.ReactNode
}

export interface DetailFilter {
  kind: 'search' | 'select'
  param: string
  label: string
  options?: { value: string; label: string }[]
  placeholder?: string
  className?: string
}

export interface GeneralStateFactor {
  name: string
  hasData: boolean
  value: number
  weight: number
  effectiveWeight: number
  contribution: number
  status: 'ok' | 'warning' | 'danger'
}

export interface GeneralStatePenalty {
  type: string
  description: string
  count: number
  points: number
  maxPoints: number
}

export interface GeneralStateData {
  score: number
  estado: string
  severity: 'ok' | 'warning' | 'danger' | 'insufficient'
  hasData: boolean
  description: string[]
  factors: GeneralStateFactor[]
  penalties: GeneralStatePenalty[]
}

export interface DashboardDetailSpec {
  title: string
  value: string | number
  valueLabel?: string
  periodLabel?: string
  endpoint: string
  exportBase?: string
  defaultParams?: Record<string, string>
  filters?: DetailFilter[]
  columns: DetailColumn[]
  pageSize?: number
  emptyText?: string
  kind?: 'table' | 'general-state'
  generalState?: GeneralStateData
  actions?: { label: string; spec: DashboardDetailSpec }[]
  onOpenDetail?: (spec: DashboardDetailSpec) => void
}

interface DashboardDetailModalProps {
  open: boolean
  onClose: () => void
  spec: DashboardDetailSpec | null
}

interface PageShape<T> {
  total: number
  page: number
  pageSize: number
  items: T[]
}

function buildUrl(base: string, params: Record<string, string>): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== '' && v !== undefined && v !== null) qs.set(k, v)
  }
  const s = qs.toString()
  return base + (base.includes('?') ? '&' : '?') + s
}

export function DashboardDetailModal({ open, onClose, spec }: DashboardDetailModalProps) {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null)

  useEffect(() => {
    if (open) {
      setSearch('')
      setFilterValues({ ...(spec?.defaultParams ?? {}) })
      setPage(1)
    }
  }, [open, spec?.endpoint, spec?.defaultParams])

  const allFilters = useMemo(() => {
    const merged: Record<string, string> = { ...(spec?.defaultParams ?? {}) }
    for (const [k, v] of Object.entries(filterValues)) {
      if (v) merged[k] = v
    }
    if (search) merged.search = search
    return merged
  }, [spec?.defaultParams, filterValues, search])

  const pageParams = useMemo(
    () => ({ ...allFilters, page: String(page), pageSize: String(spec?.pageSize ?? 25) }),
    [allFilters, page, spec?.pageSize],
  )

  const queryKey = useMemo(
    () => ['dashboard-detail', spec?.endpoint, pageParams, open],
    [spec?.endpoint, pageParams, open],
  )

  const isGeneralState = spec?.kind === 'general-state'

  const detailQuery = useQuery({
    queryKey,
    queryFn: () => apiService.get<PageShape<Record<string, unknown>>>(buildUrl(spec!.endpoint, pageParams)),
    enabled: !!open && !!spec && !isGeneralState,
    retry: false,
    // Reutiliza el dato previo SOLO cuando el endpoint es el mismo: si se abre un modal
    // distinto, el placeholder de otro endpoint traería filas con OTRA forma y las
    // columnas del nuevo spec romperían (p. ej. money(undefined)).
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey?.[1] === spec?.endpoint ? prev : undefined),
  })

  const changeFilter = useCallback((param: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [param]: value }))
    setPage(1)
  }, [])

  async function handleExport(format: 'xlsx' | 'pdf') {
    if (!spec) return
    setExporting(format)
    try {
      const base = spec.exportBase ?? spec.endpoint
      const blob = await apiService.getBlob(buildUrl(base, { ...allFilters, format }))
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${spec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast('Exportación generada.')
    } catch (err) {
      toast(getApiError(err) || 'No se pudo exportar.', 'error')
    } finally {
      setExporting(null)
    }
  }

  const data = detailQuery.data
  const items = data?.items ?? []

  const activeFilterChips = useMemo(() => {
    const chips: string[] = []
    if (spec?.periodLabel) chips.push(spec.periodLabel)
    if (search) chips.push(`Búsqueda: ${search}`)
    for (const f of spec?.filters ?? []) {
      const v = filterValues[f.param]
      if (v) {
        const opt = f.options?.find((o) => o.value === v)
        chips.push(`${f.label}: ${opt?.label ?? v}`)
      }
    }
    return chips
  }, [spec, search, filterValues])

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel={spec?.title}
      className="sm:max-w-5xl"
      title={
        <div className="flex flex-wrap items-baseline justify-between gap-2 pr-2">
          <span>{spec?.title}</span>
          <span className="text-base font-black text-blue-600 dark:text-blue-400 sm:text-lg">
            {spec?.value}
            {spec?.valueLabel && <span className="ml-1.5 text-xs font-semibold text-slate-400">{spec.valueLabel}</span>}
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-3 px-5 py-4 sm:px-6">
        {activeFilterChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeFilterChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {!isGeneralState && (
          <div className="flex flex-wrap items-center gap-2">
            {spec?.filters?.some((f) => f.kind === 'search') && (
              <div className="relative min-w-[180px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Buscar alumno..."
                  className="pl-9"
                />
              </div>
            )}
            {spec?.filters?.filter((f) => f.kind === 'select').map((f) => (
              <SelectField
                key={f.param}
                value={filterValues[f.param] ?? ''}
                onValueChange={(v) => changeFilter(f.param, v)}
                placeholder={f.placeholder ?? 'Todos'}
                aria-label={f.label}
                className={f.className ?? 'sm:w-44'}
                options={[{ value: '', label: `Todas las ${f.label.toLowerCase()}s` }, ...(f.options ?? [])]}
              />
            ))}
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" loading={exporting === 'xlsx'} disabled={exporting !== null} onClick={() => handleExport('xlsx')}>
                <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                Excel
              </Button>
              <Button variant="outline" size="sm" loading={exporting === 'pdf'} disabled={exporting !== null} onClick={() => handleExport('pdf')}>
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                PDF
              </Button>
            </div>
          </div>
        )}
        {isGeneralState && (
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" loading={exporting === 'xlsx'} disabled={exporting !== null} onClick={() => handleExport('xlsx')}>
              <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
              Excel
            </Button>
            <Button variant="outline" size="sm" loading={exporting === 'pdf'} disabled={exporting !== null} onClick={() => handleExport('pdf')}>
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              PDF
            </Button>
          </div>
        )}

        {isGeneralState && spec?.generalState ? (
          <GeneralStateBody state={spec.generalState} actions={spec.actions} onOpenDetail={spec.onOpenDetail} />
        ) : detailQuery.isLoading && !detailQuery.data ? (
          <div className="space-y-2 py-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />
            ))}
          </div>
        ) : detailQuery.isError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
            No se pudo cargar el detalle.
          </p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
            <Inbox className="h-8 w-8" aria-hidden="true" />
            <p className="text-sm">{spec?.emptyText ?? 'Sin registros para los filtros seleccionados.'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400 dark:border-slate-700">
                    {spec!.columns.map((col) => (
                      <th key={col.key} className={`px-3 py-2.5 font-bold ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((row, idx) => (
                    <tr key={`${(row as Record<string, unknown>)?.id ?? idx}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      {spec!.columns.map((col) => (
                        <td key={col.key} className={`px-3 py-2.5 align-middle text-slate-700 dark:text-slate-300 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className ?? ''}`}>
                          {col.render(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data?.page ?? 1}
              pageSize={data?.pageSize ?? spec?.pageSize ?? 25}
              totalCount={data?.total ?? 0}
              onPageChange={setPage}
              loading={detailQuery.isLoading}
            />
          </>
        )}
      </div>
    </Modal>
  )
}

const GENERAL_STATE_STYLE: Record<string, { color: string; text: string; bg: string; ring: string }> = {
  ok: { color: '#22c55e', text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/20', ring: 'stroke-emerald-500' },
  warning: { color: '#f59e0b', text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/20', ring: 'stroke-amber-500' },
  danger: { color: '#ef4444', text: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/20', ring: 'stroke-rose-500' },
  insufficient: { color: '#94a3b8', text: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50', ring: 'stroke-slate-400' },
}

const FACTOR_STATUS_STYLE: Record<string, string> = {
  ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

function GeneralStateBody({
  state,
  actions,
  onOpenDetail,
}: {
  state: GeneralStateData
  actions?: { label: string; spec: DashboardDetailSpec }[]
  onOpenDetail?: (spec: DashboardDetailSpec) => void
}) {
  const style = GENERAL_STATE_STYLE[state.severity] ?? GENERAL_STATE_STYLE.insufficient
  const shownFactors = state.factors.filter((f) => f.hasData)
  const hiddenFactors = state.factors.filter((f) => !f.hasData)

  return (
    <div className={`flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 ${style.bg} dark:border-slate-700`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
            <svg className="absolute inset-0 h-20 w-20 -rotate-90" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="32" fill="none" strokeWidth="4" className="text-slate-200 dark:text-slate-600" />
              {state.hasData && (
                <circle cx="36" cy="36" r="32" fill="none" stroke={style.color} strokeWidth="4"
                  strokeDasharray={`${(state.score / 100) * 201} 201`}
                  strokeLinecap="round" />
              )}
            </svg>
            <span className={`text-xl font-black ${style.text}`}>{state.hasData ? state.score : '—'}</span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{state.estado}</p>
            {state.hasData && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Score de salud institucional (0-100)</p>
            )}
          </div>
        </div>
        {state.hasData && state.description.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {state.description.map((s, i) => (
              <span key={i} className="text-slate-600 dark:text-slate-400">{s}</span>
            ))}
          </div>
        )}
      </div>

      {state.hasData && shownFactors.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400 dark:border-slate-700">
                <th className="px-3 py-2 font-bold">Factor</th>
                <th className="px-3 py-2 text-right font-bold">Valor actual</th>
                <th className="px-3 py-2 text-right font-bold">Peso</th>
                <th className="px-3 py-2 text-right font-bold">Peso efectivo</th>
                <th className="px-3 py-2 text-right font-bold">Aporte al score</th>
                <th className="px-3 py-2 text-center font-bold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {shownFactors.map((f) => (
                <tr key={f.name}>
                  <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">{f.name}</td>
                  <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">{f.value.toFixed(0)}%</td>
                  <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400">{f.weight}</td>
                  <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400">{f.effectiveWeight.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">{f.contribution.toFixed(1)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${FACTOR_STATUS_STYLE[f.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {f.status === 'ok' ? 'Bueno' : f.status === 'warning' ? 'Atención' : 'Crítico'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hiddenFactors.length > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Factores sin datos (no participan del score): {hiddenFactors.map((f) => f.name).join(', ')}.
        </p>
      )}

      {state.hasData && state.penalties.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Penalizaciones aplicadas</p>
          <div className="space-y-1.5">
            {state.penalties.map((p) => (
              <div key={p.type} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-700 dark:text-slate-300">{p.description}</span>
                <span className="shrink-0 font-semibold text-rose-600 dark:text-rose-400">-{p.points} puntos</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {actions && actions.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => onOpenDetail?.(a.spec)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}