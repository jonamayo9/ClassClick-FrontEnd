import * as Popover from '@radix-ui/react-popover'
import { ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

interface CountryOption { value?: string; label: string; divider?: boolean }

interface PhoneCountrySelectProps {
  value?: string
  onChange?: (value: string) => void
  options?: CountryOption[]
  disabled?: boolean
  readOnly?: boolean
  iconComponent?: React.ElementType<{ country: string }>
}

export function PhoneCountrySelect({
  value,
  onChange,
  options,
  disabled,
  readOnly,
  iconComponent: Icon,
}: PhoneCountrySelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
    if (!open) setSearch('')
  }, [open])

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    if (!term) return (options ?? []).filter((o) => !o.divider)
    return (options ?? []).filter(
      (o) => !o.divider && o.label.toLocaleLowerCase('es').includes(term),
    )
  }, [options, search])

  const selected = options?.find((o) => o.value === value)

  if (disabled || readOnly) return null

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex shrink-0 items-center gap-0.5 pl-3 pr-1 py-3 text-xs hover:bg-black/5 dark:hover:bg-white/10 rounded-l-xl outline-none"
        >
          {value && Icon ? <Icon country={value} /> : <span className="w-5 h-4 rounded-sm bg-slate-200 dark:bg-slate-600" />}
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-[120] w-[280px] rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar país…"
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
          <div className="mt-1 max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400">Sin resultados</p>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange?.(opt.value ?? ''); setOpen(false) }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    {opt.value && Icon ? (
                      <Icon country={opt.value} />
                    ) : (
                      <span className="w-5 h-4 rounded-sm bg-slate-200 dark:bg-slate-600" />
                    )}
                    <span className="flex-1 text-slate-700 dark:text-slate-200">{opt.label}</span>
                  </button>
                )
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
