import { Button } from './button'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  title: string
  message: string
  confirmText?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
}

export function ConfirmModal({
  open, onClose, title, message, confirmText = 'Confirmar', variant = 'danger', loading, onConfirm,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center sm:justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full animate-slide-up rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
        </div>
        <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            size="sm"
            loading={loading}
            className={variant === 'danger' ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-violet-600 text-white hover:bg-violet-700'}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
