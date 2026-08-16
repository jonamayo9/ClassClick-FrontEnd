const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
export const money = (v?: number | null) => (v == null ? 'Gratis' : ARS.format(v))

/**
 * Recargo efectivo de un medio según la regla del evento.
 * - Transferencia ONLINE: solo si applyTransferSurcharge.
 * - Cualquier otro medio: mantiene su recargo configurado (no cambia comportamiento actual).
 */
export function computeMethodSurcharge(
  base: number,
  method: { code?: string; surchargeType: number; surchargeValue: number },
  applyTransferSurcharge: boolean,
): number {
  if (method.code === 'Transfer' && !applyTransferSurcharge) return 0
  if (method.surchargeType === 1) return Math.round(base * method.surchargeValue / 100)
  if (method.surchargeType === 2) return Math.round(method.surchargeValue)
  return 0
}
