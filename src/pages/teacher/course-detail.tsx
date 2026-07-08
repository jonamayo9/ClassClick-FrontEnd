import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DocumentPreviewModal } from '@/components/ui/document-preview'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { CourseWall } from '@/components/course-wall'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'

function useSlug() {
  return useAuth((state) => state.activeCompanySlug ?? '')
}

function formatDate(value: string | null | undefined) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Course {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

interface DocItem {
  id: string
  title: string
  fileName: string
  fileUrl: string
  uploadedAtUtc: string
}

interface ReactionUser {
  id: string
  name: string
}

interface MsgItem {
  id: string
  senderName: string
  text: string
  imageUrl?: string
  isPrivate: boolean
  parentMessageId?: string | null
  reactions?: Record<string, ReactionUser[]>
  createdAtUtc: string
}

function TeacherCourseDetailInner() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const qc = useQueryClient()
  const slug = useSlug()
  const [tab, setTab] = useState<'info' | 'documentos' | 'muro'>('info')
  const [previewDoc, setPreviewDoc] = useState<DocItem | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['teacher-courses', slug],
    queryFn: () => apiService.get<Course[]>('/api/teacher/courses'),
    enabled: !!slug,
  })
  const course = courses.find((item) => item.id === id) ?? null

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['teacher-course-documents', slug, id],
    queryFn: () => apiService.get<DocItem[]>(`/api/teacher/${slug}/courses/${id}/documents`),
    enabled: !!id && !!slug,
  })

  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ['teacher-course-messages', slug, id],
    queryFn: () => apiService.get<MsgItem[]>(`/api/teacher/${slug}/courses/${id}/messages`),
    enabled: !!id && !!slug,
  })

  const sendMsgMutation = useMutation({
    mutationFn: (fd: FormData) => apiService.postForm(`/api/teacher/${slug}/courses/${id}/messages`, fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-course-messages'] })
      toast('Mensaje enviado.')
    },
    onError: () => toast('Error al enviar mensaje.', 'error'),
  })

  const reactMutation = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      apiService.post(`/api/teacher/${slug}/courses/${id}/messages/reactions`, { messageId, emoji }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teacher-course-messages'] }),
    onError: () => toast('Error al reaccionar.', 'error'),
  })

  const uploadMutation = useMutation({
    mutationFn: (fd: FormData) => apiService.postForm(`/api/teacher/${slug}/courses/${id}/documents`, fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-course-documents'] })
      setUploadTitle('')
      setUploadFile(null)
      if (fileRef.current) fileRef.current.value = ''
      toast('Documento subido.')
    },
    onError: () => toast('Error al subir documento.', 'error'),
  })

  function handleUpload(event: React.FormEvent) {
    event.preventDefault()
    if (!uploadFile) {
      toast('Selecciona un archivo.', 'error')
      return
    }

    const fd = new FormData()
    fd.append('file', uploadFile)
    if (uploadTitle.trim()) fd.append('title', uploadTitle.trim())
    uploadMutation.mutate(fd)
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-emerald-600" /></div>
  }

  if (!course) {
    return <div className="py-24 text-center text-sm text-slate-400">Curso no encontrado.</div>
  }

  const tabs = [
    { key: 'info' as const, label: 'Informacion' },
    { key: 'documentos' as const, label: 'Documentos' },
    { key: 'muro' as const, label: 'Muro' },
  ]

  return (
    <div className="space-y-5 pb-8">
      <BackButton to="/teacher/courses" label="Volver a cursos" />

      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 text-white sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">{course.name}</h1>
        {course.description && <p className="mt-1 text-sm text-emerald-100">{course.description}</p>}
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
              tab === item.key
                ? 'bg-white shadow-sm dark:bg-slate-700'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-bold">Informacion del curso</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nombre</p>
              <p className="mt-1 font-semibold">{course.name}</p>
            </div>
            {course.description && (
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Descripcion</p>
                <p className="mt-1 text-sm">{course.description}</p>
              </div>
            )}
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estado</p>
              <p className="mt-1 font-semibold">{course.isActive ? 'Activo' : 'Inactivo'}</p>
            </div>
          </div>
        </Card>
      )}

      {tab === 'documentos' && (
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          <Card className="w-full shrink-0 space-y-4 p-5 xl:w-80">
            <h2 className="text-sm font-bold">Subir documento</h2>
            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Titulo</label>
                <Input value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} placeholder="Nombre del documento" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Archivo</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium dark:border-slate-700 dark:bg-slate-800 dark:file:bg-slate-700"
                />
                <p className="mt-1 text-xs text-slate-400">JPG, PNG, WEBP o PDF. Máx 25 MB.</p>
              </div>
              <Button type="submit" loading={uploadMutation.isPending} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                Subir
              </Button>
            </form>
          </Card>

          <Card className="min-w-0 flex-1 space-y-4 p-5">
            <h2 className="text-sm font-bold">Documentos del curso</h2>
            {docsLoading ? (
              <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-emerald-600" /></div>
            ) : documents.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Sin documentos aun.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{doc.title}</p>
                      <p className="text-xs text-slate-400">{doc.fileName} - {formatDate(doc.uploadedAtUtc)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      Ver
                    </button>
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
          accent="emerald"
          privateLabel="Privado"
          onSend={(fd) => sendMsgMutation.mutate(fd)}
          onReact={(messageId, emoji) => reactMutation.mutate({ messageId, emoji })}
        />
      )}

      <DocumentPreviewModal
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.title ?? ''}
        fileUrl={previewDoc?.fileUrl ?? ''}
        fileName={previewDoc?.fileName ?? ''}
      />
    </div>
  )
}

export default function TeacherCourseDetailPage() {
  return <ToastProvider><TeacherCourseDetailInner /></ToastProvider>
}
