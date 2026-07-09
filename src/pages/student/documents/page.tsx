import { useState, useRef } from 'react'
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
import { formatDate, unwrap } from '../student.hooks'

const MAX_FILE_SIZE = 25 * 1024 * 1024

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

interface DocAssignment {
  assignmentId: string
  documentTypeName: string
  status: number
  isMandatory: boolean
  dueDateUtc?: string
  expirationDateUtc?: string
  currentFileName?: string
  currentFileMimeType?: string
  currentFileId?: string
  requestNote?: string
  reviewNote?: string
  assignedAtUtc?: string
}

const docStatusMeta: Record<number, { label: string; variant: 'warning' | 'success' | 'danger' | 'info' | 'default' }> = {
  1: { label: 'Pendiente', variant: 'warning' },
  2: { label: 'Entregado', variant: 'info' },
  3: { label: 'Aprobado', variant: 'success' },
  4: { label: 'Rechazado', variant: 'danger' },
  5: { label: 'Vencido', variant: 'default' },
}

const canUploadStatuses = [1, 4]

function DocumentsPageInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: docs = [], isLoading, error } = useQuery({
    queryKey: ['my-documents', slug()],
    queryFn: () => apiService.get<DocAssignment[]>(`/api/student/${slug()}/student-files/my-documents`),
    enabled: !!slug(),
    select: (d: unknown) => unwrap<DocAssignment>(d),
  })

  const [detailDoc, setDetailDoc] = useState<DocAssignment | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [viewing, setViewing] = useState<{ url?: string; name?: string } | null>(null)

  const pending = docs.filter((d) => canUploadStatuses.includes(d.status))

  async function handleUpload() {
    if (!detailDoc || !uploadFile) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      await apiService.postForm(
        `/api/student/${slug()}/student-files/assignments/${detailDoc.assignmentId}/upload`,
        fd,
      )
      qc.invalidateQueries({ queryKey: ['my-documents'] })
      toast('Documento subido correctamente.')
      setDetailDoc(null)
      setUploadFile(null)
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

  const isImage = (mime?: string) => mime?.toLowerCase().startsWith('image/')
  const isPdf = (mime?: string) => mime?.toLowerCase() === 'application/pdf'

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-br from-rose-600 via-pink-700 to-fuchsia-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Mis documentos</h1>
          <p className="mt-1 text-sm text-pink-200">Documentación requerida</p>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4"><div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /></Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-rose-600 via-pink-700 to-fuchsia-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Mis documentos</h1>
            <p className="mt-1 text-sm text-pink-200">Documentación requerida</p>
          </div>
          {pending.length > 0 && (
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-pink-200">Pendientes</p>
              <p className="text-xl font-bold">{pending.length}</p>
            </div>
          )}
        </div>
      </div>

      {error ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-red-500 dark:text-red-400">Error al cargar los documentos.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => qc.invalidateQueries({ queryKey: ['my-documents'] })}>Reintentar</Button>
        </Card>
      ) : docs.length === 0 ? (
        <EmptyState icon="📄" title="Sin documentos" description="No tenés documentación requerida." />
      ) : (
        <div className="space-y-3">
          {docs.map((d) => {
            const meta = docStatusMeta[d.status] ?? { label: String(d.status), variant: 'default' as const }
            const canUpload = canUploadStatuses.includes(d.status)
            return (
              <Card
                key={d.assignmentId}
                className="p-4 space-y-3 cursor-pointer transition hover:shadow-md active:scale-[0.99]"
                onClick={() => setDetailDoc(d)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{d.documentTypeName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {d.isMandatory ? 'Obligatorio' : 'Opcional'} · {meta.label}
                    </p>
                  </div>
                  <Badge variant={meta.variant} className="shrink-0">{meta.label}</Badge>
                </div>
                {d.requestNote && (
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-2.5 dark:bg-slate-800/50 line-clamp-2">{d.requestNote}</p>
                )}
                {d.reviewNote && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-xl p-2.5 dark:bg-amber-950/30 line-clamp-2">{d.reviewNote}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  {d.currentFileName && <span className="truncate max-w-[200px]">Archivo: {d.currentFileName}</span>}
                  {d.dueDateUtc && <span>Vence: {formatDate(d.dueDateUtc)}</span>}
                </div>
                <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  {d.currentFileId && (
                    <Button variant="outline" size="sm"
                      onClick={() => setViewing({ name: d.currentFileName, url: `/api/student/${slug()}/student-files/files/${d.currentFileId}/view` })}>
                      Ver archivo
                    </Button>
                  )}
                  {canUpload && (
                    <Button size="sm" className="bg-violet-600 text-white hover:bg-violet-700"
                      onClick={() => setDetailDoc(d)}>
                      {d.currentFileName ? 'Reemplazar' : 'Subir archivo'}
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {detailDoc && (
        <Modal open={!!detailDoc} onClose={() => { setDetailDoc(null); setUploadFile(null) }}
          title={detailDoc.documentTypeName} className="sm:max-w-lg">
          <div className="px-5 py-4 sm:px-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{detailDoc.isMandatory ? 'Obligatorio' : 'Opcional'}</span>
              <Badge variant={docStatusMeta[detailDoc.status]?.variant ?? 'default'}>
                {docStatusMeta[detailDoc.status]?.label ?? detailDoc.status}
              </Badge>
            </div>

            {detailDoc.requestNote && (
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Instrucciones</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{detailDoc.requestNote}</p>
              </div>
            )}

            {detailDoc.reviewNote && (
              <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Motivo de rechazo</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">{detailDoc.reviewNote}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              {detailDoc.assignedAtUtc && (
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Asignado</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{formatDate(detailDoc.assignedAtUtc)}</p>
                </div>
              )}
              {detailDoc.dueDateUtc && (
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Vence</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{formatDate(detailDoc.dueDateUtc)}</p>
                </div>
              )}
              {detailDoc.currentFileName && (
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50 col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Archivo actual</p>
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{detailDoc.currentFileName}</p>
                  {detailDoc.currentFileId && (
                    <Button variant="outline" size="sm" className="mt-2"
                      onClick={() => setViewing({ name: detailDoc.currentFileName, url: `/api/student/${slug()}/student-files/files/${detailDoc.currentFileId}/view` })}>
                      Ver archivo
                    </Button>
                  )}
                </div>
              )}
            </div>

            {canUploadStatuses.includes(detailDoc.status) && (
              <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
                <p className="text-sm font-semibold text-violet-800 dark:text-violet-200 mb-3">
                  {detailDoc.currentFileName ? 'Reemplazar archivo' : 'Subir documento'}
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
                <Button
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                  loading={uploading}
                  className="mt-3 bg-violet-600 text-white hover:bg-violet-700 w-full"
                >
                  {uploading ? 'Subiendo...' : 'Subir documento'}
                </Button>
                <p className="mt-2 text-[10px] text-slate-400">JPG, PNG, WEBP o PDF. Máx 25 MB.</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setDetailDoc(null); setUploadFile(null) }}>Cerrar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* View File Modal */}
      {viewing && (
        <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing.name ?? 'Documento'} className="sm:max-w-4xl">
          <div className="p-5">
            {viewing.url && (
              isPdf(detailDoc?.currentFileMimeType) || isImage(detailDoc?.currentFileMimeType) ? (
                <iframe
                  src={imgUrl(viewing.url) ?? ''}
                  className="h-[70vh] w-full rounded-xl"
                  title={viewing.name ?? 'Documento'}
                />
              ) : (
                <div className="flex flex-col items-center gap-4 py-10">
                  <p className="text-sm text-slate-500">Vista previa no disponible.</p>
                  <a
                    href={imgUrl(viewing.url) ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Descargar archivo
                  </a>
                </div>
              )
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function StudentDocumentsPage() {
  return <ToastProvider><DocumentsPageInner /></ToastProvider>
}
