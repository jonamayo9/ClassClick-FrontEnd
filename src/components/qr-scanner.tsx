import { useRef, useState, useCallback, useEffect } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'

interface QrScannerProps {
  enabled: boolean
  paused: boolean
  classId?: string
  onScan: (token: string) => void
  onError?: (message: string) => void
}

const DEBOUNCE_MS = 5000

export function QrScanner({ enabled, paused, classId, onScan, onError }: QrScannerProps) {
  const [frontCamera, setFrontCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const lastTokenRef = useRef('')
  const lastTokenTimeRef = useRef(0)
  const processedRef = useRef(false)
  const classIdRef = useRef(classId)

  classIdRef.current = classId

  const handleScan = useCallback((detectedCodes: { rawValue: string }[]) => {
    if (paused || processedRef.current) return
    const token = detectedCodes?.[0]?.rawValue
    if (!token || typeof token !== 'string') return
    if (!token.startsWith('classclick:student-card:')) return

    const now = Date.now()
    if (token === lastTokenRef.current && now - lastTokenTimeRef.current < DEBOUNCE_MS) return

    lastTokenRef.current = token
    lastTokenTimeRef.current = now
    processedRef.current = true
    onScan(token)
  }, [paused, onScan])

  const handleError = useCallback((error: { message?: string }) => {
    const msg = error?.message ?? ''
    if (msg.includes('NotAllowed') || msg.includes('Permission')) {
      setCameraError('Necesitamos acceso a la cámara para escanear el carnet. Habilitá el permiso desde la configuración del navegador.')
    } else if (msg.includes('NotFound')) {
      setCameraError('No encontramos una cámara disponible en este dispositivo.')
    } else if (msg.includes('NotReadable')) {
      setCameraError('La cámara está siendo utilizada por otra aplicación. Cerrala e intentá nuevamente.')
    } else {
      setCameraError('No pudimos abrir la cámara. Verificá los permisos e intentá nuevamente.')
    }
    onError?.(cameraError ?? 'Error de cámara')
  }, [onError, cameraError])

  useEffect(() => {
    if (!paused) {
      processedRef.current = false
    }
  }, [paused])

  useEffect(() => {
    return () => {
      processedRef.current = false
      lastTokenRef.current = ''
    }
  }, [])

  if (!enabled) return null

  return (
    <div className="relative mx-auto w-full max-w-sm">
      {cameraError ? (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-slate-100 p-6 text-center dark:bg-slate-800">
          <p className="text-sm text-slate-500">{cameraError}</p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <Scanner
            onScan={handleScan}
            onError={handleError}
            paused={paused}
            constraints={{ facingMode: frontCamera ? 'user' : 'environment' }}
            allowMultiple={false}
            scanDelay={1000}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-48 w-48 rounded-2xl border-2 border-white/60" />
          </div>
        </div>
      )}

      {/* Camera controls */}
      <div className="mt-3 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => setFrontCamera((prev) => !prev)}
          className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
          {frontCamera ? 'Cámara trasera' : 'Cámara frontal'}
        </button>
      </div>
    </div>
  )
}
