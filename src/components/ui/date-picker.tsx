import * as Popover from '@radix-ui/react-popover'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { format, isValid, parse, setMonth, setYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { SelectField } from './select-field'

function parseDate(value?: string | null) {
  if (!value) return undefined
  const result = parse(value.slice(0, 10), 'yyyy-MM-dd', new Date())
  return isValid(result) ? result : undefined
}

function isoDate(value?: Date) {
  return value ? format(value, 'yyyy-MM-dd') : ''
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 639px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)')
    const update = () => setMobile(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return mobile
}

function PickerSurface({
  open,
  onOpenChange,
  trigger,
  title,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  const mobile = useIsMobile()
  if (mobile) {
    return (
      <>
        <div onClick={() => onOpenChange(true)}>{trigger}</div>
        {open && (
          <>
            <div className="fixed inset-0 z-[130]" onClick={() => onOpenChange(false)} />
            <div className="fixed inset-x-2 bottom-2 z-[131] max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold">{title}</h2>
                <button type="button" onClick={() => onOpenChange(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {children}
            </div>
          </>
        )}
      </>
    )
  }
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} collisionPadding={12} className="z-[110] rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">{title}</h2>
            <Popover.Close asChild><button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar"><X className="h-4 w-4" /></button></Popover.Close>
          </div>
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

const calendarClassNames = {
  root: 'w-full',
  months: 'flex justify-center',
  month: 'w-full',
  month_caption: 'mb-3 flex h-9 items-center justify-center px-10',
  caption_label: 'text-sm font-bold capitalize',
  nav: 'absolute inset-x-4 top-[4.2rem] flex justify-between sm:top-4',
  button_previous: 'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800',
  button_next: 'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800',
  month_grid: 'w-full border-collapse',
  weekdays: 'grid grid-cols-7',
  weekday: 'py-2 text-center text-[11px] font-bold uppercase text-slate-400',
  weeks: 'mt-1',
  week: 'grid grid-cols-7',
  day: 'relative flex aspect-square items-center justify-center text-sm',
  day_button: 'flex h-9 w-9 items-center justify-center rounded-lg outline-none hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 dark:hover:bg-slate-800',
  selected: 'rounded-lg bg-blue-600 text-white [&>button]:hover:bg-blue-600',
  today: 'font-black text-blue-600 ring-1 ring-blue-300 rounded-lg dark:text-blue-300 dark:ring-blue-800',
  outside: 'text-slate-300 dark:text-slate-700',
  disabled: 'pointer-events-none opacity-30',
  range_start: 'rounded-l-lg bg-blue-600 text-white',
  range_middle: 'rounded-none bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100',
  range_end: 'rounded-r-lg bg-blue-600 text-white',
}

function CalendarFooter({
  onToday,
  onClear,
  onCancel,
  onApply,
  applyDisabled, hideToday,
}: {
  onToday: () => void
  onClear: () => void
  onCancel: () => void
  onApply: () => void
  applyDisabled?: boolean
  hideToday?: boolean
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
      {!hideToday && <Button type="button" variant="ghost" size="sm" onClick={onToday}>Hoy</Button>}
      <Button type="button" variant="ghost" size="sm" onClick={onClear}>Limpiar</Button>
      <div className="ml-auto flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="button" variant="primary" size="sm" onClick={onApply} disabled={applyDisabled}>Aplicar</Button>
      </div>
    </div>
  )
}

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  min?: string
  max?: string
  disabled?: boolean
  className?: string
  title?: string
  yearRange?: { from: number; to: number }
  variant?: 'default' | 'birthDate'
}

const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function CustomSelect({ value, options, onChange }: {
  value: number
  options: { value: number; label: string }[]
  onChange: (value: number) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white">
        {selected?.label ?? value}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-[120] max-h-48 min-w-[80px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          {options.map(opt => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`block w-full whitespace-nowrap rounded-md px-3 py-1.5 text-left text-xs ${opt.value === value ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function DatePicker({ value, onChange, placeholder = 'Seleccionar fecha', min, max, disabled, className, title = 'Elegir fecha', yearRange, variant = 'default' }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Date | undefined>(() => parseDate(value))
  const [viewMode, setViewMode] = useState<'days' | 'monthYear'>('days')
  const currentYear = new Date().getFullYear()
  const yrFrom = yearRange?.from ?? currentYear - 100
  const yrTo = yearRange?.to ?? currentYear
  const isBirth = variant === 'birthDate'

  // Default month for birthDate: ~15 years ago if no value set
  const defaultMonth = useMemo(() => {
    if (isBirth) {
      const d = parseDate(value)
      return d ?? new Date(currentYear - 15, 0, 1)
    }
    return parseDate(value) ?? new Date()
  }, [isBirth, value, currentYear])

  const [pickerMonth, setPickerMonth] = useState<Date>(defaultMonth)
  const yearScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (open) { setDraft(parseDate(value)); setViewMode('days'); setPickerMonth(parseDate(value) ?? defaultMonth) } }, [open, value, defaultMonth])
  useEffect(() => { if (viewMode === 'monthYear' && yearScrollRef.current) yearScrollRef.current.scrollTop = ((pickerMonth.getFullYear() - yrFrom) / (yrTo - yrFrom)) * yearScrollRef.current.scrollHeight }, [viewMode, pickerMonth, yrFrom, yrTo])

  const selected = parseDate(value)
  const label = selected ? format(selected, "EEEE d 'de' MMMM 'de' yyyy", { locale: es }) : placeholder

  const years = useMemo(() => {
    const arr: number[] = []
    for (let y = yrTo; y >= yrFrom; y--) arr.push(y)
    return arr
  }, [yrFrom, yrTo])

  const selectMonthYear = useCallback((m: number, y: number) => {
    const newDate = setYear(setMonth(pickerMonth, m), y)
    setPickerMonth(newDate)
    setViewMode('days')
  }, [pickerMonth])

  const handleCaptionClick = useCallback(() => {
    if (yearRange) setViewMode('monthYear')
  }, [yearRange])

  const trigger = (
    <button type="button" disabled={disabled} className={cn('flex min-h-11 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm outline-none transition hover:border-slate-300 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600', className)}>
      <CalendarDays className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
      <span className={cn('min-w-0 flex-1 truncate capitalize', selected ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500')}>{label}</span>
    </button>
  )

  return (
    <PickerSurface open={open} onOpenChange={(next) => { setOpen(next); if (!next) setViewMode('days') }} trigger={trigger} title={viewMode === 'monthYear' ? 'Elegir mes y año' : title}>
      {viewMode === 'monthYear' && yearRange ? (
        <div className="space-y-4">
          {/* Month grid */}
          <div className="grid grid-cols-3 gap-2">
            {monthsShort.map((mName, idx) => {
              const m = idx
              const isCurrent = pickerMonth.getMonth() === m
              return (
                <button key={m} type="button" onClick={() => selectMonthYear(m, pickerMonth.getFullYear())}
                  className={`rounded-xl py-2.5 text-sm font-semibold transition ${isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'}`}>
                  {mName}
                </button>
              )
            })}
          </div>
          {/* Year scroll list */}
          <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
            <p className="mb-2 text-xs font-semibold text-slate-500">Año</p>
            <div ref={yearScrollRef} className="flex flex-wrap gap-1.5 max-h-[180px] overflow-y-auto">
              {years.map((y) => {
                const isCurrent = pickerMonth.getFullYear() === y
                return (
                  <button key={y} type="button" onClick={() => selectMonthYear(pickerMonth.getMonth(), y)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'}`}>
                    {y}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <>
          <DayPicker
            mode="single"
            locale={es}
            weekStartsOn={1}
            selected={draft}
            onSelect={setDraft}
            month={pickerMonth}
            onMonthChange={setPickerMonth}
            startMonth={parseDate(min) ?? (isBirth ? new Date(currentYear - 120, 0, 1) : undefined)}
            endMonth={parseDate(max) ?? (isBirth ? undefined : undefined)}
            disabled={isBirth
              ? { after: new Date() }
              : { before: parseDate(min) ?? new Date(1900, 0, 1), after: parseDate(max) ?? new Date(2200, 11, 31) }
            }
            classNames={{
              ...calendarClassNames,
              ...(isBirth ? { nav: 'hidden', month_caption: 'mb-3 flex h-9 items-center justify-center' } : {}),
            }}
            components={{
              Chevron: (props: any) => {
                if (isBirth) return null
                return props.orientation === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
              },
              ...(isBirth ? {
                MonthCaption: ({ calendarMonth }: any) => {
                  const m = calendarMonth.date.getMonth()
                  const y = calendarMonth.date.getFullYear()
                  const yearOptions = Array.from({ length: yrTo - yrFrom + 1 }, (_, i) => yrTo - i)
                  return (
                    <div className="flex items-center justify-center gap-2">
                      <CustomSelect value={m} options={monthsShort.map((name, idx) => ({ value: idx, label: name }))}
                        onChange={(newM) => {
                          const d = new Date(calendarMonth.date)
                          d.setMonth(newM)
                          setPickerMonth(d)
                        }} />
                      <CustomSelect value={y} options={yearOptions.map(yr => ({ value: yr, label: String(yr) }))}
                        onChange={(newY) => {
                          const d = new Date(calendarMonth.date)
                          d.setFullYear(newY)
                          setPickerMonth(d)
                        }} />
                    </div>
                  )
                },
              } : {}),
              ...(yearRange && !isBirth ? {
                MonthCaption: ({ calendarMonth }: any) => (
                  <button type="button" onClick={handleCaptionClick} className="text-sm font-bold capitalize hover:text-blue-600 transition">
                    {format(calendarMonth.date, 'MMMM yyyy', { locale: es })}
                  </button>
                )
              } : {}),
            }}
          />
          {draft && <p className="mt-2 text-center text-xs font-medium capitalize text-slate-500 dark:text-slate-400">{format(draft, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}</p>}
          <CalendarFooter
            onToday={() => setDraft(new Date())}
            onClear={() => setDraft(undefined)}
            onCancel={() => setOpen(false)}
            onApply={() => { onChange(isoDate(draft)); setOpen(false) }}
            hideToday={isBirth}
          />
        </>
      )}
    </PickerSurface>
  )
}

interface DateRangePickerProps {
  from: string
  to: string
  onChange: (range: { from: string; to: string }) => void
  placeholder?: string
  className?: string
}

export function DateRangePicker({ from, to, onChange, placeholder = 'Seleccionar período', className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>()
  useEffect(() => {
    if (open) setDraft({ from: parseDate(from), to: parseDate(to) })
  }, [open, from, to])
  const label = from
    ? `${format(parseDate(from)!, 'dd/MM/yyyy')} ${to ? `al ${format(parseDate(to)!, 'dd/MM/yyyy')}` : ''}`
    : placeholder
  const trigger = (
    <button type="button" className={cn('flex min-h-11 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm outline-none hover:border-slate-300 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800', className)}>
      <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <span className={from ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>{label}</span>
    </button>
  )
  return (
    <PickerSurface open={open} onOpenChange={setOpen} trigger={trigger} title="Elegir período">
      <DayPicker mode="range" locale={es} weekStartsOn={1} selected={draft} onSelect={setDraft} classNames={calendarClassNames} components={{ Chevron: ({ orientation }) => orientation === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" /> }} />
      <CalendarFooter
        onToday={() => setDraft({ from: new Date(), to: new Date() })}
        onClear={() => setDraft(undefined)}
        onCancel={() => setOpen(false)}
        onApply={() => { onChange({ from: isoDate(draft?.from), to: isoDate(draft?.to) }); setOpen(false) }}
        applyDisabled={!!draft?.from && !draft?.to}
      />
    </PickerSurface>
  )
}

interface MonthYearPickerProps {
  month: number
  year: number
  onChange: (value: { month: number; year: number }) => void
  minYear?: number
  maxYear?: number
  className?: string
}

export function MonthYearPicker({ month, year, onChange, minYear = new Date().getFullYear() - 5, maxYear = new Date().getFullYear() + 5, className }: MonthYearPickerProps) {
  const [open, setOpen] = useState(false)
  const [draftMonth, setDraftMonth] = useState(String(month))
  const [draftYear, setDraftYear] = useState(String(year))
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: format(new Date(2020, index, 1), 'MMMM', { locale: es }) })), [])
  const yearOptions = useMemo(() => Array.from({ length: maxYear - minYear + 1 }, (_, index) => ({ value: String(minYear + index), label: String(minYear + index) })), [minYear, maxYear])
  const trigger = (
    <button type="button" className={cn('flex min-h-11 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800', className)}>
      <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <span className="capitalize">{format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: es })}</span>
    </button>
  )
  return (
    <PickerSurface open={open} onOpenChange={(next) => { setOpen(next); if (next) { setDraftMonth(String(month)); setDraftYear(String(year)) } }} trigger={trigger} title="Elegir mes y año">
      <div className="grid grid-cols-2 gap-3">
        <SelectField value={draftMonth} onValueChange={setDraftMonth} options={monthOptions} />
        <SelectField value={draftYear} onValueChange={setDraftYear} options={yearOptions} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button type="button" variant="primary" size="sm" onClick={() => { onChange({ month: Number(draftMonth), year: Number(draftYear) }); setOpen(false) }}>Aplicar</Button>
      </div>
    </PickerSurface>
  )
}

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  minuteStep?: number
  className?: string
  placeholder?: string
}

export function TimePicker({ value, onChange, minuteStep = 5, className, placeholder = 'Seleccionar horario' }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const [hour, minute] = value ? value.split(':') : ['', '']
  const [draftHour, setDraftHour] = useState(hour)
  const [draftMinute, setDraftMinute] = useState(minute)
  const hours = Array.from({ length: 24 }, (_, index) => ({ value: String(index).padStart(2, '0'), label: `${String(index).padStart(2, '0')} h` }))
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, index) => ({ value: String(index * minuteStep).padStart(2, '0'), label: `${String(index * minuteStep).padStart(2, '0')} min` }))
  const trigger = (
    <button type="button" className={cn('flex min-h-11 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800', className)}>
      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <span className={value ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>{value ? `${value} hs` : placeholder}</span>
    </button>
  )
  return (
    <PickerSurface open={open} onOpenChange={(next) => { setOpen(next); if (next) { setDraftHour(hour); setDraftMinute(minute) } }} trigger={trigger} title="Elegir horario">
      <div className="grid grid-cols-2 gap-3">
        <SelectField value={draftHour} onValueChange={setDraftHour} options={hours} placeholder="Hora" />
        <SelectField value={draftMinute} onValueChange={setDraftMinute} options={minutes} placeholder="Minutos" />
      </div>
      <div className="mt-4 flex justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => { onChange(''); setOpen(false) }}>Limpiar</Button>
        <Button type="button" variant="primary" size="sm" disabled={!draftHour || !draftMinute} onClick={() => { onChange(`${draftHour}:${draftMinute}`); setOpen(false) }}>Aplicar</Button>
      </div>
    </PickerSurface>
  )
}

export function DateTimePicker({ value, onChange, className }: { value: string; onChange: (value: string) => void; className?: string }) {
  const date = value ? value.slice(0, 10) : ''
  const time = value?.includes('T') ? value.slice(11, 16) : ''
  return (
    <div className={cn('grid gap-2 sm:grid-cols-2', className)}>
      <DatePicker value={date} onChange={(nextDate) => onChange(nextDate ? `${nextDate}T${time || '00:00'}` : '')} />
      <TimePicker value={time} onChange={(nextTime) => onChange(date && nextTime ? `${date}T${nextTime}` : '')} />
    </div>
  )
}
