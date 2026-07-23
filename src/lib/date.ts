export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '—'
  const m = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) {
    if (import.meta.env.DEV) console.warn('[formatDateOnly] formato inesperado:', value)
    return '—'
  }
  return `${m[3]}/${m[2]}/${m[1]}`
}
