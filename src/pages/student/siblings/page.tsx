import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { PageHero } from '@/components/ui/page-hero'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { formatDate, unwrap } from '../student.hooks'

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

interface Sibling { fullName: string; dni?: string }
interface SiblingRequest {
  id: string
  status: string | number
  requestedByStudentFullName: string
  targetStudentFullName: string
  note?: string
  adminReviewNote?: string
  documentsRequestNote?: string
  createdAtUtc: string
}
interface SearchResult { studentId: string; fullName: string; dni?: string; alreadySibling?: boolean; hasPendingRequest?: boolean }

function normalizeStatus(status: unknown): string {
  const raw = String(status ?? '').trim().toLowerCase()
  if (raw === '1' || raw === 'pending') return 'Pending'
  if (raw === '2' || raw === 'documentsrequested' || raw === 'documentrequested' || raw === 'documentationrequested') return 'DocumentRequested'
  if (raw === '3' || raw === 'underreview' || raw === 'inreview') return 'InReview'
  if (raw === '4' || raw === 'approved') return 'Approved'
  if (raw === '5' || raw === 'rejected') return 'Rejected'
  if (raw === '6' || raw === 'cancelled' || raw === 'canceled') return 'Cancelled'
  return ''
}

const statusMeta: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'info' | 'default' }> = {
  Pending: { label: 'Pendiente', variant: 'warning' },
  DocumentRequested: { label: 'Documentación solicitada', variant: 'info' },
  InReview: { label: 'En revisión', variant: 'warning' },
  Approved: { label: 'Aprobada', variant: 'success' },
  Rejected: { label: 'Rechazada', variant: 'danger' },
  Cancelled: { label: 'Cancelada', variant: 'default' },
}

function SiblingsPageInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: siblings = [], isLoading: ls } = useQuery({
    queryKey: ['siblings', slug()],
    queryFn: () => apiService.get<Sibling[]>(`/api/student/${slug()}/siblings`),
    enabled: !!slug(),
    select: (d: unknown) => unwrap<Sibling>(d),
  })

  const { data: requests = [], isLoading: lr } = useQuery({
    queryKey: ['sibling-requests', slug()],
    queryFn: () => apiService.get<SiblingRequest[]>(`/api/student/${slug()}/sibling-link-requests`),
    enabled: !!slug(),
    select: (d: unknown) => unwrap<SiblingRequest>(d),
  })

  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [searching, setSearching] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<SiblingRequest | null>(null)
  const [requestDocuments, setRequestDocuments] = useState<{ id: string; fileName: string; isImage?: boolean; isPdf?: boolean; uploadedAtUtc?: string }[]>([])
  const [viewingDoc, setViewingDoc] = useState<string | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  function doSearch(term: string) {
    setSearch(term)
    if (searchTimer.current !== null) clearTimeout(searchTimer.current)
    if (term.length < 3) { setResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const d = await apiService.get<unknown>(`/api/student/${slug()}/siblings/search?term=${encodeURIComponent(term)}`)
        setResults(unwrap<SearchResult>(d))
      } catch { setResults([]) }
      setSearching(false)
    }, 300)
  }

  const createMutation = useMutation({
    mutationFn: (body: { targetStudentId: string; note?: string }) =>
      apiService.post(`/api/student/${slug()}/siblings/requests`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sibling-requests'] })
      toast('Solicitud de vínculo enviada correctamente.')
      setSelectedId(null); setNote(''); setSearch(''); setResults([])
    },
  })

  const pendingCount = requests.filter((r) => { const s = String(r.status).toLowerCase(); return s === '1' || s === 'pending' }).length
  const loading = ls || lr

  async function openRequestDetail(r: SiblingRequest) {
    setSelectedRequest(r)
    setLoadingDetail(true)
    try {
      const detail = await apiService.get<unknown>(`/api/student/${slug()}/siblings/requests/${r.id}`)
      setSelectedRequest(detail as SiblingRequest)
      const docs = await apiService.get<unknown>(`/api/student/${slug()}/siblings/requests/${r.id}/documents`)
      setRequestDocuments(unwrap<{ id: string; fileName: string; isImage?: boolean; isPdf?: boolean; uploadedAtUtc?: string }>(docs))
    } catch { /* ignore */ }
    setLoadingDetail(false)
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>

  return (
    <div className="space-y-5 pb-8">
      <PageHero
        label="Familiares"
        title="Hermanos"
        description="Vinculá familiares para acceder a descuentos y beneficios."
        stats={[
          { label: 'Vinculados', value: siblings.length },
          ...(requests.length > 0 ? [{ label: 'Solicitudes', value: requests.length }] : []),
          ...(pendingCount > 0 ? [{ label: 'Pendientes', value: pendingCount }] : []),
        ]}
      />

      {/* Buscar familiar */}
      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Buscar familiar</h2>
          <p className="text-xs text-slate-500 mt-1">Ingresá nombre, apellido o DNI del familiar (mínimo 3 caracteres).</p>
        </div>
        <Input value={search} onChange={(e) => doSearch(e.target.value)} placeholder="Buscá por nombre o DNI..." />

        {searching && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner className="h-4 w-4 text-violet-600" />
            Buscando...
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((r) => {
              const disabled = r.alreadySibling || r.hasPendingRequest
              return (
                <div key={r.studentId}
                  className={`rounded-xl border p-3 transition ${
                    selectedId === r.studentId
                      ? 'border-violet-300 bg-violet-50 dark:border-violet-600 dark:bg-violet-950/30'
                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                  } ${disabled ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {r.fullName}{r.dni ? <span className="ml-1.5 font-normal text-slate-400">• {r.dni}</span> : ''}
                      </p>
                      {r.alreadySibling && <p className="text-xs text-emerald-600 mt-0.5">✓ Ya está vinculado como familiar</p>}
                      {r.hasPendingRequest && <p className="text-xs text-amber-600 mt-0.5">⏳ Ya hay una solicitud pendiente con este alumno</p>}
                    </div>
                    {!disabled && (
                      <Button size="sm"
                        variant={selectedId === r.studentId ? 'primary' : 'outline'}
                        onClick={() => setSelectedId(selectedId === r.studentId ? null : r.studentId)}>
                        {selectedId === r.studentId ? 'Seleccionado' : 'Seleccionar'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {search.length >= 3 && !searching && results.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">No se encontraron alumnos con ese nombre o DNI.</p>
        )}

        {selectedId && (
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-3 dark:border-violet-700 dark:bg-violet-950/30">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <p className="text-sm font-bold text-violet-800 dark:text-violet-200">Enviar solicitud de vínculo</p>
            </div>
            <p className="text-xs text-violet-600 dark:text-violet-400">
              El destinatario recibirá una notificación y deberá aceptar la solicitud.
            </p>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              placeholder="Agregá un mensaje opcional para tu familiar..." />
            <Button onClick={() => createMutation.mutate({ targetStudentId: selectedId, note: note.trim() || undefined })}
              loading={createMutation.isPending} className="bg-violet-600 text-white hover:bg-violet-700">
              Enviar solicitud
            </Button>
          </div>
        )}
      </Card>

      {/* Vinculados */}
      {siblings.length > 0 && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Familiares vinculados</h2>
              <p className="text-xs text-slate-500">{siblings.length} {siblings.length === 1 ? 'vínculo activo' : 'vínculos activos'}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {siblings.map((s, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-base dark:from-emerald-900/40 dark:to-teal-900/40">
                  👤
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{s.fullName}</p>
                  {s.dni && <p className="text-xs text-slate-400">DNI: {s.dni}</p>}
                </div>
                <Badge variant="success" className="ml-auto">Vinculado</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Solicitudes */}
      {requests.length > 0 && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Solicitudes de vínculo</h2>
              <p className="text-xs text-slate-500">{requests.length} {requests.length === 1 ? 'solicitud' : 'solicitudes'}</p>
            </div>
          </div>
          <div className="space-y-2">
            {requests.map((r) => {
              const sm = statusMeta[normalizeStatus(r.status)] ?? { label: 'Desconocido', variant: 'default' as const }
              const otherName = r.targetStudentFullName || r.requestedByStudentFullName
              return (
                <div key={r.id} onClick={() => openRequestDetail(r)}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{otherName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{formatDate(r.createdAtUtc)}</span>
                      {r.note && <span className="text-xs text-slate-400">• "{r.note}"</span>}
                    </div>
                  </div>
                  <Badge variant={sm.variant}>{sm.label}</Badge>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {siblings.length === 0 && requests.length === 0 && (
        <EmptyState icon="👫" title="Sin familiares vinculados"
          description="Buscá un familiar por nombre o DNI y enviále una solicitud de vínculo. Una vez aceptada, podrán acceder a beneficios compartidos." />
      )}

      {/* Request detail modal */}
      {selectedRequest && (
        <Modal open={!!selectedRequest} onClose={() => { setSelectedRequest(null); setRequestDocuments([]) }} title="Detalle de la solicitud" className="sm:max-w-md">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-12"><Spinner className="h-6 w-6 text-violet-600" /></div>
          ) : (
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={statusMeta[normalizeStatus(selectedRequest.status)]?.variant ?? 'default'}>
                  {statusMeta[normalizeStatus(selectedRequest.status)]?.label ?? 'Desconocido'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Solicitante</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{selectedRequest.requestedByStudentFullName}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destino</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{selectedRequest.targetStudentFullName}</p>
                </div>
              </div>

              {selectedRequest.note && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nota de la solicitud</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{selectedRequest.note}</p>
                </div>
              )}

              {selectedRequest.adminReviewNote && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300">Nota del administrador</p>
                  <p className="mt-1 text-sm text-blue-900 dark:text-blue-100">{selectedRequest.adminReviewNote}</p>
                </div>
              )}

              {selectedRequest.documentsRequestNote && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Documentación solicitada</p>
                  <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">{selectedRequest.documentsRequestNote}</p>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fecha</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatDate(selectedRequest.createdAtUtc)}</p>
              </div>

              {/* Documents */}
              {requestDocuments.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Documentos</p>
                  <div className="mt-2 space-y-1">
                    {requestDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{doc.fileName}</span>
                        <button onClick={() => setViewingDoc(doc.id)}
                          className="shrink-0 text-xs font-semibold text-violet-600 hover:text-violet-500">Ver</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Document viewer modal */}
      {viewingDoc && (
        <Modal open={!!viewingDoc} onClose={() => setViewingDoc(null)} title="Documento" className="sm:max-w-lg">
          <div className="p-4">
            <iframe src={`/api/student/${slug()}/siblings/requests/${selectedRequest?.id}/documents/${viewingDoc}/view`}
              className="h-[70vh] w-full rounded-xl border-0" title="Documento" />
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function StudentSiblingsPage() { return <ToastProvider><SiblingsPageInner /></ToastProvider> }
