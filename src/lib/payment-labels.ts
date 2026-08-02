// Etiquetas centralizadas del origen de un pago (cómo ingresó al sistema).
// NO deducir el texto sólo desde PaymentMethod.
const ORIGIN_LABELS: Record<number, string> = {
  0: 'Origen del pago no disponible', // Unknown
  1: 'Pago registrado manualmente', // Manual
  2: 'Pagado a través de Mercado Pago', // MercadoPagoCheckout
  3: 'Sync automático de Mercado Pago', // MercadoPagoSync
  4: 'Pagado con Transferencia bancaria', // TransferProof
  5: 'Pago en efectivo', // Cash
  6: 'Origen del pago no disponible', // Other
}

const ORIGIN_NAMES: Record<number, string> = {
  0: 'Unknown',
  1: 'Manual',
  2: 'MercadoPagoCheckout',
  3: 'MercadoPagoSync',
  4: 'TransferProof',
  5: 'Cash',
  6: 'Other',
}

const METHOD_LABELS: Record<string, string> = {
  '0': 'Sin medio',
  '1': 'Transferencia bancaria',
  Transfer: 'Transferencia bancaria',
  '2': 'Tarjeta de débito',
  DebitCard: 'Tarjeta de débito',
  '3': 'Tarjeta de crédito',
  CreditCard: 'Tarjeta de crédito',
  '4': 'Mercado Pago',
  MercadoPago: 'Mercado Pago',
  '5': 'Efectivo',
  Cash: 'Efectivo',
}

export function paymentOriginName(origin: number | string | null | undefined): string {
  if (origin === null || origin === undefined || origin === '') return 'Unknown'
  return ORIGIN_NAMES[Number(origin)] ?? 'Unknown'
}

export function paymentOriginLabel(origin: number | string | null | undefined): string {
  if (origin === null || origin === undefined || origin === '') return 'Origen del pago no disponible'
  return ORIGIN_LABELS[Number(origin)] ?? 'Origen del pago no disponible'
}

export function paymentMethodLabel(method: number | string | null | undefined): string {
  if (method === null || method === undefined || method === '') return 'Sin medio'
  return METHOD_LABELS[String(method)] ?? 'Otro'
}
