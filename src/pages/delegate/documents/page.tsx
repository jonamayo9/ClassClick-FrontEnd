import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/select-field'
import { DelegateDocumentsModal } from './documents-modal'
import { RequestDocumentModal } from './request-modal'
import type { DocRow, DocType } from './types'

function initials(name: string) { return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() }

const DOC_STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending', label: 'Con pendientes' },
  { value: 'expired', label: 'Vencidos' },
  { value: 'rejected', label: 'Rechazados' },
  { value: 'complete', label: 'Completos' },
]

export default function DelegateDocumentsPage() {
  const slug = useAuth((s) => s.activeCompanySlug) ?? ''
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const [courseId, setCourseId] = useState('')
  const [docStatus, setDocStatus] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  const { data: courses = [] } = useQuery({
    queryKey: ['delegate-courses', slug],
    queryFn: () => apiService.get<{ id: string; name: string }[]>(`/api/delegate/${slug}/courses`),
    enabled: !!slug,
  })

  const { data: docTypes = [] } = useQuery({
    queryKey: ['delegate-doc-types', slug],
    queryFn: () => apiService.get<DocType[]>(`/api/delegate/${slug}/documents/types`),
    enabled: !!slug,
  })

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['delegate-documents', slug, term, courseId, docStatus],
    queryFn: () => {
      const p = new URLSearchParams()
      if (term) p.set('search', term)
      if (courseId) p.set('courseId', courseId)
      if (docStatus) p.set('status', docStatus)
      const q = p.toString()
      return apiService.get<DocRow[]>(`/api/delegate/${slug}/documents${q ? `?${q}` : ''}`)
    },
    enabled: !!slug,
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['delegate-documents'] })

  const needsAttention = (r: DocRow) => r.pendingCount > 0 || r.expiredCount > 0 || r.rejectedCount > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-black sm:text-2xl">Documentos</h1>
          <p className="mt-1 text-sm text-slate-500">Estado documental de los alumnos de tus cursos asignados.</p>
        </div>
        <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setRequestOpen(true)}>
          Solicitar documentos
        </Button>
      </div>

      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
        <Input placeholder="Buscar por nombre, apellido o DNI..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:flex-1 sm:min-w-[160px] sm:max-w-[240px]" />
        <div className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:gap-2">
          <div className="sm:w-44">
            <SelectField value={courseId} onValueChange={setCourseId} placeholder="Curso" aria-label="Curso"
              options={[{ value: '', label: 'Todos los cursos' }, ...courses.map((c) => ({ value: c.id, label: c.name }))]} />
          </div>
          <div className="sm:w-40">
            <SelectField value={docStatus} onValueChange={setDocStatus} placeholder="Estado documental" aria-label="Estado documental"
              options={DOC_STATUS_OPTIONS} />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-blue-600" /></div>
      ) : rows.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">No se encontraron alumnos con estos filtros.</Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.studentId} className={`p-4 ${needsAttention(r) ? 'ring-1 ring-amber-300 dark:ring-amber-700' : ''}`}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {initials(r.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-slate-900 dark:text-white">{r.fullName}</div>
                  <div className="truncate text-xs text-slate-500">{r.dni ? `DNI ${r.dni}` : r.email}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {r.courseNames.map((c) => <span key={c} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{c}</span>)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-700">Pend. {r.pendingCount}</span>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 ring-1 ring-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:ring-blue-700">Enviados {r.submittedCount}</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-700">Vigentes {r.approvedCount}</span>
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-300 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700">Rech. {r.rejectedCount}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600">Vencidos {r.expiredCount}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedStudentId(r.studentId)}>Ver documentos</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedStudentId && (
        <DelegateDocumentsModal slug={slug} studentId={selectedStudentId} onClose={() => setSelectedStudentId(null)} />
      )}

      {requestOpen && (
        <RequestDocumentModal
          slug={slug}
          mode="course"
          docTypes={docTypes}
          courses={courses}
          onClose={() => setRequestOpen(false)}
          onDone={refresh}
        />
      )}
    </div>
  )
}
