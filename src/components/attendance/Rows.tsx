import type { HistoryAttendanceItem, MarkState, PendingAttendanceItem } from '@/types/attendance'
import { dayLabel, formatRegisteredAt, formatTime } from './utils'

function DayCell({ day }: { day: string }) {
  return <span className="capitalize text-slate-600 dark:text-slate-300">{dayLabel(day)}</span>
}

function TimeCell({ start, end }: { start: string; end?: string }) {
  return <span className="text-slate-600 dark:text-slate-300">{formatTime(start)}–{formatTime(end ?? '')}</span>
}

// Control de 3 estados por fila: Sin marcar / Presente / Ausente.
export function MarkControl({ value, onChange }: { value: MarkState; onChange: (s: MarkState) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
      <button
        type="button"
        onClick={() => onChange(value === 'present' ? 'unmarked' : 'present')}
        className={`rounded-md px-3 py-1 text-xs font-bold transition ${
          value === 'present'
            ? 'bg-emerald-500 text-white shadow-sm'
            : 'text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-300'
        }`}
      >
        Presente
      </button>
      <button
        type="button"
        onClick={() => onChange(value === 'absent' ? 'unmarked' : 'absent')}
        className={`rounded-md px-3 py-1 text-xs font-bold transition ${
          value === 'absent'
            ? 'bg-rose-500 text-white shadow-sm'
            : 'text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-300'
        }`}
      >
        Ausente
      </button>
    </div>
  )
}

function StateBadge({ present }: { present: boolean }) {
  return present ? (
    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
      Presente
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
      Ausente
    </span>
  )
}

function OriginBadge({ source }: { source: string }) {
  const isQr = source === 'QrScan'
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
        isQr
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {isQr ? 'QR' : 'Manual'}
    </span>
  )
}

interface PendingRowsProps {
  items: PendingAttendanceItem[]
  states: Record<string, MarkState>
  onSetState: (key: string, state: MarkState) => void
  showCourse: boolean
}

export function PendingRows({ items, states, onSetState, showCourse }: PendingRowsProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
      <table className="hidden w-full text-sm sm:table">
        <thead className="bg-slate-50 dark:bg-slate-800/50">
          <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            <th className="px-4 py-3">Alumno</th>
            {showCourse && <th className="px-4 py-3">Curso</th>}
            <th className="px-4 py-3">Día</th>
            <th className="px-4 py-3">Horario</th>
            <th className="px-4 py-3 text-right">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((r) => {
            const key = `${r.classId}:${r.studentId}`
            return (
              <tr key={key} className="bg-white dark:bg-slate-900">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                  {r.studentName}
                  {r.dni ? <span className="ml-2 text-xs font-normal text-slate-400">{r.dni}</span> : null}
                </td>
                {showCourse && <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.courseName}</td>}
                <td className="px-4 py-3"><DayCell day={r.dayOfWeek} /></td>
                <td className="px-4 py-3"><TimeCell start={r.startTime} end={r.endTime} /></td>
                <td className="px-4 py-3 text-right">
                  <MarkControl value={states[key] ?? 'unmarked'} onChange={(s) => onSetState(key, s)} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <ul className="divide-y divide-slate-100 sm:hidden dark:divide-slate-800">
        {items.map((r) => {
          const key = `${r.classId}:${r.studentId}`
          return (
            <li key={key} className="space-y-2 bg-white p-4 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{r.studentName}</p>
                  {showCourse && <p className="text-xs text-slate-500 dark:text-slate-400">{r.courseName}</p>}
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <DayCell day={r.dayOfWeek} /> · <TimeCell start={r.startTime} end={r.endTime} />
                  </p>
                </div>
                <MarkControl value={states[key] ?? 'unmarked'} onChange={(s) => onSetState(key, s)} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface HistoryRowsProps {
  items: HistoryAttendanceItem[]
  edits: Record<string, boolean>
  onToggle: (attendanceId: string, present: boolean) => void
  showCourse: boolean
}

export function HistoryRows({ items, edits, onToggle, showCourse }: HistoryRowsProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
      <table className="hidden w-full text-sm sm:table">
        <thead className="bg-slate-50 dark:bg-slate-800/50">
          <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            <th className="px-4 py-3">Alumno</th>
            {showCourse && <th className="px-4 py-3">Curso</th>}
            <th className="px-4 py-3">Día</th>
            <th className="px-4 py-3">Horario</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Origen</th>
            <th className="px-4 py-3">Registrado</th>
            <th className="px-4 py-3">Registrado por</th>
            <th className="px-4 py-3 text-right">Editar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((r) => {
            const qrLocked = r.source === 'QrScan' && r.present
            const current = edits[r.attendanceId] ?? r.present
            return (
              <tr key={r.attendanceId} className="bg-white dark:bg-slate-900">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{r.studentName}</td>
                {showCourse && <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.courseName}</td>}
                <td className="px-4 py-3"><DayCell day={r.dayOfWeek} /></td>
                <td className="px-4 py-3"><TimeCell start={r.startTime} end={r.endTime} /></td>
                <td className="px-4 py-3"><StateBadge present={current} /></td>
                <td className="px-4 py-3"><OriginBadge source={r.source} /></td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatRegisteredAt(r.registeredAtUtc)}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.registeredByName ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={qrLocked}
                    onClick={() => onToggle(r.attendanceId, !current)}
                    title={qrLocked ? 'Registrada por QR: no puede cambiarse a ausente' : undefined}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      qrLocked
                        ? 'cursor-not-allowed bg-blue-50 text-blue-500 opacity-70 dark:bg-blue-900/20 dark:text-blue-400'
                        : current
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300'
                    }`}
                  >
                    {qrLocked ? 'QR' : current ? 'Presente' : 'Ausente'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <ul className="divide-y divide-slate-100 sm:hidden dark:divide-slate-800">
        {items.map((r) => {
          const qrLocked = r.source === 'QrScan' && r.present
          const current = edits[r.attendanceId] ?? r.present
          return (
            <li key={r.attendanceId} className="space-y-2 bg-white p-4 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{r.studentName}</p>
                  {showCourse && <p className="text-xs text-slate-500 dark:text-slate-400">{r.courseName}</p>}
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <DayCell day={r.dayOfWeek} /> · <TimeCell start={r.startTime} end={r.endTime} />
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <StateBadge present={current} />
                    <OriginBadge source={r.source} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    {formatRegisteredAt(r.registeredAtUtc)}
                    {r.registeredByName ? ` · ${r.registeredByName}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={qrLocked}
                  onClick={() => onToggle(r.attendanceId, !current)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    qrLocked
                      ? 'cursor-not-allowed bg-blue-50 text-blue-500 opacity-70 dark:bg-blue-900/20 dark:text-blue-400'
                      : current
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                  }`}
                >
                  {qrLocked ? 'QR' : current ? 'Presente' : 'Ausente'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
