import { useCallback, useMemo, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-day-picker/style.css'

const DAY_JS: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
}

interface DayNavigatorProps {
  date: string
  onChange: (date: string) => void
  dayOfWeek?: number | string
  /** Días de la semana válidos (JS: 0=Dom..6=Sáb). Si se provee, la navegación solo aterriza en esos días. */
  validDays?: number[]
  className?: string
  /** Permitir fechas futuras (por defecto se bloquean > hoy). */
  allowFuture?: boolean
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function DayNavigator({
  date,
  onChange,
  dayOfWeek,
  validDays,
  className = '',
  allowFuture = false,
}: DayNavigatorProps) {
  const [open, setOpen] = useState(false)
  const current = parseDate(date)
  const today = useMemo(() => new Date(), [])

  const validSet = useMemo(() => {
    if (validDays && validDays.length > 0) return new Set(validDays)
    const single = typeof dayOfWeek === 'string' ? DAY_JS[dayOfWeek] : dayOfWeek
    return single !== undefined ? new Set([single]) : new Set<number>()
  }, [validDays, dayOfWeek])

  const canGoPrev = true

  const canGoNext = useMemo(() => {
    if (allowFuture) return true
    let d = addDays(current, 1)
    if (validSet.size === 0) return d <= today
    for (let i = 0; i < 7; i++) {
      if (d > today) return false
      if (validSet.has(d.getDay())) return true
      d = addDays(d, 1)
    }
    return false
  }, [current, today, validSet, allowFuture])

  const goPrev = useCallback(() => {
    let d = addDays(current, -1)
    if (validSet.size > 0) {
      for (let i = 0; i < 7; i++) {
        if (validSet.has(d.getDay())) {
          onChange(formatDate(d))
          return
        }
        d = addDays(d, -1)
      }
      return
    }
    onChange(formatDate(d))
  }, [current, validSet, onChange])

  const goNext = useCallback(() => {
    let d = addDays(current, 1)
    if (validSet.size > 0) {
      for (let i = 0; i < 7; i++) {
        if (!allowFuture && d > today) return
        if (validSet.has(d.getDay())) {
          onChange(formatDate(d))
          return
        }
        d = addDays(d, 1)
      }
      return
    }
    if (!allowFuture && d > today) return
    onChange(formatDate(d))
  }, [current, validSet, today, onChange, allowFuture])

  const isDayDisabled = useCallback(
    (d: Date) => {
      if (!allowFuture && d > today) return true
      if (validSet.size > 0 && !validSet.has(d.getDay())) return true
      return false
    },
    [today, validSet, allowFuture]
  )

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button onClick={goPrev} disabled={!canGoPrev}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>

      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
        <span className="capitalize">{format(current, 'EEEE d \'de\' MMMM \'de\' yyyy', { locale: es })}</span>
        <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      </button>

      <button onClick={goNext} disabled={!canGoNext}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[130]" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-2 bottom-2 z-[131] max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <DayPicker
              mode="single"
              selected={current}
              onSelect={(d) => { if (d) { onChange(formatDate(d)); setOpen(false) } }}
              disabled={isDayDisabled}
              defaultMonth={current}
              locale={es}
            />
          </div>
        </>
      )}
    </div>
  )
}
