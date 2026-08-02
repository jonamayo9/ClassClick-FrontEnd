import { useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'

export interface BillingProofViewPayload {
  url: string
  fileName: string
  contentType: string
  isImage: boolean
  isPdf: boolean
}

interface BillingProofPreviewModalProps {
  open: boolean
  onClose: () => void
  period: string
  load: () => Promise<BillingProofViewPayload>
}

type ProofState =
  | { status: 'closed' }
  | { status: 'loading' }
  | { status: 'ready'; data: BillingProofViewPayload }
  | { status: 'error'; notFound: boolean }

export function BillingProofPreviewModal({ open, onClose, period, load }: BillingProofPreviewModalProps) {
  const toast = useToast()
  const loadRef = useRef(load)
  loadRef.current = load

  const [state, setState] = useState<ProofState>({ status: 'closed' })

  useEffect(() => {
    if (!open) {
      setState({ status: 'closed' })
      return
    }

    let cancelled = false
    setState({ status: 'loading' })

    loadRef.current().then(
      (data) => {
        if (!cancelled) setState({ status: 'ready', data })
      },
      (err: unknown) => {
        if (cancelled) return
        const status = (err as { response?: { status?: number } })?.response?.status
        setState({ status: 'error', notFound: status === 404 })
      },
    )

    return () => {
      cancelled = true
    }
  }, [open])

  async function download() {
    if (state.status !== 'ready') return
    try {
      const res = await fetch(state.data.url)
      const blob = await res.blob()
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = state.data.fileName || 'comprobante'
      a.click()
      URL.revokeObjectURL(objUrl)
    } catch {
      toast('No pudimos descargar el comprobante.', 'error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Comprobante de pago" className="sm:max-w-2xl">
      <div className="px-5 py-4 sm:px-6 space-y-4">
        <p className="text-xs text-slate-500">Período {period}</p>

        {state.status === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Spinner className="h-5 w-5 text-slate-400" />
            Cargando comprobante…
          </div>
        )}

        {state.status === 'error' && (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-500">
              {state.notFound ? 'No hay un comprobante disponible.' : 'No pudimos cargar el comprobante.'}
            </p>
          </div>
        )}

        {state.status === 'ready' && (
          <>
            {state.data.isImage ? (
              <img
                src={state.data.url}
                alt="Comprobante de pago"
                className="mx-auto max-h-[60vh] w-auto rounded-lg bg-slate-100 object-contain dark:bg-slate-800"
              />
            ) : state.data.isPdf ? (
              <iframe
                src={state.data.url}
                title="Comprobante de pago"
                className="h-[60vh] w-full rounded-lg border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-500">No pudimos previsualizar este comprobante.</p>
              </div>
            )}
          </>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          {state.status === 'ready' && (
            <>
              <Button variant="outline" size="sm" onClick={() => window.open(state.data.url, '_blank', 'noopener,noreferrer')}>
                Abrir en otra pestaña
              </Button>
              <Button size="sm" onClick={download} className="bg-slate-800 text-white hover:bg-slate-700">
                Descargar comprobante
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
