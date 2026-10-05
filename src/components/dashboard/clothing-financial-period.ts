/** Query string del período financiero de Indumentaria: instantes precisos (hora local ARG) o fechas (UTC). */
export function clothingFinancialPeriodQs(from: string, to: string, fromUtc?: string, toUtc?: string): string {
  return fromUtc && toUtc
    ? `fromUtc=${encodeURIComponent(fromUtc)}&toUtc=${encodeURIComponent(toUtc)}`
    : `from=${from}&to=${to}`
}