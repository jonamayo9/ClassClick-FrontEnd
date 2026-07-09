import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { apiService } from '@/lib/api'
import { imgUrl } from '@/lib/media'
import { useAuth } from '@/stores/auth'
import { formatDate } from '../student.hooks'

const MAX_FILE_SIZE = 25 * 1024 * 1024

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

/* ─── Helpers ─── */

function pick<T>(raw: Record<string, unknown>, keys: string[]): T | undefined {
  for (const k of keys) {
    const v = raw[k]
    if (v !== null && v !== undefined) return v as T
  }
  return undefined
}

function pickString(raw: Record<string, unknown>, keys: string[]): string {
  return pick<string>(raw, keys) ?? ''
}

function pickBool(raw: Record<string, unknown>, keys: string[]): boolean {
  return pick<boolean>(raw, keys) === true
}

function asArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (Array.isArray(obj.items)) return obj.items as T[]
    if (Array.isArray(obj.data)) return obj.data as T[]
    if (Array.isArray(obj.documents)) return obj.documents as T[]
  }
  return []
}

/* ─── Status ─── */

function formatDocumentStatus(status: unknown): string {
  const v = String(status ?? '').toLowerCase().trim()
  if (v === '' || v === 'null' || v === 'undefined') return 'Pendiente'
  if (v === '1' || v === 'pending') return 'Pendiente'
  if (v === '2' || v === 'submitted' || v === 'uploaded') return 'Entregado'
  if (v === '3' || v === 'approved') return 'Aprobado'
  if (v === '4' || v === 'rejected') return 'Rechazado'
  if (v === '5' || v === 'expired') return 'Vencido'
  if (v.includes('missing')) return 'Faltante'
  return String(status ?? 'Pendiente')
}

const statusVariants: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
  pendiente: 'warning',
  entregado: 'info',
  aprobado: 'success',
  rechazado: 'danger',
  vencido: 'default',
  faltante: 'warning',
}

function getStatusVariant(status: unknown) {
  return statusVariants[formatDocumentStatus(status).toLowerCase()] ?? 'default'
}

/* ─── Normalizer ─── */

interface NormalizedDoc {
  assignmentId: string
  title: string
  status: string
  statusLabel: string
  isRequired: boolean
  notes: string
  rejectionReason: string
  assignedAt: string
  dueDate: string
  expirationDateUtc: string
  fileId: string
  fileName: string
  fileMimeType: string
  canUpload: boolean
  raw: Record<string, unknown>
}

function normalizeDocument(raw: Record<string, unknown>): NormalizedDoc {
  const assignmentId = pickString(raw, ['assignmentId', 'AssignmentId'])
  const title = pickString(raw, ['documentTypeName', 'DocumentTypeName', 'title', 'Title'])
  const statusRaw = pick(raw, ['status', 'Status']) ?? ''
  const statusLabel = formatDocumentStatus(statusRaw)
  const isRequired = pickBool(raw, ['isMandatory', 'IsMandatory'])
  const notes = pickString(raw, ['requestNote', 'RequestNote', 'notes', 'Notes'])
  const rejectionReason = pickString(raw, ['reviewNote', 'ReviewNote'])
  const assignedAt = pickString(raw, ['assignedAtUtc', 'AssignedAtUtc'])
  const dueDate = pickString(raw, ['dueDateUtc', 'DueDateUtc'])
  const expirationDateUtc = pickString(raw, ['expirationDateUtc', 'ExpirationDateUtc'])
  const fileId = pickString(raw, ['currentFileId', 'CurrentFileId'])
  const fileName = pickString(raw, ['currentFileName', 'CurrentFileName'])
  const fileMimeType = pickString(raw, ['currentFileMimeType', 'CurrentFileMimeType'])

  const label = statusLabel.toLowerCase()
  const canUpload = !!assignmentId && label !== 'aprobado'

  return {
    assignmentId,
    title,
    status: String(statusRaw),
    statusLabel,
    isRequired,
    notes,
    rejectionReason,
    assignedAt,
    dueDate,
    expirationDateUtc,
    fileId,
    fileName,
    fileMimeType,
    canUpload,
    raw,
  }
}

/* ─── Page ─── */

function DocumentsPageInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: rawList, isLoading, error } = useQuery({
    queryKey: ['my-documents', slug()],
    queryFn: async () => {
      const res = await apiService.get<unknown>(`/api/student/${slug()}/student-files/my-documents`)
      console.log('MY_DOCUMENTS RESPONSE', res)
      return res
    },
    enabled: !!slug(),
  })

  const docs = asArray(rawList).map((d) => normalizeDocument(d as Record<string, unknown>))

  const [selected, setSelected] = useState<NormalizedDoc | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [viewing, setViewing] = useState<{ url?: string; name?: string } | null>(null)

  const pendingCount = docs.filter((d) => {
    const s = d.statusLabel.toLowerCase()
    return s === 'pendiente' || s === 'rechazado' || s === 'vencido' || s === 'faltante'
  }).length

  function formatDateSafe(v: string) { return v ? formatDate(v) : '-' }

  async function handleUpload() {
    if (!selected || !uploadFile) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      await apiService.postForm(
        `/api/student/${slug()}/student-files/assignments/${selected.assignmentId}/upload`,
        fd,
      )
      qc.invalidateQueries({ queryKey: ['my-documents'] })
      toast('Documento subido correctamente.')
      setUploadFile(null)
      setSelected(null)
    } catch {
      toast('Error al subir el documento. Verificá el formato y tamaño.', 'error')
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      toast('El archivo supera los 25 MB permitidos.', 'error')
      e.target.value = ''
      return
    }
    setUploadFile(file)
  }

  useEffect(() => {
    if (selected) console.log('SELECTED DOCUMENT', selected)
  }, [selected])

  const isImage = (mime?: string) => mime?.toLowerCase().startsWith('image/')
  const isPdf = (mime?: string) => mime?.toLowerCase() === 'application/pdf'

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-br from-rose-600 via-pink-700 to-fuchsia-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Mis documentos</h1>
          <p className="mt-1 text-sm text-pink-200">Documentación requerida</p>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4"><div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /></Card>
          ))}
        </div>
      </div>
    )
  }

  /* ─── Main ─── */
  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-rose-600 via-pink-700 to-fuchsia-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Mis documentos</h1>
            <p className="mt-1 text-sm text-pink-200">Documentación requerida</p>
          </div>
          {pendingCount > 0 && (
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-pink-200">Pendientes</p>
              <p className="text-xl font-bold">{pendingCount}</p>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-red-500 dark:text-red-400">Error al cargar los documentos.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => qc.invalidateQueries({ queryKey: ['my-documents'] })}>Reintentar</Button>
        </Card>
      ) : docs.length === 0 ? (
        <EmptyState icon="📄" title="Sin documentos" description="No tenés documentación requerida." />
      ) : (
        <div className="space-y-3">
          {docs.map((d) => (
            <Card
              key={d.assignmentId}
              className="p-4 space-y-3 cursor-pointer transition hover:shadow-md active:scale-[0.99]"
              onClick={() => setSelected(d)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{d.title || 'Documento'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {d.isRequired ? 'Obligatorio' : 'Opcional'} · {d.statusLabel}
                  </p>
                </div>
                <Badge variant={getStatusVariant(d.status)} className="shrink-0">{d.statusLabel}</Badge>
              </div>
              {d.notes && (
                <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-2.5 dark:bg-slate-800/50 line-clamp-2">{d.notes}</p>
              )}
              {d.rejectionReason && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-xl p-2.5 dark:bg-amber-950/30 line-clamp-2">{d.rejectionReason}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                {d.fileName && <span className="truncate max-w-[200px]">Archivo: {d.fileName}</span>}
                {d.dueDate && <span>Vence: {formatDateSafe(d.dueDate)}</span>}
              </div>
              <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                {d.fileId && (
                  <Button variant="outline" size="sm"
                    onClick={() => setViewing({ name: d.fileName, url: `/api/student/${slug()}/student-files/files/${d.fileId}/view` })}>
                    Ver archivo
                  </Button>
                )}
                {d.canUpload && (
                  <Button size="sm" className="bg-violet-600 text-white hover:bg-violet-700"
                    onClick={() => setSelected(d)}>
                    {d.fileName ? 'Reemplazar' : 'Subir archivo'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => { setSelected(null); setUploadFile(null) }}
          title={selected.title || 'Documento'} className="sm:max-w-lg">
          <div className="px-5 py-4 sm:px-6 space-y-4 max-h-[85vh] overflow-y-auto">

            {/* Debug */}
            <details className="text-[10px] text-slate-400 border border-dashed border-slate-200 rounded-xl p-2 dark:border-slate-700">
              <summary className="cursor-pointer font-mono">debug</summary>
              <pre className="mt-1 font-mono leading-relaxed">{JSON.stringify({
                assignmentId: selected.assignmentId,
                fileId: selected.fileId,
                status: selected.status,
                statusLabel: selected.statusLabel,
                canUpload: selected.canUpload,
              }, null, 2)}</pre>
            </details>

            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {selected.isRequired ? 'Obligatorio' : 'Opcional'}
              </span>
              <Badge variant={getStatusVariant(selected.status)}>{selected.statusLabel}</Badge>
            </div>

            {/* Notes */}
            {selected.notes && (
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Instrucciones</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{selected.notes}</p>
              </div>
            )}

            {/* Rejection */}
            {selected.rejectionReason && (
              <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Motivo de rechazo</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">{selected.rejectionReason}</p>
              </div>
            )}

            {/* Dates & File */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {selected.assignedAt && (
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Asignado</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{formatDateSafe(selected.assignedAt)}</p>
                </div>
              )}
              {selected.dueDate && (
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Vence</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{formatDateSafe(selected.dueDate)}</p>
                </div>
              )}
              {selected.fileId && (
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50 col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Archivo actual</p>
                  <p className="font-semibold text-slate-900 dark:text-white truncate mt-0.5">{selected.fileName || 'Archivo cargado'}</p>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm"
                      onClick={() => setViewing({ name: selected.fileName || 'Documento', url: `/api/student/${slug()}/student-files/files/${selected.fileId}/view` })}>
                      Ver archivo
                    </Button>
                    <a
                      href={`/api/student/${slug()}/student-files/files/${selected.fileId}/download-file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Descargar
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* No assignmentId warning */}
            {!selected.assignmentId && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                No se puede subir porque no llegó el ID de la solicitud desde el backend.
              </div>
            )}

            {/* Upload */}
            {selected.canUpload && (
              <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
                <p className="text-sm font-semibold text-violet-800 dark:text-violet-200 mb-3">
                  {selected.fileName ? 'Reemplazar archivo' : 'Subir documento'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-violet-700 shadow-sm border border-slate-200 rounded-xl px-3 py-2 hover:file:bg-violet-50 dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-violet-300 dark:border-slate-600"
                />
                {uploadFile && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(1)} MB)
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <Button onClick={handleUpload} disabled={!uploadFile || uploading} loading={uploading}
                    className="flex-1 bg-violet-600 text-white hover:bg-violet-700">
                    {uploading ? 'Subiendo...' : 'Subir documento'}
                  </Button>
                </div>
                <p className="mt-2 text-[10px] text-slate-400">JPG, PNG, WEBP o PDF. Máx 25 MB.</p>
              </div>
            )}

            {/* Close */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setSelected(null); setUploadFile(null) }}>Cerrar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* View File Modal */}
      {viewing && (
        <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing.name ?? 'Documento'} className="sm:max-w-4xl">
          <div className="p-5">
            <div className="flex flex-col items-center gap-4 py-4">
              {viewing.url ? (
                <>
                  {isPdf(selected?.fileMimeType) || isImage(selected?.fileMimeType) ? (
                    <iframe src={imgUrl(viewing.url) ?? ''} className="h-[70vh] w-full rounded-xl" title={viewing.name ?? 'Documento'} />
                  ) : (
                    <div className="flex flex-col items-center gap-4 py-10">
                      <p className="text-sm text-slate-500">Vista previa no disponible para este tipo de archivo.</p>
                      <a href={imgUrl(viewing.url) ?? '#'} target="_blank" rel="noopener noreferrer"
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        Descargar archivo
                      </a>
                    </div>
                  )}
                  <a href={imgUrl(viewing.url) ?? '#'} target="_blank" rel="noopener noreferrer"
                    className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                    Abrir en nueva pestaña
                  </a>
                </>
              ) : (
                <p className="text-sm text-slate-500">No se pudo cargar el archivo.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function StudentDocumentsPage() {
  return <ToastProvider><DocumentsPageInner /></ToastProvider>
}
