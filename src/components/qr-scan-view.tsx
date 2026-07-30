import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface QrScanViewProps {
  courseId: string
  classId: string
  courseName: string
  className: string
  hasClass: boolean
  basePath: string
}

export function QrScanView({ courseId, classId, courseName, className, hasClass, basePath }: QrScanViewProps) {
  const navigate = useNavigate()

  return (
    <Card className="p-6">
      {!hasClass ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <span className="text-4xl">📷</span>
          <p className="text-sm text-slate-500">Seleccioná un curso y una clase para comenzar a escanear.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <div className="w-full rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 p-5 text-center dark:from-violet-950/20 dark:to-purple-950/20">
            <p className="text-xs uppercase tracking-wider text-slate-400">Clase seleccionada</p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{courseName}</p>
            <p className="text-sm text-slate-500">{className}</p>
          </div>

          <Button
            size="lg"
            onClick={() => navigate(`${basePath}/${classId}`)}
            className="w-full gap-2 bg-violet-600 py-6 text-base text-white shadow-lg hover:bg-violet-700">
            <span className="text-2xl">📷</span>
            Iniciar escaneo QR
          </Button>

          <p className="text-xs text-slate-400 text-center">
            Escaneá el carnet digital del alumno para registrar su asistencia
          </p>
        </div>
      )}
    </Card>
  )
}
