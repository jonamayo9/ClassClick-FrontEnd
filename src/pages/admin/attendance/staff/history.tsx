import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiService, getApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { SelectField } from '@/components/ui/select-field'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { useToast } from '@/components/ui/toast'
import { ExportMenu } from '@/components/export-menu'

export interface StaffCourse { id: string; name: string }

interface HistoryItem {
  id: string
  date: string
  userId: string
  fullName: string
  role: string
  status: string
  courseNames: string[]
  registeredAtUtc?: string | null
  registeredBy?: string | null
  updatedAtUtc?: string | null
}

interface HistoryPage {
  items: HistoryItem[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

interface ReportRow {
  userId: string
  fullName: string
  role: string
  courseNames: string[]
  presentCount: number
  absentCount: number
  unregisteredCount: number
  percentage: number | null
  days: (string | null)[]
}

interface ReportData {
  from: string
  to: string
  rows: ReportRow[]
  summary: {
    totalStaff: number
    presentTotal: number
    absentTotal: number
    unregisteredTotal: number
    averagePercentage: number | null
    totalDays: number
  }
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDayMonth(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

function formatTime(utc?: string | null): string {
  if (!utc) return ''
  const d = new Date(utc)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function reportFileName(from: string, to: string, format: string): string {
  if (from === to) {
    const [y, m, d] = from.split('-').map(Number)
    return `Asistencia_Personal_${d}_${MONTH_NAMES[m - 1]}_${y}.${format}`
  }

  const [fy, fm] = from.split('-').map(Number)
  const lastDay = new Date(fy, fm, 0).getDate()
  const isFullMonth =
    from === `${fy}-${String(fm).padStart(2, '0')}-01` &&
    to === `${fy}-${String(fm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  if (isFullMonth) return `Asistencia_Personal_${MONTH_NAMES[fm - 1]}_${fy}.${format}`

  return `Asistencia_Personal_${from}_${to}.${format}`
}

function currentMonthRange(): { from: string; to: string } {
  const now = new Date()
  return {
    from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
}

function currentWeekStart(): Date {
  const now = startOfDay(new Date())
  const day = now.getDay()
  const diffToMonday = (day + 6) % 7
  return addDays(now, -diffToMonday)
}

const STATUS_LABEL: Record<string, string> = { Present: 'Presente', Absent: 'Ausente' }

function StatusPill({ status }: { status: string }) {
  const isPresent = status === 'Present'
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${isPresent
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
      : 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function RolePill({ role }: { role: string }) {
  const isTeacher = role === 'Teacher'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isTeacher
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
      : 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'}`}>
      {isTeacher ? 'Profesor' : 'Delegado'}
    </span>
  )
}

function HistoryView({ slug, courses }: { slug: string; courses: StaffCourse[] }) {
  const defaultRange = useMemo(() => currentMonthRange(), [])
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const [from, setFrom] = useState(defaultRange.from)
  const [to, setTo] = useState(defaultRange.to)
  const [role, setRole] = useState('')
  const [courseId, setCourseId] = useState('')
  const [status, setStatus] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const resetPage = () => setPage(1)

  const secondaryActiveCount = [
    from !== defaultRange.from || to !== defaultRange.to ? 'period' : '',
    role,
    courseId,
    status,
  ].filter(Boolean).length

  const { data, isLoading } = useQuery({
    queryKey: ['staff-history', slug, from, to, term, role, courseId, status, page],
    queryFn: () => {
      const p = new URLSearchParams()
      p.set('page', String(page))
      p.set('pageSize', '15')
      p.set('from', from)
      p.set('to', to)
      if (term) p.set('search', term)
      if (role) p.set('role', role)
      if (courseId) p.set('courseId', courseId)
      if (status) p.set('status', status)
      return apiService.get<HistoryPage>(`/api/admin/${slug}/staff-attendance/history?${p.toString()}`)
    },
    enabled: !!slug,
  })

  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <div className="w-full sm:flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Buscar personal</label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, apellido o DNI…" />
          </div>
          <div className="self-start sm:self-auto sm:pb-0.5">
            <Button variant="outline" size="sm" className="inline-flex items-center gap-1.5" onClick={() => setFiltersOpen((v) => !v)}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtros{secondaryActiveCount > 0 ? ` (${secondaryActiveCount})` : ''}
            </Button>
          </div>
        </div>

        {filtersOpen && (
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-3 lg:grid-cols-5 dark:border-slate-700 dark:bg-slate-900">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Desde</label>
              <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); resetPage() }} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Hasta</label>
              <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); resetPage() }} />
            </div>
            <SelectField value={role} onValueChange={(v) => { setRole(v); resetPage() }} placeholder="Rol" aria-label="Rol"
              options={[
                { value: '', label: 'Todos los roles' },
                { value: 'Teacher', label: 'Profesor' },
                { value: 'Delegate', label: 'Delegado' },
              ]} />
            <SelectField value={courseId} onValueChange={(v) => { setCourseId(v); resetPage() }} placeholder="Curso" aria-label="Curso"
              options={[{ value: '', label: 'Todos los cursos' }, ...courses.map((c) => ({ value: c.id, label: c.name }))]} />
            <SelectField value={status} onValueChange={(v) => { setStatus(v); resetPage() }} placeholder="Estado" aria-label="Estado"
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'Present', label: 'Presente' },
                { value: 'Absent', label: 'Ausente' },
              ]} />
          </div>
        )}
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-violet-600" /></div>
      ) : items.length === 0 ? (
        <Card className="py-12 text-center text-sm text-slate-500">No hay registros de asistencia para estos filtros.</Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block dark:border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <th className="px-4 py-2.5">Fecha</th>
                  <th className="px-4 py-2.5">Nombre</th>
                  <th className="px-4 py-2.5">Rol</th>
                  <th className="px-4 py-2.5">Estado</th>
                  <th className="px-4 py-2.5">Registrado por</th>
                  <th className="px-4 py-2.5">Fecha/hora de registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {items.map((it) => (
                  <tr key={it.id} className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{formatShortDate(it.date)}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{it.fullName}</td>
                    <td className="px-4 py-2.5"><RolePill role={it.role} /></td>
                    <td className="px-4 py-2.5"><StatusPill status={it.status} /></td>
                    <td className="px-4 py-2.5 text-slate-500">{it.registeredBy ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {it.registeredAtUtc ? formatShortDate(isoDate(new Date(it.registeredAtUtc))) : '—'}
                      {' '}
                      {formatTime(it.registeredAtUtc)}
                      {it.updatedAtUtc && <span className="ml-1 text-[10px] italic text-slate-400">· actualizado</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {items.map((it) => (
              <Card key={it.id} className="p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-slate-900 dark:text-white">{it.fullName}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <RolePill role={it.role} />
                      <span className="text-xs text-slate-500">{formatShortDate(it.date)}</span>
                    </div>
                  </div>
                  <StatusPill status={it.status} />
                </div>
                <div className="mt-1.5 text-xs text-slate-500">
                  Registrado por {it.registeredBy ?? '—'} · {formatTime(it.registeredAtUtc)}
                  {it.updatedAtUtc && <span className="ml-1 italic text-slate-400">· actualizado</span>}
                </div>
              </Card>
            ))}
          </div>

          <Pagination
            page={data?.page ?? 1}
            pageSize={data?.pageSize ?? 15}
            totalCount={data?.totalCount ?? 0}
            onPageChange={setPage}
            loading={isLoading}
          />
        </>
      )}
    </div>
  )
}

type Preset = 'weekly' | 'biweekly' | 'monthly' | 'custom'

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-0.5 text-base font-black text-slate-900 dark:text-white">{value}</div>
    </div>
  )
}

