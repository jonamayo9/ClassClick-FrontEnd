import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

function useSlug() { return useAuth((s) => s.activeCompanySlug ?? '') }

interface Course { id: string; name: string; description: string | null; isActive: boolean }

export default function TeacherHomePage() {
  const slug = useSlug()
  const navigate = useNavigate()

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['teacher-courses', slug],
    queryFn: () => apiService.get<Course[]>(`/api/teacher/courses`),
    enabled: !!slug,
  })

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-emerald-600" /></div>

  return (
    <div className="space-y-5 pb-8">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 text-white sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Panel del docente</h1>
        <p className="mt-1 text-sm text-emerald-200">Tus cursos y asistencias</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/15 p-3 backdrop-blur-sm">
            <div className="text-2xl font-black">{courses.length}</div>
            <div className="text-xs text-emerald-200">Cursos</div>
          </div>
          <div className="rounded-xl bg-white/15 p-3 backdrop-blur-sm">
            <div className="text-2xl font-black">{courses.filter((c) => c.isActive).length}</div>
            <div className="text-xs text-emerald-200">Activos</div>
          </div>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Accesos rápidos</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/teacher/attendance')}
            className="rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
            <span className="text-2xl">✅</span>
            <p className="mt-1 text-sm font-bold">Asistencia</p>
            <p className="text-xs text-slate-400">Tomar asistencia</p>
          </button>
          <button onClick={() => navigate('/teacher/courses')}
            className="rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
            <span className="text-2xl">📚</span>
            <p className="mt-1 text-sm font-bold">Mis cursos</p>
            <p className="text-xs text-slate-400">Ver cursos y materiales</p>
          </button>
        </div>
      </Card>

      {courses.length > 0 && (
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Tus cursos</h2>
          <div className="space-y-2">
            {courses.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{c.name}</p>
                  {c.description && <p className="text-xs text-slate-400 truncate">{c.description}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${c.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                  {c.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/teacher/courses')} className="w-full">Ver todos</Button>
        </Card>
      )}
    </div>
  )
}
