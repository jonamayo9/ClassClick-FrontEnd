import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import type { OverdueStudent } from '@/types/attendance'

const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('es-AR', { month: 'long' }))

function chargeLine(chargeTypeName: string, month: number, year: number) {
  return `${chargeTypeName} — ${MONTHS[month - 1]} ${year}`
}

function StudentCharges({ student }: { student: OverdueStudent }) {
  return (
    <div>
      <div className="font-bold text-slate-900 dark:text-white">{student.studentName}</div>
      <ul className="mt-1 space-y-0.5">
        {student.overdueCharges.map((c, i) => (
          <li key={i} className="text-sm text-slate-600 dark:text-slate-300">
            • {chargeLine(c.chargeTypeName, c.month, c.year)}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function OverdueAttendanceModal({
  students, onCancel, onConfirmAll, onConfirmSelected,
}: {
  students: OverdueStudent[]
  onCancel: () => void
  onConfirmAll: () => void
  onConfirmSelected: (studentIds: string[]) => void
}) {
  const [mode, setMode] = useState<'action' | 'select'>('action')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const single = students.length === 1

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Modal open onClose={onCancel} title="Cuotas vencidas" className="sm:max-w-lg">
      <div className="px-5 py-4 sm:px-6">
        {mode === 'action' ? (
          <>
            {single ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-white">{students[0].studentName}</span> tiene las
                siguientes cuotas vencidas:
              </p>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Estos alumnos tienen cuotas vencidas:
              </p>
            )}

            <div className={`${single ? 'mt-2' : 'mt-2 space-y-3'}`}>
              {students.map((s) => (
                <StudentCharges key={s.studentId} student={s} />
              ))}
            </div>

            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {single
                ? '¿Querés marcar la asistencia igualmente?'
                : '¿Cómo querés continuar?'}
            </p>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={onCancel}>Cancelar</Button>
              {single ? (
                <Button className="bg-violet-600 text-white hover:bg-violet-700" onClick={onConfirmAll}>
                  Sí, marcar asistencia
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setMode('select')}>Algunos</Button>
                  <Button className="bg-violet-600 text-white hover:bg-violet-700" onClick={onConfirmAll}>Sí</Button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Seleccioná a qué alumnos querés marcar igualmente la asistencia.
            </p>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {students.map((s) => (
                <label key={s.studentId} className="block rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white">{s.studentName}</div>
                      <ul className="mt-1 space-y-0.5">
                        {s.overdueCharges.map((c, i) => (
                          <li key={i} className="text-xs text-slate-500">
                            {chargeLine(c.chargeTypeName, c.month, c.year)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <input type="checkbox" checked={selected.has(s.studentId)} onChange={() => toggle(s.studentId)} className="accent-violet-600" />
                      Marcar asistencia igualmente
                    </span>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={onCancel}>Cancelar</Button>
              <Button
                className="bg-violet-600 text-white hover:bg-violet-700"
                disabled={selected.size === 0}
                onClick={() => onConfirmSelected(Array.from(selected))}
              >
                Finalizar
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
