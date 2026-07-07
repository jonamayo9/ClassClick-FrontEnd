import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function BackButton({ to, label = 'Volver' }: { to: string; label?: string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition',
        'hover:bg-slate-100 hover:text-slate-700',
        'dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
      )}
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  )
}
