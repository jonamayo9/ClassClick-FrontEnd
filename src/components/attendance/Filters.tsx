import { useEffect, useMemo, useState } from 'react'
import { DayNavigator } from '@/components/ui/day-navigator'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  const [filtersOpen, setFiltersOpen] = useState(false)
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

  const secondaryActiveCount = [
    value.courseId,
    value.classId,
    mode === 'historial' ? value.present : '',
    mode === 'historial' ? value.source : '',
  ].filter(Boolean).length

  const handleCourseChange = (optionValue: string) => {
    const courseId = fromOptionValue(optionValue)
    const keepClass = courseId !== '' && classes.some((c) => c.courseId === courseId && c.id === value.classId)
    onChange({ courseId, classId: keepClass ? value.classId : '' })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
        <div className="w-full sm:w-64">
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Fecha</label>
          <DayNavigator date={value.date} onChange={(d) => onChange({ date: d })} validDays={validDays} allowFuture />
        </div>

        <div className="w-full sm:flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Buscar alumno</label>
          <Input value={draft} onChange={(e) => onSearchDraft(e.target.value)} placeholder="Nombre o DNI…" />
        </div>

        <div className="self-start sm:self-auto sm:pb-0.5">
          <Button
            variant="outline"
            size="sm"
            className="inline-flex items-center gap-1.5"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros{secondaryActiveCount > 0 ? ` (${secondaryActiveCount})` : ''}
          </Button>
        </div>
      </div>

      {filtersOpen && (
        <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-700 dark:bg-slate-900">
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
      )}
    </div>
  )
}

