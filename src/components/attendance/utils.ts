export type AttendanceRole = 'admin' | 'teacher' | 'delegate'

export interface AttendanceFilters {
  date: string
  courseId: string
  classId: string
  search: string
  present: string
  source: string
}

export interface CourseOption {
  id: string
  name: string
}

export interface ClassOption {
  id: string
  courseId: string
  courseName: string
  dayOfWeek: string
  startTime: string
  endTime?: string
}

export function todayIso(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function defaultFilters(): AttendanceFilters {
  return { date: todayIso(), courseId: '', classId: '', search: '', present: '', source: '' }
}

export function formatTime(t: string): string {
  if (!t) return ''
  return t.slice(0, 5)
}

const DAY_LABEL_MAP: Record<string, string> = {
  Sunday: 'Domingo', Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles',
  Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado',
}

export function dayLabel(d: string): string {
  return DAY_LABEL_MAP[d] ?? d
}

const JS_DAY_TO_EN: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Nombre del día (inglés, como el backend) para una fecha ISO local. */
export function dayNameFromIso(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return JS_DAY_TO_EN[new Date(y, m - 1, d).getDay()]
}

export function rowKey(classId: string, studentId: string): string {
  return `${classId}:${studentId}`
}

export function formatRegisteredAt(utc?: string | null): string {
  if (!utc) return '—'
  try {
    const d = new Date(utc)
    return d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

export const ROLE_ACCENTS: Record<AttendanceRole, { hero: string; text: string }> = {
  admin: { hero: 'from-violet-600 via-violet-700 to-purple-800', text: 'text-violet-200' },
  teacher: { hero: 'from-emerald-600 via-emerald-700 to-teal-800', text: 'text-emerald-200' },
  delegate: { hero: 'from-sky-600 via-sky-700 to-blue-800', text: 'text-sky-200' },
}

// ============ Filtros: "Todos" como opción real ============
// Valor centinela usado como valor de option (Radix no permite value="").
// Internamente "Todos" se representa como "" (→ se omite el query param).
export const ALL = '__all__'

export function toOptionValue(v: string): string {
  return v === '' ? ALL : v
}

export function fromOptionValue(v: string): string {
  return v === ALL ? '' : v
}

const DAY_OF_WEEK_TO_JS: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
}

/** Días de la semana (JS: 0=Dom..6=Sáb) en que existen clases accesibles para los filtros. */
export function validDaysFor(classes: ClassOption[], courseId: string, classId: string): number[] {
  const set = new Set<number>()
  for (const c of classes) {
    if (courseId && c.courseId !== courseId) continue
    if (classId && c.id !== classId) continue
    const idx = DAY_OF_WEEK_TO_JS[c.dayOfWeek]
    if (idx !== undefined) set.add(idx)
  }
  return Array.from(set).sort((a, b) => a - b)
}

export function isDateValid(iso: string, validDays: number[]): boolean {
  if (validDays.length === 0) return true
  const [y, m, d] = iso.split('-').map(Number)
  return validDays.includes(new Date(y, m - 1, d).getDay())
}

/** Fecha más reciente <= hoy cuyo día pertenece a validDays (mismo criterio que getClosestPastDate). */
export function closestValidDate(validDays: number[]): string {
  const set = new Set(validDays)
  if (set.size === 0) return todayIso()
  const d = new Date()
  for (let i = 0; i < 8; i++) {
    if (set.has(d.getDay())) {
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${d.getFullYear()}-${m}-${day}`
    }
    d.setDate(d.getDate() - 1)
  }
  return todayIso()
}
