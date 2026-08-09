import { useCallback, useState } from 'react'
import { QrScanner } from '@/components/qr-scanner'
import { ScanResultModal } from '@/components/scan-result-modal'
import { useScanAttendance } from '@/hooks/useScanAttendance'
import { hasModule } from '@/hooks/useModule'
import type { ScanAttendanceResponse } from '@/types/attendance'
import { ROLE_ACCENTS, type AttendanceRole } from './utils'

interface LegacyQrScanProps {
  classId: string
  role: AttendanceRole
}

/** Flujo QR legacy (con clase pre-seleccionada): POST /api/attendance/scan { qrToken, classId }. */
export function LegacyQrScan({ classId, role }: LegacyQrScanProps) {
  const { scan, isScanning, resetError } = useScanAttendance()
  const [scanResult, setScanResult] = useState<ScanAttendanceResponse | null>(null)
  const [paused, setPaused] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const qrEnabled = hasModule('qr_attendance')
  const accent = ROLE_ACCENTS[role]

  const handleScan = useCallback(
    async (token: string) => {
      setScannerError(null)
      resetError()
      try {
        const result = await scan(token, classId)
        setScanResult(result)
        setPaused(true)
      } catch {
        setPaused(false)
      }
    },
    [classId, scan, resetError]
  )

  const handleModalClose = useCallback(() => {
    setScanResult(null)
    setPaused(false)
  }, [])

  return (
    <>
      <div className={`rounded-2xl bg-gradient-to-br ${accent.hero} p-5 text-white`}>
        <h1 className="text-lg font-black">Escanear QR</h1>
        <p className={`mt-1 text-sm ${accent.text}`}>Escaneá el carnet digital del alumno</p>
      </div>

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

          <QrScanner enabled={qrEnabled} paused={paused} classId={classId} onScan={handleScan} onError={setScannerError} />

          <div className="text-center text-xs text-slate-400">
            {isScanning ? 'Procesando...' : 'Apuntá la cámara al código QR del carnet'}
          </div>
        </div>
      )}

      <ScanResultModal result={scanResult} onClose={handleModalClose} />
    </>
  )
}