function PersonDetailModal({
  row, from, to, onClose,
}: {
  row: ReportRow
  from: string
  to: string
  onClose: () => void
}) {
  const daysCount = row.days.length
  const list = Array.from({ length: daysCount }, (_, i) => {
    const date = addDays(parseIso(from), i)
    const status = row.days[i] ?? 'Unregistered'
    return { date, status }
  })

  return (
    <Modal open onClose={onClose} title={row.fullName} className="sm:max-w-md">
      <div className="px-5 py-4 sm:px-6">
        <div className="mb-1 flex items-center gap-2">
          <RolePill role={row.role} />
        </div>
        <p className="mb-3 text-xs text-slate-500">{formatShortDate(from)} — {formatShortDate(to)}</p>

        <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
          {list.map(({ date, status }) => (
            <div key={isoDate(date)} className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5 last:border-0 dark:border-slate-800">
              <span className="text-sm text-slate-600 dark:text-slate-300">{formatDayMonth(isoDate(date))}</span>
              {status === 'Present' ? (
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Presente</span>
              ) : status === 'Absent' ? (
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">Ausente</span>
              ) : (
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Sin registrar</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

function ReportView({ slug, courses }: { slug: string; courses: StaffCourse[] }) {
  const [preset, setPreset] = useState<Preset>('weekly')
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const [role, setRole] = useState('')
  const [courseId, setCourseId] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [weekStart, setWeekStart] = useState<Date>(() => currentWeekStart())
  const [quincena, setQuincena] = useState(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth(), half: n.getDate() <= 15 ? 1 : 2 }
  })
  const [mperiod, setMperiod] = useState(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() }
  })
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [selected, setSelected] = useState<ReportRow | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null)
  const toast = useToast()

  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  const range = useMemo((): { from: string; to: string } => {
    if (preset === 'weekly') {
      return { from: isoDate(weekStart), to: isoDate(addDays(weekStart, 6)) }
    }
    if (preset === 'biweekly') {
      const { year, month, half } = quincena
      const last = new Date(year, month + 1, 0).getDate()
      return half === 1
        ? { from: isoDate(new Date(year, month, 1)), to: isoDate(new Date(year, month, 15)) }
        : { from: isoDate(new Date(year, month, 16)), to: isoDate(new Date(year, month, last)) }
    }
    if (preset === 'monthly') {
      const { year, month } = mperiod
      return { from: isoDate(new Date(year, month, 1)), to: isoDate(new Date(year, month + 1, 0)) }
    }
    return { from: customFrom, to: customTo }
  }, [preset, weekStart, quincena, mperiod, customFrom, customTo])

  const rangeValid = preset !== 'custom' || (!!customFrom && !!customTo && customFrom <= customTo)

  const goWeek = (delta: number) => setWeekStart((w) => addDays(w, delta * 7))

  const goQuincena = (delta: number) => {
    setQuincena((q) => {
      const nextHalf = q.half + delta
      const monthCount = q.year * 12 + q.month
      if (nextHalf < 1) {
        const target = monthCount - 1
        return { year: Math.floor(target / 12), month: target % 12, half: 2 }
      }
      if (nextHalf > 2) {
        const target = monthCount + 1
        return { year: Math.floor(target / 12), month: target % 12, half: 1 }
      }
      return { ...q, half: nextHalf }
    })
  }

  const goMonth = (delta: number) => {
    setMperiod((p) => {
      const target = p.year * 12 + p.month + delta
      return { year: Math.floor(target / 12), month: target % 12 }
    })
  }

  async function runReportExport(format: 'pdf' | 'xlsx') {
    if (exporting) return
    setExporting(format)
    try {
      const p = new URLSearchParams()
      p.set('from', range.from)
      p.set('to', range.to)
      if (term) p.set('search', term)
      if (role) p.set('role', role)
      if (courseId) p.set('courseId', courseId)
      p.set('format', format)
      const blob = await apiService.getBlob(`/api/admin/${slug}/staff-attendance/export?${p.toString()}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = reportFileName(range.from, range.to, format)
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast(getApiError(err), 'error')
    } finally {
      setExporting(null)
    }
  }

  const { data: report, isLoading } = useQuery({
    queryKey: ['staff-report', slug, range.from, range.to, term, role, courseId],
    queryFn: () => {
      const p = new URLSearchParams()
      p.set('from', range.from)
      p.set('to', range.to)
      if (term) p.set('search', term)
      if (role) p.set('role', role)
      if (courseId) p.set('courseId', courseId)
      return apiService.get<ReportData>(`/api/admin/${slug}/staff-attendance/report?${p.toString()}`)
    },
    enabled: !!slug && rangeValid,
  })

  const secondaryActiveCount = [role, courseId, term].filter(Boolean).length

  const periodLabel = preset === 'weekly'
    ? `${formatShortDate(range.from)} — ${formatShortDate(range.to)}`
    : preset === 'biweekly'
      ? `${formatShortDate(range.from)} — ${formatShortDate(range.to)}`
      : preset === 'monthly'
        ? `${MONTH_NAMES[mperiod.month]} ${mperiod.year}`
        : `${formatShortDate(range.from)} — ${formatShortDate(range.to)}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {(['weekly', 'biweekly', 'monthly', 'custom'] as Preset[]).map((p) => (
          <Button key={p} variant={preset === p ? 'default' : 'outline'} size="sm" onClick={() => setPreset(p)}>
            {p === 'weekly' ? 'Semanal' : p === 'biweekly' ? 'Quincenal' : p === 'monthly' ? 'Mensual' : 'Personalizado'}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        {preset !== 'custom' && (
          <button type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            onClick={() => { if (preset === 'weekly') goWeek(-1); else if (preset === 'biweekly') goQuincena(-1); else goMonth(-1) }}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}

        {preset === 'custom' ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-auto" />
            <span className="text-xs text-slate-400">a</span>
            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-auto" />
          </div>
        ) : (
          <span className="min-w-[150px] text-sm font-bold capitalize text-slate-900 dark:text-white">{periodLabel}</span>
        )}

        {preset === 'biweekly' && (
          <div className="ml-1 flex gap-1">
            {([1, 2] as const).map((half) => (
              <button key={half}
                onClick={() => setQuincena((q) => ({ ...q, half }))}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${quincena.half === half ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                {half === 1 ? '1–15' : '16–fin'}
              </button>
            ))}
          </div>
        )}

        {preset !== 'custom' && (
          <button type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            onClick={() => { if (preset === 'weekly') goWeek(1); else if (preset === 'biweekly') goQuincena(1); else goMonth(1) }}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        )}

        <div className="ml-auto">
          <ExportMenu
            onExport={runReportExport}
            exporting={exporting !== null}
            disabled={!report || report.rows.length === 0}
          />
        </div>
      </div>

      {!rangeValid && (
        <p className="text-xs text-red-600 dark:text-red-400">El rango personalizado es inválido: Desde debe ser anterior o igual a Hasta.</p>
      )}

      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <div className="w-full sm:flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Buscar persona</label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, apellido o DNI…" />
          </div>
          <div className="self-start sm:self-auto sm:pb-0.5">
            <Button variant="outline" size="sm" className="inline-flex items-center gap-1.5" onClick={() => setFiltersOpen((v) => !v)}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtros{secondaryActiveCount > 0 ? ` (${secondaryActiveCount})` : ''}
            </Button>
          </div>
        </div>

        {filtersOpen && (
          <div className="mt-2 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-900">
            <SelectField value={role} onValueChange={setRole} placeholder="Rol" aria-label="Rol"
              options={[
                { value: '', label: 'Todos los roles' },
                { value: 'Teacher', label: 'Profesor' },
                { value: 'Delegate', label: 'Delegado' },
              ]} />
            <SelectField value={courseId} onValueChange={setCourseId} placeholder="Curso" aria-label="Curso"
              options={[{ value: '', label: 'Todos los cursos' }, ...courses.map((c) => ({ value: c.id, label: c.name }))]} />
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <ReportStat label="Total personal" value={String(report?.summary.totalStaff ?? 0)} />
        <ReportStat label="Presentes" value={String(report?.summary.presentTotal ?? 0)} />
        <ReportStat label="Ausentes" value={String(report?.summary.absentTotal ?? 0)} />
        <ReportStat label="Sin registrar" value={String(report?.summary.unregisteredTotal ?? 0)} />
        <ReportStat label="% Asistencia" value={report?.summary.averagePercentage == null ? '—' : `${report.summary.averagePercentage}%`} />
      </div>
      <p className="text-xs text-slate-400">
        El porcentaje de asistencia contempla todos los días del período. Los días sin asistencia registrada reducen el porcentaje.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-violet-600" /></div>
      ) : !report || report.rows.length === 0 ? (
        <Card className="py-12 text-center text-sm text-slate-500">No hay personal que coincida con los filtros para este período.</Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block dark:border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <th className="px-4 py-2.5">Persona</th>
                  <th className="px-4 py-2.5">Rol</th>
                  <th className="px-4 py-2.5 text-center">Presentes</th>
                  <th className="px-4 py-2.5 text-center">Ausentes</th>
                  <th className="px-4 py-2.5 text-center">Sin registrar</th>
                  <th className="px-4 py-2.5 text-right">% Asistencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {report.rows.map((row) => (
                  <tr key={row.userId} onClick={() => setSelected(row)}
                    className="cursor-pointer bg-white hover:bg-violet-50/50 dark:bg-slate-900 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-2.5 font-medium text-violet-700 hover:underline dark:text-violet-300">{row.fullName}</td>
                    <td className="px-4 py-2.5"><RolePill role={row.role} /></td>
                    <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.presentCount}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.absentCount}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.unregisteredCount}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900 dark:text-white">
                      {row.percentage == null ? '—' : `${row.percentage.toLocaleString('es-AR')}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {report.rows.map((row) => (
              <Card key={row.userId} className="cursor-pointer p-3" onClick={() => setSelected(row)}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-violet-700 dark:text-violet-300">{row.fullName}</div>
                    <div className="mt-1"><RolePill role={row.role} /></div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-slate-900 dark:text-white">
                      {row.percentage == null ? '—' : `${row.percentage.toLocaleString('es-AR')}%`}
                    </div>
                    <div className="text-[10px] text-slate-400">% asistencia</div>
                  </div>
                </div>
                <div className="mt-2 flex gap-3 text-xs text-slate-500">
                  <span>Presentes: <b>{row.presentCount}</b></span>
                  <span>Ausentes: <b>{row.absentCount}</b></span>
                  <span>Sin registrar: <b>{row.unregisteredCount}</b></span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {selected && (
        <PersonDetailModal row={selected} from={report?.from ?? range.from} to={report?.to ?? range.to} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export function StaffHistoryReport({ slug, courses }: { slug: string; courses: StaffCourse[] }) {
  const [view, setView] = useState<'historial' | 'reporte'>('historial')

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-slate-200 pb-1 dark:border-slate-700">
        {(['historial', 'reporte'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`-mb-px px-3 py-1.5 text-sm font-semibold transition ${
              view === v
                ? 'border-b-2 border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-300'
                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            {v === 'historial' ? 'Historial' : 'Reporte'}
          </button>
        ))}
      </div>
      {view === 'historial' ? <HistoryView slug={slug} courses={courses} /> : <ReportView slug={slug} courses={courses} />}
    </div>
  )
}

