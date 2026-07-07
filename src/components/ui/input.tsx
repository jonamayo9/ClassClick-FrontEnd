import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900',
        'placeholder:text-slate-400',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
