import { lazy, Suspense, useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { DatePicker } from '@/components/ui/date-picker'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { formatDate, formatDateOnly } from '../student.hooks'

// Viewer PDF propio (PDF.js): lazy-loaded para no inflar el bundle inicial.
const PdfViewer = lazy(() => import('@/components/pdf-viewer'))

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

/* ─── Types ─── */

interface DocFile {
  id: string
  fileName: string
  mimeType: string
  uploadedAtUtc: string
}

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
  files: DocFile[]
  maxFiles: number
  allowMultipleFiles: boolean
  canUpload: boolean
  uploadLabel: string
  hasExpiration: boolean
  maxValidityDays: number | null
  sourceFileCount: number
  uploadedCount: number
  remaining: number
  maxSelectable: number
  raw: Record<string, unknown>
}

/* ─── Normalizer ─── */

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
  const maxFiles = Number(pick(raw, ['maxFiles', 'MaxFiles'])) || 1
  const allowMultipleFiles = pickBool(raw, ['allowMultipleFiles', 'AllowMultipleFiles'])

  // Files collection
  const filesRaw = pick<unknown[]>(raw, ['files', 'Files'])
  const files: DocFile[] = Array.isArray(filesRaw)
    ? filesRaw.map((file) => {
        const f = file as Record<string, unknown>
        return {
          id: pickString(f, ['id', 'Id', 'fileId', 'FileId']),
          fileName: pickString(f, ['fileName', 'FileName', 'name', 'Name']),
          mimeType: pickString(f, ['mimeType', 'MimeType', 'fileMimeType', 'FileMimeType']),
          uploadedAtUtc: pickString(f, ['uploadedAtUtc', 'UploadedAtUtc', 'uploadedAt', 'UploadedAt']),
        }
      }).filter((f) => !!f.id)
    : []

  // Backward compatibility: single file
  const singleFileId = pickString(raw, ['currentFileId', 'CurrentFileId'])
  const singleFileName = pickString(raw, ['currentFileName', 'CurrentFileName'])
  const singleFileMimeType = pickString(raw, ['currentFileMimeType', 'CurrentFileMimeType'])

  // If no files collection but single file exists, create one
  const effectiveFiles = files.length > 0
    ? files
    : singleFileId
      ? [{ id: singleFileId, fileName: singleFileName, mimeType: singleFileMimeType, uploadedAtUtc: '' }]
      : []

  // Upload rules
  const label = statusLabel.toLowerCase()
  const sourceFileCount = Math.max(Number(pick(raw, ['sourceFileCount', 'SourceFileCount'])) || 0, 0)
  const uploadedCount = sourceFileCount > 0 ? sourceFileCount : effectiveFiles.length
  const remaining = Math.max(0, maxFiles - uploadedCount)
  const canUpload = !!assignmentId && (
    (label === 'pendiente' && remaining > 0) ||
    (label === 'rechazado')
  )

  // En rechazo la nueva presentación reemplaza a la anterior: el lote puede tener hasta maxFiles.
  const maxSelectable = label === 'rechazado' ? maxFiles : remaining

  let uploadLabel = 'Subir documento'
  if (label === 'rechazado') {
    uploadLabel = 'Volver a subir documento'
  } else if (uploadedCount > 0 && uploadedCount < maxFiles) {
    uploadLabel = 'Agregar documento'
  }

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
    hasExpiration: pickBool(raw, ['hasExpiration', 'HasExpiration']),
    maxValidityDays: pick<number>(raw, ['maxValidityDays', 'MaxValidityDays']) ?? null,
    files: effectiveFiles,
    maxFiles,
    allowMultipleFiles,
    canUpload,
    uploadLabel,
    sourceFileCount,
    uploadedCount,
    remaining,
    maxSelectable,
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
    queryFn: () => apiService.get<unknown>(`/api/student/${slug()}/student-files/my-documents`),
    enabled: !!slug(),
  })

  const docs = asArray(rawList).map((d) => normalizeDocument(d as Record<string, unknown>))

  const [selected, setSelected] = useState<NormalizedDoc | null>(null)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadExpiration, setUploadExpiration] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  /* View file state */
  const [viewFileLoading, setViewFileLoading] = useState(false)
  const [viewFileData, setViewFileData] = useState<{
    downloadUrl: string
    canonicalUrl: string
    fileName: string
    isImage: boolean
    isPdf: boolean
  } | null>(null)

  const pendingCount = docs.filter((d) => {
    const s = d.statusLabel.toLowerCase()
    return s === 'pendiente' || s === 'rechazado' || s === 'vencido' || s === 'faltante'
  }).length

  function formatDateSafe(v: string) { return v ? formatDateOnly(v) : '-' }

  async function handleUpload() {
    if (!selected || uploadFiles.length === 0) return
    setUploading(true)
    setUploadError('')
    try {
      const fd = new FormData()
      uploadFiles.forEach((f) => fd.append('files', f))
      if (selected.hasExpiration && uploadExpiration) {
        fd.append('expirationDate', uploadExpiration)
      }
      await apiService.postForm(
        `/api/student/${slug()}/student-files/assignments/${selected.assignmentId}/upload`,
        fd,
      )
      qc.invalidateQueries({ queryKey: ['my-documents'] })
      toast('Documento subido correctamente.')
      setUploadFiles([])
      setSelected(null)
    } catch (err: any) {
      const serverMsg = err?.response?.data ?? err?.message ?? 'Error al subir el documento.'
      setUploadError(serverMsg)
      toast(serverMsg, 'error')
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!selected || chosen.length === 0) return

    const remainingSlots = selected.maxSelectable - uploadFiles.length
    if (remainingSlots <= 0) {
      toast('Ya se alcanzó la cantidad máxima de archivos para este documento.', 'error')
      return
    }

    const valid = chosen.filter((f) => f.size <= MAX_FILE_SIZE)
    if (valid.length < chosen.length) {
      toast('Algunos archivos superan los 25 MB permitidos y fueron omitidos.', 'error')
    }

    const toAdd = valid.slice(0, remainingSlots)
    if (toAdd.length < valid.length) {
      toast(`Solo podés agregar ${remainingSlots} archivo(s) más.`, 'error')
    }

    setUploadFiles((prev) => [...prev, ...toAdd])
  }

  async function handleViewFile(fileId: string, assignmentId: string, fileName: string, mimeType: string) {
    setViewFileLoading(true)
    setViewFileData(null)
    try {
      const res = await apiService.get<{ url: string; fileName?: string; isPdf?: boolean }>(
        `/api/student/${slug()}/student-files/files/${fileId}/view`,
      )
      if (res?.url) {
        // El backend devuelve la metadata efectiva del recurso servido (canónico PDF o archivo individual).
        const effectiveIsPdf = typeof res.isPdf === 'boolean'
          ? res.isPdf
          : mimeType?.toLowerCase() === 'application/pdf'
        setViewFileData({
          downloadUrl: res.url,
          canonicalUrl: `/api/student/${slug()}/student-files/assignments/${assignmentId}/canonical`,
          fileName: res.fileName || fileName,
          isImage: !effectiveIsPdf && (mimeType?.toLowerCase().startsWith('image/') ?? false),
          isPdf: effectiveIsPdf,
        })
      }
    } catch {
      toast('No se pudo cargar el archivo.', 'error')
    } finally {
      setViewFileLoading(false)
    }
  }

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
              onClick={() => { setSelected(d); setUploadError('') }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{d.title || 'Documento'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {d.isRequired ? 'Obligatorio' : 'Opcional'} · {d.statusLabel}
                    {d.maxFiles > 1 && <span className="ml-1">({d.uploadedCount}/{d.maxFiles})</span>}
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
              {d.files.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  {d.files.map((f) => (
                    <span key={f.id} className="truncate max-w-[200px]">Archivo: {f.fileName}</span>
                  ))}
                  {d.dueDate && <span>Vence: {formatDateSafe(d.dueDate)}</span>}
                </div>
              )}
              {!d.files.length && d.dueDate && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span>Vence: {formatDateSafe(d.dueDate)}</span>
                </div>
              )}
              <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                {d.files.length > 0 && d.files[0].id && (
                  <Button variant="outline" size="sm"
                    onClick={() => handleViewFile(d.files[0].id, d.assignmentId, d.files[0].fileName, d.files[0].mimeType)}>
                    Ver archivo
                  </Button>
                )}
                {d.canUpload && (
                  <Button size="sm" className="bg-violet-600 text-white hover:bg-violet-700"
                    onClick={() => { setSelected(d); setUploadError('') }}>
                    {d.uploadLabel}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => { setSelected(null); setUploadFiles([]); setUploadExpiration(''); setUploadError('') }}
          title={selected.title || 'Documento'} className="sm:max-w-lg">
          <div className="px-5 py-4 sm:px-6 space-y-4 max-h-[85vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {selected.isRequired ? 'Obligatorio' : 'Opcional'}
                {selected.maxFiles > 1 && <span className="ml-1">({selected.uploadedCount}/{selected.maxFiles})</span>}
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

            {/* Dates */}
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
            </div>

            {/* Files list */}
            {selected.files.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Archivos cargados ({selected.uploadedCount}/{selected.maxFiles})
                </p>
                {selected.files.map((f) => (
                  <div key={f.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{f.fileName}</p>
                      <p className="text-xs text-slate-400">{formatDateSafe(f.uploadedAtUtc)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm"
                        onClick={() => handleViewFile(f.id, selected.assignmentId, f.fileName, f.mimeType)}>
                        Ver
                      </Button>
                      <a
                        href={`/api/student/${slug()}/student-files/files/${f.id}/download-file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Descargar
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No assignmentId warning */}
            {!selected.assignmentId && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                No se puede subir porque no llegó el ID de la solicitud desde el backend.
              </div>
            )}

            {/* Upload */}
            {selected.canUpload && (
              <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
                {uploadError && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    {uploadError}
                  </div>
                )}
                <p className="text-sm font-semibold text-violet-800 dark:text-violet-200 mb-3">
                  {selected.uploadLabel}
                </p>
                {/* Expiration date */}
                {selected.hasExpiration && (
                  <div className="mb-3">
                    {selected.expirationDateUtc ? (
                      <>
                        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Fecha de vencimiento del documento</label>
                        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                          {formatDateOnly(selected.expirationDateUtc)}
                        </p>
                      </>
                    ) : (
                      <>
                        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Fecha de vencimiento *</label>
                        <DatePicker value={uploadExpiration} onChange={setUploadExpiration} placeholder="Seleccionar fecha" title="Vencimiento" />
                        <p className="mt-0.5 text-[10px] text-slate-400">Ingresá la fecha que figura en el documento.</p>
                      </>
                    )}
                  </div>
                )}
                {/* Custom file input */}
                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
                  multiple={selected.maxFiles > 1}
                  onChange={handleFileChange} className="hidden" />
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="shrink-0">
                    Seleccionar archivo{selected.maxFiles > 1 ? 's' : ''}
                  </Button>
                  <div className="flex-1 flex items-center text-sm text-slate-500 dark:text-slate-400 min-w-0">
                    {uploadFiles.length > 0 ? (
                      <span className="truncate">{uploadFiles.length} archivo(s) seleccionado(s)</span>
                    ) : (
                      <span>Ningún archivo seleccionado</span>
                    )}
                  </div>
                </div>

                {uploadFiles.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Archivos seleccionados</p>
                    <div className="space-y-1">
                      {uploadFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-1.5 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                          <span className="min-w-0 truncate">{f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB)</span>
                          <button type="button" onClick={() => setUploadFiles((prev) => prev.filter((_, j) => j !== i))}
                            className="shrink-0 rounded px-1.5 py-0.5 font-bold text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selected.remaining > 0 && (
                  <p className="mt-1 text-[10px] text-slate-400">
                    {selected.statusLabel.toLowerCase() === 'rechazado'
                      ? `La nueva presentación reemplaza los archivos anteriores (hasta ${selected.maxFiles} archivo(s)).`
                      : `Podés agregar hasta ${selected.maxSelectable} archivo(s) más.`}
                  </p>
                )}

                <div className="flex gap-2 mt-3">
                  <Button onClick={handleUpload}
                    disabled={uploadFiles.length === 0 || uploading || (selected.hasExpiration && !selected.expirationDateUtc && !uploadExpiration)}
                    loading={uploading}
                    className="flex-1 bg-violet-600 text-white hover:bg-violet-700">
                    {uploading ? 'Subiendo...' : 'Subir documento'}
                  </Button>
                </div>
                <p className="mt-2 text-[10px] text-slate-400">JPG, PNG, WEBP o PDF. Máx 25 MB.</p>
              </div>
            )}

            {/* Close */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setSelected(null); setUploadFiles([]); setUploadExpiration(''); setUploadError('') }}>Cerrar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* View File Modal */}
      {viewFileData && (
        <Modal
          open={!!viewFileData}
          onClose={() => setViewFileData(null)}
          title={viewFileData.fileName}
          className={viewFileData.isPdf ? 'sm:max-w-4xl h-[85dvh] sm:h-[70vh]' : 'sm:max-w-4xl'}
        >
          {viewFileLoading ? (
            <div className="flex items-center justify-center py-16"><Spinner className="h-6 w-6 text-violet-600" /></div>
          ) : viewFileData.isPdf ? (
            <Suspense fallback={<div className="flex items-center justify-center py-16"><Spinner className="h-6 w-6 text-violet-600" /></div>}>
              <PdfViewer url={viewFileData.canonicalUrl} downloadUrl={viewFileData.downloadUrl} fileName={viewFileData.fileName} />
            </Suspense>
          ) : viewFileData.isImage ? (
            <div className="bg-slate-100 p-4 dark:bg-slate-800">
              <img src={viewFileData.downloadUrl} alt={viewFileData.fileName} className="mx-auto max-h-[72vh] w-auto max-w-full rounded-lg object-contain shadow-sm" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-16">
              <p className="text-sm text-slate-500">No se puede previsualizar este archivo.</p>
              <div className="flex gap-2">
                <a href={viewFileData.downloadUrl} download={viewFileData.fileName} target="_blank" rel="noreferrer"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                  Descargar archivo
                </a>
                <a href={viewFileData.downloadUrl} target="_blank" rel="noreferrer"
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                  Abrir
                </a>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

export default function StudentDocumentsPage() {
  return <ToastProvider><DocumentsPageInner /></ToastProvider>
}
