import { useCallback, useEffect, useRef, useState } from 'react'
import { imgUrl } from '@/lib/media'
import {
  playSuccessSound,
  playWarningSound,
  playErrorSound,
  vibrateSuccess,
  vibrateWarning,
  vibrateError,
} from '@/lib/feedback'
import { Button } from '@/components/ui/button'
import type { ScanPendingClass, ScanRegisterResponse, ScanResolveResponse } from '@/types/attendance'
import { dayLabel, formatTime } from '@/components/attendance/utils'

type Phase = 'resolve' | 'multi' | 'register'

interface ScanResolveModalProps {
  phase: Phase
  result: ScanResolveResponse
  registerResult?: ScanRegisterResponse
  classes?: ScanPendingClass[]
  isRegistering: boolean
  error?: string | null
  onSubmit: (classIds: string[]) => void
  onClose: () => void
}

function Avatar({ url, name }: { url?: string | null; name: string }) {
  const [failed, setFailed] = useState(false)
  const initials = name.split(' ').map((n) => n.charAt(0)).join('').toUpperCase().slice(0, 2) || 'AL'
  if (!url || failed) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
        <span className="text-lg font-bold text-slate-400">{initials}</span>
      </div>
    )
  }
  return <img src={imgUrl(url) ?? ''} alt="" className="h-14 w-14 rounded-full object-cover" onError={() => setFailed(true)} />
}

function formatAttendanceTime(utc?: string): string {
  if (!utc) return ''
  try {
    return new Date(utc).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return ''
  }
}

function classLabel(c: ScanPendingClass): string {
  return `${c.courseName} · ${dayLabel(c.dayOfWeek)} ${formatTime(c.startTime)}–${formatTime(c.endTime)}`
}

function FinancialBadge({ status }: { status?: string }) {
  if (!status) return null
  return (
    <span
      className={`rounded-full px-3 py-0.5 text-[10px] font-bold ${
        status === 'up_to_date'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
      }`}
    >
      {status === 'up_to_date' ? 'AL DÍA' : 'EN MORA'}
    </span>
  )
}

