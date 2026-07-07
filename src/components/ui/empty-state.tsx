import { cn } from '@/lib/utils'
import { Button } from './button'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({ icon = '📋', title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <span className="text-4xl">{icon}</span>
      <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</p>
      {description && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{description}</p>}
      {action && (
        <Button size="sm" className="mt-4 bg-violet-600 text-white hover:bg-violet-700" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
