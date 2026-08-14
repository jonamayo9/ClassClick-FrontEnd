import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/select-field'

export interface DelegateStudentCourse { id: string; name: string }
export interface DelegateStudent {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string | null
  dni: string | null
  dateOfBirth: string | null
  phone: string | null
  address: string | null
  isActive: boolean
  isRegistrationCompleted: boolean
  memberNumber: string | null
  financialStatus: string
  visibleCourses: DelegateStudentCourse[]
}

const FINANCIAL: Record<string, { label: string; classes: string }> = {
  upToDate: { label: 'Al día', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
  pendingDebt: { label: 'Deuda pendiente', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  overdueDebt: { label: 'Con deuda vencida', classes: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
}

function initials(name: string) { return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() }

const avatarColors = ['bg-blue-500', 'bg-cyan-500', 'bg-sky-500', 'bg-indigo-500', 'bg-teal-500']

function avatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return avatarColors[Math.abs(h) % avatarColors.length]
}

export default function DelegateStudentsPage() {
  const slug = useAuth((s) => s.activeCompanySlug) ?? ''
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const [courseId, setCourseId] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => { setTerm(search.trim()); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const { data: courses = [] } = useQuery({
    queryKey: ['delegate-courses', slug],
    queryFn: () => apiService.get<{ id: string; name: string }[]>(`/api/delegate/${slug}/courses`),
    enabled: !!slug,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['delegate-students', slug, term, courseId, page],
    queryFn: () => {
      const p = new URLSearchParams()
      if (courseId) p.set('courseId', courseId)
      if (term) p.set('search', term)
      p.set('page', String(page))
      p.set('pageSize', '20')
      return apiService.get<{ items: DelegateStudent[]; totalCount: number; totalPages: number }>(`/api/delegate/${slug}/students?${p.toString()}`)
    },
    enabled: !!slug,
  })

  const students = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black sm:text-2xl">Alumnos</h1>
        <p className="mt-1 text-sm text-slate-500">Solo alumnos de tus cursos asignados.</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <div className="w-full sm:w-44">
          <SelectField value={courseId} onValueChange={(v) => { setCourseId(v); setPage(1) }} placeholder="Curso" aria-label="Curso"
            options={[{ value: '', label: 'Todos los cursos' }, ...courses.map((c) => ({ value: c.id, label: c.name }))]} />
        </div>
        <Input placeholder="Buscar por nombre, apellido o DNI..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-[220px]" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-blue-600" /></div>
      ) : students.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">No se encontraron alumnos para estos filtros.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => {
            const fin = FINANCIAL[s.financialStatus] ?? FINANCIAL.upToDate
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(s.fullName)}`}>
                    {initials(s.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-slate-900 dark:text-white">{s.fullName}</div>
                    <div className="truncate text-xs text-slate-500">{s.dni ? `DNI ${s.dni}` : s.email ?? '—'}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                    {s.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${fin.classes}`}>{fin.label}</span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {s.visibleCourses.map((c) => (
                    <span key={c.id} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{c.name}</span>
                  ))}
                  {s.visibleCourses.length === 0 && <span className="text-[10px] text-slate-400">Sin cursos visibles</span>}
                </div>

                <div className="mt-3 flex items-center justify-end">
                  <Link to={`/delegate/students/${s.id}`} className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400">Ver alumno</Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
          </div>
        </div>
      )}
    </div>
  )
}
