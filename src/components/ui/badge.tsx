import { cn } from '@/lib/utils'

const variantStyles = {
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-700',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-700',
  danger: 'bg-red-50 text-red-700 ring-1 ring-red-300 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700',
  info: 'bg-blue-50 text-blue-700 ring-1 ring-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:ring-blue-700',
  default: 'bg-slate-50 text-slate-600 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600',
  violet: 'bg-violet-50 text-violet-700 ring-1 ring-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:ring-violet-700',
}

interface BadgeProps {
  variant?: keyof typeof variantStyles
  className?: string
  children: React.ReactNode
}

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variantStyles[variant], className)}>
      {children}
    </span>
  )
}
