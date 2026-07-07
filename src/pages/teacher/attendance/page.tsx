import { useState, useRef } from 'react'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { DatePicker } from '@/components/ui/date-picker'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'

function useSlug() { return useAuth((s) => s.activeCompanySlug ?? '') }

const DAYS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

interface Course { id: string; name: string }
interface ClassItem { id: string; courseId: string; courseName: string; dayOfWeek: number; startTime: string; endTime?: string }
interface Student { id: string; fullName: string; dni?: string }
interface AttendanceRecord { studentId: string; present: boolean }

function TeacherAttendanceInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const slug = useSlug()
  const userName = useAuth((s) => s.user?.name ?? 'Docente')

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ['teacher-courses', slug],
    queryFn: () => apiService.get<Course[]>(`/api/teacher/courses`),
    enabled: !!slug,
  })

  const [courseId, setCourseId] = useState('')
  const [classId, setClassId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [records, setRecords] = useState<Record<string, boolean>>({})
  const prevRef = useRef('')

  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['teacher-classes', slug, courseId],
    queryFn: () => apiService.get<ClassItem[]>(`/api/teacher/classes?courseId=${courseId}`),
    enabled: !!courseId && !!slug,
  })

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['teacher-course-students', slug, classId],
    queryFn: () => apiService.get<Student[]>(`/api/teacher/courses/${courseId}/students`),
    enabled: !!classId && !!courseId && !!slug,
  })

  const { data: existingAttendance = [] } = useQuery({
    queryKey: ['teacher-attendance', slug, classId, date],
    queryFn: () => apiService.get<AttendanceRecord[]>(`/api/teacher/attendance/${classId}/${date}`),
    enabled: !!classId && !!date && !!slug,
    select: (data: unknown) => {
      if (Array.isArray(data)) return data as AttendanceRecord[]
      const r = data as { students?: AttendanceRecord[]; records?: AttendanceRecord[] }
      return r.students ?? r.records ?? []
    },
  })

  const syncKey = classId ? `${classId}-${date}-${existingAttendance.map(r => r.studentId + r.present).join(',')}` : ''

  if (syncKey && syncKey !== prevRef.current) {
    prevRef.current = syncKey
    const map: Record<string, boolean> = {}
    existingAttendance.forEach((r: AttendanceRecord) => { map[r.studentId] = r.present })
    setRecords(map)
  }

  const saveMutation = useMutation({
    mutationFn: (body: { classId: string; date: string; students: { studentId: string; present: boolean }[] }) =>
      apiService.post(`/api/teacher/attendance`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-attendance'] }); toast('Asistencia guardada.') },
    onError: () => toast('Error al guardar.', 'error'),
  })

  function togglePresent(studentId: string) {
    setRecords((prev) => ({ ...prev, [studentId]: !(prev[studentId] ?? false) }))
  }

  async function handleSave() {
    if (!classId || !date) return
    const studentsList = students.map((s) => ({
      studentId: s.id,
      present: records[s.id] ?? false,
    }))
    saveMutation.mutate({ classId, date, students: studentsList })
  }

  function handleCourseChange(id: string) {
    setCourseId(id); setClassId(''); setRecords({})
  }

  const presentCount = Object.values(records).filter(Boolean).length
  const selectedClass = classes.find((c) => c.id === classId)

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Docente</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">Asistencias</h1>
          <p className="mt-1 text-sm text-emerald-200">Bienvenido, {userName}</p>
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200">Presentes</p>
            <p className="mt-0.5 text-xl font-bold">{presentCount}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200">Ausentes</p>
            <p className="mt-0.5 text-xl font-bold">{students.length - presentCount}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200">Total</p>
            <p className="mt-0.5 text-xl font-bold">{students.length}</p>
          </div>
        </div>
      </section>

      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Curso</label>
            <Select value={courseId} onChange={(e) => handleCourseChange(e.target.value)} disabled={loadingCourses}>
              <option value="">Seleccionar curso</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          {courseId && (
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Clase (horario)</label>
              <Select value={classId} onChange={(e) => setClassId(e.target.value)} disabled={loadingClasses}>
                <option value="">Seleccionar clase</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {DAYS[c.dayOfWeek]} {c.startTime}{c.endTime ? ` - ${c.endTime}` : ''}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {classId && (
            <div className="min-w-[180px]">
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Fecha</label>
              <DatePicker value={date} onChange={setDate} />
            </div>
          )}
        </div>

        {selectedClass && (
          <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">
            {DAYS[selectedClass.dayOfWeek]} {selectedClass.startTime}{selectedClass.endTime ? ` - ${selectedClass.endTime}` : ''}
          </div>
        )}

        {!classId ? (
          <EmptyState icon="📋" title="Seleccioná tu curso y clase" description="Elegí el curso, la clase y la fecha para tomar asistencia." />
        ) : loadingStudents ? (
          <div className="flex items-center justify-center py-16"><Spinner className="h-6 w-6 text-emerald-600" /></div>
        ) : students.length === 0 ? (
          <EmptyState icon="👤" title="Sin alumnos" description="Este curso no tiene alumnos." />
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-3">Alumno</th>
                    <th className="px-4 py-3 text-center">Presente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {students.map((s, idx) => {
                    const bg = idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'
                    const present = records[s.id] ?? false
                    return (
                      <tr key={s.id} className={bg}>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{s.fullName}</td>
                        <td className="px-4 py-3 text-center">
                          <button type="button" onClick={() => togglePresent(s.id)}
                            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 transition ${present
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'border-slate-200 text-slate-300 hover:border-slate-400 dark:border-slate-600 dark:text-slate-600'}`}>
                            {present ? <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : null}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end pt-1">
              <Button onClick={handleSave} loading={saveMutation.isPending} className="bg-emerald-600 text-white hover:bg-emerald-700">Guardar asistencia</Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

export default function TeacherAttendancePage() {
  return <ToastProvider><TeacherAttendanceInner /></ToastProvider>
}
