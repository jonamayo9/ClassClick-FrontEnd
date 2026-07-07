import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

const variants = {
  default: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200',
  primary: 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20',
  secondary: 'border border-white/15 bg-white/10 text-white hover:bg-white/15',
  ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800',
  outline: 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
  danger: 'bg-red-600 text-white hover:bg-red-500',
} as const

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  default: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-4 text-sm',
  xl: 'px-8 py-5 text-base',
} as const

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition',
        variants[variant],
        sizes[size],
        'disabled:opacity-50 disabled:pointer-events-none',
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
