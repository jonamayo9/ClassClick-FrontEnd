import { useState, useRef, useCallback, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { DocumentReviewDialog } from '@/components/ui/document-review-dialog'
import { Pagination } from '@/components/ui/pagination'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { usePermission } from '@/hooks/usePermission'
import { config } from '@/lib/config'
import {
  Bell, Plus, Search, RotateCcw, Eye, ChevronRight,
  Users, CheckCircle2, Clock3, AlertCircle,
} from 'lucide-react'
import {
  useCourses, useDocumentTypes, useStudents, useStudentsAll, useRecordsSummary,
  useStudentDetail, useStudentCourses, useStudentEconomic, useStudentLegajo,
  useCreateDocumentRequest, useAllDocuments, useDownloadFile,
  useDeleteAssignment,
  formatDateOnly, getStatusLabel, getStatusBadgeClass,
} from './hooks'
import type { Student, StudentDocument, RecordsSummary } from './hooks'

const PAGE_SIZE = 10
function slug() { return useAuth.getState().activeCompanySlug ?? '' }

/** "Curso" es del vertical Deportivo; en Educativa se oculta el filtro y no se consulta. */
function isEducativaContext() {
  return useAuth.getState().companies.find((c) => (c.slug ?? c.companySlug) === slug())?.vertical === 'Educativa'
}

async function downloadBlob(url: string, fileName: string) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error()
    const blob = await res.blob()
    const objUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objUrl)
  } catch {
    /* Silently fail */
  }
}

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x.charAt(0).toUpperCase()).join('') || '?'
}

