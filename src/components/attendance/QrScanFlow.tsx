import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { BackButton } from '@/components/ui/back-button'
import { QrScanner } from '@/components/qr-scanner'
import { useRegisterAttendance, useResolveAttendance } from '@/hooks/useScanAttendance'
import { hasModule } from '@/hooks/useModule'
import { ScanResolveModal } from './ScanResolveModal'
import { ROLE_ACCENTS, type AttendanceRole } from './utils'
import type { ScanRegisterResponse, ScanResolveResponse } from '@/types/attendance'

type FlowState =
  | { kind: 'resolve'; data: ScanResolveResponse }
  | { kind: 'multi'; data: ScanResolveResponse; token: string }
  | { kind: 'register'; data: ScanResolveResponse; token: string; registerResult: ScanRegisterResponse }

export function QrScanFlow({ role, embedded = false }: { role: AttendanceRole; embedded?: boolean }) {
  const backPath = role === 'admin' ? '/admin/attendance' : '/teacher/attendance'
  const accent = ROLE_ACCENTS[role]
  const qc = useQueryClient()
  const qrEnabled = hasModule('qr_attendance')
  const { resolve, isResolving, resetError } = useResolveAttendance()
  const { register, isRegistering } = useRegisterAttendance()

  const [state, setState] = useState<FlowState | null>(null)
  const [paused, setPaused] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [flowError, setFlowError] = useState<string | null>(null)

  const invalidateQueries = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['attendance-pending'] })
    qc.invalidateQueries({ queryKey: ['attendance-history'] })
  }, [qc])

  const handleScan = useCallback(
    async (token: string) => {
      setScannerError(null)
      setFlowError(null)
      resetError()
      setPaused(true)
      try {
        const result = await resolve(token)
        if (result.status === 'multiple_pending') {
          setState({ kind: 'multi', data: result, token })
          return
        }
        setState({ kind: 'resolve', data: result })
        if (result.status === 'registered' || result.status === 'already_registered') {
          invalidateQueries()
        }
      } catch {
        setPaused(false)
        setScannerError('No pudimos procesar el QR. Intentá nuevamente.')
      }
    },
    [resolve, resetError, invalidateQueries]
  )

  const handleSubmit = useCallback(
    async (classIds: string[]) => {
      if (state?.kind !== 'multi') return
      setFlowError(null)
      try {
        const registerResult = await register(state.token, classIds)
        setState({ kind: 'register', data: state.data, token: state.token, registerResult })
        invalidateQueries()
      } catch {
        setFlowError('No pudimos registrar la asistencia. Intentá nuevamente.')
      }
    },
    [state, register, invalidateQueries]
  )

  const handleClose = useCallback(() => {
    setState(null)
    setFlowError(null)
    setPaused(false)
  }, [])

  const phase =
    state?.kind === 'resolve'
      ? 'resolve'
      : state?.kind === 'multi'
        ? 'multi'
        : state?.kind === 'register'
          ? 'register'
          : undefined

  return (
    <div className={embedded ? 'space-y-4' : 'mx-auto max-w-lg space-y-5 py-8'}>
      {!embedded && <BackButton to={backPath} label="Volver a asistencias" />}

      {!embedded && (
        <div className={`rounded-2xl bg-gradient-to-br ${accent.hero} p-5 text-white`}>
          <h1 className="text-lg font-black">Escanear QR</h1>
          <p className={`mt-1 text-sm ${accent.text}`}>Escaneá el carnet digital del alumno</p>
        </div>
      )}

      {!qrEnabled && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-slate-900">
          <p className="text-sm text-slate-500">
            La asistencia por QR no está habilitada para esta institución. Contactate con el soporte de ClassClick.
          </p>
        </div>
      )}

      {qrEnabled && (
        <div className="space-y-4">
          {scannerError && (
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">
              {scannerError}
            </div>
          )}

          <QrScanner enabled={qrEnabled} paused={paused} onScan={handleScan} onError={setScannerError} />

          <div className="text-center text-xs text-slate-400">
            {isResolving || isRegistering ? 'Procesando...' : 'Apuntá la cámara al código QR del carnet'}
          </div>
        </div>
      )}

      {state && phase && (
        <ScanResolveModal
          phase={phase}
          result={state.data}
          registerResult={state.kind === 'register' ? state.registerResult : undefined}
          classes={state.data.pendingClasses}
          isRegistering={isRegistering}
          error={flowError}
          onSubmit={handleSubmit}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