export function ScanResolveModal({
  phase,
  result,
  registerResult,
  classes = [],
  isRegistering,
  error,
  onSubmit,
  onClose,
}: ScanResolveModalProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    setSelected({})
  }, [phase, result.status])

  const cleanClose = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (mountedRef.current) onClose()
  }, [onClose])

  useEffect(() => {
    mountedRef.current = true
    if (phase !== 'resolve') return

    const s = result.status
    if (s === 'registered') {
      playSuccessSound()
      vibrateSuccess()
    } else if (s === 'already_registered' || s === 'all_registered' || s === 'no_valid_classes' || s === 'not_enrolled') {
      playWarningSound()
      vibrateWarning()
    } else {
      playErrorSound()
      vibrateError()
    }

    timerRef.current = setTimeout(cleanClose, 4000)
    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [phase, result, cleanClose])

  const student = result.student
  const registeredClass = result.registeredClass

  const renderStudentHeader = (title: string, tone: 'success' | 'warning' | 'error') => {
    const toneClass =
      tone === 'success'
        ? 'text-emerald-600'
        : tone === 'warning'
          ? 'text-amber-600'
          : 'text-red-600'
    return (
      <>
        <p className={`text-center text-sm font-bold ${toneClass}`}>{title}</p>
        {student && (
          <div className="mt-4 flex flex-col items-center gap-3">
            <Avatar url={student.profilePhotoUrl} name={student.fullName} />
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{student.fullName}</p>
              <p className="text-xs text-slate-500">Carnet N.º {student.cardNumber}</p>
            </div>
          </div>
        )}
      </>
    )
  }

  const renderTerminal = () => {
    switch (result.status) {
      case 'registered':
        return (
          <>
            {renderStudentHeader('Asistencia registrada', 'success')}
            {registeredClass && (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800">
                <p className="text-xs text-slate-400">Clase registrada</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{registeredClass.courseName}</p>
                <p className="text-xs text-slate-500">
                  {dayLabel(registeredClass.dayOfWeek)} {formatTime(registeredClass.startTime)}–{formatTime(registeredClass.endTime)}
                </p>
              </div>
            )}
            <div className="mt-3 flex flex-col items-center gap-2">
              <FinancialBadge status={result.financialStatus} />
              {result.attendanceTime && (
                <p className="text-xs text-slate-400">{formatAttendanceTime(result.attendanceTime)}</p>
              )}
            </div>
          </>
        )
      case 'already_registered':
        return (
          <>
            {renderStudentHeader('Asistencia ya registrada', 'warning')}
            {registeredClass && (
              <p className="mt-3 text-center text-xs text-slate-500">
                {classLabel(registeredClass)}
              </p>
            )}
            {result.attendanceTime && (
              <p className="mt-2 text-center text-xs text-slate-400">
                Registrada a las {formatAttendanceTime(result.attendanceTime)}
              </p>
            )}
          </>
        )
      case 'all_registered':
        return (
          <>
            <p className="text-center text-sm font-bold text-amber-600">
              El alumno ya tiene registrada la asistencia para todas las clases disponibles en este horario.
            </p>
            {(result.alreadyRegistered ?? []).length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {(result.alreadyRegistered ?? []).map((c) => (
                  <li key={c.classId} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {classLabel(c)}
                  </li>
                ))}
              </ul>
            )}
          </>
        )
      case 'no_valid_classes':
        return (
          <p className="text-center text-sm font-bold text-amber-600">
            {result.hasClassesToday
              ? 'El alumno tiene clases hoy, pero ninguna se encuentra dentro del horario habilitado para registrar asistencia.'
              : 'El alumno no tiene clases programadas para hoy.'}
          </p>
        )
      case 'not_enrolled':
        return (
          <p className="text-center text-sm font-bold text-amber-600">
            El alumno no tiene inscripciones activas disponibles para registrar asistencia.
          </p>
        )
      case 'expired':
        return (
          <p className="text-center text-sm font-bold text-red-600">
            El código QR venció. Solicitá al alumno que actualice su carnet.
          </p>
        )
      case 'invalid':
        return <p className="text-center text-sm font-bold text-red-600">Código QR inválido.</p>
      case 'forbidden':
        return (
          <p className="text-center text-sm font-bold text-red-600">
            No tenés permisos para registrar esta asistencia.
          </p>
        )
      default:
        return (
          <p className="text-center text-sm font-bold text-red-600">
            {result.message || 'No pudimos registrar la asistencia. Intentá nuevamente.'}
          </p>
        )
    }
  }

  const renderMulti = () => {
    const pending = result.pendingClasses ?? []
    const toggle = (classId: string) =>
      setSelected((prev) => ({ ...prev, [classId]: !prev[classId] }))
    const selectedIds = pending.filter((c) => selected[c.classId]).map((c) => c.classId)

    return (
      <>
        <p className="text-center text-sm font-bold text-slate-900 dark:text-white">
          ¿En qué clase querés registrar la asistencia?
        </p>
        {student && (
          <p className="mt-1 text-center text-xs text-slate-500">{student.fullName}</p>
        )}

        <div className="mt-4 space-y-2">
          {pending.map((c) => (
            <label
              key={c.classId}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <input
                type="checkbox"
                checked={!!selected[c.classId]}
                onChange={() => toggle(c.classId)}
                className="h-4 w-4 accent-violet-600"
              />
              <span className="text-slate-700 dark:text-slate-200">{classLabel(c)}</span>
            </label>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <Button
            size="sm"
            loading={isRegistering}
            disabled={selectedIds.length === 0}
            onClick={() => onSubmit(selectedIds)}
            className="bg-violet-600 text-white hover:bg-violet-700"
          >
            Registrar seleccionadas
          </Button>
          <Button
            size="sm"
            variant="outline"
            loading={isRegistering}
            disabled={pending.length === 0}
            onClick={() => onSubmit(pending.map((c) => c.classId))}
          >
            Registrar en todas
          </Button>
        </div>
      </>
    )
  }

  const renderRegister = () => {
    const byId = new Map(classes.map((c) => [c.classId, c]))
    const labelFor = (id: string) => (byId.get(id) ? classLabel(byId.get(id)!) : id)
    const registeredIds = registerResult?.registered ?? []
    const alreadyIds = registerResult?.already ?? []
    const notPendingIds = registerResult?.notPending ?? []
    const status = registerResult?.status ?? ''

    const title =
      status === 'registered'
        ? 'Asistencia registrada'
        : status === 'partial'
          ? 'Se registraron algunas clases'
          : 'Asistencia ya registrada'

    return (
      <>
        <p className={`text-center text-sm font-bold ${
          status === 'already_registered' ? 'text-amber-600' : 'text-emerald-600'
        }`}>
          {title}
        </p>
        {status === 'partial' && registerResult?.message && (
          <p className="mt-1 text-center text-xs text-slate-500">{registerResult.message}</p>
        )}

        {registeredIds.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Registradas</p>
            <ul className="mt-1 space-y-1">
              {registeredIds.map((id) => (
                <li key={id} className="text-xs text-slate-600 dark:text-slate-300">✓ {labelFor(id)}</li>
              ))}
            </ul>
          </div>
        )}
        {alreadyIds.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Ya existían</p>
            <ul className="mt-1 space-y-1">
              {alreadyIds.map((id) => (
                <li key={id} className="text-xs text-slate-600 dark:text-slate-300">ℹ️ {labelFor(id)}</li>
              ))}
            </ul>
          </div>
        )}
        {notPendingIds.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">Dejaron de ser válidas</p>
            <ul className="mt-1 space-y-1">
              {notPendingIds.map((id) => (
                <li key={id} className="text-xs text-slate-600 dark:text-slate-300">✕ {labelFor(id)}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <Button size="sm" onClick={cleanClose}>Listo</Button>
        </div>
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={cleanClose} />
      <div className="relative z-10 max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
        <button
          onClick={cleanClose}
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {phase === 'resolve' && renderTerminal()}
        {phase === 'multi' && renderMulti()}
        {phase === 'register' && renderRegister()}
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 p-2 text-center text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
