import { useParams } from 'react-router-dom'
import { BackButton } from '@/components/ui/back-button'
import { LegacyQrScan } from '@/components/attendance/LegacyQrScan'
import { QrScanFlow } from '@/components/attendance/QrScanFlow'

function isValidGuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export default function AdminQrScanPage() {
  const { classId } = useParams<{ classId: string }>()

  // Nueva ruta sin classId: flujo scan-first (resolve → register).
  if (!classId) return <QrScanFlow role="admin" />

  // Ruta legacy con :classId: mantener comportamiento actual.
  if (!isValidGuid(classId)) {
    return (
      <div className="mx-auto max-w-lg space-y-5 py-8">
        <BackButton to="/admin/attendance" label="Volver a asistencias" />
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-slate-900">
          <p className="text-sm text-slate-500">
            No encontramos la clase seleccionada. Volvé a Asistencia y elegí una clase válida.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 py-8">
      <BackButton to="/admin/attendance" label="Volver a asistencias" />
      <LegacyQrScan classId={classId} role="admin" />
    </div>
  )
}
