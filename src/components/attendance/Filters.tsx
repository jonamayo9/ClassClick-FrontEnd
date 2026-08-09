import { useEffect, useMemo, useState } from 'react'
import { DayNavigator } from '@/components/ui/day-navigator'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { SearchableCombobox } from '@/components/ui/combobox'
import type { SelectOption } from '@/components/ui/select-field'
import { useDebouncedValue } from './hooks'
import {
  ALL,
  dayLabel,
  formatTime,
  fromOptionValue,
  toOptionValue,
  validDaysFor,
  type AttendanceFilters,
  type CourseOption,
  type ClassOption,
} from './utils'

interface FiltersProps {
  mode: 'marcar' | 'historial'
  value: AttendanceFilters
  searchDraft: string
  onSearchDraft: (text: string) => void
  onChange: (partial: Partial<AttendanceFilters>) => void
  courses: CourseOption[]
  classes: ClassOption[]
  loadingOptions?: boolean
}

export function Filters({
  mode,
  value,
  searchDraft,
  onSearchDraft,
  onChange,
  courses,
  classes,
  loadingOptions,
}: FiltersProps) {
  const [draft, setDraft] = useState(searchDraft)
  const debouncedSearch = useDebouncedValue(draft, 350)

  useEffect(() => setDraft(searchDraft), [searchDraft])
  useEffect(() => {
    if (debouncedSearch !== value.search) onChange({ search: debouncedSearch })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const validDays = useMemo(
    () => validDaysFor(classes, value.courseId, value.classId),
    [classes, value.courseId, value.classId]
  )

  const classOptions = classes.filter((c) => !value.courseId || c.courseId === value.courseId)

  const courseOptions: SelectOption[] = useMemo(
    () => [{ value: ALL, label: 'Todos' }, ...courses.map((c) => ({ value: c.id, label: c.name }))],
    [courses]
  )

  const handleCourseChange = (optionValue: string) => {
    const courseId = fromOptionValue(optionValue)
    const keepClass = courseId !== '' && classes.some((c) => c.courseId === courseId && c.id === value.classId)
    onChange({ courseId, classId: keepClass ? value.classId : '' })
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Fecha</label>
        <DayNavigator date={value.date} onChange={(d) => onChange({ date: d })} validDays={validDays} allowFuture />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Curso</label>
        <SearchableCombobox
          value={toOptionValue(value.courseId)}
          onValueChange={handleCourseChange}
          options={courseOptions}
          placeholder="Todos"
          searchPlaceholder="Buscar curso..."
          emptyText="No se encontraron cursos."
          showSearch={courses.length > 10}
          disabled={loadingOptions}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Horario / clase</label>
        <Select
          value={toOptionValue(value.classId)}
          disabled={loadingOptions}
          onChange={(e) => onChange({ classId: fromOptionValue(e.target.value) })}
        >
          <option value={ALL}>Todos</option>
          {classOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {value.courseId
                ? `${dayLabel(c.dayOfWeek)} ${formatTime(c.startTime)}–${formatTime(c.endTime ?? '')}`
                : `${c.courseName} · ${dayLabel(c.dayOfWeek)} ${formatTime(c.startTime)}–${formatTime(c.endTime ?? '')}`}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Buscar alumno</label>
        <Input value={draft} onChange={(e) => onSearchDraft(e.target.value)} placeholder="Nombre o DNI…" />
      </div>

      {mode === 'historial' && (
        <>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Estado</label>
            <Select value={toOptionValue(value.present)} onChange={(e) => onChange({ present: fromOptionValue(e.target.value) })}>
              <option value={ALL}>Todos</option>
              <option value="true">Presentes</option>
              <option value="false">Ausentes</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Origen</label>
            <Select value={toOptionValue(value.source)} onChange={(e) => onChange({ source: fromOptionValue(e.target.value) })}>
              <option value={ALL}>Todos</option>
              <option value="Manual">Manual</option>
              <option value="QrScan">QR</option>
            </Select>
          </div>
        </>
      )}
    </div>
  )
}
