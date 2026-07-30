import { useState, useEffect, useRef, useCallback } from 'react'
import { imgUrl } from '@/lib/media'
import { playSuccessSound, playWarningSound, playErrorSound, vibrateSuccess, vibrateWarning, vibrateError } from '@/lib/feedback'
import type { ScanAttendanceResponse } from '@/types/attendance'

interface ScanResultModalProps {
  result: ScanAttendanceResponse | null
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
  return (
    <img src={imgUrl(url) ?? ''} alt="" className="h-14 w-14 rounded-full object-cover"
      onError={() => setFailed(true)} />
  )
}

function formatTime(utcString?: string): string {
  if (!utcString) return ''
  try {
    return new Date(utcString).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch { return '' }
}

function getModalContent(result: ScanAttendanceResponse) {
  switch (result.status) {
    case 'registered':
      return { icon: '✅', title: 'Asistencia registrada', isError: false, isWarning: false }
    case 'already_registered':
      return { icon: 'ℹ️', title: 'Asistencia ya registrada', isError: false, isWarning: true }
    case 'expired':
      return { icon: '⏰', title: 'El código QR venció.', subtitle: 'Pedile al alumno que actualice su carnet.', isError: true, isWarning: false }
    case 'student_not_in_class':
      return { icon: '🚫', title: 'El alumno no pertenece a esta clase.', isError: true, isWarning: false }
    case 'forbidden':
      return { icon: '🔒', title: 'No tenés permisos para registrar asistencia en esta clase.', isError: true, isWarning: false }
    default:
      return {
        icon: '⚠️',
        title: result.message || (result.status === 'invalid'
          ? 'Código QR inválido.'
          : 'No pudimos registrar la asistencia. Intentá nuevamente.'),
        subtitle: result.status !== 'invalid' && result.message ? undefined : undefined,
        isError: true,
        isWarning: false,
      }
  }
}

export function ScanResultModal({ result, onClose }: ScanResultModalProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const cleanClose = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (mountedRef.current) onClose()
  }, [onClose])

  useEffect(() => {
    mountedRef.current = true
    if (!result) return

    if (result.status === 'registered') { playSuccessSound(); vibrateSuccess() }
    else if (result.status === 'already_registered') { playWarningSound(); vibrateWarning() }
    else { playErrorSound(); vibrateError() }

    timerRef.current = setTimeout(cleanClose, 4000)
    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [result, cleanClose])

  if (!result) return null

  const content = getModalContent(result)
  const student = result.student

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={cleanClose} />
      <div className="relative z-10 w-full max-w-xs animate-slide-up rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
        <button onClick={cleanClose}
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="text-center">
          <span className="text-2xl">{content.icon}</span>
          <p className={`mt-2 text-sm font-bold ${
            content.isError ? 'text-red-600' : content.isWarning ? 'text-amber-600' : 'text-emerald-600'
          }`}>
            {content.title}
          </p>
          {content.subtitle && <p className="mt-1 text-xs text-slate-500">{content.subtitle}</p>}
        </div>

        {student && (
          <div className="mt-4 flex flex-col items-center gap-3">
            <Avatar url={student.profilePhotoUrl} name={student.fullName} />
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{student.fullName}</p>
              <p className="text-xs text-slate-500">Carnet N.º {student.cardNumber}</p>
              <p className="text-xs text-slate-500">{student.courseName}</p>
            </div>

            {result.financialStatus && (
              <span className={`rounded-full px-3 py-0.5 text-[10px] font-bold ${
                result.financialStatus === 'up_to_date'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                {result.financialStatus === 'up_to_date' ? 'AL DÍA' : 'EN MORA'}
              </span>
            )}

            {result.attendanceTime && (
              <p className="text-xs text-slate-400">{formatTime(result.attendanceTime)}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
