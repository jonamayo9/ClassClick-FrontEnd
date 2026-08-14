import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/card'

interface DelegateCourse {
  id: string
  name: string
}

export default function DelegateHomePage() {
  const slug = useAuth((s) => s.activeCompanySlug) ?? ''
  const { data: courses, isLoading } = useQuery({
    queryKey: ['delegate-courses', slug],
    queryFn: () => apiService.get<DelegateCourse[]>(`/api/delegate/${slug}/courses`),
    enabled: !!slug,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black sm:text-2xl">Panel del Delegado</h1>
        <p className="mt-1 text-sm text-slate-500">Vista limitada a tus cursos asignados.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(courses ?? []).map((course) => (
            <Card key={course.id} className="p-4">
              <div className="text-sm font-bold text-slate-900 dark:text-white">{course.name}</div>
            </Card>
          ))}
          {courses?.length === 0 && (
            <Card className="p-6 text-sm text-slate-500">No tenés cursos asignados todavía.</Card>
          )}
        </div>
      )}
    </div>
  )
}
