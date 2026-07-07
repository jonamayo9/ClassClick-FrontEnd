import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { useStudentCourses } from '../student.hooks'

const ARS_FMT = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function StudentCoursesPage() {
  const navigate = useNavigate()
  const { data: courses = [], isLoading } = useStudentCourses()

  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Mis cursos</h1>
        <p className="mt-1 text-sm text-blue-200">{courses.length} curso{courses.length !== 1 ? 's' : ''}</p>
      </div>

      {courses.length === 0 ? (
        <EmptyState icon="📚" title="Sin cursos" description="No estás inscripto en ningún curso todavía." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((c) => {
            const schedule = c.schedules
            return (
              <button key={c.id} onClick={() => navigate(`/student/courses/${c.id}`)}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{c.name}</h3>
                    {c.description && <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{c.description}</p>}
                  </div>
                  <Badge variant={c.isActive !== false ? 'success' : 'default'}>
                    {c.isActive !== false ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                {c.teacherFullName && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium">Profesor:</span> {c.teacherFullName}
                  </p>
                )}
                {c.classesPerWeek && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium">Clases/semana:</span> {c.classesPerWeek}
                  </p>
                )}
                {schedule && schedule.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {schedule.map((s, i) => (
                      <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {daysOfWeek[s.dayOfWeek ?? 0]}{s.startTime ? ` ${s.startTime}` : ''}
                      </span>
                    ))}
                  </div>
                )}
                {c.finalPrice != null && (
                  <p className="mt-3 text-right text-sm font-black text-slate-900 dark:text-white">
                    {ARS_FMT.format(c.finalPrice)}{c.basePrice && c.basePrice !== c.finalPrice ? <span className="ml-1 text-xs font-normal text-slate-400 line-through">{ARS_FMT.format(c.basePrice)}</span> : ''}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
