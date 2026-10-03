import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService, getApiError } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { attendanceStatusLabel, EducativaDocenteDayGroup, AttendanceStatus } from '@/pages/educativa/types'

type Status = AttendanceStatus | null

export function DocenteMisClasesPage() {
  const slug = useAuth((s) => s.activeCompanySlug ?? '')
  const qc = useQueryClient()

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [drafts, setDrafts] = useState<Record<string, Status>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const query = useQuery({
    queryKey: ['docente-day', slug, date],
    queryFn: () => apiService.get<EducativaDocenteDayGroup[]>(`/api/educativa/${slug}/attendance/docente/day?date=${date}`),
    enabled: !!slug,
    retry: false,
  })

  const groups = query.data ?? []

  function draftKey(classId: string, enrollmentId: string) { return `${classId}:${enrollmentId}` }

  function statusOf(classId: string, enrollmentId: string, fallback: AttendanceStatus | null | undefined): Status {
    const key = draftKey(classId, enrollmentId)
    if (key in drafts) return drafts[key] ?? null
    return fallback ?? null
  }

  function setStatus(classId: string, enrollmentId: string, value: Status) {
    setDrafts((prev) => ({ ...prev, [draftKey(classId, enrollmentId)]: value }))
  }

  function resetDrafts() {
    setDrafts({})
  }

  async function saveItem(item: { commissionId: string; commissionClassId: string; date: string; students: { commissionEnrollmentId: string; status?: AttendanceStatus | null }[] }) {
    const entries = item.students
      .map((s) => {
        const st = statusOf(item.commissionClassId, s.commissionEnrollmentId, s.status)
        return st ? { commissionEnrollmentId: s.commissionEnrollmentId, commissionClassId: item.commissionClassId, status: st } : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    if (entries.length === 0) return 0

    await apiService.put(`/api/educativa/${slug}/attendance`, {
      commissionId: item.commissionId,
      date: item.date,
      entries,
    })
    return entries.length
  }

  async function saveAll() {
    setSaving(true)
    setMessage(null)
    try {
      let total = 0
      for (const group of groups) {
        for (const item of group.items) {
          const n = await saveItem({ commissionId: item.commissionId, commissionClassId: item.commissionClassId, date, students: item.students })
          total += n
        }
      }
      setMessage({ ok: true, text: `Asistencia guardada (${total} registros).` })
      resetDrafts()
      qc.invalidateQueries({ queryKey: ['docente-day', slug, date] })
    } catch (err) {
      setMessage({ ok: false, text: getApiError(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-violet-200">Portal docente</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">Mis clases</h1>
          <p className="mt-1 text-sm text-violet-200">Tomá asistencia de todas tus comisiones agrupadas por horario.</p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" className="max-w-[170px]" value={date} onChange={(e) => { setDate(e.target.value); resetDrafts() }} />
        <span className="text-xs text-slate-400">Se muestran solo las clases del día según el horario recurrente.</span>
      </div>

      {message && (
        <p className={`rounded-xl px-4 py-3 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'}`}>
          {message.text}
        </p>
      )}

      {query.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner /></div>}
      {query.isError && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">No se pudieron cargar tus clases.</p>}
      {!query.isLoading && !query.isError && groups.length === 0 && (
        <Card><EmptyState icon="🗓️" title="Sin clases" description="No tenés clases este día dentro del período de tus comisiones." /></Card>
      )}

      {!query.isLoading && groups.map((group) => (
        <Card key={`${group.dayOfWeek}-${group.startTime}-${group.endTime}`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-violet-50 px-3 py-1.5 text-sm font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">{group.dayLabel}</span>
              <span className="text-lg font-black text-slate-800 dark:text-white">{group.timeSlotLabel}</span>
            </div>
            <span className="text-xs text-slate-400">{group.items.length} comisión(es)</span>
          </div>

          <div className="space-y-4 p-4">
            {group.items.map((item) => (
              <div key={item.commissionId} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.commissionName}</p>
                    <p className="text-xs text-slate-400">{item.trainingName}</p>
                  </div>
                  <Badge variant="info">Comisión</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="py-1.5 pr-2">Alumno</th>
                        <th className="py-1.5 pr-2">Comisión</th>
                        <th className="py-1.5">Asistencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {item.students.map((s) => (
                        <tr key={s.commissionEnrollmentId}>
                          <td className="py-2 pr-2 font-medium text-slate-700 dark:text-slate-300">{s.studentName}</td>
                          <td className="py-2 pr-2 text-xs text-slate-400">{item.commissionName}</td>
                          <td className="py-2">
                            <select
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                              value={statusOf(item.commissionClassId, s.commissionEnrollmentId, s.status) ?? ''}
                              onChange={(e) => setStatus(item.commissionClassId, s.commissionEnrollmentId, (e.target.value as Status) || null)}
                            >
                              <option value="">Sin registrar</option>
                              {Object.entries(attendanceStatusLabel).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {!query.isLoading && groups.length > 0 && (
        <div className="flex justify-end">
          <Button variant="primary" loading={saving} onClick={saveAll}>Guardar asistencia del día</Button>
        </div>
      )}
    </div>
  )
}