import { useState } from 'react'
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

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

interface DocAssignment { assignmentId: string; documentTypeName: string; status: number; isMandatory: boolean; dueDateUtc?: string; currentFileName?: string; requestNote?: string; reviewNote?: string; currentFileId?: string }

const docStatusMeta: Record<number, { label: string; variant: 'warning' | 'success' | 'danger' | 'info' | 'default' }> = {
  1: { label: 'Pendiente', variant: 'warning' }, 2: { label: 'Entregado', variant: 'info' },
  3: { label: 'Aprobado', variant: 'success' }, 4: { label: 'Rechazado', variant: 'danger' }, 5: { label: 'Vencido', variant: 'default' },
}

function DocumentsPageInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: docs = [], isLoading } = useQuery({ queryKey: ['my-documents', slug()], queryFn: () => apiService.get<DocAssignment[]>(`/api/student/${slug()}/student-files/my-documents`), enabled: !!slug(), select: (d: unknown) => unwrap<DocAssignment>(d) })

  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [viewing, setViewing] = useState<{ url?: string; name?: string } | null>(null)

  const canUploadStatuses = [1, 4]
  const pending = docs.filter((d) => canUploadStatuses.includes(d.status))

  async function handleUpload(assignmentId: string) {
    if (!uploadFile) return
    try {
      const fd = new FormData(); fd.append('file', uploadFile)
      await apiService.postForm(`/api/student/${slug()}/student-files/assignments/${assignmentId}/upload`, fd)
      qc.invalidateQueries({ queryKey: ['my-documents'] })
      toast('Archivo subido correctamente.')
      setUploading(null); setUploadFile(null)
    } catch { toast('Error al subir.', 'error') }
  }

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-rose-600 via-pink-700 to-fuchsia-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Mis documentos</h1><p className="mt-1 text-sm text-pink-200">Documentación requerida</p></div>
          {pending.length > 0 && <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-center"><p className="text-[10px] uppercase tracking-[0.2em] text-pink-200">Pendientes</p><p className="text-xl font-bold">{pending.length}</p></div>}
        </div>
      </div>

      {docs.length === 0 ? (
        <EmptyState icon="📄" title="Sin documentos" description="No tenés documentación requerida." />
      ) : (
        <div className="space-y-3">
          {docs.map((d) => {
            const meta = docStatusMeta[d.status] ?? { label: String(d.status), variant: 'default' as const }
            const canUpload = canUploadStatuses.includes(d.status)
            return (
              <Card key={d.assignmentId} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-sm font-bold text-slate-900 dark:text-white">{d.documentTypeName}</p><p className="text-xs text-slate-400">{d.isMandatory ? 'Obligatorio' : 'Opcional'} · {meta.label}</p></div>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
                {d.requestNote && <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-2 dark:bg-slate-800/50">{d.requestNote}</p>}
                {d.reviewNote && <p className="text-xs text-amber-600 bg-amber-50 rounded-xl p-2 dark:bg-amber-950/30">{d.reviewNote}</p>}
                {d.currentFileName && <p className="text-xs text-slate-400">Archivo: {d.currentFileName}</p>}
                {d.dueDateUtc && <p className="text-xs text-slate-400">Vence: {formatDate(d.dueDateUtc)}</p>}
                <div className="flex gap-2">
                  {d.currentFileId && <Button variant="outline" size="sm" onClick={() => setViewing({ name: d.currentFileName, url: `/api/student/${slug()}/student-files/files/${d.currentFileId}/view` })}>Ver</Button>}
                  {canUpload && <Button size="sm" className="bg-violet-600 text-white hover:bg-violet-700" onClick={() => setUploading(d.assignmentId)}>{d.currentFileName ? 'Reemplazar' : 'Subir archivo'}</Button>}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {uploading && (
        <Modal open={!!uploading} onClose={() => { setUploading(null); setUploadFile(null) }} title="Subir documento" className="sm:max-w-md">
          <div className="space-y-4 p-5">
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:file:bg-slate-700" />
            <Button onClick={() => handleUpload(uploading)} disabled={!uploadFile} className="w-full bg-violet-600 text-white hover:bg-violet-700">Subir</Button>
          </div>
        </Modal>
      )}

      {viewing && <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing.name ?? 'Documento'}><div className="p-5"><iframe src={imgUrl(viewing.url ?? '') ?? ''} className="h-[70vh] w-full rounded-xl" title="Documento" /></div></Modal>}
    </div>
  )
}

export default function StudentDocumentsPage() { return <ToastProvider><DocumentsPageInner /></ToastProvider> }
