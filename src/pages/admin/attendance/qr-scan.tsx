import { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { QrScanner } from '@/components/qr-scanner'
import { ScanResultModal } from '@/components/scan-result-modal'
import { useScanAttendance } from '@/hooks/useScanAttendance'
import { useAuth } from '@/stores/auth'
import { hasModule } from '@/hooks/useModule'
import type { ScanAttendanceResponse } from '@/types/attendance'

function isValidGuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export default function AdminQrScanPage() {
  const { classId } = useParams<{ classId: string }>()
  const { scan, isScanning, resetError } = useScanAttendance()
  const [scanResult, setScanResult] = useState<ScanAttendanceResponse | null>(null)
  const [paused, setPaused] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const qrEnabled = hasModule('qr_attendance')
  const classIdValid = classId ? isValidGuid(classId) : false

  const handleScan = useCallback(async (token: string) => {
    if (!classId) return
    const preview = token.length > 25 ? token.slice(0, 15) + '...' + token.slice(-10) : token
    console.log('QR scan:', preview, 'class:', classId)
    setScannerError(null)
    resetError()
    try {
      const result = await scan(token, classId)
      console.log('QR result:', result.status, result.message || '')
      setScanResult(result)
      setPaused(true)
    } catch (err) {
      console.warn('QR scan failed:', err)
      setPaused(false)
    }
  }, [classId, scan, resetError])

  const handleModalClose = useCallback(() => {
    setScanResult(null)
    setPaused(false)
  }, [])

  if (!classId || !classIdValid) {
    return (
      <div className="mx-auto max-w-lg space-y-5 py-8">
        <BackButton to="/admin/attendance" label="Volver a asistencias" />
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-slate-900">
          <p className="text-sm text-slate-500">No encontramos la clase seleccionada. Volvé a Asistencia y elegí una clase válida.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 py-8">
      <BackButton to="/admin/attendance" label="Volver a asistencias" />

      <div className="rounded-2xl bg-gradient-to-br from-violet-600 via-violet-700 to-purple-800 p-5 text-white">
        <h1 className="text-lg font-black">Escanear QR</h1>
        <p className="mt-1 text-sm text-violet-200">Escaneá el carnet digital del alumno</p>
      </div>

      {!qrEnabled && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-slate-900">
          <p className="text-sm text-slate-500">
            La asistencia por QR no está habilitada para esta institución.
            Contactate con el soporte de ClassClick.
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

          <QrScanner
            enabled={qrEnabled}
            paused={paused}
            classId={classId}
            onScan={handleScan}
            onError={setScannerError}
          />

          <div className="text-center text-xs text-slate-400">
            {isScanning ? 'Procesando...' : 'Apuntá la cámara al código QR del carnet'}
          </div>
        </div>
      )}

      <ScanResultModal result={scanResult} onClose={handleModalClose} />
    </div>
  )
}