export default function RecordsPage() {
  const qc = useQueryClient()
  const isEducativa = isEducativaContext()
  const canEconomic = usePermission(isEducativa ? 'cuotas' : undefined)
  const [pageTab, setPageTab] = useState<'records' | 'documents'>('records')

  // Filtros server-side (Legajos)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [courseId, setCourseId] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [documentStatus, setDocumentStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const searchTimer = useRef<number | undefined>(undefined)

  function onSearchChange(v: string) {
    setSearchInput(v)
    clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => { setSearch(v); setPage(1) }, 300)
  }
  function resetFilters() {
    clearTimeout(searchTimer.current)
    setSearchInput(''); setSearch(''); setCourseId(''); setActiveFilter(''); setDocumentStatus(''); setPage(1)
  }

  const filters = { search, courseId, isActive: activeFilter, documentStatus, page, pageSize }
  const { data: studentsData, isLoading, error } = useStudents(filters)
  const students = studentsData?.items ?? []
  const totalCount = studentsData?.totalCount ?? 0
  const { data: summary } = useRecordsSummary()
  const { data: courses = [] } = useCourses()
  const { data: documentTypes = [] } = useDocumentTypes()

  const [showRequestModal, setShowRequestModal] = useState(false)
  const { data: allStudents = [] } = useStudentsAll(showRequestModal)

  const [showDetailId, setShowDetailId] = useState<string | null>(null)
  const [reviewDoc, setReviewDoc] = useState<StudentDocument | null>(null)
  const [deleteConfirmAssignmentId, setDeleteConfirmAssignmentId] = useState<{ id: string; name: string; fileCount: number } | null>(null)
  const deleteAssignment = useDeleteAssignment()
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([])

  const toastId = useRef(0)
  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId.current
    setToasts((p) => [...p, { id, message: msg, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500)
  }, [])

  const notifyPendingMutation = useMutation({
    mutationFn: () => apiService.post(`/api/admin/${slug()}/student-files/notify-pending`),
    onSuccess: (data: unknown) => {
      const notified = (data as Record<string, unknown>)?.notified ?? 0
      toast(`Notificaciones enviadas a ${notified} alumno(s).`)
      qc.invalidateQueries({ queryKey: ['records-summary'] })
    },
    onError: () => toast('Error al notificar.', 'error'),
  })
  function handleNotifyPending() { notifyPendingMutation.mutate() }

  const { data: detail, isLoading: detailLoading } = useStudentDetail(showDetailId)
  const createRequest = useCreateDocumentRequest()

  const requiredDocCount = Math.max(1, documentTypes.filter((d) => d.isRequired).length || documentTypes.length)

  function renderRecordsContent() {
    return (
      <div className="space-y-4">
        {/* Filtros */}
        <Card className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-10" placeholder="Buscar alumno por nombre, apellido, DNI o email..."
                value={searchInput} onChange={(e) => onSearchChange(e.target.value)} />
            </div>
            {!isEducativa && (
              <div className="lg:w-48">
                <Select value={courseId} onChange={(e) => { setCourseId(e.target.value); setPage(1) }}>
                  <option value="">Todos los cursos</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
            )}
            <div className="lg:w-40">
              <Select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }}>
                <option value="">Todos los alumnos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </Select>
            </div>
            <div className="lg:w-52">
              <Select value={documentStatus} onChange={(e) => { setDocumentStatus(e.target.value); setPage(1) }}>
                <option value="">Toda la documentación</option>
                <option value="ontime">Al día</option>
                <option value="pending">Pendientes</option>
                <option value="expiring">Próximos a vencer</option>
                <option value="expired">Vencidos</option>
                <option value="rejected">Rechazados</option>
                <option value="none">Sin documentos</option>
              </Select>
            </div>
            <Button variant="outline" className="h-11 shrink-0" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4" /> Limpiar
            </Button>
          </div>

          {/* Chips rápidos (sincronizados con el filtro de estado documental) */}
          <div className="mt-3 flex flex-wrap gap-2">
            {([
              { key: 'pending', label: 'Pendientes', active: 'bg-amber-100 text-amber-700 ring-2 ring-amber-300 dark:bg-amber-500/20 dark:text-amber-300' },
              { key: 'expiring', label: 'Próximos a vencer', active: 'bg-blue-100 text-blue-700 ring-2 ring-blue-300 dark:bg-blue-500/20 dark:text-blue-300' },
              { key: 'expired', label: 'Vencidos', active: 'bg-rose-100 text-rose-700 ring-2 ring-rose-300 dark:bg-rose-500/20 dark:text-rose-300' },
            ] as const).map((chip) => {
              const isActive = documentStatus === chip.key
              return (
                <button key={chip.key} type="button"
                  onClick={() => { setDocumentStatus(isActive ? '' : chip.key); setPage(1) }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${isActive ? chip.active : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}>
                  {chip.label}
                </button>
              )
            })}
          </div>
        </Card>

        {isLoading ? (
          <Card className="p-6"><div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div></Card>
        ) : error ? (
          <Card className="p-6 text-center text-sm text-rose-600 dark:text-rose-400">No se pudieron cargar los legajos. Intentá nuevamente.</Card>
        ) : students.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sin resultados</p>
            <p className="mt-1 text-xs text-slate-400">Probá cambiando los filtros o limpialos.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            {/* Desktop */}
            <div className="hidden md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-[0.4px] text-slate-400 dark:border-slate-800">
                    <th className="px-4 py-3">Alumno</th>
                    <th className="px-4 py-3">{isEducativa ? 'Formación' : 'Curso'}</th>
                    <th className="px-4 py-3">Documentación</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {students.map((s) => {
                    const st = studentDocStatus(s)
                    const pct = Math.min(100, Math.round((s.approvedCount / requiredDocCount) * 100))
                    return (
                      <tr key={s.studentId} onClick={() => setShowDetailId(s.studentId)}
                        className="cursor-pointer transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{initials(s.fullName)}</div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{s.fullName || '-'}</p>
                              <p className="truncate text-xs text-slate-400">{s.memberNumber || s.dni || s.email || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-slate-500 dark:text-slate-400">{s.courseName || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="w-40">
                            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                              <span>{s.approvedCount} de {requiredDocCount}</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span></td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end">
                            <IconButton label="Ver legajo" onClick={() => setShowDetailId(s.studentId)}><Eye className="h-4 w-4" /></IconButton>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {students.map((s) => {
                const st = studentDocStatus(s)
                const pct = Math.min(100, Math.round((s.approvedCount / requiredDocCount) * 100))
                return (
                  <div key={s.studentId} role="button" tabIndex={0}
                    onClick={() => setShowDetailId(s.studentId)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowDetailId(s.studentId) } }}
                    className="cursor-pointer p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{initials(s.fullName)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{s.fullName || '-'}</p>
                        <p className="truncate text-xs text-slate-400">{s.memberNumber || s.dni || s.email || '-'}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                      {s.courseName && <span className="truncate text-[11px] text-slate-400">{s.courseName}</span>}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
                      <span className="text-[11px] text-slate-400">{s.approvedCount}/{requiredDocCount}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
              <Pagination page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage} loading={isLoading}
                showPageNumbers pageSizeOptions={[10, 20, 50]} onPageSizeChange={(n) => { setPageSize(n); setPage(1) }} />
            </div>
          </Card>
        )}
      </div>
    )
  }

  function renderDocumentsContent() {
    return (
      <MainDocumentsView
        courses={courses}
        documentTypes={documentTypes}
        onOpenDetail={(id: string) => setShowDetailId(id)}
        onReview={(doc: StudentDocument) => setReviewDoc(doc)}
        toast={toast}
      />
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-white sm:text-[26px]">Legajos</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-[13px]">Gestioná la documentación y el estado de los legajos de tus alumnos.</p>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <Button variant="outline" className="h-11 w-full sm:h-10 sm:w-auto" onClick={handleNotifyPending} loading={notifyPendingMutation.isPending}>
            <Bell className="h-4 w-4" /> Notificar pendientes
          </Button>
          <Button className="h-11 w-full bg-blue-600 text-white hover:bg-blue-500 sm:h-10 sm:w-auto" onClick={() => setShowRequestModal(true)}>
            <Plus className="h-4 w-4" /> Solicitar documentos
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <RecordsKpis summary={summary} />

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => setPageTab('records')}
          className={`-mb-px border-b-2 pb-2.5 text-sm font-semibold transition ${pageTab === 'records' ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
          Legajos
        </button>
        <button onClick={() => setPageTab('documents')}
          className={`-mb-px border-b-2 pb-2.5 text-sm font-semibold transition ${pageTab === 'documents' ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
          Documentos
        </button>
      </div>

      {pageTab === 'records' && renderRecordsContent()}
      {pageTab === 'documents' && renderDocumentsContent()}

      {/* MODALS / DRAWERS */}
      {showRequestModal && (
        <RequestModal documentTypes={documentTypes} students={allStudents}
          isSubmitting={createRequest.isPending} serverError={createRequest.error}
          onSubmit={async (data) => {
            try {
              if (data.scope === 'all') {
                await createRequest.mutateAsync({ documentTypeId: data.documentTypeId, scope: 3, studentId: null, courseId: null, note: data.note, isMandatory: data.isMandatory, dueDateUtc: data.dueDateUtc })
              } else if (data.studentIds) {
                for (const sid of data.studentIds) {
                  await createRequest.mutateAsync({ documentTypeId: data.documentTypeId, scope: 1, studentId: sid, courseId: null, note: data.note, isMandatory: data.isMandatory, dueDateUtc: data.dueDateUtc })
                }
              }
              setShowRequestModal(false); toast('Solicitud enviada correctamente.')
            } catch { toast('Error al enviar la solicitud.', 'error') }
          }}
          onClose={() => { if (!createRequest.isPending) setShowRequestModal(false) }} />
      )}

      {showDetailId && (
        <DetailDrawer detail={detail ?? null} isLoading={detailLoading}
          documentTypes={documentTypes}
          isEducativa={isEducativa}
          canEconomic={canEconomic}
          onClose={() => setShowDetailId(null)}
          onReview={(doc) => setReviewDoc(doc)}
          onDeleteAssignmentRequest={(assignmentId, docName, fileCount) => setDeleteConfirmAssignmentId({ id: assignmentId, name: docName, fileCount })} />
      )}

      <DocumentReviewDialog doc={reviewDoc} slug={slug()} studentName={detail?.fullName}
        onClose={() => setReviewDoc(null)}
        onDone={() => {
          setReviewDoc(null)
          qc.invalidateQueries({ queryKey: ['records-students'] })
          qc.invalidateQueries({ queryKey: ['records-student-detail'] })
          qc.invalidateQueries({ queryKey: ['records-all-documents'] })
        }} />

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={!!deleteConfirmAssignmentId}
        onClose={() => setDeleteConfirmAssignmentId(null)}
        title="Eliminar solicitud documental"
        message={
          deleteConfirmAssignmentId
            ? `¿Seguro que querés eliminar la solicitud '${deleteConfirmAssignmentId.name}'?` +
              (deleteConfirmAssignmentId.fileCount > 0
                ? ` También se eliminarán los ${deleteConfirmAssignmentId.fileCount} archivos asociados.`
                : '') +
              ' Esta acción no se puede deshacer.'
            : ''
        }
        confirmText="Eliminar solicitud"
        variant="danger"
        loading={deleteAssignment.isPending}
        onConfirm={() => {
          if (!deleteConfirmAssignmentId) return
          deleteAssignment.mutate(deleteConfirmAssignmentId.id, {
            onSuccess: () => { toast('Solicitud documental eliminada correctamente.'); setDeleteConfirmAssignmentId(null) },
            onError: () => { toast('Error al eliminar la solicitud.', 'error'); setDeleteConfirmAssignmentId(null) },
          })
        }}
      />

      {/* TOASTS */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:right-4 sm:left-auto sm:top-4 sm:bottom-auto sm:items-end sm:p-0">
        {toasts.map((t) => (
          <div key={t.id}
            className={`pointer-events-auto animate-slide-up rounded-xl border px-5 py-3 text-sm font-medium shadow-lg ${
              t.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
            }`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ════════════════════════════════════
   SUB-COMPONENTES
   ════════════════════════════════════ */

function RecordsKpis({ summary }: { summary: RecordsSummary | undefined }) {
  const total = summary?.totalStudents ?? 0
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)

  const tones: Record<string, { icon: string; bar: string }> = {
    violet: { icon: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400', bar: 'bg-violet-500' },
    green: { icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400', bar: 'bg-emerald-500' },
    amber: { icon: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400', bar: 'bg-amber-500' },
    red: { icon: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400', bar: 'bg-rose-500' },
  }

  if (!summary) {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3.5">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[104px] animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />)}
      </div>
    )
  }

  const items = [
    { key: 'total', icon: Users, tone: 'violet', label: 'Total alumnos', value: total, desc: 'Alumnos registrados', percent: null as number | null },
    { key: 'ontime', icon: CheckCircle2, tone: 'green', label: 'Al día', value: summary.upToDate, desc: 'Documentación completa', percent: pct(summary.upToDate) },
    { key: 'pending', icon: Clock3, tone: 'amber', label: 'Pendientes', value: summary.pending, desc: 'Requieren atención', percent: pct(summary.pending) },
    { key: 'expired', icon: AlertCircle, tone: 'red', label: 'Vencidos', value: summary.expired, desc: 'Documentación vencida', percent: pct(summary.expired) },
  ]

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3.5">
      {items.map((it) => {
        const t = tones[it.tone]
        const Icon = it.icon
        return (
          <div key={it.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full ${t.icon}`}><Icon className="h-5 w-5" /></div>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-slate-500 dark:text-slate-400">{it.label}</p>
                <p className="text-2xl font-bold leading-tight text-slate-900 dark:text-white">{it.value}</p>
              </div>
            </div>
            <p className="mt-2 truncate text-[11px] text-slate-400">{it.desc}{it.percent != null ? ` · ${it.percent}%` : ''}</p>
            {it.percent != null && (
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${it.percent}%` }} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function EconTile({ label, value, tone }: { label: string; value: string; tone: 'rose' | 'emerald' | 'amber' | 'blue' }) {
  const tones: Record<string, string> = {
    rose: 'text-rose-600 dark:text-rose-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    blue: 'text-blue-600 dark:text-blue-400',
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-base font-bold tabular-nums ${tones[tone]}`}>{value}</p>
    </div>
  )
}

function MiniStat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{label} {value}</span>
}

function fmtMoney(value: number, currency: string | null) {
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: currency || 'ARS', maximumFractionDigits: 0 }).format(value)
  } catch {
    return `$${Math.round(value)}`
  }
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200">
      {children}
    </button>
  )
}

function studentDocStatus(s: Student): { key: string; label: string; cls: string } {
  if (s.expiredCount > 0) return { key: 'expired', label: 'Vencido', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' }
  if (s.rejectedCount > 0) return { key: 'rejected', label: 'Rechazado', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' }
  if (s.pendingCount > 0 || s.submittedCount > 0) return { key: 'pending', label: 'Pendiente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' }
  if (s.approvedCount > 0) return { key: 'ontime', label: 'Al día', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' }
  return { key: 'none', label: 'Sin documentos', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400' }
}

function FilterSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
      {children}
    </Select>
  )
}

/* ─── ModalShell ─── */
function ModalShell({ children, onClose, title, subtitle }: { children: React.ReactNode; onClose: () => void; title: string; subtitle?: string }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full animate-slide-up rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-700">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">{subtitle}</p>}
          </div>
          <button onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 sm:px-6 sm:py-5">{children}</div>
      </div>
    </div>
  )
}

/* ─── RequestModal ─── */
function RequestModal({ documentTypes, students, isSubmitting, serverError, onSubmit, onClose }: {
  documentTypes: { id: string; name: string }[]; students: Student[]
  isSubmitting: boolean; serverError: Error | null
  onSubmit: (d: { scope: string; documentTypeId: string; note: string | null; isMandatory: boolean; dueDateUtc: string | null; studentIds?: string[] }) => void
  onClose: () => void
}) {
  const [scope, setScope] = useState('search')
  const [documentTypeId, setDocumentTypeId] = useState('')
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isMandatory, setIsMandatory] = useState(true)
  const [formError, setFormError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [modalSelectedIds, setModalSelectedIds] = useState<Set<string>>(new Set())

  const searchResults = searchQuery.trim()
    ? students.filter((s) => {
        const q = searchQuery.toLowerCase().trim()
        const name = (s.fullName || '').toLowerCase()
        const email = (s.email || '').toLowerCase()
        const dni = String(s.dni || '').toLowerCase()
        return name.includes(q) || email.includes(q) || dni.includes(q)
      })
    : []

  function toggleModalSelect(id: string) {
    setModalSelectedIds((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setFormError('')
    if (!documentTypeId) { setFormError('El tipo documental es obligatorio.'); return }
    if (scope === 'search' && !modalSelectedIds.size) { setFormError('Seleccioná al menos un alumno.'); return }
    onSubmit({
      scope, documentTypeId, note: note.trim() || null, isMandatory,
      dueDateUtc: dueDate ? `${dueDate}T00:00:00Z` : null,
      studentIds: scope === 'search' ? Array.from(modalSelectedIds) : undefined,
    })
  }

  return (
    <ModalShell onClose={onClose} title="Solicitar documentos" subtitle="Configurá el alcance y el tipo documental">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Alcance</label>
          <FilterSelect value={scope} onChange={setScope}>
            <option value="search">Buscar y seleccionar alumnos</option>
            <option value="all">Todos los alumnos</option>
          </FilterSelect>
        </div>

        {scope === 'search' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Buscar alumnos</label>
              <Input placeholder="Nombre, apellido, email o DNI" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            {searchQuery.trim() && searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                {searchResults.map((s) => {
                  const id = s.studentId
                  const isSel = modalSelectedIds.has(id)
                  return (
                    <div key={id} className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5 last:border-b-0 dark:border-slate-700">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{s.fullName}</p>
                        <p className="text-xs text-slate-400">{s.email}{s.dni ? ` · DNI ${s.dni}` : ''}</p>
                      </div>
                      <button type="button" onClick={() => toggleModalSelect(id)}
                        className={`ml-2 shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                          isSel
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                            : 'bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600'
                        }`}>
                        {isSel ? 'Seleccionado' : 'Seleccionar'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {searchQuery.trim() && searchResults.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500">Sin resultados</p>
            )}

            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Seleccionados ({modalSelectedIds.size})</p>
              {modalSelectedIds.size === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">Ningún alumno seleccionado</p>
              ) : (
                <div className="space-y-1.5">
                  {students.filter((s) => modalSelectedIds.has(s.studentId)).map((s) => (
                    <div key={s.studentId} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{s.fullName}</p>
                        <p className="text-xs text-slate-400">{s.courseName}</p>
                      </div>
                      <button type="button" onClick={() => toggleModalSelect(s.studentId)}
                        className="ml-2 shrink-0 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30">
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Tipo documental</label>
          <FilterSelect value={documentTypeId} onChange={setDocumentTypeId}>
            <option value="">Seleccionar tipo</option>
            {documentTypes.map((dt) => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
          </FilterSelect>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nota (opcional)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Ej: subir frente y dorso del DNI"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Fecha límite</label>
            <DatePicker value={dueDate} onChange={setDueDate} placeholder="Sin fecha límite" />
          </div>
          <div className="flex items-end pb-0.5">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:border-slate-600" />
              Obligatorio
            </label>
          </div>
        </div>
        <div className="rounded-xl bg-teal-50 px-4 py-3 text-sm dark:bg-teal-950/30">
          <span className="font-bold text-teal-800 dark:text-teal-300">Alcance: </span>
          <span className="text-teal-700 dark:text-teal-400">
            {scope === 'all' ? `Todos los alumnos (${students.length})` : `${modalSelectedIds.size} seleccionado(s)`}
          </span>
        </div>
        {(formError || serverError) && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {formError || serverError?.message}
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" size="sm" loading={isSubmitting}>Enviar solicitud</Button>
        </div>
      </form>
    </ModalShell>
  )
}

/* ─── MainDocumentsView ─── */
function MainDocumentsView({ courses, documentTypes, onOpenDetail, onReview, toast }: {
  courses: { id: string; name: string }[]
  documentTypes: { id: string; name: string }[]
  onOpenDetail: (id: string) => void
  onReview?: (doc: StudentDocument) => void
  toast: (msg: string, type?: 'success' | 'error') => void
}) {
  const isEducativa = isEducativaContext()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [filterDocType, setFilterDocType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [scope, setScope] = useState('current')

  const filters = { search, courseId: filterCourse, documentTypeId: filterDocType, status: filterStatus, scope, page, pageSize }
  const { data, isLoading } = useAllDocuments(filters)
  const documents = data?.items ?? []
  const totalCount = data?.totalCount ?? 0

  const [viewFileData, setViewFileData] = useState<{ url: string; fileName: string; isImage: boolean; isPdf: boolean } | null>(null)
  const [viewFileLoading, setViewFileLoading] = useState(false)
  const [zipLoading, setZipLoading] = useState(false)
  const downloadMutation = useDownloadFile()

  function formatDateSafe(v: string | null) { return v ? formatDateOnly(v) : '-' }

  async function handleDownloadFileRow(fileId: string, fileName: string) {
    try {
      const r = await apiService.get<{ url: string }>(`/api/admin/${slug()}/student-files/files/${fileId}/download`)
      if (r?.url) downloadBlob(r.url, fileName)
    } catch { toast('Error al descargar.', 'error') }
  }

  function getBestDate(d: import('./hooks').AdminDocumentItem): string {
    return d.submittedAtUtc || d.dueDateUtc || ''
  }

  // Paginación server-side: el endpoint ya devuelve la página solicitada.
  const pageItems = documents

  async function handleViewFile(fileId: string, fileName: string, mimeType: string) {
    setViewFileLoading(true)
    setViewFileData(null)
    try {
      const res = await apiService.get<{ url: string }>(`/api/admin/${slug()}/student-files/files/${fileId}/view`)
      if (res?.url) setViewFileData({ url: res.url, fileName, isImage: mimeType?.toLowerCase().startsWith('image/') ?? false, isPdf: mimeType?.toLowerCase() === 'application/pdf' })
    } catch { /* ignore */ } finally { setViewFileLoading(false) }
  }

  async function handleViewAssignment(assignmentId: string, docName: string) {
    setViewFileLoading(true)
    setViewFileData(null)
    try {
      const res = await apiService.get<{ url?: string | null; isCanonical: boolean; files?: { id: string; fileName: string; mimeType: string }[] }>(`/api/admin/${slug()}/student-files/assignments/${assignmentId}/view-canonical`)
      if (res?.isCanonical && res.url) {
        setViewFileData({ url: res.url, fileName: `${docName}.pdf`, isImage: false, isPdf: true })
      } else if (res?.files && res.files.length > 0) {
        setViewFileData({ url: res.files[0].id, fileName: res.files[0].fileName, isImage: res.files[0].mimeType?.startsWith('image/') ?? false, isPdf: res.files[0].mimeType === 'application/pdf' })
      }
    } catch { /* ignore */ } finally { setViewFileLoading(false) }
  }

  async function handleDownloadAssignment(assignmentId: string, docName: string) {
    try {
      const res = await apiService.get<{ url?: string | null; isCanonical: boolean; files?: { id: string; fileName: string; mimeType: string }[] }>(`/api/admin/${slug()}/student-files/assignments/${assignmentId}/view-canonical`)
      if (res?.isCanonical && res.url) {
        downloadBlob(res.url, `${docName}.pdf`)
      } else if (res?.files && res.files.length > 0) {
        // Download first file if single, or trigger zip
        if (res.files.length === 1) {
          const r = await apiService.get<{ url: string }>(`/api/admin/${slug()}/student-files/files/${res.files[0].id}/download`)
          if (r?.url) downloadBlob(r.url, res.files[0].fileName)
        } else {
          toast('Varios archivos. Descargá ZIP desde el botón superior.', 'error')
        }
      }
    } catch { toast('Error al descargar.', 'error') }
  }

  async function handleDownloadZip() {
    setZipLoading(true)
    try {
      const body: Record<string, unknown> = {}
      if (search) body.search = search
      if (filterCourse) body.courseId = filterCourse
      if (filterDocType) body.documentTypeId = filterDocType
      if (filterStatus) body.status = filterStatus
      const res = await fetch(`${config.apiBaseUrl}/api/admin/${slug()}/student-files/documents/download-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${useAuth.getState().token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const msg = await res.text().catch(() => 'Error al descargar'); toast(msg, 'error'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `documentos_filtrados.zip`; a.click()
      URL.revokeObjectURL(url)
      toast('ZIP descargado correctamente.')
    } catch { toast('Error al descargar el ZIP.', 'error') } finally { setZipLoading(false) }
  }

  return (
    <Card className="p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">Documentos</h2>
          <p className="text-xs text-slate-400 mt-0.5">{totalCount} documento{totalCount !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadZip} loading={zipLoading} disabled={totalCount === 0}>
          Descargar todos los documentos
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <Input placeholder="Buscar alumno o documento..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <select value={scope} onChange={(e) => { setScope(e.target.value); setPage(1) }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          <option value="current">Documentos actuales</option>
          <option value="historical">Documentos históricos</option>
          <option value="all">Todos los documentos</option>
        </select>
        {!isEducativa && (
          <select value={filterCourse} onChange={(e) => { setFilterCourse(e.target.value); setPage(1) }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="">Todos los cursos</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <select value={filterDocType} onChange={(e) => { setFilterDocType(e.target.value); setPage(1) }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          <option value="">Todos los tipos</option>
          {documentTypes.map((dt) => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          <option value="">Todos los estados</option>
          <option value="Pending">Pendientes de entrega</option>
          <option value="Submitted">Pendientes de aprobar</option>
          <option value="Approved">Aprobados</option>
          <option value="Rejected">Rechazados</option>
          <option value="Expired">Vencidos</option>
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2 py-8">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>
      ) : documents.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Sin documentos.</p>
      ) : (
        <>
          {/* MOBILE CARDS */}
          <div className="space-y-1.5 sm:hidden">
            {pageItems.map((d) => {
              const statusLabel = normalizeStatus(d.status)
              const statusClass = getStatusBadgeClass(d.status)
              return (
                <div key={d.assignmentId} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-800/50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{d.studentName}</p>
                      <span className={`shrink-0 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${statusClass}`}>{statusLabel}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{d.documentTypeName}{d.dni ? ` · ${d.dni}` : ''}</p>
                    {d.fileName && <p className="text-[11px] text-slate-400 truncate" title={d.fileName}>{d.fileName}</p>}
                    <p className="text-[11px] text-slate-400">{formatDateSafe(getBestDate(d))}</p>
                  </div>
                  <div className="shrink-0 flex gap-1.5">
                    {d.fileId || d.sourceFileCount > 0 ? (<>
                      <button onClick={() => handleViewAssignment(d.assignmentId, d.documentTypeName)}
                        className="inline-flex items-center rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                        Ver
                      </button>
                      <button onClick={() => handleDownloadAssignment(d.assignmentId, d.documentTypeName)}
                        className="inline-flex items-center rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                        Descargar
                      </button>
                    </>) : (
                      <span className="text-xs text-slate-400 px-2">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-3 py-3 w-[30%] min-w-[220px]">Alumno</th>
                  <th className="px-3 py-3 w-[18%] min-w-[140px] max-w-[220px]">Documento</th>
                  <th className="px-3 py-3 w-[14%]">Estado</th>
                  <th className="px-3 py-3 w-[14%] hidden md:table-cell">Fecha</th>
                  <th className="px-3 py-3 w-[18%] text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pageItems.map((d) => {
                  const statusLabel = d.isHistorical ? 'Histórico' : normalizeStatus(d.status)
                  const statusClass = d.isHistorical ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : getStatusBadgeClass(d.status)
                  const bestDate = getBestDate(d)
                  const rowKey = `${d.assignmentId}-${d.version ?? 'cur'}-${d.submittedAtUtc ?? ''}`
                  return (
                    <tr key={rowKey} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-3 py-3 w-[30%] min-w-[220px]">
                        <p className="font-semibold text-slate-900 dark:text-white whitespace-nowrap truncate">{d.studentName}</p>
                        <p className="text-xs text-slate-400">{d.dni || d.courseName || '-'}</p>
                      </td>
                      <td className="px-3 py-3 w-[18%] min-w-[140px] max-w-[220px]">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white truncate" title={d.documentTypeName}>{d.documentTypeName}</p>
                          {d.version != null && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">v{d.version}</span>}
                        </div>
                        {d.fileName && <p className="text-xs text-slate-400 truncate max-w-[200px]" title={d.fileName}>{d.fileName}</p>}
                      </td>
                      <td className="px-3 py-3 w-[14%]">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusClass}`}>{statusLabel}</span>
                      </td>
                      <td className="px-3 py-3 w-[14%] hidden md:table-cell text-slate-500 whitespace-nowrap">{formatDateSafe(bestDate)}</td>
                      <td className="px-3 py-3 w-[18%] text-right">
                        {d.fileId || d.sourceFileCount > 0 ? (
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => d.isHistorical && d.fileId
                              ? handleViewFile(d.fileId, d.fileName || 'Documento', d.fileMimeType || '')
                              : handleViewAssignment(d.assignmentId, d.documentTypeName)}
                              className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                              Ver
                            </button>
                            <button onClick={() => d.isHistorical && d.fileId
                              ? handleDownloadFileRow(d.fileId, d.fileName || 'documento')
                              : handleDownloadAssignment(d.assignmentId, d.documentTypeName)}
                              className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                              Descargar
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación server-side */}
          <div className="border-t border-slate-200 px-4 py-3 sm:px-6 dark:border-slate-700">
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={setPage}
              loading={isLoading}
              showPageNumbers
              pageSizeOptions={[10, 20, 50]}
              onPageSizeChange={(n) => { setPageSize(n); setPage(1) }}
            />
          </div>
        </>
      )}

      {/* View File Modal */}
      {viewFileData && (
        <div className="fixed inset-0 z-[65] flex items-end sm:items-center sm:justify-center sm:p-4" onClick={() => setViewFileData(null)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative z-10 flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-4xl sm:rounded-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{viewFileData.fileName}</h3>
              <button onClick={() => setViewFileData(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {viewFileLoading ? (
              <div className="flex items-center justify-center py-16"><span className="text-sm text-slate-500">Cargando...</span></div>
            ) : viewFileData.url ? (
              <>
                <div className="flex justify-end border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                  <span className="text-xs text-slate-400">Vista previa</span>
                </div>
                <div className="bg-slate-100 p-4 dark:bg-slate-800 flex-1 overflow-auto">
                  {viewFileData.isImage ? (
                    <img src={viewFileData.url} alt={viewFileData.fileName} className="mx-auto max-h-[72vh] w-auto max-w-full rounded-lg object-contain shadow-sm" />
                  ) : viewFileData.isPdf ? (
                    <iframe src={viewFileData.url} title={viewFileData.fileName} className="h-[72vh] w-full rounded-lg border-0" />
                  ) : (
                    <div className="flex flex-col items-center gap-4 py-16">
                      <p className="text-sm text-slate-500">No se puede previsualizar este archivo.</p>
                      <span className="text-xs text-slate-400">Usá el botón Descargar.</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-sm text-slate-400">No se pudo cargar el archivo.</div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

/* ─── DocumentosTab ─── */
function DocumentosTab({ detail, documentTypes, toast }: {
  detail: import('./hooks').StudentDetail | null
  documentTypes: { id: string; name: string }[]
  toast: (msg: string, type?: 'success' | 'error') => void
}) {
  const [docFilter, setDocFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState(false)
  const [viewFileLoading, setViewFileLoading] = useState(false)
  const [viewFileData, setViewFileData] = useState<{ url: string; fileName: string; isImage: boolean; isPdf: boolean } | null>(null)
  const docDownload = useDownloadFile()

  if (!detail) return <p className="py-12 text-center text-sm text-slate-400">Seleccioná un alumno.</p>

  const filtered = detail.documents.filter((d) => {
    if (!docFilter) return true
    return d.documentTypeName.toLowerCase().includes(docFilter.toLowerCase())
  })

  const docsWithFile = filtered.filter((d) => d.currentFileId)
  const allSelected = docsWithFile.length > 0 && docsWithFile.every((d) => selectedIds.has(d.currentFileId!))
  const allFileIds = detail.documents.filter((d) => d.currentFileId).map((d) => d.currentFileId!)

  const selectedFileIds = docsWithFile
    .filter((d) => selectedIds.has(d.currentFileId!))
    .map((d) => d.currentFileId!)

  function toggleSelect(fileId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(fileId)) next.delete(fileId)
      else next.add(fileId)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      docsWithFile.forEach((d) => allSelected ? next.delete(d.currentFileId!) : next.add(d.currentFileId!))
      return next
    })
  }

  async function handleDownloadZip(fileIds?: string[]) {
    if (!detail) return
    setDownloading(true)
    try {
      const body: Record<string, unknown> = {}
      if (fileIds) body.fileIds = fileIds
      if (docFilter) {
        const dt = documentTypes.find((t) => t.name.toLowerCase().includes(docFilter.toLowerCase()))
        if (dt) body.documentTypeId = dt.id
      }
      const res = await fetch(`${config.apiBaseUrl}/api/admin/${slug()}/student-files/students/${detail.studentId}/documents/download-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${useAuth.getState().token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Error al descargar')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `documentos_${detail.fullName.replace(/\s+/g, '_')}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast('ZIP descargado correctamente.')
    } catch {
      toast('Error al descargar el ZIP.', 'error')
    } finally {
      setDownloading(false)
    }
  }

  async function handleViewFile(fileId: string, fileName: string, mimeType: string) {
    setViewFileLoading(true)
    setViewFileData(null)
    try {
      const res = await apiService.get<{ url: string }>(`/api/admin/${slug()}/student-files/files/${fileId}/view`)
      if (res?.url) {
        setViewFileData({
          url: res.url,
          fileName,
          isImage: mimeType?.toLowerCase().startsWith('image/') ?? false,
          isPdf: mimeType?.toLowerCase() === 'application/pdf',
        })
      }
    } catch {
      toast('No se pudo cargar el archivo.', 'error')
    } finally {
      setViewFileLoading(false)
    }
  }

  function getBestDate(doc: import('./hooks').StudentDocument): string {
    return doc.submittedAtUtc || doc.reviewedAtUtc || doc.dueDateUtc || doc.assignedAtUtc || ''
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">Documentos</h4>
          <p className="text-xs text-slate-400">
            {detail.documents.length} documento{detail.documents.length !== 1 ? 's' : ''}
            {selectedFileIds.length > 0 && (
              <span className="ml-2 font-medium text-blue-600 dark:text-blue-400">
                · {selectedFileIds.length} seleccionado{selectedFileIds.length !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={allFileIds.length === 0 || downloading}
            onClick={() => handleDownloadZip(allFileIds)}>
            Descargar todos
          </Button>
          <Button variant="outline" size="sm" disabled={selectedFileIds.length === 0 || downloading}
            onClick={() => handleDownloadZip(selectedFileIds)}>
            Descargar seleccionados {selectedFileIds.length > 0 && `(${selectedFileIds.length})`}
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Input placeholder="Filtrar por tipo documental..." value={docFilter} onChange={(e) => setDocFilter(e.target.value)} className="flex-1" />
      </div>

      {/* Selection summary (mobile) */}
      {selectedFileIds.length > 0 && (
        <p className="text-xs text-slate-500 sm:hidden">{selectedFileIds.length} documento{selectedFileIds.length !== 1 ? 's' : ''} seleccionado{selectedFileIds.length !== 1 ? 's' : ''}</p>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-600 dark:bg-slate-800/30 dark:text-slate-500">
          {docFilter ? 'Sin documentos que coincidan con el filtro.' : 'Sin documentos.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="px-3 py-3 w-8">
                  {docsWithFile.length > 0 && (
                    <input type="checkbox" checked={allSelected}
                      onChange={toggleSelectAll} className="h-4 w-4 rounded border-slate-300" />
                  )}
                </th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3 hidden sm:table-cell">Archivo</th>
                <th className="px-3 py-3 hidden md:table-cell">Fecha</th>
                <th className="px-3 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((doc) => {
                const statusLabel = getStatusLabel(doc.status)
                const isSelected = doc.currentFileId ? selectedIds.has(doc.currentFileId) : false
                const bestDate = getBestDate(doc)
                return (
                  <tr key={doc.assignmentId} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                    <td className="px-3 py-3">
                      {doc.currentFileId && (
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(doc.currentFileId!)} className="h-4 w-4 rounded border-slate-300" />
                      )}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">{doc.documentTypeName}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusBadgeClass(doc.status)}`}>{statusLabel}</span>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell text-slate-500 truncate max-w-[180px]">{doc.currentFileName || '—'}</td>
                    <td className="px-3 py-3 hidden md:table-cell text-slate-500 whitespace-nowrap">{bestDate ? formatDateOnly(bestDate) : '—'}</td>
                    <td className="px-3 py-3 text-right">
                      {doc.currentFileId ? (
                        <span className="text-[11px] text-slate-400">{doc.files?.length ?? 0} archivo{(doc.files?.length ?? 0) !== 1 ? 's' : ''}</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Unified document actions */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          <button type="button" onClick={async () => {
            const filesToView = filtered.filter(d => d.currentFileId)
            if (filesToView.length === 0) return
            if (filesToView.length === 1) {
              handleViewFile(filesToView[0].currentFileId!, filesToView[0].currentFileName || 'Documento', filesToView[0].currentFileMimeType || '')
            } else {
              toast('Vista múltiple no disponible. Usá la descarga ZIP.', 'error')
            }
          }}
            className="rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300">
            Ver documentos
          </button>
          <button type="button" onClick={async () => {
            const assignWithFiles = filtered.filter(d => d.currentFileId)
            if (assignWithFiles.length === 0) return
            if (assignWithFiles.length === 1) {
              const d = assignWithFiles[0]
              docDownload.mutateAsync(d.currentFileId!).then((r) => downloadBlob(r.url, d.currentFileName || 'documento')).catch(() => {})
            } else {
              await handleDownloadZip(assignWithFiles.map(d => d.currentFileId!))
            }
          }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300">
            Descargar documento
          </button>
        </div>
      )}

      {/* View File Modal (inline) */}
      {viewFileData && (
        <div className="fixed inset-0 z-[65] flex items-end sm:items-center sm:justify-center sm:p-4" onClick={() => setViewFileData(null)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative z-10 flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-4xl sm:rounded-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{viewFileData.fileName}</h3>
              <button onClick={() => setViewFileData(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {viewFileLoading ? (
              <div className="flex items-center justify-center py-16"><span className="text-sm text-slate-500">Cargando...</span></div>
            ) : viewFileData.url ? (
              <>
                <div className="flex justify-end border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                  <a href={viewFileData.url} download={viewFileData.fileName} target="_blank" rel="noreferrer"
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    Descargar
                  </a>
                </div>
                <div className="bg-slate-100 p-4 dark:bg-slate-800 flex-1 overflow-auto">
                  {viewFileData.isImage ? (
                    <img src={viewFileData.url} alt={viewFileData.fileName} className="mx-auto max-h-[72vh] w-auto max-w-full rounded-lg object-contain shadow-sm" />
                  ) : viewFileData.isPdf ? (
                    <iframe src={viewFileData.url} title={viewFileData.fileName} className="h-[72vh] w-full rounded-lg border-0" />
                  ) : (
                    <div className="flex flex-col items-center gap-4 py-16">
                      <p className="text-sm text-slate-500">No se puede previsualizar este archivo.</p>
                      <a href={viewFileData.url} download={viewFileData.fileName} target="_blank" rel="noreferrer"
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        Descargar archivo
                      </a>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-sm text-slate-400">No se pudo cargar el archivo.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── DetailDrawer ─── */
function DetailDrawer({ detail, isLoading, documentTypes, isEducativa, canEconomic, onClose, onReview, onDeleteAssignmentRequest }: {
  detail: import('./hooks').StudentDetail | null; isLoading: boolean
  documentTypes: { id: string; name: string; isRequired?: boolean; hasExpiration?: boolean }[]
  isEducativa: boolean
  canEconomic: boolean
  onClose: () => void
  onReview: (doc: import('./hooks').StudentDocument) => void
  onDeleteAssignmentRequest?: (assignmentId: string, docName: string, fileCount: number) => void
}) {
  const [visible, setVisible] = useState(false)
  const [tab, setTab] = useState<'summary' | 'docs' | 'courses' | 'economic'>('summary')
  const [filesView, setFilesView] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadDocType, setUploadDocType] = useState('')
  const [uploadExpiration, setUploadExpiration] = useState('')
  const [uploading, setUploading] = useState(false)
  const [zipLoading, setZipLoading] = useState(false)
  const [historyDoc, setHistoryDoc] = useState<StudentDocument | null>(null)
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const qc = useQueryClient()

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])
  useEffect(() => { setTab('summary'); setFilesView(false); setUploadFile(null); setUploadDocType(''); setUploadExpiration('') }, [detail?.studentId])
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') { setVisible(false); setTimeout(onClose, 200) } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleClose() { setVisible(false); setTimeout(onClose, 200) }
  function showToast(text: string, type: 'success' | 'error' = 'success') {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 3500)
  }

  const coursesQ = useStudentCourses(detail && !isEducativa ? detail.studentId : null)
  const economicQ = useStudentEconomic(detail && !isEducativa ? detail.studentId : null, canEconomic && !isEducativa && !!detail)
  const legajoQ = useStudentLegajo(detail && isEducativa ? detail.studentId : null)

  // Situación económica normalizada para ambas divisiones (Deportiva: account-status;
  // Educativa: inscripciones del legajo, con montos solo si el backend confirmó `cuotas`).
  const econ = (() => {
    if (isEducativa) {
      const enrs = legajoQ.data?.enrollments ?? []
      const visible = legajoQ.data?.economicVisible === true
      const groups = enrs.map((e) => ({
        label: e.trainingName || e.commissionName || 'Inscripción',
        debt: Number(e.balanceDue ?? 0),
        paid: Number(e.totalPaid ?? 0),
        overdue: Number(e.overdueCount ?? 0),
        nextDueDate: e.nextDueDateUtc ?? null,
        currency: e.snapshotCurrency ?? null,
      }))
      const currencies = Array.from(new Set(groups.map((g) => g.currency).filter((c): c is string => !!c)))
      const single = currencies.length <= 1
      return {
        isLoading: legajoQ.isLoading,
        isError: legajoQ.isError,
        visible,
        totalDebt: single ? groups.reduce((a, g) => a + g.debt, 0) : 0,
        totalPaid: single ? groups.reduce((a, g) => a + g.paid, 0) : 0,
        pendingCharges: 0,
        overdueCharges: single ? groups.reduce((a, g) => a + g.overdue, 0) : 0,
        currency: single ? (currencies[0] ?? null) : null,
        groups,
      }
    }
    const d = economicQ.data
    return {
      isLoading: economicQ.isLoading,
      isError: economicQ.isError,
      visible: true,
      totalDebt: d?.totalDebt ?? 0,
      totalPaid: d?.totalPaid ?? 0,
      pendingCharges: d?.pendingCharges ?? 0,
      overdueCharges: d?.overdueCharges ?? 0,
      currency: d?.currency ?? null,
      groups: d?.groups ?? [],
    }
  })()

  const selectedUploadType = documentTypes.find((dt) => dt.id === uploadDocType)
  const uploadNeedsExpiration = !!selectedUploadType?.hasExpiration

  async function handleUpload() {
    if (!detail || !uploadFile) return
    if (uploadNeedsExpiration && !uploadExpiration) { showToast('Indicá la fecha de vencimiento.', 'error'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      if (uploadDocType) fd.append('documentTypeId', uploadDocType)
      if (uploadNeedsExpiration && uploadExpiration) fd.append('expirationDate', uploadExpiration)
      await apiService.postForm(`/api/admin/${slug()}/student-files/students/${detail.studentId}/upload`, fd)
      showToast('Documento subido correctamente.')
      setUploadFile(null)
      setUploadExpiration('')
      // Refrescar el legajo para reflejar la nueva versión actual + el historial.
      qc.invalidateQueries({ queryKey: ['records-student-detail'] })
      qc.invalidateQueries({ queryKey: ['records-students'] })
      qc.invalidateQueries({ queryKey: ['records-summary'] })
      qc.invalidateQueries({ queryKey: ['records-all-documents'] })
    } catch {
      showToast('Error al subir el documento.', 'error')
    }
    setUploading(false)
  }

  async function handleDownloadFile(fileId: string, fileName: string) {
    try {
      const r = await apiService.get<{ url: string }>(`/api/admin/${slug()}/student-files/files/${fileId}/download`)
      if (r?.url) downloadBlob(r.url, fileName)
    } catch { showToast('Error al descargar el archivo.', 'error') }
  }

  async function handleDownloadAll() {
    if (!detail) return
    setZipLoading(true)
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/admin/${slug()}/student-files/students/${detail.studentId}/documents/download-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${useAuth.getState().token}` },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `documentos_${detail.fullName.replace(/\s+/g, '_')}.zip`; a.click()
      URL.revokeObjectURL(url)
      showToast('Descarga iniciada.')
    } catch { showToast('Error al descargar el ZIP.', 'error') } finally { setZipLoading(false) }
  }

  const docs = detail?.documents ?? []
  const aggStatus = (() => {
    const expired = docs.filter((d) => normalizeStatus(d.status) === 'Vencido').length
    const rejected = docs.filter((d) => normalizeStatus(d.status) === 'Rechazado').length
    const pending = docs.filter((d) => ['Pendiente', 'En revisión'].includes(normalizeStatus(d.status))).length
    const approved = docs.filter((d) => normalizeStatus(d.status) === 'Aprobado').length
    if (expired > 0) return { label: 'Vencido', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' }
    if (rejected > 0) return { label: 'Rechazado', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' }
    if (pending > 0) return { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' }
    if (approved > 0) return { label: 'Al día', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' }
    return { label: 'Sin documentos', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400' }
  })()

  // Conteos reales para el Resumen (sobre la versión vigente de cada documento).
  const docCounts = (() => {
    const c = { approved: 0, pending: 0, rejected: 0, expired: 0, expiring: 0 }
    const today = Date.now()
    const limit = today + 30 * 86400000
    for (const d of docs) {
      const s = normalizeStatus(d.status)
      if (s === 'Aprobado') c.approved++
      else if (s === 'Pendiente' || s === 'En revisión') c.pending++
      else if (s === 'Rechazado') c.rejected++
      else if (s === 'Vencido') c.expired++
      const exp = d.expirationDateUtc ? new Date(d.expirationDateUtc).getTime() : null
      if (exp && exp >= today && exp <= limit && s !== 'Vencido') c.expiring++
    }
    return c
  })()
  const requiredTotal = Math.max(documentTypes.filter((d) => d.isRequired).length, 1)
  const coursesCount = isEducativa ? (legajoQ.data?.enrollments?.length ?? 0) : (coursesQ.data?.length ?? 0)

  const tabs: { key: 'summary' | 'docs' | 'courses' | 'economic'; label: string }[] = [
    { key: 'summary', label: 'Resumen' },
    { key: 'docs', label: 'Documentación' },
    { key: 'courses', label: 'Cursos' },
  ]
  if (canEconomic) tabs.push({ key: 'economic', label: 'Situación económica' })

  return (
    <div className="fixed inset-0 z-[55]">
      <div className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose} />
      <div className={`absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 sm:max-w-[540px] dark:bg-slate-900 ${visible ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header fijo */}
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {detail?.profileImageUrl ? (
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><img src={detail.profileImageUrl} alt="" className="h-full w-full object-cover" /></div>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{initials(detail?.fullName || '?')}</div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[19px] font-bold text-slate-900 dark:text-white">{detail?.fullName || 'Legajo del alumno'}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{detail?.dni ? `DNI ${detail.dni}` : detail?.email || (isLoading ? 'Cargando…' : '')}</p>
              </div>
            </div>
            <button onClick={handleClose} aria-label="Cerrar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {detail && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${aggStatus.cls}`}>{aggStatus.label}</span>
              <span className="text-[11px] text-slate-400">{docs.filter((d) => normalizeStatus(d.status) === 'Aprobado').length} aprobado(s) · {docs.length} en total</span>
            </div>
          )}
          {detail && (
            <div className="mt-3 flex gap-5 overflow-x-auto scrollbar-hide">
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`whitespace-nowrap border-b-2 pb-2 text-xs font-semibold transition ${tab === t.key ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {isLoading && (<div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>)}
          {!isLoading && !detail && <p className="py-12 text-center text-sm text-slate-400">Seleccioná un alumno para ver su legajo.</p>}

          {!isLoading && detail && tab === 'summary' && (
            <div className="space-y-3">
              {/* Datos personales */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Datos personales</p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${detail.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400'}`}>{detail.isActive ? 'Activo' : 'Inactivo'}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">DNI: <b className="font-semibold text-slate-700 dark:text-slate-200">{detail.dni || '-'}</b></span>
                  <span className="text-slate-500 dark:text-slate-400">Legajo: <b className="font-semibold text-slate-700 dark:text-slate-200">{detail.memberNumber || '-'}</b></span>
                  <span className="col-span-2 truncate text-slate-500 dark:text-slate-400">Email: <b className="font-semibold text-slate-700 dark:text-slate-200">{detail.email || '-'}</b></span>
                  <span className="col-span-2 text-slate-500 dark:text-slate-400">Obra social: <b className="font-semibold text-slate-700 dark:text-slate-200">{detail.hasHealthInsurance ? (detail.healthInsuranceName || 'Sí') : 'No'}</b></span>
                </div>
              </div>

              {/* Documentación */}
              <button type="button" onClick={() => setTab('docs')}
                className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Documentación</p>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Requeridos: <b className="text-slate-700 dark:text-slate-200">{requiredTotal}</b> · Aprobados: <b className="text-emerald-600 dark:text-emerald-400">{docCounts.approved}</b></p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <MiniStat label="Pendientes" value={docCounts.pending} cls="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" />
                  <MiniStat label="Rechazados" value={docCounts.rejected} cls="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400" />
                  <MiniStat label="Vencidos" value={docCounts.expired} cls="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400" />
                  <MiniStat label="Por vencer" value={docCounts.expiring} cls="bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" />
                </div>
              </button>

              {/* Cursos */}
              <button type="button" onClick={() => setTab('courses')}
                className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{isEducativa ? 'Formaciones' : 'Cursos e inscripciones'}</p>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Cantidad: <b className="text-slate-700 dark:text-slate-200">{coursesCount}</b></p>
              </button>

              {/* Situación económica (permiso-gated) */}
              {canEconomic && (
                <button type="button" onClick={() => setTab('economic')}
                  className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Situación económica</p>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                  {econ.isLoading ? (
                    <div className="h-5 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                  ) : econ.isError || (isEducativa && !econ.visible) ? (
                    <p className="text-xs text-slate-400">No disponible.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                      <span>Deuda: <b className="text-rose-600 dark:text-rose-400">{fmtMoney(econ.totalDebt, econ.currency)}</b></span>
                      <span>Pagado: <b className="text-emerald-600 dark:text-emerald-400">{fmtMoney(econ.totalPaid, econ.currency)}</b></span>
                      <span>Cuotas pendientes: <b className="text-slate-700 dark:text-slate-200">{econ.pendingCharges}</b></span>
                      <span>Cuotas vencidas: <b className="text-rose-600 dark:text-rose-400">{econ.overdueCharges}</b></span>
                    </div>
                  )}
                </button>
              )}
            </div>
          )}

          {!isLoading && detail && tab === 'docs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Documentación</p>
                <div className="flex items-center gap-2">
                  {filesView ? (
                    <Button variant="outline" size="sm" onClick={() => setFilesView(false)}>Volver</Button>
                  ) : (
                    <>
                      {docs.some((d) => d.currentFileId) && (
                        <Button variant="outline" size="sm" onClick={handleDownloadAll} loading={zipLoading}>Descargar todo</Button>
                      )}
                      {docs.some((d) => d.currentFileId) && (
                        <Button variant="outline" size="sm" onClick={() => setFilesView(true)}>Seleccionar</Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {filesView ? (
                <DocumentosTab detail={detail} documentTypes={documentTypes} toast={showToast} />
              ) : (
                <>
                  {docs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">Sin documentación asignada.</div>
                  ) : docs.map((doc) => (
                    <DocumentCard key={doc.assignmentId} doc={doc} onReview={() => onReview(doc)}
                      onHistory={() => setHistoryDoc(doc)}
                      onDelete={() => onDeleteAssignmentRequest?.(doc.assignmentId, doc.documentTypeName, doc.files?.length ?? 0)} />
                  ))}

                  {/* Upload directo */}
                  <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg dark:bg-blue-900/40">📎</span>
                      <div>
                        <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Subir documento</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">Se agrega directamente al legajo, sin solicitud previa.</p>
                      </div>
                    </div>
                    {documentTypes.length > 0 && (
                      <div className="mb-3">
                        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Tipo documental</label>
                        <Select value={uploadDocType} onChange={(e) => { setUploadDocType(e.target.value); setUploadExpiration('') }}>
                          <option value="">Seleccionar tipo...</option>
                          {documentTypes.map((dt) => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
                        </Select>
                      </div>
                    )}
                    {uploadNeedsExpiration && (
                      <div className="mb-3">
                        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Fecha de vencimiento *</label>
                        <DatePicker value={uploadExpiration} onChange={setUploadExpiration} placeholder="Seleccionar fecha" title="Vencimiento" />
                      </div>
                    )}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                        className="block w-full flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-blue-300" />
                      <Button onClick={handleUpload} disabled={!uploadFile || (!isEducativa && !uploadDocType) || (uploadNeedsExpiration && !uploadExpiration)} loading={uploading}
                        className="h-11 shrink-0 bg-blue-600 text-white hover:bg-blue-500 sm:h-10">Subir</Button>
                    </div>
                    {uploadFile && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Archivo: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(1)} MB)</p>}
                    {toastMsg && <p className={`mt-2 text-xs font-medium ${toastMsg.type === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>{toastMsg.text}</p>}
                  </div>
                </>
              )}
            </div>
          )}

          {!isLoading && detail && tab === 'courses' && (
            <div className="space-y-3">
              {isEducativa ? (
                legajoQ.isLoading ? (
                  <div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                ) : (legajoQ.data?.enrollments?.length ?? 0) === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">Sin formaciones asociadas.</div>
                ) : legajoQ.data!.enrollments.map((e) => (
                  <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{e.trainingName || e.commissionName}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{e.commissionName}{e.categoryName ? ` · ${e.categoryName}` : ''}</p>
                        <p className="mt-1 text-[11px] text-slate-400">Inscripción: {formatDateOnly(e.enrolledAtUtc)}</p>
                      </div>
                      {e.academicSituation && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">{e.academicSituation}</span>}
                    </div>
                  </div>
                ))
              ) : coursesQ.isLoading ? (
                <div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              ) : (coursesQ.data?.length ?? 0) === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">Sin cursos asociados.</div>
              ) : coursesQ.data!.map((c) => (
                <div key={c.courseId} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{c.courseName}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{c.teacherName ? `Prof. ${c.teacherName}` : 'Sin profesor asignado'} · {c.classesPerWeek} clase(s)/semana</p>
                      <p className="mt-1 text-[11px] text-slate-400">Inscripción: {formatDateOnly(c.enrolledAtUtc)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${c.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400'}`}>{c.isActive ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && detail && tab === 'economic' && canEconomic && (
            <div className="space-y-3">
              {econ.isLoading ? (
                <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>
              ) : econ.isError || (isEducativa && !econ.visible) ? (
                <p className="text-xs text-slate-400">No se pudo cargar la situación económica.</p>
              ) : (
                <>
                  {econ.currency !== null && (
                    <div className="grid grid-cols-2 gap-2">
                      <EconTile label="Deuda pendiente" value={fmtMoney(econ.totalDebt, econ.currency)} tone="rose" />
                      <EconTile label="Total pagado" value={fmtMoney(econ.totalPaid, econ.currency)} tone="emerald" />
                      <EconTile label="Cuotas pendientes" value={String(econ.pendingCharges)} tone="amber" />
                      <EconTile label="Cuotas vencidas" value={String(econ.overdueCharges)} tone="rose" />
                    </div>
                  )}
                  {econ.groups.length > 0 && (
                    <div className="space-y-2">
                      {econ.groups.map((g, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/40">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">{g.label}</p>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-rose-600 dark:text-rose-400">{fmtMoney(g.debt, g.currency)}</span>
                          </div>
                          {g.nextDueDate && <p className="mt-1 text-[11px] text-slate-400">Próximo vencimiento: {formatDateOnly(g.nextDueDate)}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {econ.currency !== null && econ.totalDebt === 0 && econ.totalPaid === 0 && econ.groups.length === 0 && (
                    <p className="text-xs text-slate-400">Sin obligaciones económicas.</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

        {/* Historial documental */}
        {historyDoc && (
          <div className="absolute inset-0 z-[10] flex items-end justify-center sm:items-center sm:p-4" onClick={() => setHistoryDoc(null)}>
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative z-10 flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{historyDoc.documentTypeName}</p>
                  <p className="text-xs text-slate-400">Historial de versiones</p>
                </div>
                <button onClick={() => setHistoryDoc(null)} aria-label="Cerrar"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {(() => {
                  type HFile = { id: string; fileName: string; uploadedAtUtc: string }
                  const all: HFile[] = [
                    ...(historyDoc.files ?? []).map((f) => ({ id: f.id, fileName: f.fileName, uploadedAtUtc: f.uploadedAtUtc })),
                    ...(historyDoc.historicalFiles ?? []).map((f) => ({ id: f.id, fileName: f.fileName, uploadedAtUtc: f.uploadedAtUtc })),
                  ]
                  // Agrupamos por fecha de carga: los archivos de una misma presentación comparten timestamp.
                  const groups = new Map<string, HFile[]>()
                  for (const f of all) {
                    const key = f.uploadedAtUtc || 'sin-fecha'
                    if (!groups.has(key)) groups.set(key, [])
                    groups.get(key)!.push(f)
                  }
                  const presentations = Array.from(groups.entries())
                    .map(([at, files]) => ({ at, files }))
                    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
                  const lastIdx = presentations.length - 1

                  if (presentations.length === 0) {
                    return <p className="text-xs text-slate-400">Sin presentaciones registradas.</p>
                  }

                  return presentations.map((p, i) => {
                    const isCurrent = i === lastIdx
                    return (
                      <div key={p.at} className={`rounded-xl border p-3 ${isCurrent ? 'border-blue-300 bg-blue-50/40 dark:border-blue-700 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-700'}`}>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Versión {i + 1}{isCurrent ? ' · vigente' : ''}</span>
                          <span className="text-[11px] text-slate-400">Cargado: {formatDateOnly(p.at)}</span>
                        </div>
                        {isCurrent && (
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${getStatusBadgeClass(historyDoc.status)}`}>{normalizeStatus(historyDoc.status)}</span>
                            <span className="text-[11px] text-slate-400">Enviado: {formatDateOnly(historyDoc.submittedAtUtc)} · Revisado: {formatDateOnly(historyDoc.reviewedAtUtc)} · Vence: {formatDateOnly(historyDoc.expirationDateUtc)}</span>
                          </div>
                        )}
                        {p.files.map((f) => (
                          <div key={f.id} className="mt-1 flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate text-xs text-slate-600 dark:text-slate-300">{f.fileName}</span>
                            <button type="button" onClick={() => handleDownloadFile(f.id, f.fileName)} className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">Descargar</button>
                          </div>
                        ))}
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

/* ─── DocumentCard ─── */
function DocumentCard({ doc, onReview, onHistory, onDelete }: {
  doc: StudentDocument; onReview?: () => void; onHistory?: () => void; onDelete?: () => void
}) {
  const status = normalizeStatus(doc.status)
  const isInReview = status === 'En revisión'
  const isApproved = status === 'Aprobado'
  const isRejected = status === 'Rechazado'
  const fileCount = doc.files?.length ?? 0
  // Cantidad de presentaciones anteriores (agrupadas por fecha de carga).
  const historyCount = new Set((doc.historicalFiles ?? []).map((f) => f.uploadedAtUtc)).size

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-700 dark:bg-slate-800/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-sm font-bold text-slate-900 sm:text-base dark:text-white">{doc.documentTypeName || 'Documento'}</h5>
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${getStatusBadgeClass(doc.status)}`}>{status}</span>
            {onDelete && (
              <button type="button" onClick={onDelete}
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:border-slate-600 dark:hover:bg-red-950/30"
                aria-label="Eliminar solicitud" title="Eliminar solicitud">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-sm text-slate-500 dark:text-slate-400">
            <span><b className="font-semibold text-slate-600 dark:text-slate-400">Asignado:</b> {formatDateOnly(doc.assignedAtUtc)}</span>
            <span><b className="font-semibold text-slate-600 dark:text-slate-400">Límite:</b> {formatDateOnly(doc.dueDateUtc)}</span>
            <span><b className="font-semibold text-slate-600 dark:text-slate-400">Enviado:</b> {formatDateOnly(doc.submittedAtUtc)}</span>
            <span><b className="font-semibold text-slate-600 dark:text-slate-400">Revisado:</b> {formatDateOnly(doc.reviewedAtUtc)}</span>
            <span><b className="font-semibold text-slate-600 dark:text-slate-400">Vence:</b> {formatDateOnly(doc.expirationDateUtc)}</span>
          </div>
          <p className="text-xs text-slate-400">{fileCount} archivo{fileCount !== 1 ? 's' : ''}</p>

          {doc.requestNote && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nota de solicitud</p>
              <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{doc.requestNote}</p>
            </div>
          )}
          {doc.reviewNote && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/50 dark:bg-rose-950/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400">Observación de revisión</p>
              <p className="mt-0.5 text-sm text-rose-700 dark:text-rose-300">{doc.reviewNote}</p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-1.5 sm:flex-col sm:w-28">
          {isInReview && onReview && (
            <DocActionBtn className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={onReview}>Revisar entrega</DocActionBtn>
          )}
          {(isApproved || isRejected) && onReview && (
            <DocActionBtn onClick={onReview}>Ver detalle</DocActionBtn>
          )}
          {!isInReview && !isApproved && !isRejected && onReview && (
            <DocActionBtn onClick={onReview}>Ver solicitud</DocActionBtn>
          )}
          {onHistory && historyCount > 0 && (
            <DocActionBtn onClick={onHistory}>Ver historial ({historyCount})</DocActionBtn>
          )}
        </div>
      </div>
    </div>
  )
}

function DocActionBtn({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold transition active:scale-[0.97] ${
        className || 'bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}>
      {children}
    </button>
  )
}

function normalizeStatus(status: number | string | undefined): string {
  const s = Number(status)
  if (s === 1) return 'Pendiente'
  if (s === 2) return 'En revisión'
  if (s === 3) return 'Aprobado'
  if (s === 4) return 'Rechazado'
  if (s === 5) return 'Vencido'
  const str = String(status ?? '').toLowerCase().trim()
  if (str === 'pending') return 'Pendiente'
  if (str === 'submitted' || str === 'uploaded') return 'En revisión'
  if (str === 'approved') return 'Aprobado'
  if (str === 'rejected') return 'Rechazado'
  if (str === 'expired') return 'Vencido'
  return String(status ?? '')
}


