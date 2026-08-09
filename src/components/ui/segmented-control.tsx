import { cn } from '@/lib/utils'

export interface SegmentOption {
  value: string
  label: string
}

interface SegmentedControlProps {
  options: SegmentOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  return (
    <div className={cn('flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 rounded-lg py-2.5 text-sm font-bold transition',
            value === opt.value
              ? 'bg-white shadow-sm dark:bg-slate-700'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
