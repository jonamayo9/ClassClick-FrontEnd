import { cn } from '@/lib/utils'
import { HTMLAttributes, forwardRef } from 'react'

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm',
        'dark:border-slate-800 dark:bg-slate-900',
        className
      )}
      {...props}
    />
  )
)
Card.displayName = 'Card'
