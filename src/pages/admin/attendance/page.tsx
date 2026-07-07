import { useState, useMemo, useEffect, useRef } from 'react'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { PageHero } from '@/components/ui/page-hero'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { DatePicker } from '@/components/ui/date-picker'
import { useClasses, useClassAttendance, useSaveAttendance } from './hooks'

const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function AttendancePageInner() {
  const toast = useToast()
  const { data: classes = [], isLoading } = useClasses()
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  const { data: attendanceRecords = [], isLoading: loadingAttendance } = useClassAttendance(selectedClass, date)
  const saveMutation = useSaveAttendance()

  const [records, setRecords] = useState<Record<string, boolean>>({})
  const prevKeyRef = useRef('')

  useEffect(() => {
    const key = `${selectedClass}-${date}`
    if (key !== prevKeyRef.current) {
      prevKeyRef.current = key
      const map: Record<string, boolean> = {}
      attendanceRecords.forEach((r) => { map[r.studentId] = r.present })
      setRecords(map)
    }
  }, [selectedClass, date, attendanceRecords])

  function togglePresent(studentId: string) {
    setRecords((prev) => ({ ...prev, [studentId]: !(prev[studentId] ?? false) }))
  }

  function markAll(v: boolean) {
    const map: Record<string, boolean> = {}
    attendanceRecords.forEach((r) => { map[r.studentId] = v })
    setRecords(map)
  }

  async function handleSave() {
    if (!selectedClass) return
    const students = attendanceRecords.map((r) => ({
      studentId: r.studentId,
      present: records[r.studentId] ?? false,
    }))
    try {
      await saveMutation.mutateAsync({ classId: selectedClass, date, students })
      toast('Asistencia guardada.')
    } catch {
      toast('Error al guardar.', 'error')
    }
  }

  const grouped = useMemo(() => {
    const groups: Record<number, typeof classes> = {}
    classes.forEach((c) => {
      const day = c.dayOfWeek ?? 0
      if (!groups[day]) groups[day] = []
      groups[day].push(c)
    })
    return Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b))
  }, [classes])

  const selected = classes.find((c) => c.id === selectedClass)
  const presentCount = Object.values(records).filter(Boolean).length

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      <PageHero
        label="Asistencias"
        title="Asistencia por clase"
        description="Seleccioná una clase y fecha para tomar asistencia."
        stats={selectedClass ? [
          { label: 'Presentes', value: presentCount },
          { label: 'Ausentes', value: attendanceRecords.length - presentCount },
          { label: 'Total', value: attendanceRecords.length },
        ] : undefined}
      />

      <div className="flex flex-col gap-5 xl:flex-row">
        {/* Classes list */}
        <Card className="w-full shrink-0 p-5 xl:w-80">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Clases</h2>
          {classes.length === 0 ? (
            <p className="text-sm text-slate-400">No hay clases configuradas.</p>
          ) : (
            <div className="space-y-4">
              {grouped.map(([day, items]) => (
                <div key={day}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    {daysOfWeek[Number(day)]}
                  </p>
                  <div className="space-y-1">
                    {items.map((c) => (
                      <button key={c.id} onClick={() => setSelectedClass(c.id)}
                        className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                          selectedClass === c.id
                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}>
                        <p className="truncate">{c.courseName || 'Curso'}</p>
                        <p className="text-[10px] opacity-60">{c.startTime}{c.endTime ? ` - ${c.endTime}` : ''}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Attendance */}
        <Card className="min-w-0 flex-1 p-5 space-y-4">
          {!selectedClass ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-400">
              Seleccioná una clase de la lista para tomar asistencia.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {selected?.courseName || 'Clase'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {selected ? `${selected.startTime} - ${selected.endTime ?? ''}` : ''}
                  </p>
                </div>
                <DatePicker value={date} onChange={setDate} className="sm:w-64" />
              </div>

              {loadingAttendance ? (
                <div className="flex justify-center py-12"><Spinner className="h-6 w-6 text-violet-600" /></div>
              ) : attendanceRecords.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-400">Sin alumnos inscriptos en este curso.</p>
              ) : (
                <>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => markAll(true)}>Todos presente</Button>
                    <Button variant="outline" size="sm" onClick={() => markAll(false)}>Todos ausente</Button>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">
                          <th className="px-4 py-3">Alumno</th>
                          <th className="px-4 py-3">DNI</th>
                          <th className="px-4 py-3 text-center">Presente</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {attendanceRecords.map((r, idx) => {
                          const bg = idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'
                          const present = records[r.studentId] ?? false
                          return (
                            <tr key={r.studentId} className={bg}>
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{r.studentName}</td>
                              <td className="px-4 py-3 text-slate-500">{r.dni ?? '-'}</td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => togglePresent(r.studentId)}
                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border-2 transition ${
                                    present
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                                      : 'border-slate-200 text-slate-300 hover:border-slate-400 dark:border-slate-600 dark:text-slate-600'
                                  }`}>
                                  {present ? (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : null}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSave} loading={saveMutation.isPending}
                      className="bg-violet-600 text-white hover:bg-violet-700">
                      Guardar asistencia
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function AttendancePage() {
  return <ToastProvider><AttendancePageInner /></ToastProvider>
}
