export const DOC_STATUS: Record<string, { label: string; classes: string }> = {
  Pending: { label: 'Pendiente', classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-700' },
  Submitted: { label: 'Enviado', classes: 'bg-blue-50 text-blue-700 ring-1 ring-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:ring-blue-700' },
  Approved: { label: 'Vigente', classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-700' },
  Rejected: { label: 'Rechazado', classes: 'bg-red-50 text-red-700 ring-1 ring-red-300 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700' },
  Expired: { label: 'Vencido', classes: 'bg-slate-100 text-slate-500 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600' },
}

export function docStatusInfo(status: string): { label: string; classes: string } {
  return DOC_STATUS[status] ?? { label: status, classes: 'bg-slate-50 text-slate-600 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600' }
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
