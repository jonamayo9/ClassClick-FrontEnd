import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService, getApiError } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { SelectField } from '@/components/ui/select-field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { DayNavigator } from '@/components/ui/day-navigator'
import { useToast } from '@/components/ui/toast'
import { ExportMenu } from '@/components/export-menu'
import { StaffHistoryReport } from './staff/history'

export type StaffStatus = 'Present' | 'Absent' | 'Unregistered'

interface StaffRow {
  userId: string
  firstName: string
  lastName: string
  fullName: string
  role: string
  courseNames: string[]
  status: string
  registeredAtUtc?: string | null
  registeredBy?: string | null
}

interface StaffDaily {
  date: string
  staff: StaffRow[]
  summary: { totalStaff: number; presentCount: number; absentCount: number; unregisteredCount: number }
}

interface SaveResult {
  saved: number
  removed: number
  daily: StaffDaily
}

interface MonthlyRow {
  userId: string
  fullName: string
  role: string
  courseNames: string[]
  days: (string | null)[]
}

interface MonthlyData {
  year: number
  month: number
  staff: MonthlyRow[]
  summary: {
    totalStaff: number
    presentTotal: number
    absentTotal: number
    unregisteredTotal: number
    averagePercentage: number | null
    totalDays: number
  }
}

interface Course { id: string; name: string }

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const text = new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function roleLabel(role: string): string {
  return role === 'Teacher' ? 'Profesor' : role === 'Delegate' ? 'Delegado' : role
}

function normalizeCourses(data: unknown): Course[] {
  if (Array.isArray(data)) return data as Course[]
  const r = data as { items?: Course[]; data?: Course[] }
  return r.items ?? r.data ?? []
}

const STATUS_LABEL: Record<string, string> = { Present: 'Presente', Absent: 'Ausente', Unregistered: 'Sin registrar' }

