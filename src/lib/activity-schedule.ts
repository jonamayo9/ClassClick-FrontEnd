const DAY_NAMES: Record<string, string> = {
  Monday: 'Lunes',
  Tuesday: 'Martes',
  Wednesday: 'Miércoles',
  Thursday: 'Jueves',
  Friday: 'Viernes',
  Saturday: 'Sábado',
  Sunday: 'Domingo',
}

export interface ActivityScheduleItem {
  day?: string
  startTime?: string
  endTime?: string
}

/**
 * Formatea el primer horario de una actividad como "Lunes de 20:00 a 21:00 hs".
 * Devuelve null si no hay horarios utilizables.
 */
export function formatActivitySchedule(schedule?: ActivityScheduleItem[] | null): string | null {
  if (!schedule || schedule.length === 0) return null

  const first = schedule[0]
  const start = (first.startTime ?? '').substring(0, 5)
  const end = (first.endTime ?? '').substring(0, 5)
  if (!start || !end) return null

  const day = DAY_NAMES[first.day ?? ''] ?? ''
  const extra = schedule.length > 1 ? ` (+${schedule.length - 1} más)` : ''

  return `${day ? `${day} ` : ''}de ${start} a ${end} hs${extra}`.replace(/\s+/g, ' ').trim()
}
