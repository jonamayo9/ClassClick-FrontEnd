import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface SelectFieldProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  contentClassName?: string
  'aria-label'?: string
}

export function SelectField({
  value,
  onValueChange,
  options,
  placeholder = 'Seleccionar...',
  disabled,
  className,
  contentClassName,
  'aria-label': ariaLabel,
}: SelectFieldProps) {
  return (
    <SelectPrimitive.Root value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          'flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm text-slate-900 outline-none transition',
          'data-[placeholder]:text-slate-400 hover:border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'disabled:pointer-events-none disabled:opacity-50',
          'dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:data-[placeholder]:text-slate-500 dark:hover:border-slate-600',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            'z-[100] max-h-[min(22rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl',
            'dark:border-slate-700 dark:bg-slate-900 dark:text-white',
            contentClassName,
          )}
        >
          <SelectPrimitive.ScrollUpButton className="flex h-7 items-center justify-center bg-white text-slate-500 dark:bg-slate-900">
            <ChevronUp className="h-4 w-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1.5">
            {options.length === 0 ? (
              <div className="px-3 py-5 text-center text-sm text-slate-400">No hay opciones disponibles</div>
            ) : options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  'relative flex cursor-default select-none items-center rounded-lg py-2.5 pl-9 pr-3 text-sm outline-none',
                  'data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-900 data-[state=checked]:font-semibold',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
                  'dark:data-[highlighted]:bg-slate-800 dark:data-[highlighted]:text-white',
                )}
              >
                <SelectPrimitive.ItemIndicator className="absolute left-3 inline-flex items-center">
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </SelectPrimitive.ItemIndicator>
                <div className="min-w-0">
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  {option.description && <p className="mt-0.5 truncate text-xs font-normal text-slate-400">{option.description}</p>}
                </div>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-7 items-center justify-center bg-white text-slate-500 dark:bg-slate-900">
            <ChevronDown className="h-4 w-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
