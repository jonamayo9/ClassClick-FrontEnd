import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/modal'
import type { AlertItem } from '@/types/dashboard'

interface AlertModalProps {
  open: boolean
  alerts: AlertItem[]
  onClose: () => void
}

const severityIcons: Record<string, string> = { high: '🔴', medium: '🟡', low: '🔵' }

export function AlertModal({ open, alerts, onClose }: AlertModalProps) {
  const navigate = useNavigate()

  return (
    <Modal open={open} onClose={onClose} title="⚠️ Atención">
      <div className="space-y-3 p-5 sm:p-6">
        <p className="text-sm text-slate-600 dark:text-slate-400">Se detectaron las siguientes situaciones que requieren atención:</p>
        {alerts.map((a) => (
          <div key={a.type} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800/50">
            <span className="text-lg">{severityIcons[a.severity] ?? '🔵'}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{a.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{a.message}</p>
            </div>
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">{a.count}</span>
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <button onClick={() => { onClose(); if (alerts[0]?.navigateTo) navigate(alerts[0].navigateTo) }}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700">
            Ir a revisar
          </button>
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  )
}
