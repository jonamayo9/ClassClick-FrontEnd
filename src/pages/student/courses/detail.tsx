import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { CourseWall } from '@/components/course-wall'
import { apiService } from '@/lib/api'
import { imgUrl } from '@/lib/media'
import { useAuth } from '@/stores/auth'
import { useStudentCourses, useCourseAttendance, useCourseDocuments } from '../student.hooks'
import type { StudentCourse } from '../student.hooks'

const ARS_FMT = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

function formatDate(v: string | null | undefined) {
  if (!v) return ''
  return new Date(v).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type Tab = 'info' | 'asistencias' | 'documentos' | 'muro'

interface ReactionUser { id: string; name: string }
interface CourseMessage {
  id: string
  senderName: string
  text: string
  imageUrl?: string
  isPrivate: boolean
  parentMessageId?: string | null
  reactions?: Record<string, ReactionUser[]>
  createdAtUtc: string
}

function CourseDetailInner() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'info')
  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null
    if (t && ['info', 'asistencias', 'documentos', 'muro'].includes(t)) setTab(t)
  }, [searchParams])
  const { data: courses = [] } = useStudentCourses()
  const course = courses.find((c) => c.id === id) ?? null
  const { data: attendance = [] } = useCourseAttendance(id ?? null)
  const { data: documents = [] } = useCourseDocuments(id ?? null)

  const { data: messages = [] } = useQuery({
    queryKey: ['course-messages', slug(), id],
    queryFn: () => apiService.get<CourseMessage[]>(`/api/student/${slug()}/courses/${id}/messages`),
    enabled: !!id && !!slug(),
    select: (d: unknown) => {
      if (Array.isArray(d)) return d as CourseMessage[]
      const r = d as { items?: CourseMessage[]; data?: CourseMessage[] }
      return r.items ?? r.data ?? []
    },
  })

  const sendMsg = useMutation({
    mutationFn: (formData: FormData) =>
      apiService.postForm(`/api/student/${slug()}/courses/${id}/messages`, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-messages'] })
      toast('Mensaje enviado.')
    },
  })

  const reactMutation = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      apiService.post(`/api/student/${slug()}/courses/${id}/messages/reactions`, { messageId, emoji }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-messages'] }),
    onError: () => toast('Error al reaccionar.', 'error'),
  })

  if (!id) return null

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'info', label: 'Información', icon: '📋' },
    { key: 'asistencias', label: 'Asistencias', icon: '✅' },
    { key: 'documentos', label: 'Documentos', icon: '📄' },
    { key: 'muro', label: 'Muro', icon: '📌' },
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <button onClick={() => navigate('/student/courses')} className="mb-3 inline-flex items-center gap-1 text-xs text-blue-200 hover:text-white">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Volver a cursos
        </button>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{course?.name ?? 'Curso'}</h1>
        {course?.teacherFullName && <p className="mt-1 text-sm text-blue-200">Profesor: {course.teacherFullName}</p>}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition ${
              tab === t.key
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}>
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && course && <InfoTab course={course} />}
      {tab === 'asistencias' && <AttendanceTab attendance={attendance} />}
      {tab === 'documentos' && <DocumentsTab documents={documents} />}
      {tab === 'muro' && (
        <CourseWall
          messages={messages}
          sending={sendMsg.isPending}
          reacting={reactMutation.isPending}
          accent="blue"
          privateLabel="Solo lo ve el profesor"
          imageUrl={(url) => imgUrl(url) ?? url}
          onSend={(fd) => sendMsg.mutate(fd)}
          onReact={(messageId, emoji) => reactMutation.mutate({ messageId, emoji })}
        />
      )}

    </div>
  )
}

function InfoTab({ course }: { course: StudentCourse }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {course.teacherFullName && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Profesor</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{course.teacherFullName}</p>
          </div>
        )}
        {course.classesPerWeek && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Clases/semana</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{course.classesPerWeek}</p>
          </div>
        )}
        {course.finalPrice != null && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Precio</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
              {ARS_FMT.format(course.finalPrice)}
              {course.basePrice && course.basePrice !== course.finalPrice ? <span className="ml-1 text-xs text-slate-400 line-through">{ARS_FMT.format(course.basePrice)}</span> : ''}
            </p>
          </div>
        )}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estado</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{course.isActive !== false ? 'Activo' : 'Inactivo'}</p>
        </div>
      </div>
      {course.description && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Descripción</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{course.description}</p>
        </div>
      )}
      {course.schedules && course.schedules.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Horarios</p>
          {course.schedules.map((s, i) => (
            <p key={i} className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {daysOfWeek[s.dayOfWeek ?? 0]}: {s.startTime ?? ''} - {s.endTime ?? ''}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function AttendanceTab({ attendance }: { attendance: { date: string; present: boolean }[] }) {
  const present = attendance.filter((a) => a.present).length
  const absent = attendance.filter((a) => !a.present).length

  if (attendance.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">
        Sin registro de asistencias.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Presentes</p>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{present}</p>
        </div>
        <div className="flex-1 rounded-xl border border-red-200 bg-red-50 p-3 text-center dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-[10px] font-bold uppercase text-red-600 dark:text-red-400">Ausentes</p>
          <p className="text-xl font-black text-red-700 dark:text-red-300">{absent}</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700">
        {[...attendance].reverse().map((a, i) => (
          <div key={i} className={`flex items-center justify-between px-4 py-2.5 text-sm ${i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/30'}`}>
            <span className="text-slate-600 dark:text-slate-400">{formatDate(a.date)}</span>
            <span className={`font-semibold ${a.present ? 'text-emerald-600' : 'text-red-500'}`}>{a.present ? 'Presente' : 'Ausente'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DocumentsTab({ documents }: { documents: { id: string; title: string; fileName: string; fileUrl?: string; uploadedAtUtc?: string }[] }) {
  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">
        El profesor aún no ha compartido documentos en este curso.
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {documents.map((d) => (
        <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{d.title || d.fileName}</p>
            {d.uploadedAtUtc && <p className="text-xs text-slate-400">{formatDate(d.uploadedAtUtc)}</p>}
          </div>
          {d.fileUrl && (
            <a href={d.fileUrl} target="_blank" rel="noopener noreferrer"
              className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
              Descargar
            </a>
          )}
        </div>
      ))}
    </div>
  )
}

export default function CourseDetailPage() {
  return <ToastProvider><CourseDetailInner /></ToastProvider>
}
