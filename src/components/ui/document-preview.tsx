import { useState } from 'react'
import { Modal } from './modal'
import { Spinner } from './spinner'

interface DocumentPreviewProps {
  open: boolean
  onClose: () => void
  title: string
  fileUrl: string
  fileName: string
}

export function DocumentPreviewModal({ open, onClose, title, fileUrl, fileName }: DocumentPreviewProps) {
  const [loading, setLoading] = useState(true)
  const isPdf = fileName.toLowerCase().endsWith('.pdf')
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName)

  return (
    <Modal open={open} onClose={onClose} title={title} className="sm:max-w-4xl">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500 truncate">{fileName}</p>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" download={fileName}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Descargar
          </a>
        </div>
        <div className="relative min-h-[300px] rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner className="h-8 w-8 text-violet-600" />
            </div>
          )}
          {isPdf ? (
            <iframe
              src={fileUrl}
              className="h-[70vh] w-full rounded-xl"
              onLoad={() => setLoading(false)}
              title={fileName}
            />
          ) : isImage ? (
            <img
              src={fileUrl}
              alt={title}
              className="mx-auto max-h-[70vh] w-auto rounded-xl object-contain"
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 p-12">
              <span className="text-4xl">📄</span>
              <p className="text-sm text-slate-500">Vista previa no disponible para este tipo de archivo.</p>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" download={fileName}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                Descargar archivo
              </a>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
