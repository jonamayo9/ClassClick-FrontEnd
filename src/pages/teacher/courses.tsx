import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

function useSlug() { return useAuth((s) => s.activeCompanySlug ?? '') }

interface Course { id: string; name: string; description: string | null; isActive: boolean }

export default function TeacherCoursesPage() {
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
        <h1 className="text-xl font-black sm:text-2xl">Mis cursos</h1>
        <p className="mt-1 text-sm text-emerald-200">Cursos que dictás</p>
      </div>

      {courses.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-400">No tenés cursos asignados.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{c.name}</h3>
                  {c.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{c.description}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {c.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <Button variant="outline" size="sm" onClick={() => navigate(`/teacher/courses/${c.id}`)}>Ver detalle</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
