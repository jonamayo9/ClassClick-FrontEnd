import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { docStatusInfo, formatDate } from '@/pages/delegate/documents/helpers'
import { RequestDocumentModal } from './request-modal'
import type { DocDetail, DocItem, DocType } from './types'

function DocCard({
  slug, doc,
}: {
  slug: string
  doc: DocItem
}) {
  const toast = useToast()
  const info = docStatusInfo(doc.status)
  const vencimiento = doc.expirationDateUtc ?? doc.dueDateUtc

  async function openFile(fileId: string, action: 'view' | 'download') {
    try {
      const res = await apiService.get<{ url: string }>(`/api/delegate/${slug}/documents/files/${fileId}/${action}`)
      window.open(res.url, '_blank', 'noopener,noreferrer')
    } catch {
      toast('No se pudo abrir el archivo.', 'error')
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-slate-900 dark:text-white">{doc.documentTypeName}</span>
          {doc.isRequired && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-300 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700">Requerido</span>
          )}
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${info.classes}`}>{info.label}</span>
        </div>
        {doc.currentFileId && (
          <div className="flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" onClick={() => openFile(doc.currentFileId!, 'view')}>Ver</Button>
            <Button variant="outline" size="sm" onClick={() => openFile(doc.currentFileId!, 'download')}>Descargar</Button>
          </div>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
        <span>Vencimiento: {formatDate(vencimiento)}</span>
        <span>Asignado: {formatDate(doc.assignedAtUtc)}</span>
      </div>
    </div>
  )
}

export function DelegateDocumentsModal({
  slug, studentId, onClose,
}: {
  slug: string
  studentId: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'current' | 'historical'>('current')
  const [requesting, setRequesting] = useState(false)

  const { data: detail, isLoading } = useQuery({
    queryKey: ['delegate-docs-detail', slug, studentId],
    queryFn: () => apiService.get<DocDetail>(`/api/delegate/${slug}/documents/students/${studentId}/documents`),
    enabled: !!slug && !!studentId,
    retry: false,
  })

  const { data: docTypes = [] } = useQuery({
    queryKey: ['delegate-doc-types', slug],
    queryFn: () => apiService.get<DocType[]>(`/api/delegate/${slug}/documents/types`),
    enabled: !!slug,
  })

  const currentYear = new Date().getFullYear()
  const docs = detail?.documents ?? []
  const yearOf = (d: DocItem) => new Date(d.assignedAtUtc).getFullYear()
  const current = docs.filter((d) => yearOf(d) === currentYear)
  const historical = docs.filter((d) => yearOf(d) !== currentYear)
  const historicalYears = [...new Set(historical.map(yearOf))].sort((a, b) => b - a)
  const activeTypeIds = docs.map((d) => d.documentTypeId)

  if (isLoading) {
    return (
      <Modal open onClose={onClose} title="Documentos" className="sm:max-w-2xl">
        <div className="flex justify-center py-14"><Spinner className="h-7 w-7 text-blue-600" /></div>
      </Modal>
    )
  }

  if (!detail) {
    return (
      <Modal open onClose={onClose} title="Documentos" className="sm:max-w-2xl">
        <p className="px-5 py-10 text-center text-sm text-slate-500">No se pudieron cargar los documentos.</p>
      </Modal>
    )
  }

  const renderDoc = (doc: DocItem) => (
    <DocCard key={doc.assignmentId} slug={slug} doc={doc} />
  )

  return (
    <Modal open onClose={onClose} title="Documentos" className="sm:max-w-2xl">
      <div className="px-5 py-4 sm:px-6">
        <div className="mb-3">
          <div className="text-base font-black text-slate-900 dark:text-white">{detail.fullName}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {detail.visibleCourses.map((c) => (
              <span key={c.id} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{c.name}</span>
            ))}
          </div>
        </div>

        {tab === 'current' && (
          <div className="mb-3 flex justify-end">
            <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setRequesting(true)}>
              Solicitar documento
            </Button>
          </div>
        )}

        <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold transition ${tab === 'current' ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}
            onClick={() => setTab('current')}>
            {currentYear} · Año actual
          </button>
          <button
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold transition ${tab === 'historical' ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}
            onClick={() => setTab('historical')}>
            Históricos
          </button>
        </div>

        {tab === 'current' ? (
          current.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Sin documentos en el año actual.</p>
          ) : (
            <div className="space-y-2">{current.map(renderDoc)}</div>
          )
        ) : historical.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Sin documentos históricos.</p>
        ) : (
          <div className="max-h-[50vh] space-y-3 overflow-y-auto">
            {historicalYears.map((year) => (
              <div key={year}>
                <h4 className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">{year}</h4>
                <div className="space-y-2">{historical.filter((d) => yearOf(d) === year).map(renderDoc)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {requesting && (
        <RequestDocumentModal
          slug={slug}
          mode="individual"
          docTypes={docTypes}
          activeTypeIds={activeTypeIds}
          studentId={studentId}
          studentName={detail.fullName}
          onClose={() => setRequesting(false)}
          onDone={() => qc.invalidateQueries({ queryKey: ['delegate-docs-detail', slug, studentId] })}
        />
      )}
    </Modal>
  )
}
