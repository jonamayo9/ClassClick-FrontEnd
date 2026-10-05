import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900',
      'placeholder:text-slate-400',
      'focus:outline-none focus:ring-2 focus:border-transparent',
      'dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500',
      error
        ? 'border-red-400 dark:border-red-500/70 focus:ring-red-500'
        : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500',
      'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-slate-800/60',
      className
    )}
    {...props}
  />
))
Input.displayName = 'Input'
