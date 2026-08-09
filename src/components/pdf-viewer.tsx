import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { apiService } from '@/lib/api'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

interface PdfViewerProps {
  url: string
  downloadUrl: string
  fileName: string
}

const A4_RATIO = 842 / 595

export default function PdfViewer({ url, downloadUrl, fileName }: PdfViewerProps) {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const visibleRef = useRef(new Set<number>())

  // Descarga real sin navegar: obtiene el canónico como Blob (capa autenticada), crea un object URL
  // y dispara un <a download>. Mantiene al usuario dentro de ClassClick con el modal abierto.
  const handleDownload = useCallback(async () => {
    if (downloading) return
    setDownloading(true)
    setDownloadError(false)
    try {
      const blob = await apiService.getBlob(url)
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch {
      setDownloadError(true)
    } finally {
      setDownloading(false)
    }
  }, [url, fileName, downloading])

  // Descarga el canónico con la capa autenticada (axios → Authorization) y lo entrega a PDF.js como datos.
  // Se resetea el estado al cambiar de documento y se cancela la carga pendiente al desmontar (sin PDFs viejos).
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    setPdfBytes(null)
    setNumPages(0)
    setCurrentPage(1)
    visibleRef.current.clear()

    apiService
      .getBlob(url)
      .then((blob) => (cancelled ? null : blob.arrayBuffer()))
      .then((buf) => {
        if (cancelled || !buf) return
        setPdfBytes(new Uint8Array(buf))
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [url])

  // Referencia ESTABLE para <Document>: se crea una copia dedicada (slice) que PDF.js puede detachar
  // sin tocar nuestro estado; solo cambia cuando cambian los bytes, no en cada render.
  const documentFile = useMemo(
    () => (pdfBytes ? { data: pdfBytes.slice() } : null),
    [pdfBytes],
  )

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // Página "actual" = la más cercana al inicio entre las visibles.
  const handleVisible = useCallback((index: number, visible: boolean) => {
    if (visible) visibleRef.current.add(index)
    else visibleRef.current.delete(index)
    const min = Math.min(...visibleRef.current)
    setCurrentPage(Number.isFinite(min) ? min + 1 : 1)
  }, [])

  const pageWidth = width > 0 ? width * zoom : undefined

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2 dark:border-slate-700">
        <div className="flex items-center gap-1 text-xs">
          <button type="button" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
            className="h-7 w-7 rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Alejar">−</button>
          <button type="button" onClick={() => setZoom(1)}
            className="min-w-[3.5rem] rounded-lg px-1 text-center text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Restablecer zoom">{Math.round(zoom * 100)}%</button>
          <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
            className="h-7 w-7 rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Acercar">+</button>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">Pág {numPages ? `${currentPage}/${numPages}` : '—/—'}</span>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={handleDownload} disabled={downloading}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
            {downloading ? 'Descargando...' : 'Descargar'}
          </button>
          <a href={downloadUrl} target="_blank" rel="noreferrer"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
            Abrir PDF
          </a>
        </div>
      </div>

      {downloadError && (
        <div className="border-b border-slate-200 bg-red-50 px-4 py-1.5 text-xs text-red-600 dark:border-slate-700 dark:bg-red-950/30 dark:text-red-400">
          No se pudo descargar. Intentá con "Abrir PDF".
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-slate-200 p-3 dark:bg-slate-800">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
          </div>
        ) : error || !pdfBytes ? (
          <div className="flex flex-col items-center gap-4 py-16 text-sm text-slate-500 dark:text-slate-400">
            <p>No se pudo cargar el PDF.</p>
            <div className="flex gap-2">
              <button type="button" onClick={handleDownload} disabled={downloading}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {downloading ? 'Descargando...' : 'Descargar'}
              </button>
              <a href={downloadUrl} target="_blank" rel="noreferrer"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Abrir PDF</a>
            </div>
          </div>
        ) : (
          <Document
            file={documentFile}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={() => setError(true)}
            loading={<div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" /></div>}
          >
            {Array.from({ length: numPages }, (_, i) => (
              <PdfPage key={i} index={i} width={pageWidth} onVisible={handleVisible} />
            ))}
          </Document>
        )}
      </div>
    </div>
  )
}

function PdfPage({ index, width, onVisible }: { index: number; width?: number; onVisible: (index: number, visible: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(index < 2)
  const pw = width ?? 500
  const ph = Math.round(pw * A4_RATIO)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        setVisible(entry.isIntersecting)
        onVisible(index, entry.isIntersecting)
      }
    }, { root: null, rootMargin: '250px 0px' })
    io.observe(el)
    return () => {
      io.disconnect()
      onVisible(index, false)
    }
  }, [index, onVisible])

  return (
    <div ref={ref} className="mx-auto mb-3 w-fit">
      {visible ? (
        <Page
          pageNumber={index + 1}
          width={pw}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={<div style={{ width: pw, height: ph }} className="animate-pulse rounded bg-slate-300/60 dark:bg-slate-700/60" />}
          error={<div style={{ width: pw, height: ph }} className="flex items-center justify-center rounded bg-white text-xs text-slate-400">Error de página</div>}
        />
      ) : (
        <div style={{ width: pw, height: ph }} className="rounded bg-white/60 dark:bg-slate-700/40" />
      )}
    </div>
  )
}
