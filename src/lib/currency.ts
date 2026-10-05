const cache = new Map<string, Intl.NumberFormat>()

export function money(amount: number, currency: string | null | undefined = 'ARS'): string {
  const cur = (currency ?? 'ARS').toUpperCase()
  let fmt = cache.get(cur)
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: cur, maximumFractionDigits: 0 })
    } catch {
      fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
    }
    cache.set(cur, fmt)
  }
  return fmt.format(amount)
}