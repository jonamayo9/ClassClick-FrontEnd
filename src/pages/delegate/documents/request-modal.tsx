import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { SelectField } from '@/components/ui/select-field'
import { useToast } from '@/components/ui/toast'
import type { DocRow, DocType } from './types'

interface RequestResult { assignmentsCreated: number; assignmentsSkipped: number }

export function RequestDocumentModal({
  slug, mode, docTypes, activeTypeIds, studentId, studentName, defaultCourseId, courses, onClose, onDone,
}: {
  slug: string
  mode: 'individual' | 'course'
  docTypes: DocType[]
  activeTypeIds?: string[]
  studentId?: string
  studentName?: string
  defaultCourseId?: string
  courses?: { id: string; name: string }[]
  onClose: () => void
  onDone: () => void
}) {
  const toast = useToast()
  const [docTypeId, setDocTypeId] = useState('')
  const [note, setNote] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [courseId, setCourseId] = useState(defaultCourseId ?? '')
  const [target, setTarget] = useState<'all' | 'selected'>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [studentSearch, setStudentSearch] = useState('')

  const availableTypes = docTypes.filter((t) => !activeTypeIds?.includes(t.id))
  const selectedType = docTypes.find((t) => t.id === docTypeId)
  const requiresExpiration = !!selectedType?.hasExpiration

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['delegate-docs-course-students', slug, courseId],
    queryFn: () => apiService.get<DocRow[]>(`/api/delegate/${slug}/documents?courseId=${courseId}`),
    enabled: mode === 'course' && !!courseId && target === 'selected',
  })

  const mutation = useMutation({
    mutationFn: async (): Promise<RequestResult> => {
      const expirationDateUtc = expirationDate
        ? new Date(`${expirationDate}T00:00:00Z`).toISOString()
        : undefined

      const body = (over: Record<string, unknown>) => ({
        documentTypeId: docTypeId,
        note: note.trim() || undefined,
        expirationDateUtc,
        ...over,
      })

      if (mode === 'individual') {
        const res = await apiService.post<RequestResult>(`/api/delegate/${slug}/documents/requests`, body({ scope: 'Individual', studentId }))
        return { assignmentsCreated: res?.assignmentsCreated ?? 1, assignmentsSkipped: res?.assignmentsSkipped ?? 0 }
      }

      if (target === 'all') {
        const res = await apiService.post<RequestResult>(`/api/delegate/${slug}/documents/requests`, body({ scope: 'Course', courseId }))
        return { assignmentsCreated: res?.assignmentsCreated ?? 1, assignmentsSkipped: res?.assignmentsSkipped ?? 0 }
      }

      let created = 0
      let skipped = 0
      for (const sid of selectedIds) {
        const res = await apiService.post<RequestResult>(`/api/delegate/${slug}/documents/requests`, body({ scope: 'Individual', studentId: sid }))
        created += res?.assignmentsCreated ?? 1
        skipped += res?.assignmentsSkipped ?? 0
      }
      return { assignmentsCreated: created, assignmentsSkipped: skipped }
    },
    onSuccess: (result) => {
      const skippedNote = result.assignmentsSkipped > 0
        ? ` (${result.assignmentsSkipped} ya tenían solicitud activa)`
        : ''
      if (mode === 'individual') {
        toast(`Documento solicitado.${skippedNote}`)
      } else {
        toast(`Solicitud enviada a ${result.assignmentsCreated} ${result.assignmentsCreated === 1 ? 'alumno' : 'alumnos'}.${skippedNote}`)
      }
      onDone()
      onClose()
    },
    onError: () => toast('Error al solicitar el documento.', 'error'),
  })

  const filteredStudents = students.filter((s) =>
    s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.dni ?? '').toLowerCase().includes(studentSearch.toLowerCase()))

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const canSubmit = !!docTypeId && (
    mode === 'individual'
      ? !!studentId
      : !!courseId && (target === 'all' || selectedIds.length > 0)
  )

  return (
    <Modal open onClose={onClose} title={mode === 'individual' ? 'Solicitar documento' : 'Solicitar documentos'} className="sm:max-w-lg">
      <div className="space-y-4 px-5 py-4 sm:px-6">
        {mode === 'individual' && studentName && (
          <p className="text-sm text-slate-500">
            Alumno: <span className="font-semibold text-slate-900 dark:text-white">{studentName}</span>
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-bold">Tipo de documento *</label>
          {availableTypes.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Ya se solicitaron todos los documentos disponibles.
            </p>
          ) : (
            <SelectField value={docTypeId} onValueChange={(v) => { setDocTypeId(v); setExpirationDate('') }} placeholder="Seleccionar tipo..."
              options={availableTypes.map((t) => ({ value: t.id, label: t.name }))} />
          )}
        </div>

        {requiresExpiration && (
          <div>
            <label className="mb-1 block text-sm font-bold">Fecha de vencimiento (opcional)</label>
            <Input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
            <p className="mt-1 text-xs text-slate-400">
              Si no la cargás ahora, el alumno deberá ingresarla al subir el documento.
            </p>
          </div>
        )}

        {mode === 'course' && (
          <div>
            <label className="mb-1 block text-sm font-bold">Curso *</label>
            <SelectField value={courseId} onValueChange={(v) => { setCourseId(v); setSelectedIds([]) }} placeholder="Seleccionar curso..."
              options={(courses ?? []).map((c) => ({ value: c.id, label: c.name }))} />
          </div>
        )}

        {mode === 'course' && courseId && (
          <div>
            <div className="mb-1 flex gap-3">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <input type="radio" checked={target === 'all'} onChange={() => setTarget('all')} className="accent-blue-600" />
                Todos los alumnos del curso
              </label>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <input type="radio" checked={target === 'selected'} onChange={() => setTarget('selected')} className="accent-blue-600" />
                Seleccionar alumnos
              </label>
            </div>

            {target === 'selected' && (
              <div className="space-y-2">
                <Input placeholder="Buscar alumno..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                {studentsLoading ? (
                  <p className="py-4 text-center text-sm text-slate-400">Cargando alumnos...</p>
                ) : filteredStudents.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">No hay alumnos en este curso.</p>
                ) : (
                  <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                    {filteredStudents.map((s) => (
                      <label key={s.studentId} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                        <input type="checkbox" checked={selectedIds.includes(s.studentId)} onChange={() => toggleStudent(s.studentId)} className="accent-blue-600" />
                        <span className="truncate">{s.fullName}</span>
                        {s.dni && <span className="ml-auto shrink-0 text-xs text-slate-400">DNI {s.dni}</span>}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-bold">Nota (opcional)</label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Detalle de la solicitud..." />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button loading={mutation.isPending} disabled={!canSubmit || availableTypes.length === 0}
            className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => mutation.mutate()}>
            {mode === 'individual' ? 'Solicitar' : 'Solicitar documentos'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
