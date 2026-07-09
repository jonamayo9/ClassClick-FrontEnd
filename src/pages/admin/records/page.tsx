import { useState, useRef, useCallback, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { config } from '@/lib/config'
import {
  useCourses, useDocumentTypes, useStudents, useStudentDetail,
  useCreateDocumentRequest, usePreviewFile, useDownloadFile,
  useApproveDocument, useRejectDocument, useAllDocuments,
  formatDate, getStatusLabel, getStatusBadgeClass,
} from './hooks'
import type { Student, StudentDocument } from './hooks'

const PAGE_SIZE = 20
function slug() { return useAuth.getState().activeCompanySlug ?? '' }

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x.charAt(0).toUpperCase()).join('') || '?'
}

function isImage(m: string | null) { return String(m || '').toLowerCase().startsWith('image/') }
function isPdf(m: string | null) { return String(m || '').toLowerCase() === 'application/pdf' }

export default function RecordsPage() {
  const [pageTab, setPageTab] = useState<'records' | 'documents'>('records')
  const [draft, setDraft] = useState({ search: '', courseId: '', status: '', documentStatus: '' })
  const [applied, setApplied] = useState({ search: '', courseId: '', status: '', documentStatus: '' })
  const { data: students = [], isLoading, error } = useStudents(applied)
  const { data: courses = [] } = useCourses()
  const { data: documentTypes = [] } = useDocumentTypes()

  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const notifyPendingMutation = useMutation({
    mutationFn: () => apiService.post(`/api/admin/${slug()}/student-files/notify-pending`),
    onSuccess: (data: unknown) => { toast(`Notificaciones enviadas a ${(data as Record<string, unknown>)?.notified ?? 0} alumnos.`) },
    onError: () => toast('Error al notificar.', 'error'),
  })
  function handleNotifyPending() { notifyPendingMutation.mutate() }

  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showDetailId, setShowDetailId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState<{ fileId: string; url: string; fileName: string; mimeType: string } | null>(null)
  const [showReview, setShowReview] = useState<{ action: 'approve' | 'reject'; assignmentId: string; documentName: string } | null>(null)
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([])

  const toastId = useRef(0)
  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId.current
    setToasts((p) => [...p, { id, message: msg, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500)
  }, [])

  const { data: detail, isLoading: detailLoading } = useStudentDetail(showDetailId)
  const createRequest = useCreateDocumentRequest()
  const previewFile = usePreviewFile()
  const downloadFile = useDownloadFile()
  const approveDoc = useApproveDocument()
  const rejectDoc = useRejectDocument()

  const filtered = students.filter((s) => {
    const q = draft.search.toLowerCase().trim()
    if (q) {
      const name = (s.fullName || '').toLowerCase()
      if (!name.includes(q) && !(s.email || '').toLowerCase().includes(q) &&
          !String(s.dni || '').toLowerCase().includes(q) && !String(s.memberNumber || '').toLowerCase().includes(q))
        return false
    }
    if (draft.courseId && s.courseId !== draft.courseId) return false
    if (draft.status === 'active' && !s.isActive) return false
    if (draft.status === 'inactive' && s.isActive) return false
    const total = s.pendingCount + s.submittedCount + s.approvedCount + s.rejectedCount + s.expiredCount
    if (draft.documentStatus === 'pending' && !s.pendingCount) return false
    if (draft.documentStatus === 'submitted' && !s.submittedCount) return false
    if (draft.documentStatus === 'approved' && !s.approvedCount) return false
    if (draft.documentStatus === 'rejected' && !s.rejectedCount) return false
    if (draft.documentStatus === 'expired' && !s.expiredCount) return false
    if (draft.documentStatus === 'none' && total > 0) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const end = start + PAGE_SIZE
  const pageItems = filtered.slice(start, end)

  function applyFilters() { setApplied({ ...draft }); setPage(1) }
  function clearFilters() {
    setDraft({ search: '', courseId: '', status: '', documentStatus: '' })
    setApplied({ search: '', courseId: '', status: '', documentStatus: '' })
    setPage(1); setShowFilters(false)
  }

  const hasFilters = !!(draft.search || draft.courseId || draft.status || draft.documentStatus)

  function renderRecordsContent() {
    return (
      <>
      <Card className="p-4 sm:p-5">
        <button className="flex w-full items-center justify-between sm:hidden" onClick={() => setShowFilters((p) => !p)}>
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filtros</span>
            {hasFilters && (
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">Activos</span>
            )}
          </div>
          <svg className={`h-4 w-4 text-slate-400 transition ${showFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className={`${showFilters || 'hidden'} mt-4 sm:mt-0 sm:block`}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Buscar</label>
              <Input placeholder="Nombre, email, DNI o legajo" value={draft.search}
                onChange={(e) => setDraft((p) => ({ ...p, search: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Curso</label>
              <FilterSelect value={draft.courseId} onChange={(v) => setDraft((p) => ({ ...p, courseId: v }))}>
                <option value="">Todos los cursos</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </FilterSelect>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Alumno</label>
              <FilterSelect value={draft.status} onChange={(v) => setDraft((p) => ({ ...p, status: v }))}>
                <option value="">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </FilterSelect>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Documentación</label>
              <FilterSelect value={draft.documentStatus} onChange={(v) => setDraft((p) => ({ ...p, documentStatus: v }))}>
                <option value="">Todos</option>
                <option value="pending">Pendientes</option>
                <option value="submitted">En revisión</option>
                <option value="approved">Aprobados</option>
                <option value="rejected">Rechazados</option>
                <option value="expired">Vencidos</option>
                <option value="none">Sin documentos</option>
              </FilterSelect>
            </div>
            <div className="flex items-end gap-2">
              <Button size="sm" onClick={applyFilters} className="flex-1">Aplicar</Button>
              <Button size="sm" variant="ghost" onClick={clearFilters}>Limpiar</Button>
            </div>
          </div>
        </div>
      </Card>

      {/* LOADING */}
      {isLoading && (
        <Card className="p-8">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        </Card>
      )}

      {/* ERROR */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900/50 dark:bg-red-950/30">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-red-800 dark:text-red-200">
            <p className="font-semibold">Error al cargar</p>
            <p className="mt-0.5 text-red-600 dark:text-red-400">{error instanceof Error ? error.message : 'Intentalo de nuevo.'}</p>
          </div>
        </div>
      )}

      {/* LISTA */}
      {!isLoading && !error && (
        <Card className="overflow-hidden p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-16">
              <svg className="h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No hay alumnos</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Probá cambiando los filtros o limpiálos.</p>
            </div>
          ) : (
            <>

      {/* MOBILE CARDS */}
      <div className="sm:hidden">
        {pageItems.map((s) => (
          <div key={s.studentId} className="border-b border-slate-100 px-4 py-4 last:border-b-0 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                {initials(s.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{s.fullName || '-'}</p>
                <p className="truncate text-xs text-slate-400 dark:text-slate-500">{s.memberNumber || s.dni || 'Sin legajo'}</p>
              </div>
              <ActiveBadge active={s.isActive} />
            </div>
            <div className="ml-11 mt-1.5 flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                <span className="truncate max-w-[120px]">{s.email}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="truncate max-w-[100px]">{s.courseName}</span>
              </div>
            </div>
            <div className="ml-11 mt-2 flex items-center justify-between">
              <DocBadges student={s} />
              <button onClick={() => setShowDetailId(s.studentId)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm active:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:active:bg-slate-700">
                Ver legajo
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
              <th className="px-3 py-3.5">Alumno</th>
              <th className="hidden px-3 py-3.5 lg:table-cell">Email</th>
              <th className="hidden px-3 py-3.5 xl:table-cell">Curso</th>
              <th className="px-3 py-3.5">Documentación</th>
              <th className="w-24 px-3 py-3.5">Estado</th>
              <th className="w-28 px-3 py-3.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pageItems.map((s, i) => {
              const bg = i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'
              return (
                <tr key={s.studentId} className={`${bg} transition-colors hover:bg-teal-50/40 dark:hover:bg-teal-950/30`}>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                        {initials(s.fullName)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{s.fullName || '-'}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{s.memberNumber || s.dni || 'Sin legajo'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-3.5 text-slate-500 dark:text-slate-400 lg:table-cell">{s.email || '-'}</td>
                  <td className="hidden px-3 py-3.5 text-slate-500 dark:text-slate-400 xl:table-cell">{s.courseName || '-'}</td>
                  <td className="px-3 py-3.5"><DocBadges student={s} /></td>
                  <td className="px-3 py-3.5"><ActiveBadge active={s.isActive} /></td>
                  <td className="px-3 py-3.5 text-right">
                    <Button variant="outline" size="sm" onClick={() => setShowDetailId(s.studentId)}>Ver legajo</Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex flex-col items-center gap-3 border-t border-slate-200 bg-slate-50/50 px-4 py-3 sm:flex-row sm:justify-between sm:px-6 dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-xs text-slate-500 dark:text-slate-400">{start + 1}–{Math.min(end, filtered.length)} de {filtered.length}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>← Anterior</Button>
          <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente →</Button>
        </div>
      </div>
            </>
          )}
        </Card>
      )}
      </>
    )
  }

  function renderDocumentsContent() {
    return (
      <MainDocumentsView
        courses={courses}
        documentTypes={documentTypes}
        onOpenDetail={(id: string) => setShowDetailId(id)}
        toast={toast}
      />
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-teal-400/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">Legajos</h1>
            <p className="mt-1 text-sm text-teal-200 sm:mt-1.5 sm:text-base">Administrá la documentación de los alumnos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="shadow-lg" onClick={handleNotifyPending} loading={notifyPendingMutation.isPending}>
              Notificar pendientes
            </Button>
            <Button variant="secondary" size="sm" className="shadow-lg" onClick={() => setShowRequestModal(true)}>
              + Solicitar documentos
            </Button>
          </div>
        </div>
      </section>

      {/* NAV INTERNO */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button onClick={() => setPageTab('records')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${pageTab === 'records' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          Legajos
        </button>
        <button onClick={() => setPageTab('documents')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${pageTab === 'documents' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          Documentos
        </button>
      </div>

      {pageTab === 'records' && renderRecordsContent()}
      {pageTab === 'documents' && renderDocumentsContent()}

      {/* MODALS / DRAWERS */}

      {/* MODALS / DRAWERS */}
      {showRequestModal && (
        <RequestModal documentTypes={documentTypes} students={students}
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
          onClose={() => setShowDetailId(null)}
          onPreview={async (doc) => {
            try {
              const r = await previewFile.mutateAsync(doc.currentFileId!)
              setShowPreview({ fileId: doc.currentFileId!, url: r.url, fileName: doc.currentFileName || 'Documento', mimeType: doc.currentFileMimeType || r.contentType || '' })
            } catch { toast('No se pudo abrir el archivo.', 'error') }
          }}
          onDownload={async (fileId) => { try { window.open((await downloadFile.mutateAsync(fileId)).url, '_blank') } catch { toast('Error al descargar.', 'error') } }}
          onApprove={(aid, name) => setShowReview({ action: 'approve', assignmentId: aid, documentName: name })}
          onReject={(aid, name) => setShowReview({ action: 'reject', assignmentId: aid, documentName: name })} />
      )}

      {showPreview && (
        <PreviewModal url={showPreview.url} fileName={showPreview.fileName} mimeType={showPreview.mimeType}
          onClose={() => setShowPreview(null)}
          onDownload={async () => { try { window.open((await downloadFile.mutateAsync(showPreview.fileId)).url, '_blank') } catch { toast('Error al descargar.', 'error') } }} />
      )}

      {showReview && (
        <ReviewModal action={showReview.action} documentName={showReview.documentName}
          isPending={approveDoc.isPending || rejectDoc.isPending} serverError={approveDoc.error || rejectDoc.error}
          onSubmit={async ({ reviewNote, expirationDateUtc }) => {
            try {
              if (showReview.action === 'approve') { await approveDoc.mutateAsync({ assignmentId: showReview.assignmentId, reviewNote, expirationDateUtc }); toast('Documento aprobado.') }
              else { await rejectDoc.mutateAsync({ assignmentId: showReview.assignmentId, reviewNote: reviewNote! }); toast('Documento rechazado.') }
              setShowReview(null)
            } catch { toast('Error en la revisión.', 'error') }
          }}
          onClose={() => setShowReview(null)} />
      )}

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

function FilterSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
      {children}
    </Select>
  )
}

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
      Activo
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
      Inactivo
    </span>
  )
}

const BADGE_META: { key: string; label: string; cls: string; dark: string; getCount: (s: Student) => number }[] = [
  { key: 'pending', label: 'Pend.', cls: 'bg-amber-100 text-amber-700', dark: 'dark:bg-amber-900/50 dark:text-amber-300', getCount: (s) => s.pendingCount },
  { key: 'submitted', label: 'Revisión', cls: 'bg-blue-100 text-blue-700', dark: 'dark:bg-blue-900/50 dark:text-blue-300', getCount: (s) => s.submittedCount },
  { key: 'approved', label: 'Aprob.', cls: 'bg-emerald-100 text-emerald-700', dark: 'dark:bg-emerald-900/50 dark:text-emerald-300', getCount: (s) => s.approvedCount },
  { key: 'rejected', label: 'Rech.', cls: 'bg-rose-100 text-rose-700', dark: 'dark:bg-rose-900/50 dark:text-rose-300', getCount: (s) => s.rejectedCount },
  { key: 'expired', label: 'Venc.', cls: 'bg-slate-200 text-slate-600', dark: 'dark:bg-slate-700 dark:text-slate-300', getCount: (s) => s.expiredCount },
]

function DocBadges({ student }: { student: Student }) {
  const total = BADGE_META.reduce((sum, m) => sum + m.getCount(student), 0)
  if (!total) return <span className="text-xs text-slate-400 dark:text-slate-500">Sin documentos</span>
  return (
    <div className="flex flex-wrap gap-1">
      {BADGE_META.filter((m) => m.getCount(student) > 0).map((m) => (
        <span key={m.key} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${m.cls} ${m.dark}`}>
          {m.getCount(student)} {m.label}
        </span>
      ))}
    </div>
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
function MainDocumentsView({ courses, documentTypes, onOpenDetail, toast }: {
  courses: { id: string; name: string }[]
  documentTypes: { id: string; name: string }[]
  onOpenDetail: (id: string) => void
  toast: (msg: string, type?: 'success' | 'error') => void
}) {
  const PAGE_SIZE = 20
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [filterDocType, setFilterDocType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const filters = { search, courseId: filterCourse, documentTypeId: filterDocType, status: filterStatus }
  const { data: documents = [], isLoading } = useAllDocuments(filters)

  const [viewFileData, setViewFileData] = useState<{ url: string; fileName: string; isImage: boolean; isPdf: boolean } | null>(null)
  const [viewFileLoading, setViewFileLoading] = useState(false)
  const [zipLoading, setZipLoading] = useState(false)

  function formatDateSafe(v: string | null) { return v ? formatDate(v) : '-' }

  function getBestDate(d: import('./hooks').AdminDocumentItem): string {
    return d.submittedAtUtc || d.dueDateUtc || ''
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(documents.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const end = start + PAGE_SIZE
  const pageItems = documents.slice(start, end)

  async function handleViewFile(fileId: string, fileName: string, mimeType: string) {
    setViewFileLoading(true)
    setViewFileData(null)
    try {
      const res = await apiService.get<{ url: string }>(`/api/admin/${slug()}/student-files/files/${fileId}/view`)
      if (res?.url) setViewFileData({ url: res.url, fileName, isImage: mimeType?.toLowerCase().startsWith('image/') ?? false, isPdf: mimeType?.toLowerCase() === 'application/pdf' })
    } catch { /* ignore */ } finally { setViewFileLoading(false) }
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
          <p className="text-xs text-slate-400 mt-0.5">{documents.length} documento{documents.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadZip} loading={zipLoading} disabled={documents.length === 0}>
          Descargar todos los documentos
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Input placeholder="Buscar alumno o documento..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <select value={filterCourse} onChange={(e) => { setFilterCourse(e.target.value); setPage(1) }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          <option value="">Todos los cursos</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterDocType} onChange={(e) => { setFilterDocType(e.target.value); setPage(1) }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          <option value="">Todos los tipos</option>
          {documentTypes.map((dt) => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          <option value="">Todos los estados</option>
          <option value="Pending">Pendientes</option>
          <option value="Submitted">En revisión</option>
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
                  <div className="shrink-0">
                    {d.fileId ? (
                      <a href={`/api/admin/${slug()}/student-files/files/${d.fileId}/download-file`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                        Descargar
                      </a>
                    ) : (
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
                  <th className="px-3 py-3 w-[12%] text-right">Descargar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pageItems.map((d) => {
                  const statusLabel = normalizeStatus(d.status)
                  const statusClass = getStatusBadgeClass(d.status)
                  const bestDate = getBestDate(d)
                  return (
                    <tr key={d.assignmentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-3 py-3 w-[30%] min-w-[220px]">
                        <p className="font-semibold text-slate-900 dark:text-white whitespace-nowrap truncate">{d.studentName}</p>
                        <p className="text-xs text-slate-400">{d.dni || d.courseName || '-'}</p>
                      </td>
                      <td className="px-3 py-3 w-[18%] min-w-[140px] max-w-[220px]">
                        <p className="font-semibold text-slate-900 dark:text-white truncate" title={d.documentTypeName}>{d.documentTypeName}</p>
                        {d.fileName && <p className="text-xs text-slate-400 truncate max-w-[200px]" title={d.fileName}>{d.fileName}</p>}
                      </td>
                      <td className="px-3 py-3 w-[14%]">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusClass}`}>{statusLabel}</span>
                      </td>
                      <td className="px-3 py-3 w-[14%] hidden md:table-cell text-slate-500 whitespace-nowrap">{formatDateSafe(bestDate)}</td>
                      <td className="px-3 py-3 w-[12%] text-right">
                        {d.fileId ? (
                          <a href={`/api/admin/${slug()}/student-files/files/${d.fileId}/download-file`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                            Descargar
                          </a>
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

          {/* Pagination */}
          <div className="flex flex-col items-center gap-3 border-t border-slate-200 bg-slate-50/50 px-4 py-3 sm:flex-row sm:justify-between sm:px-6 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">{start + 1}–{Math.min(end, documents.length)} de {documents.length}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>← Anterior</Button>
              <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente →</Button>
            </div>
          </div>
        </>
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
                    <td className="px-3 py-3 hidden md:table-cell text-slate-500 whitespace-nowrap">{bestDate ? formatDate(bestDate) : '—'}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        {doc.currentFileId ? (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleViewFile(doc.currentFileId!, doc.currentFileName || 'Documento', doc.currentFileMimeType || '')}>Ver</Button>
                            <a href={`/api/admin/${slug()}/student-files/files/${doc.currentFileId}/download-file`}
                              target="_blank" rel="noopener noreferrer"
                              className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                              Descargar
                            </a>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
function DetailDrawer({ detail, isLoading, documentTypes, onClose, onPreview, onDownload, onApprove, onReject }: {
  detail: import('./hooks').StudentDetail | null; isLoading: boolean
  documentTypes: { id: string; name: string }[]
  onClose: () => void
  onPreview: (doc: import('./hooks').StudentDocument) => void
  onDownload: (fileId: string) => void
  onApprove: (assignmentId: string, documentName: string) => void
  onReject: (assignmentId: string, documentName: string) => void
}) {
  const [visible, setVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<'legajo' | 'documentos'>('legajo')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadDocType, setUploadDocType] = useState('')
  const [uploading, setUploading] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])
  useEffect(() => { setActiveTab('legajo') }, [detail?.studentId])

  function handleClose() { setVisible(false); setTimeout(onClose, 200) }

  function showToast(text: string, type: 'success' | 'error' = 'success') {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 3500)
  }

  async function handleUpload() {
    if (!detail || !uploadFile) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      if (uploadDocType) fd.append('documentTypeId', uploadDocType)
      await apiService.postForm(`/api/admin/${slug()}/student-files/students/${detail.studentId}/upload`, fd)
      showToast('Documento subido correctamente.')
      setUploadFile(null)
      onClose()
    } catch {
      showToast('Error al subir el documento.', 'error')
    }
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 z-[55]">
      <div className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose} />
      <div className={`absolute inset-x-0 bottom-0 top-16 flex flex-col bg-white shadow-2xl transition-transform duration-300 sm:top-0 sm:left-auto sm:right-0 sm:w-full sm:max-w-2xl lg:max-w-3xl dark:bg-slate-900 ${
        visible ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-y-0 sm:translate-x-full'}`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-700">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">Legajo del alumno</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Documentación y revisión</p>
          </div>
          <button onClick={handleClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        {detail && (
          <div className="flex gap-1 border-b border-slate-200 px-5 py-2 dark:border-slate-700">
            <button onClick={() => setActiveTab('legajo')}
              className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${activeTab === 'legajo' ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              Legajo
            </button>
            <button onClick={() => setActiveTab('documentos')}
              className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${activeTab === 'documentos' ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              Documentos
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {activeTab === 'documentos' ? (
            <DocumentosTab detail={detail} documentTypes={documentTypes} toast={showToast} />
          ) : (
            <>
          {isLoading && (
            <div className="space-y-4 py-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          )}
          {!isLoading && !detail && (
            <p className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">Seleccioná un alumno para ver su legajo.</p>
          )}
          {!isLoading && detail && (
            <div className="space-y-5">
              {/* Perfil */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  {detail.profileImageUrl ? (
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-700">
                      <img src={detail.profileImageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-base font-bold text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                      {initials(detail.fullName)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">{detail.fullName || '-'}</h4>
                    <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                      <span><b className="text-slate-700 dark:text-slate-300">Email:</b> {detail.email || '-'}</span>
                      <span><b className="text-slate-700 dark:text-slate-300">DNI:</b> {detail.dni || '-'}</span>
                      <span><b className="text-slate-700 dark:text-slate-300">Legajo:</b> {detail.memberNumber || '-'}</span>
                      <span><b className="text-slate-700 dark:text-slate-300">Curso:</b> {detail.courseName || '-'}</span>
                      <span className="col-span-2"><b className="text-slate-700 dark:text-slate-300">Obra social:</b> {detail.hasHealthInsurance ? `Sí${detail.healthInsuranceName ? ` (${detail.healthInsuranceName})` : ''}` : 'No'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documentos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Documentación</h4>
                  <span className="text-sm text-slate-400 dark:text-slate-500">{detail.documents.length} documento{detail.documents.length !== 1 ? 's' : ''}</span>
                </div>
                {detail.documents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-600 dark:bg-slate-800/30 dark:text-slate-500">
                    Sin documentación solicitada.
                  </div>
                ) : (
                  detail.documents.map((doc) => (
                    <DocumentCard key={doc.assignmentId} doc={doc}
                      onPreview={doc.currentFileId ? () => onPreview(doc) : undefined}
                      onDownload={doc.currentFileId ? () => onDownload(doc.currentFileId!) : undefined}
                      onApprove={() => onApprove(doc.assignmentId, doc.documentTypeName)}
                      onReject={() => onReject(doc.assignmentId, doc.documentTypeName)} />
                  ))
                )}
              </div>

              {/* Upload directo */}
              <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-5 dark:border-violet-900/50 dark:bg-violet-950/20">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-lg dark:bg-violet-900/40">📎</span>
                  <div>
                    <p className="text-sm font-bold text-violet-800 dark:text-violet-200">Subir documento</p>
                    <p className="text-xs text-violet-600 dark:text-violet-400">Se agregará directamente al legajo, sin solicitud previa.</p>
                  </div>
                </div>
                {documentTypes.length > 0 && (
                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Tipo documental</label>
                    <Select value={uploadDocType} onChange={(e) => setUploadDocType(e.target.value)}>
                      <option value="">Seleccionar tipo...</option>
                      {documentTypes.map((dt) => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
                    </Select>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1">
                    <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-violet-700 shadow-sm border border-slate-200 rounded-xl px-3 py-2 hover:file:bg-violet-50 dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-violet-300 dark:border-slate-600" />
                  </div>
                  <Button size="sm" onClick={handleUpload} disabled={!uploadFile || !uploadDocType} loading={uploading}
                    className="bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-500/20 shrink-0 sm:w-auto w-full">Subir</Button>
                </div>
                {uploadFile && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Archivo: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(1)} MB)
                  </p>
                )}
                {toastMsg && (
                  <p className={`mt-2 text-xs font-medium ${toastMsg.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                    {toastMsg.text}
                  </p>
                )}
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── DocumentCard ─── */
function DocumentCard({ doc, onPreview, onDownload, onApprove, onReject }: {
  doc: StudentDocument; onPreview?: () => void; onDownload?: () => void
  onApprove?: () => void; onReject?: () => void
}) {
  const canReview = normalizeStatus(doc.status) === 'Submitted'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-700 dark:bg-slate-800/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-sm font-bold text-slate-900 sm:text-base dark:text-white">{doc.documentTypeName || 'Documento'}</h5>
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${getStatusBadgeClass(doc.status)}`}>{getStatusLabel(doc.status)}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-sm text-slate-500 dark:text-slate-400">
            <span><b className="font-semibold text-slate-600 dark:text-slate-400">Asignado:</b> {formatDate(doc.assignedAtUtc)}</span>
            <span><b className="font-semibold text-slate-600 dark:text-slate-400">Límite:</b> {formatDate(doc.dueDateUtc)}</span>
            <span><b className="font-semibold text-slate-600 dark:text-slate-400">Enviado:</b> {formatDate(doc.submittedAtUtc)}</span>
            <span><b className="font-semibold text-slate-600 dark:text-slate-400">Revisado:</b> {formatDate(doc.reviewedAtUtc)}</span>
            <span><b className="font-semibold text-slate-600 dark:text-slate-400">Vence:</b> {formatDate(doc.expirationDateUtc)}</span>
            <span className="truncate"><b className="font-semibold text-slate-600 dark:text-slate-400">Archivo:</b> {doc.currentFileName || '—'}</span>
          </div>

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
          {onPreview && <DocActionBtn onClick={onPreview}>Ver archivo</DocActionBtn>}
          {onDownload && <DocActionBtn onClick={onDownload}>Descargar</DocActionBtn>}
          {canReview && onApprove && <DocActionBtn className="bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800" onClick={onApprove}>Aprobar</DocActionBtn>}
          {canReview && onReject && <DocActionBtn className="bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800" onClick={onReject}>Rechazar</DocActionBtn>}
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

/* ─── PreviewModal ─── */
function PreviewModal({ url, fileName, mimeType, onClose, onDownload }: {
  url: string; fileName: string; mimeType: string; onClose: () => void; onDownload: () => void
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  function handleClose() { setVisible(false); setTimeout(onClose, 200) }

  return (
    <div className="fixed inset-0 z-[65] flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className={`absolute inset-0 bg-black/70 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose} />
      <div className={`relative z-10 flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 sm:max-w-4xl sm:rounded-2xl dark:bg-slate-900 ${
        visible ? 'translate-y-0' : 'translate-y-full sm:translate-y-4 sm:opacity-0'}`}>
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 sm:text-base dark:text-white">{fileName}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">{mimeType}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={onDownload}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.97] dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
              Descargar
            </button>
            <button onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 sm:p-5">
          {isPdf(mimeType) ? (
            <iframe src={url} className="h-[60vh] w-full rounded-xl border border-slate-200 dark:border-slate-700" title={fileName} />
          ) : isImage(mimeType) ? (
            <div className="flex max-h-[60vh] items-center justify-center overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <img src={url} alt={fileName} className="max-h-[55vh] w-auto max-w-full object-contain" />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              No se puede previsualizar. Usá el botón descargar.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── ReviewModal ─── */
function ReviewModal({ action, documentName, isPending, serverError, onSubmit, onClose }: {
  action: 'approve' | 'reject'; documentName: string
  isPending: boolean; serverError: Error | null
  onSubmit: (d: { reviewNote: string | null; expirationDateUtc: string | null }) => void
  onClose: () => void
}) {
  const isApprove = action === 'approve'
  const [note, setNote] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [formError, setFormError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setFormError('')
    if (!isApprove && !note.trim()) { setFormError('Indicá el motivo del rechazo.'); return }
    onSubmit({ reviewNote: note.trim() || null, expirationDateUtc: expirationDate ? `${expirationDate}T00:00:00Z` : null })
  }

  return (
    <ModalShell onClose={onClose} title={isApprove ? 'Aprobar documento' : 'Rechazar documento'}
      subtitle={isApprove ? 'Fecha de vencimiento y observación opcional' : 'Indicá el motivo del rechazo'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800">
          <span className="font-bold text-slate-600 dark:text-slate-400">Documento: </span>
          <span className="font-semibold text-slate-900 dark:text-white">{documentName}</span>
        </div>
        {isApprove && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Fecha de vencimiento (opcional)</label>
            <DatePicker value={expirationDate} onChange={setExpirationDate} placeholder="Sin vencimiento" />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Observación</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            placeholder={isApprove ? 'Opcional' : 'Motivo del rechazo'}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </div>
        {(formError || serverError) && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {formError || serverError?.message}
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button type="submit" size="sm" loading={isPending}
            className={isApprove ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-rose-600 text-white hover:bg-rose-700'}>
            {isApprove ? 'Aprobar' : 'Rechazar'}
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}