function StatusBadge({ status }: { status: string }) {
  const classes = status === 'Present'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    : status === 'Absent'
      ? 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300'
      : 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${classes}`}>{STATUS_LABEL[status] ?? status}</span>
}

const STATUS_OPTIONS: { key: StaffStatus; label: string; active: string; inactive: string }[] = [
  {
    key: 'Present', label: 'Presente',
    active: 'bg-emerald-500 border-emerald-500 text-white',
    inactive: 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400',
  },
  {
    key: 'Absent', label: 'Ausente',
    active: 'bg-red-500 border-red-500 text-white',
    inactive: 'border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400',
  },
  {
    key: 'Unregistered', label: 'Sin registrar',
    active: 'bg-amber-500 border-amber-500 text-white',
    inactive: 'border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400',
  },
]

function StatusButtons({ value, onChange }: { value: StaffStatus; onChange: (s: StaffStatus) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUS_OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${value === o.key ? o.active : o.inactive}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function StaffAttendancePage() {
  const slug = useAuth((s) => s.activeCompanySlug) ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  const [tab, setTab] = useState<'marcar' | 'historial'>('marcar')
  const [date, setDate] = useState(() => todayIso())
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const [role, setRole] = useState('')
  const [courseId, setCourseId] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [draft, setDraft] = useState<Record<string, StaffStatus>>({})
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null)
  const now = new Date()
  const [monthYear, setMonthYear] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })

  async function runMonthExport(format: 'pdf' | 'xlsx') {
    if (exporting) return
    setExporting(format)
    try {
      const first = new Date(monthYear.year, monthYear.month - 1, 1)
      const last = new Date(monthYear.year, monthYear.month, 0)
      const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const p = new URLSearchParams()
      p.set('from', iso(first))
      p.set('to', iso(last))
      if (term) p.set('search', term)
      if (role) p.set('role', role)
      if (courseId) p.set('courseId', courseId)
      p.set('format', format)
      const blob = await apiService.getBlob(`/api/admin/${slug}/staff-attendance/export?${p.toString()}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Asistencia_Personal_${MONTH_NAMES[monthYear.month - 1]}_${monthYear.year}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast(getApiError(err), 'error')
    } finally {
      setExporting(null)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  // Al cambiar filtros se descarta el borrador local (está atado al listado visible).
  useEffect(() => {
    setDraft({})
  }, [date, term, role, courseId])

  const { data: courses = [] } = useQuery({
    queryKey: ['admin-courses', slug],
    queryFn: () => apiService.get<unknown>(`/api/admin/${slug}/courses`).then(normalizeCourses),
    enabled: !!slug,
  })

  const { data: daily, isLoading } = useQuery({
    queryKey: ['staff-attendance-daily', slug, date, term, role, courseId],
    queryFn: () => {
      const p = new URLSearchParams()
      p.set('date', date)
      if (term) p.set('search', term)
      if (role) p.set('role', role)
      if (courseId) p.set('courseId', courseId)
      return apiService.get<StaffDaily>(`/api/admin/${slug}/staff-attendance?${p.toString()}`)
    },
    enabled: !!slug && !!date,
  })

  const staff = daily?.staff ?? []
  const loadedStatus = (userId: string) => staff.find((s) => s.userId === userId)?.status ?? 'Unregistered'
  const effectiveStatus = (userId: string): StaffStatus => draft[userId] ?? (loadedStatus(userId) as StaffStatus)

  const changedCount = Object.keys(draft).filter((id) => draft[id] !== loadedStatus(id)).length

  const { data: monthly } = useQuery({
    queryKey: ['staff-attendance-monthly', slug, monthYear.year, monthYear.month, term, role, courseId],
    queryFn: () => {
      const p = new URLSearchParams()
      p.set('year', String(monthYear.year))
      p.set('month', String(monthYear.month))
      if (term) p.set('search', term)
      if (role) p.set('role', role)
      if (courseId) p.set('courseId', courseId)
      return apiService.get<MonthlyData>(`/api/admin/${slug}/staff-attendance/monthly?${p.toString()}`)
    },
    enabled: !!slug,
  })

  const goMonth = (delta: number) => {
    setMonthYear((prev) => {
      const d = new Date(prev.year, prev.month - 1 + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })
  }

  const today = new Date()
  const todayDay = today.getFullYear() === monthYear.year && today.getMonth() + 1 === monthYear.month ? today.getDate() : null

  const markAll = (status: 'Present' | 'Absent') => {
    const next: Record<string, StaffStatus> = {}
    staff.forEach((s) => { next[s.userId] = status })
    setDraft(next)
  }

  const setStatus = (userId: string, status: StaffStatus) => {
    setDraft((prev) => ({ ...prev, [userId]: status }))
  }

  const saveMutation = useMutation({
    mutationFn: async (): Promise<SaveResult> => {
      const entries = Object.entries(draft)
        .filter(([id, status]) => status !== loadedStatus(id))
        .map(([userId, status]) => ({ userId, status }))

      if (entries.length === 0) {
        return { saved: 0, removed: 0, daily: daily! }
      }

      return apiService.put<SaveResult>(`/api/admin/${slug}/staff-attendance`, { date, entries })
    },
    onSuccess: (result) => {
      const parts = [
        result.saved > 0 ? `${result.saved} registro(s) guardados` : null,
        result.removed > 0 ? `${result.removed} dado(s) de baja` : null,
      ].filter(Boolean)
      toast(parts.length ? parts.join(' · ') : 'No hay cambios para guardar.')
      setDraft({})
      qc.invalidateQueries({ queryKey: ['staff-attendance-daily'] })
    },
    onError: (err) => toast(getApiError(err), 'error'),
  })

  const handleSave = () => saveMutation.mutate()

  if (tab === 'historial') {
    return (
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
        <StaffHeader />
        <SegmentedControl
          options={[
            { value: 'marcar', label: 'Marcar asistencia' },
            { value: 'historial', label: 'Historial' },
          ]}
          value={tab}
          onChange={(v) => setTab(v as 'marcar' | 'historial')}
        />
        <StaffHistoryReport slug={slug} courses={courses} />
      </div>
    )
  }

  const secondaryActiveCount = [role, courseId].filter(Boolean).length

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
      <StaffHeader />
      <SegmentedControl
        options={[
          { value: 'marcar', label: 'Marcar asistencia' },
          { value: 'historial', label: 'Historial' },
        ]}
        value={tab}
        onChange={(v) => setTab(v as 'marcar' | 'historial')}
      />

      <div className="space-y-2">
        <DayNavigator date={date} onChange={setDate} allowFuture />
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar personal…" className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            className="inline-flex shrink-0 items-center gap-1.5"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros{secondaryActiveCount > 0 ? ` (${secondaryActiveCount})` : ''}
          </Button>
        </div>

        {filtersOpen && (
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-900">
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
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            onClick={() => markAll('Present')}
          >
            Marcar presentes
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
            onClick={() => markAll('Absent')}
          >
            Marcar ausentes
          </Button>
        </div>
        <Button
          loading={saveMutation.isPending}
          disabled={changedCount === 0}
          size="lg"
          className="w-full bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-600/25 sm:w-auto"
          onClick={handleSave}
        >
          ✓ Guardar asistencia
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-violet-600" /></div>
      ) : staff.length === 0 ? (
        <Card className="py-12 text-center text-sm text-slate-500">No hay personal que coincida con los filtros para esta fecha.</Card>
      ) : (
        <div className="space-y-1.5">
          {staff.map((s) => (
            <div key={s.userId} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between gap-2 px-3 pt-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">
                    {initials(s.fullName)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{s.fullName}</div>
                    <div className="truncate text-xs text-slate-500">
                      {roleLabel(s.role)}
                      {s.courseNames.length > 0 && (
                        <>
                          {' · '}
                          {s.courseNames.slice(0, 2).join(' · ')}
                          {s.courseNames.length > 2 ? ` · +${s.courseNames.length - 2}` : ''}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <StatusBadge status={effectiveStatus(s.userId)} />
              </div>
              <div className="px-3 pb-2 pt-1.5">
                <StatusButtons value={effectiveStatus(s.userId)} onChange={(st) => setStatus(s.userId, st)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {changedCount > 0 && (
        <p className="text-xs text-slate-500">
          {changedCount} cambio(s) pendiente(s). Los cambios se guardan con el botón &quot;Guardar asistencia&quot;.
        </p>
      )}

      {/* Previsualización diaria */}
      <Card className="p-3 sm:p-4">
        <div>
          <h2 className="text-sm font-black">Previsualización diaria</h2>
          <p className="mt-0.5 text-xs capitalize text-slate-500">{formatDateLong(date)}</p>
        </div>

        <div className="mt-2 hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-1">Persona</th>
                <th className="py-1">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {daily?.staff.map((s) => (
                <tr key={s.userId}>
                  <td className="py-1 font-medium text-slate-900 dark:text-white">{s.fullName}</td>
                  <td className="py-1"><StatusBadge status={loadedStatus(s.userId)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-2 space-y-1 md:hidden">
          {daily?.staff.map((s) => (
            <div key={s.userId} className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{s.fullName}</span>
              <StatusBadge status={loadedStatus(s.userId)} />
            </div>
          ))}
        </div>

        <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
          Presentes <b>{daily?.summary.presentCount ?? 0}</b>
          {' · '}Ausentes <b>{daily?.summary.absentCount ?? 0}</b>
          {' · '}Sin registrar <b>{daily?.summary.unregisteredCount ?? 0}</b>
          {' · '}Total <b>{daily?.summary.totalStaff ?? 0}</b>
        </p>
      </Card>

      {/* Asistencia mensual */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-black">Asistencia mensual</h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => goMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="min-w-[120px] text-center text-sm font-bold capitalize text-slate-900 dark:text-white">
              {MONTH_NAMES[monthYear.month - 1]} {monthYear.year}
            </span>
            <button type="button" onClick={() => goMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <ExportMenu
              onExport={runMonthExport}
              exporting={exporting !== null}
              disabled={!monthly || monthly.staff.length === 0}
            />
          </div>
        </div>

        {monthly && monthly.staff.length > 0 ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <MonthStat label="Total personal" value={String(monthly.summary.totalStaff)} />
              <MonthStat label="Presentes" value={String(monthly.summary.presentTotal)} />
              <MonthStat label="Ausentes" value={String(monthly.summary.absentTotal)} />
              <MonthStat label="Sin registrar" value={String(monthly.summary.unregisteredTotal)} />
              <div className="col-span-2 sm:col-span-1">
                <MonthStat
                  label="% Asistencia"
                  value={monthly.summary.averagePercentage == null ? '—' : `${monthly.summary.averagePercentage}%`}
                  accent
                />
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              El porcentaje de asistencia contempla todos los días del período. Los días sin asistencia registrada reducen el porcentaje.
            </p>

            <div className="mt-3 max-w-full overflow-x-auto">
              <table className="border-separate border-spacing-0" style={{ minWidth: 'max-content' }}>
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 min-w-[150px] border-b border-slate-200 bg-white px-3 py-1.5 text-left text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">Personal</th>
                    {Array.from({ length: monthly.summary.totalDays }, (_, i) => i + 1).map((d) => {
                      const isToday = todayDay === d
                      const dateIso = `${monthYear.year}-${String(monthYear.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                      return (
                        <th key={d} title={formatDateShort(dateIso)}
                          className={`min-w-[24px] border-b border-slate-200 bg-white px-1 py-1.5 text-center text-[10px] font-semibold dark:border-slate-700 dark:bg-slate-900 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                          {d}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {monthly.staff.map((row) => (
                    <tr key={row.userId}>
                      <td className="sticky left-0 z-10 min-w-[150px] bg-white px-3 py-1 text-sm font-medium whitespace-nowrap text-slate-900 dark:bg-slate-900 dark:text-white">
                        {row.fullName}
                        <span className="ml-1 text-[10px] text-slate-400">{row.role === 'Teacher' ? 'Profesor' : 'Delegado'}</span>
                      </td>
                      {row.days.map((st, i) => {
                        const day = i + 1
                        const isToday = todayDay === day
                        const dateIso = `${monthYear.year}-${String(monthYear.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        const label = st === 'Present' ? 'Presente' : st === 'Absent' ? 'Ausente' : 'Sin registrar'
                        return (
                          <td key={i} className="px-1 py-1 text-center">
                            <span
                              title={`${formatDateShort(dateIso)} — ${label}`}
                              className={`inline-block h-4 min-w-[16px] rounded-sm ${st === 'Present' ? 'bg-emerald-500' : st === 'Absent' ? 'bg-red-500' : 'bg-amber-400'} ${isToday ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" /> Presente</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-red-500" /> Ausente</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-amber-400" /> Sin registrar</span>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">No hay personal para mostrar en este mes con los filtros actuales.</p>
        )}
      </Card>
    </div>
  )
}

function MonthStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-2.5 ${accent ? 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/40' : 'border-slate-200 dark:border-slate-700'}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-0.5 text-base font-black ${accent ? 'text-violet-700 dark:text-violet-300' : 'text-slate-900 dark:text-white'}`}>{value}</div>
    </div>
  )
}

function StaffHeader() {
  return (
    <header>
      <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Asistencia del personal</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Tomá asistencia a profesores y delegados de forma manual.
      </p>
    </header>
  )
}
