import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { apiService } from '@/lib/api'
import { normalizeStatus, getStatusLabel, formatDateOnly } from '@/pages/admin/records/hooks'
import type { StudentDocument, StudentFile } from '@/pages/admin/records/hooks'

interface ReviewDialogProps {
  doc: StudentDocument | null
  studentName?: string
  slug: string
  onClose: () => void
  onDone: () => void
}

export function DocumentReviewDialog({ doc, studentName, slug, onClose, onDone }: ReviewDialogProps) {
  const [currentFileIdx, setCurrentFileIdx] = useState(0)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  if (!doc) return null

  const files: StudentFile[] = (doc.files ?? []).length > 0 ? doc.files : (doc.currentFileId ? [{ id: doc.currentFileId, fileName: doc.currentFileName || 'Archivo', mimeType: doc.currentFileMimeType || '', uploadedAtUtc: '' }] : [])
  const normalizedStatus = normalizeStatus(doc.status)
  const isInReview = normalizedStatus === 'En revisión'

  const handlePreview = async (fileId: string) => {
    try {
      const r = await apiService.get<{ url: string }>(`/api/admin/${slug}/student-files/files/${fileId}/view`)
      setPreviewUrl(r.url)
    } catch {
      setPreviewUrl(null)
    }
  }

  const handleSubmit = async () => {
    if (action === 'reject' && !reviewNote.trim()) { setError('Indicá el motivo del rechazo.'); return }
    setError('')
    setLoading(true)
      try {
      if (action === 'approve') {
        await apiService.post(`/api/admin/${slug}/student-files/assignments/${doc.assignmentId}/approve`, {
          reviewNote: reviewNote.trim() || null,
        })
      } else {
        await apiService.post(`/api/admin/${slug}/student-files/assignments/${doc.assignmentId}/reject`, {
          reviewNote: reviewNote.trim(),
        })
      }
      setAction(null)
      setReviewNote('')
      setExpirationDate('')
      onDone()
    } catch (e: any) {
      setError(e?.message || 'Error al procesar.')
    }
    setLoading(false)
  }

  const currentFile = files[currentFileIdx]
  const ext = currentFile?.fileName?.split('.').pop()?.toLowerCase()
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')
  const canShowInline = isImage || ext === 'pdf'

  return (
    <Modal open={!!doc} onClose={previewUrl ? () => { setPreviewUrl(null) } : onClose}
      title={doc.documentTypeName || 'Documento'} className="sm:max-w-3xl">

      {previewUrl ? (
        <div className="flex flex-col" style={{ maxHeight: '80vh' }}>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{currentFile?.fileName}</span>
            <div className="flex gap-2">
              <a href={previewUrl} target="_blank" rel="noreferrer"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Descargar
              </a>
              <button onClick={() => setPreviewUrl(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Volver
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-slate-100 p-4 dark:bg-slate-800">
            {isImage ? (
              <img src={previewUrl} alt="" className="mx-auto max-h-[70vh] w-auto max-w-full rounded-lg object-contain" />
            ) : (
              <iframe src={previewUrl} title={currentFile?.fileName} className="h-[70vh] w-full rounded-lg border-0" />
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col" style={{ maxHeight: '80vh' }}>
          {/* Header info */}
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${normalizedStatus === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' : normalizedStatus === 'Rechazado' ? 'bg-rose-100 text-rose-700' : normalizedStatus === 'En revisión' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                {normalizedStatus}
              </span>
              {studentName && <span className="text-sm text-slate-500 dark:text-slate-400">{studentName}</span>}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Asignado: {formatDateOnly(doc.assignedAtUtc)}</span>
              <span>Límite: {formatDateOnly(doc.dueDateUtc)}</span>
              <span>Enviado: {formatDateOnly(doc.submittedAtUtc)}</span>
              <span>Revisado: {formatDateOnly(doc.reviewedAtUtc)}</span>
              <span>Vence: {formatDateOnly(doc.expirationDateUtc)}</span>
            </div>
          </div>

          {/* Files list */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Archivos ({files.length})
            </p>
            {files.map((f, i) => (
              <div key={f.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition ${i === currentFileIdx ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-700'}`}
                onClick={() => { setCurrentFileIdx(i); handlePreview(f.id) }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{f.fileName}</p>
                  <p className="text-xs text-slate-400">{f.mimeType || '—'}</p>
                </div>
                <a href={`/api/admin/${slug}/student-files/files/${f.id}/download`} target="_blank" rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Descargar
                </a>
              </div>
            ))}

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

            {/* Approve/Reject form */}
            {isInReview && !action && (
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button onClick={() => setAction('approve')}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700">
                  Aprobar
                </button>
                <button onClick={() => setAction('reject')}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700">
                  Rechazar
                </button>
              </div>
            )}

            {isInReview && action === 'approve' && (
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Aprobar documento</p>
                <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={2}
                  placeholder="Observación (opcional)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                {error && <p className="text-sm text-rose-600">{error}</p>}
                <div className="flex gap-2">
                  <Button onClick={handleSubmit} loading={loading} className="bg-emerald-600 text-white hover:bg-emerald-700 flex-1">Confirmar aprobación</Button>
                  <Button variant="outline" onClick={() => setAction(null)} disabled={loading}>Cancelar</Button>
                </div>
              </div>
            )}

            {isInReview && action === 'reject' && (
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Rechazar documento</p>
                <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={3}
                  placeholder="Motivo del rechazo (obligatorio)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                {error && <p className="text-sm text-rose-600">{error}</p>}
                <div className="flex gap-2">
                  <Button onClick={handleSubmit} loading={loading} className="bg-rose-600 text-white hover:bg-rose-700 flex-1">Confirmar rechazo</Button>
                  <Button variant="outline" onClick={() => setAction(null)} disabled={loading}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
