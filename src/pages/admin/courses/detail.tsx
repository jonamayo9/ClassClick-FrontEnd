import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { PageHero } from '@/components/ui/page-hero'
import { BackButton } from '@/components/ui/back-button'
import { DocumentPreviewModal } from '@/components/ui/document-preview'
import { CourseWall } from '@/components/course-wall'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import type { Course } from './page'

function useSlug() { return useAuth((s) => s.activeCompanySlug ?? '') }

function formatDate(v: string | null | undefined) {
  if (!v) return ''
  return new Date(v).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface DocItem { id: string; title: string; fileName: string; fileUrl: string; uploadedAtUtc: string }
interface ReactionUser { id: string; name: string }
interface MsgItem { id: string; senderName: string; text: string; imageUrl?: string; isPrivate: boolean; parentMessageId?: string | null; reactions?: Record<string, ReactionUser[]>; createdAtUtc: string }

function CourseDetailInner() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const qc = useQueryClient()
  const slug = useSlug()
  const [tab, setTab] = useState<'info' | 'alumnos' | 'documentos' | 'muro'>('info')
  const [deleteMsg, setDeleteMsg] = useState<MsgItem | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<DocItem | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [viewImage, setViewImage] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<DocItem | null>(null)
  const [tooltipMsg, setTooltipMsg] = useState<string | null>(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [assignModal, setAssignModal] = useState<{ studentId: string; name: string } | null>(null)
  const [selectedFreq, setSelectedFreq] = useState<number>(0)

  useEffect(() => {
    if (!tooltipMsg) return
    const h = () => setTooltipMsg(null)
    // Use timeout so the same click that opened the tooltip doesn't close it
    const timer = setTimeout(() => document.addEventListener('click', h), 0)
    return () => { clearTimeout(timer); document.removeEventListener('click', h) }
  }, [tooltipMsg])
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['admin-courses', slug],
    queryFn: () => apiService.get<Course[]>(`/api/admin/${slug}/courses`),
    enabled: !!slug,
  })
  const course = courses.find((c) => c.id === id) ?? null

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['admin-course-documents', slug, id],
    queryFn: () => apiService.get<DocItem[]>(`/api/admin/${slug}/courses/${id}/documents`),
    enabled: !!id && !!slug,
  })

  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ['admin-course-messages', slug, id],
    queryFn: () => apiService.get<MsgItem[]>(`/api/admin/${slug}/courses/${id}/messages`),
    enabled: !!id && !!slug,
  })

  const { data: allStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['admin-course-students', slug, id],
    queryFn: () => apiService.get<any[]>(`/api/admin/${slug}/courses/${id}/available-students`),
    enabled: !!id && !!slug,
  })

  const uploadMutation = useMutation({
    mutationFn: (fd: FormData) => apiService.postForm(`/api/admin/${slug}/courses/${id}/documents`, fd),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-course-documents'] }); setUploadTitle(''); setUploadFile(null); toast('Documento subido.') },
    onError: () => toast('Error al subir documento.', 'error'),
  })

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => apiService.del(`/api/admin/${slug}/courses/${id}/documents/${docId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-course-documents'] }); setDeleteDoc(null); toast('Documento eliminado.') },
    onError: () => toast('Error al eliminar documento.', 'error'),
  })

  const deleteMsgMutation = useMutation({
    mutationFn: (msgId: string) => apiService.del(`/api/admin/${slug}/courses/${id}/messages/${msgId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-course-messages'] }); setDeleteMsg(null); toast('Mensaje eliminado.') },
    onError: () => toast('Error al eliminar mensaje.', 'error'),
  })

  const sendMsgMutation = useMutation({
    mutationFn: (fd: FormData) => apiService.postForm(`/api/admin/${slug}/courses/${id}/messages`, fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-course-messages'] })
      toast('Mensaje enviado.')
    },
    onError: () => toast('Error al enviar mensaje.', 'error'),
  })

  const assignMut = useMutation({
    mutationFn: ({ studentIds, classesPerWeek, remove }: { studentIds: string[]; classesPerWeek: number; remove?: boolean }) => {
      const currentAssigned = allStudents.filter((s: any) => s.isAssigned).map((s: any) => ({
        studentId: s.studentId,
        classesPerWeek: s.classesPerWeek ?? classesPerWeek
      }))
      const newStudents = remove
        ? currentAssigned.filter((s: any) => !studentIds.includes(s.studentId))
        : [...currentAssigned, ...studentIds.map((id: string) => ({ studentId: id, classesPerWeek }))]
      return apiService.post(`/api/admin/${slug}/courses/${id}/students`, { students: newStudents })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-course-students'] })
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      toast('Cambios guardados correctamente.')
    },
    onError: () => toast('Error al guardar cambios.', 'error'),
  })

  const reactMutation = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      apiService.post(`/api/admin/${slug}/courses/${id}/messages/reactions`, { messageId, emoji }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-course-messages'] }),
    onError: () => toast('Error al reaccionar.', 'error'),
  })

  function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadFile) { toast('Seleccioná un archivo.', 'error'); return }
    const fd = new FormData()
    fd.append('file', uploadFile)
    if (uploadTitle.trim()) fd.append('title', uploadTitle.trim())
    uploadMutation.mutate(fd)
  }

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>
  if (!course) return <div className="py-24 text-center text-sm text-slate-400">Curso no encontrado.</div>

  const tabs = [
    { key: 'info' as const, label: 'Información' },
    { key: 'alumnos' as const, label: 'Alumnos' },
    { key: 'documentos' as const, label: 'Documentos' },
    { key: 'muro' as const, label: 'Muro' },
  ]

  return (
    <div className="space-y-5 pb-8">
      <BackButton to="/admin/courses" label="Volver a cursos" />
      <PageHero label={course.name} title={course.name} description={course.description ?? ''}
        stats={[
          { label: 'Alumnos', value: allStudents.filter((s: any) => s.isAssigned).length },
          { label: 'Documentos', value: documents.length },
          { label: 'Mensajes', value: messages.length },
        ]} />

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${tab === t.key ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <Card className="p-5 space-y-4">
          <h2 className="text-base font-bold">Información del curso</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nombre</p>
              <p className="mt-1 font-semibold">{course.name}</p>
            </div>
            {course.description && (
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Descripción</p>
                <p className="mt-1 text-sm">{course.description}</p>
              </div>
            )}
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estado</p>
              <p className="mt-1 font-semibold">{course.isActive ? 'Activo' : 'Inactivo'}</p>
            </div>
            {course.teacherName && (
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Profesor</p>
                <p className="mt-1 font-semibold">{course.teacherName}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {tab === 'alumnos' && (
        <div className="space-y-4">
          {studentsLoading ? (
            <div className="flex justify-center py-10"><Spinner className="h-6 w-6 text-violet-600" /></div>
          ) : (
            <>
              {/* Search */}
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <Input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Buscar alumnos por nombre o email..." className="flex-1" />
                </div>
              </Card>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Asignados */}
                <Card className="p-0 overflow-hidden">
                  <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-emerald-100/50 px-5 py-3 dark:from-emerald-950/30 dark:to-emerald-900/20">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Asignados</h3>
                      <span className="rounded-full bg-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-800 dark:text-emerald-300">
                        {allStudents.filter((s: any) => s.isAssigned).length}
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {allStudents.filter((s: any) => s.isAssigned && (!studentSearch || s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase()))).length === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <p className="text-3xl mb-2">👤</p>
                        <p className="text-sm text-slate-400">No hay alumnos asignados</p>
                      </div>
                    ) : allStudents.filter((s: any) => s.isAssigned && (!studentSearch || s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase()))).map((student: any) => (
                      <div key={student.studentId} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition dark:hover:bg-slate-800/50">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          {student.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{student.fullName}</p>
                          <p className="text-xs text-slate-400 truncate">{student.email}</p>
                        </div>
                        <div className="text-xs text-slate-500 shrink-0">
                          {student.classesPerWeek}x/sem
                        </div>
                        <button onClick={() => assignMut.mutate({
                          studentIds: [student.studentId],
                          classesPerWeek: 0,
                          remove: true
                        })} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition shrink-0">
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Disponibles */}
                <Card className="p-0 overflow-hidden">
                  <div className="border-b border-slate-200 bg-gradient-to-r from-violet-50 to-violet-100/50 px-5 py-3 dark:from-violet-950/30 dark:to-violet-900/20">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-violet-800 dark:text-violet-300">Disponibles</h3>
                      <span className="rounded-full bg-violet-200 px-2.5 py-0.5 text-xs font-bold text-violet-800 dark:bg-violet-800 dark:text-violet-300">
                        {allStudents.filter((s: any) => !s.isAssigned).length}
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {allStudents.filter((s: any) => !s.isAssigned && (!studentSearch || s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase()))).length === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <p className="text-3xl mb-2">🎉</p>
                        <p className="text-sm text-slate-400">Todos los alumnos están asignados</p>
                      </div>
                    ) : allStudents.filter((s: any) => !s.isAssigned && (!studentSearch || s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase()))).map((student: any) => (
                      <div key={student.studentId} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition dark:hover:bg-slate-800/50">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                          {student.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{student.fullName}</p>
                          <p className="text-xs text-slate-400 truncate">{student.email}</p>
                        </div>
                        <button onClick={() => setAssignModal({ studentId: student.studentId, name: student.fullName })}
                          className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition shrink-0">
                          Asignar
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'documentos' && (
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          <Card className="w-full shrink-0 p-5 space-y-4 xl:w-80">
            <h2 className="text-sm font-bold">Subir documento</h2>
            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Título</label>
                <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Nombre del documento" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Archivo</label>
                <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium dark:border-slate-700 dark:bg-slate-800 dark:file:bg-slate-700" />
                <p className="mt-1 text-xs text-slate-400">JPG, PNG, WEBP o PDF. Máx 25 MB.</p>
              </div>
              <Button type="submit" loading={uploadMutation.isPending} className="w-full bg-violet-600 text-white hover:bg-violet-700">Subir</Button>
            </form>
          </Card>

          <Card className="min-w-0 flex-1 p-5 space-y-4">
            <h2 className="text-sm font-bold">Documentos subidos</h2>
            {docsLoading ? (
              <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-violet-600" /></div>
            ) : documents.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Sin documentos aún.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{doc.title}</p>
                      <p className="text-xs text-slate-400">{doc.fileName} · {formatDate(doc.uploadedAtUtc)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setPreviewDoc(doc)}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">Ver</button>
                      <button onClick={() => setDeleteDoc(doc)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">Eliminar</button>
                    </div>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'muro' && (
        <CourseWall
          messages={messages}
          loading={msgsLoading}
          sending={sendMsgMutation.isPending}
          reacting={reactMutation.isPending}
          canDelete
          accent="violet"
          privateLabel="Privado"
          onSend={(fd) => sendMsgMutation.mutate(fd)}
          onReact={(messageId, emoji) => reactMutation.mutate({ messageId, emoji })}
          onDelete={(message) => setDeleteMsg(message)}
        />
      )}

      {viewImage && (
        <Modal open={!!viewImage} onClose={() => setViewImage(null)} title="Imagen">
          <div className="p-4">
            <img src={viewImage} alt="Imagen" className="w-full rounded-xl" />
          </div>
        </Modal>
      )}

      <DocumentPreviewModal open={!!previewDoc} onClose={() => setPreviewDoc(null)}
        title={previewDoc?.title ?? ''} fileUrl={previewDoc?.fileUrl ?? ''} fileName={previewDoc?.fileName ?? ''} />

      <ConfirmModal open={!!deleteDoc} onClose={() => setDeleteDoc(null)} title="Eliminar documento"
        message={deleteDoc ? `¿Eliminar "${deleteDoc.title}"?` : ''}
        confirmText="Eliminar" variant="danger" loading={deleteDocMutation.isPending}
        onConfirm={() => { if (deleteDoc) deleteDocMutation.mutate(deleteDoc.id) }} />

      <ConfirmModal open={!!deleteMsg} onClose={() => setDeleteMsg(null)} title="Eliminar mensaje"
        message={deleteMsg ? `¿Eliminar el mensaje de ${deleteMsg.senderName}?` : ''}
        confirmText="Eliminar" variant="danger" loading={deleteMsgMutation.isPending}
        onConfirm={() => { if (deleteMsg) deleteMsgMutation.mutate(deleteMsg.id) }} />

      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setAssignModal(null); setSelectedFreq(0) }}>
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Asignar alumno</h3>
            <p className="mt-1 text-sm text-slate-500">Seleccioná la frecuencia semanal de <span className="font-semibold text-slate-900 dark:text-white">{assignModal.name}</span></p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(course.classesPerWeekOptions ?? [1, 2, 3, 4, 5]).map((n: number) => (
                <button key={n} onClick={() => setSelectedFreq(n)}
                  className={`rounded-xl border-2 py-3 text-sm font-bold transition ${selectedFreq === n ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:border-violet-200 hover:bg-violet-50'}`}>
                  {n}x por semana
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => { setAssignModal(null); setSelectedFreq(0) }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={() => { if (selectedFreq > 0) { assignMut.mutate({ studentIds: [assignModal.studentId], classesPerWeek: selectedFreq }); setAssignModal(null); setSelectedFreq(0) } }}
                disabled={selectedFreq <= 0}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CourseDetailPage() { return <ToastProvider><CourseDetailInner /></ToastProvider> }
