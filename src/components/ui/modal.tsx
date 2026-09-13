import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  description?: React.ReactNode
  footer?: React.ReactNode
  ariaLabel?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, description, footer, ariaLabel, children, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined) ?? 'Diálogo'}
        className={cn(
          'relative z-10 flex max-h-[85vh] w-full flex-col rounded-2xl bg-white shadow-2xl sm:max-w-2xl dark:bg-slate-900 overflow-hidden',
          className
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-700">
            <div className="min-w-0">
              {title && <h2 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">{title}</h2>}
              {description && <p className="mt-0.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">{description}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="border-t border-slate-200 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 dark:border-slate-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
