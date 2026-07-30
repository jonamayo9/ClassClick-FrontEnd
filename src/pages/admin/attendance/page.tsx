import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { PageHero } from '@/components/ui/page-hero'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { DayNavigator } from '@/components/ui/day-navigator'
import { Select } from '@/components/ui/select'
import { QrScanView } from '@/components/qr-scan-view'
import { useClasses, useClassAttendance, useSaveAttendance, getDayIndex, getClosestPastDate } from './hooks'
import { hasModule } from '@/hooks/useModule'

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAY_LABEL_MAP: Record<string, string> = {
  Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles',
  Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado', Sunday: 'Domingo',
}

function AttendancePageInner() {
  const toast = useToast()
  const { data: classes = [], isLoading } = useClasses()
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const qrEnabled = hasModule('qr_attendance')
  const [mode, setMode] = useState<'qr' | 'manual'>(qrEnabled ? 'qr' : 'manual')

  // QR mode: course/class selectors
  const [qrCourseId, setQrCourseId] = useState('')
  const [qrClassId, setQrClassId] = useState('')
  const [qrDate, setQrDate] = useState(() => new Date().toISOString().slice(0, 10))

  const qrCourses = useMemo(() => {
    const map = new Map<string, string>()
    classes.forEach((c) => { if (c.courseId && c.courseName) map.set(c.courseId, c.courseName) })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [classes])

  const qrClasses = useMemo(() => {
    return classes.filter((c) => c.courseId === qrCourseId)
  }, [classes, qrCourseId])

  const selectedQrClass = qrClasses.find((c) => c.id === qrClassId)

  // Recalculate date when selectedClass changes (based on the class's dayOfWeek)
  const selectClass = useCallback((id: string) => {
    setSelectedClass(id)
    const cls = classes.find((c) => c.id === id)
    if (cls?.dayOfWeek) setDate(getClosestPastDate(cls.dayOfWeek))
  }, [classes])

  // Sync QR date when class changes
  useEffect(() => {
    if (selectedQrClass?.dayOfWeek) setQrDate(getClosestPastDate(selectedQrClass.dayOfWeek))
  }, [qrClassId, selectedQrClass?.dayOfWeek])

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
    const groups: Record<string, typeof classes> = {}
    classes.forEach((c) => {
      const day = c.dayOfWeek ?? 'Monday'
      if (!groups[day]) groups[day] = []
      groups[day].push(c)
    })
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return dayOrder.filter((d) => groups[d]).map((d) => [String(getDayIndex(d)), groups[d]] as [string, typeof classes])
  }, [classes])

  const selected = classes.find((c) => c.id === selectedClass)
  const presentCount = Object.values(records).filter(Boolean).length

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      <PageHero
        label="Asistencias"
        title="Asistencia"
        description="Registrá la asistencia de tus alumnos."
        stats={mode === 'manual' && selectedClass ? [
          { label: 'Presentes', value: presentCount },
          { label: 'Ausentes', value: attendanceRecords.length - presentCount },
          { label: 'Total', value: attendanceRecords.length },
        ] : undefined}
      />

      {/* Mode selector */}
      {qrEnabled && (
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button type="button" onClick={() => setMode('qr')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
              mode === 'qr'
                ? 'bg-white shadow-sm dark:bg-slate-700'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}>
            📷 Escanear QR
          </button>
          <button type="button" onClick={() => setMode('manual')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
              mode === 'manual'
                ? 'bg-white shadow-sm dark:bg-slate-700'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}>
            ✍ Asistencia manual
          </button>
        </div>
      )}

      {mode === 'qr' && qrEnabled && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Curso</label>
                <Select value={qrCourseId} onChange={(e) => { setQrCourseId(e.target.value); setQrClassId('') }}>
                  <option value="">Seleccionar curso</option>
                  {qrCourses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
              {qrCourseId && (
                <div className="min-w-[200px] flex-1">
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Clase (horario)</label>
                  <Select value={qrClassId} onChange={(e) => setQrClassId(e.target.value)}>
                    <option value="">Seleccionar clase</option>
                    {qrClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {DAY_LABEL_MAP[c.dayOfWeek] ?? c.dayOfWeek} {c.startTime}{c.endTime ? ` - ${c.endTime}` : ''}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {qrClassId && (
                <div className="min-w-[180px]">
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Fecha</label>
                  <DayNavigator date={qrDate} onChange={setQrDate} dayOfWeek={selectedQrClass?.dayOfWeek} />
                </div>
              )}
            </div>
          </Card>

          <QrScanView
            courseId={qrCourseId}
            classId={qrClassId}
            courseName={selectedQrClass?.courseName ?? ''}
            className={selectedQrClass ? `${DAY_LABEL_MAP[selectedQrClass.dayOfWeek] ?? ''} ${selectedQrClass.startTime}${selectedQrClass.endTime ? ` - ${selectedQrClass.endTime}` : ''}` : ''}
            hasClass={!!qrClassId}
            basePath="/admin/attendance/qr-scan"
          />
        </div>
      )}

      {mode === 'manual' && (
        <div className="flex flex-col gap-5 xl:flex-row">
          <Card className="w-full shrink-0 p-5 xl:w-80">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Clases</h2>
            {classes.length === 0 ? (
              <p className="text-sm text-slate-400">No hay clases configuradas.</p>
            ) : (
              <div className="space-y-4">
                {grouped.map(([day, items]) => (
                  <div key={day}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      {DAY_LABELS[Number(day)]}
                    </p>
                    <div className="space-y-1">
                      {items.map((c) => (
                        <button key={c.id} onClick={() => selectClass(c.id)}
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
                  <DayNavigator date={date} onChange={setDate} dayOfWeek={selected?.dayOfWeek} />
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
                                  <button type="button" onClick={() => togglePresent(r.studentId)}
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
      )}
    </div>
  )
}

export default function AttendancePage() {
  return <ToastProvider><AttendancePageInner /></ToastProvider>
}
