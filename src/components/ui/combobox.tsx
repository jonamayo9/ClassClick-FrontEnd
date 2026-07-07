import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { SelectOption } from './select-field'

interface SearchableComboboxProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  loading?: boolean
  disabled?: boolean
  className?: string
  onSearchChange?: (value: string) => void
}

export function SearchableCombobox({
  value,
  onValueChange,
  options,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyText = 'No se encontraron resultados',
  loading,
  disabled,
  className,
  onSearchChange,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selected = options.find((option) => option.value === value)
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    if (!term) return options
    return options.filter((option) =>
      `${option.label} ${option.description ?? ''}`.toLocaleLowerCase('es').includes(term),
    )
  }, [options, search])

  return (
    <Popover.Root open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSearch('') }}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm outline-none transition',
            'hover:border-slate-300 focus:ring-2 focus:ring-blue-500 disabled:pointer-events-none disabled:opacity-50',
            'dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600',
            selected ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500',
            className,
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-[100] w-[var(--radix-popover-trigger-width)] rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              autoFocus
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                onSearchChange?.(event.target.value)
              }}
              placeholder={searchPlaceholder}
              className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            {search && <button type="button" onClick={() => { setSearch(''); onSearchChange?.('') }} aria-label="Limpiar búsqueda"><X className="h-4 w-4 text-slate-400" /></button>}
          </div>
          <div className="mt-1 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-6 text-center text-sm text-slate-400">Cargando opciones...</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-400">{emptyText}</div>
            ) : filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => { onValueChange(option.value); setOpen(false) }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-blue-50 disabled:opacity-40 dark:hover:bg-slate-800"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {value === option.value && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{option.label}</span>
                  {option.description && <span className="block truncate text-xs text-slate-400">{option.description}</span>}
                </span>
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

interface MultiSelectProps {
  values: string[]
  onValuesChange: (values: string[]) => void
  options: SelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
}

export function MultiSelect({
  values,
  onValuesChange,
  options,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  disabled,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    return term
      ? options.filter((option) => `${option.label} ${option.description ?? ''}`.toLocaleLowerCase('es').includes(term))
      : options
  }, [options, search])
  const allEnabledValues = options.filter((option) => !option.disabled).map((option) => option.value)
  const allSelected = allEnabledValues.length > 0 && allEnabledValues.every((value) => values.includes(value))

  function toggle(value: string) {
    onValuesChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }

  return (
    <Popover.Root open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSearch('') }}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm outline-none transition',
            'hover:border-slate-300 focus:ring-2 focus:ring-blue-500 disabled:pointer-events-none disabled:opacity-50',
            'dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600',
            className,
          )}
        >
          <span className={values.length ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}>
            {values.length === 0 ? placeholder : values.length === 1 ? options.find((option) => option.value === values[0])?.label : `${values.length} seleccionados`}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-[100] w-[var(--radix-popover-trigger-width)] rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </div>
          <button
            type="button"
            onClick={() => onValuesChange(allSelected ? [] : allEnabledValues)}
            className="mt-1 flex w-full items-center gap-3 rounded-lg border-b border-slate-100 px-3 py-2.5 text-left text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 dark:border-slate-600">{allSelected && <Check className="h-4 w-4" />}</span>
            {allSelected ? 'Quitar todos' : 'Seleccionar todos'}
          </button>
          <div className="max-h-64 overflow-y-auto pt-1">
            {filtered.length === 0 ? <div className="px-3 py-6 text-center text-sm text-slate-400">No hay opciones</div> : filtered.map((option) => (
              <button key={option.value} type="button" disabled={option.disabled} onClick={() => toggle(option.value)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-blue-50 disabled:opacity-40 dark:hover:bg-slate-800">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-300 dark:border-slate-600">{values.includes(option.value) && <Check className="h-4 w-4 text-blue-600" />}</span>
                <span className="truncate">{option.label}</span>
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
